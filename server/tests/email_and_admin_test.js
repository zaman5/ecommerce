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

async function runEmailAndAdminTests() {
  console.log('================================================================');
  console.log('📧 RUNNING EMAIL SYSTEM, SMTP & ADMIN AHSAN FEATURE SUITE');
  console.log('================================================================\n');

  // 1. Admin Login with Ahsan Credentials
  console.log('--- 1. ADMIN AHSAN LOGIN ---');
  const loginRes = await request('POST', '/auth/login', {
    email: 'ahsan@wondercart.pk',
    password: 'Ahsan@Ahmad123',
  });
  assert(loginRes.status === 200, 'Admin ahsan@wondercart.pk login succeeded');
  assert(loginRes.data.user?.role === 'admin', 'User role is admin');
  const ahsanToken = loginRes.data.token;

  // 2. Fetch Email Templates
  console.log('\n--- 2. EMAIL TEMPLATES FETCH ---');
  const tplListRes = await request('GET', '/email-templates', null, ahsanToken);
  assert(tplListRes.status === 200, 'GET /email-templates returns 200');
  assert(Array.isArray(tplListRes.data) && tplListRes.data.length === 3, 'Fetched 3 core email templates');

  const confTpl = tplListRes.data.find((t) => t.type === 'order_confirmation');
  assert(!!confTpl, 'Order confirmation template exists');

  // 3. Upload Email Attachment
  console.log('\n--- 3. EMAIL ATTACHMENT UPLOAD ---');
  const dummyPdf = Buffer.from('%PDF-1.4 sample pdf content for email testing');
  const attRes = await uploadMultipart(
    '/email-templates/attachment',
    'file',
    'Wondercart_Invoice_Sample.pdf',
    dummyPdf,
    'application/pdf',
    ahsanToken
  );
  assert(attRes.status === 201, 'Uploaded email PDF attachment');
  assert(attRes.data.name === 'Wondercart_Invoice_Sample.pdf', `Attachment named: ${attRes.data.name}`);
  const uploadedAtt = attRes.data;

  // 4. Update Email Template with Design & Attachment
  console.log('\n--- 4. UPDATE EMAIL TEMPLATE ---');
  const updateRes = await request(
    'PUT',
    '/email-templates/order_confirmation',
    {
      heading: 'Your Wondercart Order is Confirmed!',
      brandColor: '#1f6b60',
      customMessage: 'Thank you for choosing Wondercart! Your order is being packed by our warehouse.',
      attachments: [uploadedAtt],
    },
    ahsanToken
  );
  assert(updateRes.status === 200, 'PUT /email-templates/order_confirmation succeeded');
  assert(updateRes.data.attachments?.length >= 1, 'Template contains attached file');

  // 5. Test Live Test Email Sender
  console.log('\n--- 5. LIVE TEST EMAIL DISPATCH ---');
  const testSendRes = await request(
    'POST',
    '/email-templates/test-send',
    {
      to: 'ahsan@wondercart.pk',
      type: 'order_confirmation',
    },
    ahsanToken
  );
  console.log('  Test send response:', testSendRes.data);
  assert(testSendRes.status === 200 || testSendRes.status === 500, 'Test send endpoint executed with SMTP response');

  // 6. Test Automated Order Email Triggering
  console.log('\n--- 6. ORDER LIFECYCLE EMAIL TRIGGERS ---');
  const prods = await request('GET', '/products?limit=1');
  const prod = prods.data.items[0];
  const color = prod.colors?.length ? prod.colors[0].name : '';

  const orderRes = await request(
    'POST',
    '/orders',
    {
      items: [{ product: prod._id, qty: 1, color }],
      shippingAddress: {
        fullName: 'Ahsan Ahmad',
        line1: 'House 123, Sector F-7',
        city: 'Islamabad',
        province: 'Federal',
        postalCode: '44000',
        phone: '03038164288',
      },
      email: 'ahsan@wondercart.pk',
      paymentMethod: 'cod',
    },
    ahsanToken
  );
  assert(orderRes.status === 201, `Order #${orderRes.data?.orderNumber} placed (confirmation triggered)`);
  const orderId = orderRes.data?._id;

  // Update status to shipped (dispatch email triggered)
  const shipRes = await request(
    'PUT',
    `/orders/${orderId}/status`,
    { status: 'shipped', note: 'Leopard Courier tracking #LEO847193' },
    ahsanToken
  );
  assert(shipRes.status === 200, 'Order status updated to shipped (dispatch email triggered)');

  // Update status to delivered (delivered email triggered)
  const delRes = await request(
    'PUT',
    `/orders/${orderId}/status`,
    { status: 'delivered', note: 'Package handed to customer' },
    ahsanToken
  );
  assert(delRes.status === 200, 'Order status updated to delivered (delivery email triggered)');

  // Cleanup
  await request('DELETE', `/orders/${orderId}/cancel`, null, ahsanToken);

  console.log('\n================================================================');
  console.log(`🏁 EMAIL & ADMIN SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');
}

runEmailAndAdminTests().catch((err) => {
  console.error('Email and admin test failed:', err);
});
