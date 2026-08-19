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

async function runExtendedTests() {
  console.log('==============================================');
  console.log('🔍 RUNNING EXTENDED FEATURE & EDGE-CASE SUITE');
  console.log('==============================================\n');

  // Admin login
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@wondercart.pk', password: 'admin12345' });
  const adminToken = adminLogin.data.token;

  // 1. Search & Filter
  console.log('--- 1. SEARCH & FILTERING ---');
  const searchRes = await request('GET', '/products?search=bedding');
  assert(searchRes.status === 200, 'Search by keyword "bedding" returns 200');
  assert(searchRes.data.items?.length > 0, `Search found ${searchRes.data.items?.length} items`);

  // Price range filter
  const priceFilter = await request('GET', '/products?minPrice=1000&maxPrice=10000');
  assert(priceFilter.status === 200, 'Price range filter returns 200');

  // 2. Reviews System
  console.log('\n--- 2. PRODUCT REVIEWS SYSTEM ---');
  const prods = await request('GET', '/products?limit=1');
  const testProd = prods.data.items[0];

  const custEmail = `reviewer_${Date.now()}@test.com`;
  const reviewer = await request('POST', '/auth/register', {
    name: 'Reviewer Guy',
    email: custEmail,
    password: 'Password123',
    phone: '03009876543',
  });
  const reviewerToken = reviewer.data.token;

  // Submit review
  const reviewPost = await request(
    'POST',
    `/products/${testProd.slug}/reviews`,
    { rating: 5, comment: 'Exceptional quality! Super satisfied with this item.' },
    reviewerToken
  );
  assert(reviewPost.status === 200 || reviewPost.status === 201, 'Review submitted successfully');

  // Fetch reviews breakdown
  const reviewGet = await request('GET', `/products/${testProd.slug}/reviews`);
  assert(reviewGet.status === 200, 'Fetched reviews list & breakdown');
  assert(reviewGet.data.reviews && reviewGet.data.reviews.length > 0, 'Review present in list');

  // 3. Guest Order Lookup
  console.log('\n--- 3. GUEST ORDER LOOKUP ---');
  const productColor = testProd.colors?.[0]?.name || '';
  const guestOrderRes = await request('POST', '/orders', {
    items: [{ product: testProd._id, qty: 1, color: productColor }],
    shippingAddress: {
      fullName: 'Lookup Guest',
      line1: 'House 99, Street 1',
      city: 'Karachi',
      phone: '03129998877',
    },
    paymentMethod: 'cod',
    email: 'guest_lookup@test.com',
  });
  assert(guestOrderRes.status === 201, 'Guest order created');
  const guestToken = guestOrderRes.data.guestToken;

  const lookupRes = await request('POST', '/orders/lookup', {
    orderNumber: guestOrderRes.data.orderNumber,
    email: 'guest_lookup@test.com',
  });
  assert(lookupRes.status === 200, 'Guest order looked up by orderNumber and email');
  assert(lookupRes.data.id === guestOrderRes.data._id, 'Lookup returned matching order id');

  // 4. Shop Manager CRUD & Permissions
  console.log('\n--- 4. SHOP MANAGER CREATION & ASSIGNMENT ---');
  const cats = await request('GET', '/categories');
  const firstCatId = cats.data[0]._id;

  const smEmail = `sm_test_${Date.now()}@test.com`;
  const createSM = await request(
    'POST',
    '/shop-managers',
    {
      name: 'Scoped Manager',
      email: smEmail,
      password: 'password123',
      assignedCategories: [firstCatId],
    },
    adminToken
  );
  assert(createSM.status === 201, 'Admin created scoped Shop Manager');
  const newSmId = createSM.data.id;

  // Login as new SM
  const smNewLogin = await request('POST', '/auth/login', { email: smEmail, password: 'password123' });
  assert(smNewLogin.status === 200, 'New Shop Manager logged in successfully');
  const newSmToken = smNewLogin.data.token;

  // New SM tries to create product in assigned category
  const createProdSuccess = await request(
    'POST',
    '/products',
    {
      name: `SM Test Product ${Date.now()}`,
      category: firstCatId,
      price: 2500,
      stock: 20,
      description: '<p>Created by shop manager</p>',
    },
    newSmToken
  );
  assert(createProdSuccess.status === 201, 'Shop Manager created product in assigned category');

  // Delete test SM
  const delSM = await request('DELETE', `/shop-managers/${newSmId}`, null, adminToken);
  assert(delSM.status === 200, 'Admin deleted test shop manager');

  // 5. Contact Messages
  console.log('\n--- 5. CONTACT MESSAGES ---');
  const msgPost = await request('POST', '/messages', {
    name: 'Inquiring User',
    email: 'inquiry@test.com',
    subject: 'Order delivery time inquiry',
    body: 'Hello, what are standard delivery timelines to Multan?',
  });
  assert(msgPost.status === 200 || msgPost.status === 201, 'Contact message sent');

  const msgList = await request('GET', '/messages', null, adminToken);
  assert(msgList.status === 200, 'Admin can view contact messages');

  console.log('\n==============================================');
  console.log(`🏁 EXTENDED TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==============================================');
}

runExtendedTests().catch((err) => {
  console.error('Extended test execution error:', err);
});
