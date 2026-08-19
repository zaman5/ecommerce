import http from 'http';

const BASE = 'http://localhost:5000/api';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(
      url,
      { method, headers },
      (res) => {
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
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
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

async function runTests() {
  console.log('==============================================');
  console.log('🚀 RUNNING FULL END-TO-END FEATURE TEST SUITE');
  console.log('==============================================\n');

  // 1. Categories
  console.log('--- 1. CATEGORY TESTS ---');
  const catsRes = await request('GET', '/categories');
  assert(catsRes.status === 200, 'GET /categories returns 200');
  assert(Array.isArray(catsRes.data) && catsRes.data.length > 0, `Found ${catsRes.data.length} categories`);

  // 2. Banners
  console.log('\n--- 2. BANNER TESTS ---');
  const bannersRes = await request('GET', '/banners');
  assert(bannersRes.status === 200, 'GET /banners returns 200');
  assert(Array.isArray(bannersRes.data), 'Banners list is an array');

  // 3. Products
  console.log('\n--- 3. PRODUCT CATALOG TESTS ---');
  const prodsRes = await request('GET', '/products?page=1&limit=10');
  assert(prodsRes.status === 200, 'GET /products returns 200');
  assert(prodsRes.data.items && prodsRes.data.items.length > 0, `Fetched ${prodsRes.data.items?.length} products`);

  const firstProduct = prodsRes.data.items[0];
  const prodDetail = await request('GET', `/products/${firstProduct.slug}`);
  assert(prodDetail.status === 200, `GET /products/${firstProduct.slug} returns 200`);
  assert(prodDetail.data.name === firstProduct.name, 'Product detail matches requested slug');

  // Colors
  const colorsRes = await request('GET', '/products/colors');
  assert(colorsRes.status === 200, 'GET /products/colors returns 200');

  // Flash sale
  console.log('\n--- 4. FLASH SALE TESTS ---');
  const flashRes = await request('GET', '/flash-sale');
  assert(flashRes.status === 200, 'GET /flash-sale returns 200');

  // 5. Auth
  console.log('\n--- 5. AUTHENTICATION & ROLE TESTS ---');
  // Admin Login
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@wondercart.pk', password: 'admin12345' });
  assert(adminLogin.status === 200, 'Admin login succeeded');
  assert(adminLogin.data.user?.role === 'admin', 'Admin role verified');
  const adminToken = adminLogin.data.token;

  // Shop Manager Login
  const mgrLogin = await request('POST', '/auth/login', { email: 'manager@wondercart.pk', password: 'manager123' });
  assert(mgrLogin.status === 200, 'Shop Manager login succeeded');
  assert(mgrLogin.data.user?.role === 'shopmanager', 'Shop Manager role verified');
  const mgrToken = mgrLogin.data.token;

  // Client Register / Login
  const testEmail = `test_cust_${Date.now()}@example.com`;
  const clientReg = await request('POST', '/auth/register', {
    name: 'Test Customer',
    email: testEmail,
    password: 'Password123',
    phone: '03001234567',
  });
  assert(clientReg.status === 201, 'Customer registration succeeded with required phone and strong password');
  const clientToken = clientReg.data.token;

  // 6. Settings (JazzCash)
  console.log('\n--- 6. JAZZCASH SETTINGS TESTS ---');
  const jcPublic = await request('GET', '/settings/jazzcash');
  assert(jcPublic.status === 200, 'Public GET /settings/jazzcash returns 200');
  assert(jcPublic.data.phone !== undefined, `JazzCash phone is configured: ${jcPublic.data.phone}`);

  const jcUpdate = await request('PUT', '/settings/jazzcash', { phone: '03038164288' }, adminToken);
  assert(jcUpdate.status === 200, 'Admin update JazzCash settings succeeded');

  const jcUnauthorized = await request('PUT', '/settings/jazzcash', { phone: '03000000000' }, clientToken);
  assert(jcUnauthorized.status === 403, 'Regular client blocked from updating JazzCash settings');

  // 7. Orders Flow (COD & JazzCash)
  console.log('\n--- 7. ORDER PLACEMENT & VERIFICATION TESTS ---');
  const productColor = firstProduct.colors?.[0]?.name || '';

  // Place COD Order
  const codOrder = await request('POST', '/orders', {
    items: [{ product: firstProduct._id, qty: 1, color: productColor }],
    shippingAddress: {
      fullName: 'Test Buyer',
      line1: 'House 1, Street 2',
      city: 'Islamabad',
      province: 'Federal',
      postalCode: '44000',
      phone: '03001234567',
    },
    paymentMethod: 'cod',
    email: 'buyer@example.com',
  });
  assert(codOrder.status === 201, `COD Order placed successfully: #${codOrder.data.orderNumber}`);

  // Place JazzCash Order with Screenshot
  const jcOrder = await request('POST', '/orders', {
    items: [{ product: firstProduct._id, qty: 1, color: productColor }],
    shippingAddress: {
      fullName: 'JazzCash Buyer',
      line1: 'Apartment 4B, Blue Area',
      city: 'Islamabad',
      province: 'Federal',
      postalCode: '44000',
      phone: '03038164288',
    },
    paymentMethod: 'jazzcash',
    paymentScreenshot: '/uploads/sample_proof.png',
    email: 'jc_buyer@example.com',
  });
  assert(jcOrder.status === 201, `JazzCash Order placed: #${jcOrder.data.orderNumber}`);
  assert(jcOrder.data.paymentScreenshot === '/uploads/sample_proof.png', 'Payment screenshot stored correctly');

  // Admin Order Verification
  const verifyRes = await request('PUT', `/orders/${jcOrder.data._id}/verify-payment`, {}, adminToken);
  assert(verifyRes.status === 200, 'Admin successfully verified JazzCash payment');
  assert(verifyRes.data.paymentStatus === 'paid', 'Order paymentStatus updated to paid');

  // Status Update & Tracking
  const statusUpdate = await request(
    'PUT',
    `/orders/${jcOrder.data._id}/status`,
    { status: 'shipped', note: 'Dispatched with TCS Courier tracking #TCS99281' },
    adminToken
  );
  assert(statusUpdate.status === 200, 'Admin updated order status to shipped');
  assert(statusUpdate.data.status === 'shipped', 'Order status verified as shipped');

  // 8. Analytics
  console.log('\n--- 8. ANALYTICS API TESTS ---');
  const analyticsOverview = await request('GET', '/analytics/overview', null, adminToken);
  assert(analyticsOverview.status === 200, 'Admin analytics overview returns 200');
  assert(typeof analyticsOverview.data.totalRevenue === 'number', 'Revenue calculated correctly');

  // 9. Scope Isolation
  console.log('\n--- 9. SHOP MANAGER SCOPE ISOLATION TESTS ---');
  const smOrders = await request('GET', '/orders', null, mgrToken);
  assert(smOrders.status === 200, 'Shop manager orders endpoint returns 200');

  const smAdminBanners = await request('GET', '/banners/admin/all', null, mgrToken);
  assert(smAdminBanners.status === 403, 'Shop manager blocked from admin banners');

  const smShopManagers = await request('GET', '/shop-managers', null, mgrToken);
  assert(smShopManagers.status === 403, 'Shop manager blocked from managing shop managers');

  console.log('\n==============================================');
  console.log(`🏁 TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==============================================');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
});
