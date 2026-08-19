import http from 'http';

const BASE = 'http://localhost:5000/api';

function request(method, reqPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + reqPath);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(url, { method, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function uploadMultipart(reqPath, fieldName, filename, fileBuffer, mimeType, token = null) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const url = new URL(BASE + reqPath);

    let header = `--${boundary}\r\n`;
    header += `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\n`;
    header += `Content-Type: ${mimeType}\r\n\r\n`;

    const footer = `\r\n--${boundary}--\r\n`;

    const payload = Buffer.concat([
      Buffer.from(header, 'utf8'),
      fileBuffer,
      Buffer.from(footer, 'utf8'),
    ]);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': payload.length,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method: 'POST', headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runMasterSuite() {
  console.log('====================================================');
  console.log('🎯 RUNNING COMPLETE MASTER SUITE ACROSS ALL FEATURES');
  console.log('====================================================\n');

  // 1. Health check
  console.log('--- 1. SYSTEM HEALTH CHECK ---');
  const health = await request('GET', '/health');
  assert(health.status === 200 && health.data.status === 'ok', 'Server API is live and healthy');

  // 2. Authentication & Strong Passwords
  console.log('\n--- 2. AUTHENTICATION & PASSWORD POLICIES ---');
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@wondercart.pk', password: 'admin12345' });
  assert(adminLogin.status === 200, 'Admin login succeeded');
  const adminToken = adminLogin.data.token;

  const mgrLogin = await request('POST', '/auth/login', { email: 'manager@wondercart.pk', password: 'manager123' });
  assert(mgrLogin.status === 200, 'Shop Manager login succeeded');
  const mgrToken = mgrLogin.data.token;

  // Weak password rejection
  const weakReg = await request('POST', '/auth/register', {
    name: 'Weak User',
    email: `weak_${Date.now()}@test.com`,
    password: 'weak',
    phone: '03001234567',
  });
  assert(weakReg.status === 400, 'Rejected password shorter than 8 characters');

  // Letters-only password rejection
  const lettersOnlyReg = await request('POST', '/auth/register', {
    name: 'Letters User',
    email: `letters_${Date.now()}@test.com`,
    password: 'passwordonly',
    phone: '03001234567',
  });
  assert(lettersOnlyReg.status === 400, 'Rejected password lacking numbers');

  // Missing phone rejection
  const noPhoneReg = await request('POST', '/auth/register', {
    name: 'No Phone User',
    email: `nophone_${Date.now()}@test.com`,
    password: 'Password123',
  });
  assert(noPhoneReg.status === 400, 'Rejected registration without phone number');

  // Successful registration
  const customerEmail = `master_cust_${Date.now()}@test.com`;
  const validReg = await request('POST', '/auth/register', {
    name: 'Master Customer',
    email: customerEmail,
    password: 'StrongPassword2026',
    phone: '03009988776',
  });
  assert(validReg.status === 201, 'Customer registered with strong password & phone number');
  const clientToken = validReg.data.token;

  // 3. Uploads (Image, Video, Screenshot)
  console.log('\n--- 3. MEDIA UPLOADS (PHOTO & VIDEO) ---');
  // Photo upload
  const dummyImg = Buffer.from('FAKE_PNG_BINARY_DATA');
  const imgUp = await uploadMultipart('/uploads/image', 'image', 'photo.png', dummyImg, 'image/png', adminToken);
  assert(imgUp.status === 201, 'Product photo uploaded successfully');

  // Video upload
  const dummyVid = Buffer.from('FAKE_MP4_BINARY_DATA');
  const vidUp = await uploadMultipart('/uploads/video', 'video', 'demo.mp4', dummyVid, 'video/mp4', adminToken);
  assert(vidUp.status === 201, 'Product video uploaded successfully');
  const videoUrl = vidUp.data.url;

  // Public payment screenshot upload
  const ssUp = await uploadMultipart('/uploads/payment-screenshot', 'image', 'proof.jpg', dummyImg, 'image/jpeg');
  assert(ssUp.status === 201, 'Public payment screenshot uploaded without token');
  const screenshotUrl = ssUp.data.url;

  // 4. Categories & Slug Generation
  console.log('\n--- 4. CATEGORIES & SLUG LOGIC ---');
  const catsList = await request('GET', '/categories');
  assert(catsList.status === 200 && catsList.data.length > 0, `Fetched ${catsList.data.length} categories`);
  const firstCat = catsList.data[0];

  // Auto-slug creation
  const newCatRes = await request('POST', '/categories', { name: `Auto Slug Dept ${Date.now()}` }, adminToken);
  assert(newCatRes.status === 201, 'Admin created category with auto-generated slug');
  assert(newCatRes.data.slug.startsWith('auto-slug-dept'), `Generated slug: "${newCatRes.data.slug}"`);
  const testCatId = newCatRes.data._id;

  // 5. Products with Video & Color Variants
  console.log('\n--- 5. PRODUCT CREATION & STOREFRONT DELIVERY ---');
  const newProdRes = await request(
    'POST',
    '/products',
    {
      name: `Master Test Gear ${Date.now()}`,
      category: testCatId,
      price: 4999,
      compareAtPrice: 5999,
      stock: 50,
      description: '<p>Top tier product with full video demonstration</p>',
      images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'],
      video: videoUrl,
      colors: [
        { name: 'Midnight Navy', hex: '#1e3a8a', image: '' },
        { name: 'Coral Rose', hex: '#f43f5e', image: '' },
      ],
    },
    adminToken
  );
  assert(newProdRes.status === 201, 'Created product with images, video, and color variants');
  const prodSlug = newProdRes.data.slug;
  const prodId = newProdRes.data._id;

  // Storefront view
  const storeProd = await request('GET', `/products/${prodSlug}`);
  assert(storeProd.status === 200, 'Product retrieved by slug on storefront');
  assert(storeProd.data.video === videoUrl, 'Product contains video for storefront player');
  assert(storeProd.data.colors?.length === 2, 'Product contains both color variants');

  // 6. Reviews
  console.log('\n--- 6. CUSTOMER REVIEWS ---');
  const revRes = await request(
    'POST',
    `/products/${prodSlug}/reviews`,
    { rating: 5, comment: 'Hands down the best quality baby product!' },
    clientToken
  );
  assert(revRes.status === 201 || revRes.status === 200, 'Customer submitted product review');

  const revSummary = await request('GET', `/products/${prodSlug}/reviews`);
  assert(revSummary.status === 200 && revSummary.data.total >= 1, 'Review summary calculated average & total');

  // 7. JazzCash Settings
  console.log('\n--- 7. JAZZCASH SETTINGS ---');
  const jcPublic = await request('GET', '/settings/jazzcash');
  assert(jcPublic.status === 200, 'Public JazzCash settings available');

  const jcUpdate = await request('PUT', '/settings/jazzcash', { phone: '03038164288' }, adminToken);
  assert(jcUpdate.status === 200, 'Admin updated JazzCash phone number');

  // 8. Order Placement & Full Lifecycle (JazzCash Flow)
  console.log('\n--- 8. ORDER PLACEMENT & PAYMENT VERIFICATION ---');
  const orderRes = await request(
    'POST',
    '/orders',
    {
      items: [{ product: prodId, qty: 2, color: 'Midnight Navy' }],
      shippingAddress: {
        fullName: 'Master Buyer',
        line1: 'House 50, F-7/2',
        city: 'Islamabad',
        province: 'Federal',
        postalCode: '44000',
        phone: '03038164288',
      },
      paymentMethod: 'jazzcash',
      paymentScreenshot: screenshotUrl,
      email: customerEmail,
    },
    clientToken
  );
  assert(orderRes.status === 201, `JazzCash order created: #${orderRes.data.orderNumber}`);
  const orderId = orderRes.data._id;
  assert(orderRes.data.paymentScreenshot === screenshotUrl, 'Payment screenshot stored on order');
  assert(orderRes.data.paymentStatus === 'unpaid', 'Initial paymentStatus is unpaid (awaiting admin verification)');

  // Admin Payment Verification
  const verifyRes = await request('PUT', `/orders/${orderId}/verify-payment`, {}, adminToken);
  assert(verifyRes.status === 200, 'Admin verified JazzCash payment screenshot');
  assert(verifyRes.data.paymentStatus === 'paid', 'Order marked as paid');

  // Status progression
  const shipRes = await request(
    'PUT',
    `/orders/${orderId}/status`,
    { status: 'shipped', note: 'Dispatched via Leopard Courier tracking #LEO887192' },
    adminToken
  );
  assert(shipRes.status === 200, 'Order status updated to shipped with courier tracking note');

  // 9. Contact Inquiries
  console.log('\n--- 9. CONTACT INQUIRIES ---');
  const contactRes = await request('POST', '/messages', {
    name: 'Curious Customer',
    email: 'curious@example.com',
    subject: 'Bulk order discount inquiry',
    body: 'We would like to place a school-wide bulk order for 100 sets.',
  });
  assert(contactRes.status === 201, 'Customer inquiry stored');

  const adminMsgs = await request('GET', '/messages', null, adminToken);
  assert(adminMsgs.status === 200 && adminMsgs.data.items?.length > 0, 'Admin can view incoming messages');

  // 10. Analytics
  console.log('\n--- 10. REVENUE & ANALYTICS ---');
  const analyticsRes = await request('GET', '/analytics/overview', null, adminToken);
  assert(analyticsRes.status === 200, 'Analytics overview generated successfully');
  assert(typeof analyticsRes.data.totalOrders === 'number', 'Total orders metric calculated');

  // 11. Cleanup Test Artifacts
  console.log('\n--- 11. CLEANUP ---');
  await request('DELETE', `/products/${prodId}`, null, adminToken);
  await request('DELETE', `/categories/${testCatId}`, null, adminToken);
  console.log('  Cleaned up temporary test product and category');

  console.log('\n====================================================');
  console.log(`🏁 MASTER SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runMasterSuite().catch((err) => {
  console.error('Master test suite failed:', err);
});
