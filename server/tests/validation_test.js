import http from 'http';
import { resetAuthRateLimit } from '../middleware/rateLimiter.js';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };
    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch(e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runValidationTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING STRICT SCHEMA VALIDATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} — ${details}`);
      failed++;
    }
  }

  // Clear rate limit counters for local testing
  resetAuthRateLimit('127.0.0.1');
  resetAuthRateLimit('::1');

  // --- 1. AUTH REGISTRATION VALIDATION TESTS ---
  console.log('--- 1. AUTH REGISTRATION VALIDATION TESTS ---');

  // Test 1.1: Missing required fields
  const r1 = await request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    body: { name: 'Test' }
  });
  assert(r1.status === 400 && r1.json?.error === 'Validation Error', 'Rejects missing email/password/phone with 400', JSON.stringify(r1.json));

  // Test 1.2: Invalid email format
  const r2 = await request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    body: { name: 'Test User', email: 'invalid-email-no-at', password: 'Password123', phone: '03001234567' }
  });
  assert(r2.status === 400 && r2.json?.message?.toLowerCase().includes('email'), 'Rejects malformed email with 400', JSON.stringify(r2.json));

  // Test 1.3: Password too short or missing numbers
  const r3 = await request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    body: { name: 'Test User', email: `val_${Date.now()}@example.com`, password: 'short', phone: '03001234567' }
  });
  assert(r3.status === 400 && r3.json?.message?.toLowerCase().includes('password'), 'Rejects weak password with 400', JSON.stringify(r3.json));

  // Test 1.4: Disallowed unknown injected fields
  const r4 = await request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    body: { name: 'Test User', email: `inj_${Date.now()}@example.com`, password: 'Password123', phone: '03001234567', role: 'admin', isAdmin: true }
  });
  assert(r4.status === 400 && r4.json?.message?.includes('Unknown or disallowed property'), 'Rejects malicious injected properties (e.g. role, isAdmin)', JSON.stringify(r4.json));

  // --- 2. ORDER / CHECKOUT VALIDATION TESTS ---
  console.log('\n--- 2. ORDER & CHECKOUT VALIDATION TESTS ---');

  // Test 2.1: Empty items list
  const o1 = await request('http://localhost:5000/api/orders', {
    method: 'POST',
    body: {
      items: [],
      shippingAddress: { fullName: 'Ahmad Khan', line1: '123 Main St', city: 'Lahore', phone: '03001234567' },
      paymentMethod: 'cod'
    }
  });
  assert(o1.status === 400 && o1.json?.message?.includes('items'), 'Rejects empty items array with 400', JSON.stringify(o1.json));

  // Test 2.2: Invalid item quantity (negative or zero)
  const o2 = await request('http://localhost:5000/api/orders', {
    method: 'POST',
    body: {
      items: [{ product: 'some-prod', qty: -5 }],
      shippingAddress: { fullName: 'Ahmad Khan', line1: '123 Main St', city: 'Lahore', phone: '03001234567' },
      paymentMethod: 'cod'
    }
  });
  assert(o2.status === 400 && o2.json?.message?.includes('qty'), 'Rejects negative item quantity with 400', JSON.stringify(o2.json));

  // Test 2.3: Invalid payment method enum
  const o3 = await request('http://localhost:5000/api/orders', {
    method: 'POST',
    body: {
      items: [{ product: 'some-prod', qty: 1 }],
      shippingAddress: { fullName: 'Ahmad Khan', line1: '123 Main St', city: 'Lahore', phone: '03001234567' },
      paymentMethod: 'bitcoin'
    }
  });
  assert(o3.status === 400 && o3.json?.message?.includes('paymentMethod'), 'Rejects invalid paymentMethod enum with 400', JSON.stringify(o3.json));

  // Test 2.4: Malformed phone in shipping address
  const o4 = await request('http://localhost:5000/api/orders', {
    method: 'POST',
    body: {
      items: [{ product: 'some-prod', qty: 1 }],
      shippingAddress: { fullName: 'Ahmad Khan', line1: '123 Main St', city: 'Lahore', phone: 'badphone' },
      paymentMethod: 'cod'
    }
  });
  assert(o4.status === 400 && o4.json?.message?.includes('phone'), 'Rejects malformed shipping phone with 400', JSON.stringify(o4.json));

  // --- 3. PRODUCT REVIEWS VALIDATION TESTS ---
  console.log('\n--- 3. PRODUCT REVIEWS VALIDATION TESTS ---');

  // Register a fresh valid user to test authenticated review endpoint
  const testEmail = `reviewer_${Date.now()}@wondercart.pk`;
  const regUser = await request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    body: { name: 'Reviewer', email: testEmail, password: 'Password123', phone: '03001234567' }
  });
  const token = regUser.json?.token;

  // Test 3.1: Rating out of bounds (e.g. 10 stars)
  const rev1 = await request('http://localhost:5000/api/products/test-slug/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { rating: 10, comment: 'Great product!' }
  });
  assert(rev1.status === 400 && rev1.json?.message?.includes('rating'), 'Rejects rating > 5 with 400', JSON.stringify(rev1.json));

  // Test 3.2: Rating below bounds (e.g. 0 stars)
  const rev2 = await request('http://localhost:5000/api/products/test-slug/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { rating: 0, comment: 'Bad product!' }
  });
  assert(rev2.status === 400 && rev2.json?.message?.includes('rating'), 'Rejects rating < 1 with 400', JSON.stringify(rev2.json));

  // Test 3.3: Comment too short
  const rev3 = await request('http://localhost:5000/api/products/test-slug/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: { rating: 5, comment: 'a' }
  });
  assert(rev3.status === 400 && rev3.json?.message?.includes('comment'), 'Rejects comment shorter than 3 chars with 400', JSON.stringify(rev3.json));

  // --- 4. CONTACT MESSAGE VALIDATION TESTS ---
  console.log('\n--- 4. CONTACT MESSAGE VALIDATION TESTS ---');

  const m1 = await request('http://localhost:5000/api/messages', {
    method: 'POST',
    body: { name: 'Sara', email: 'bad-email', subject: 'Inquiry', message: 'Hello there' }
  });
  assert(m1.status === 400 && m1.json?.message?.includes('email'), 'Rejects invalid contact email with 400', JSON.stringify(m1.json));

  // --- 5. JAZZCASH SETTINGS VALIDATION TESTS ---
  console.log('\n--- 5. JAZZCASH SETTINGS VALIDATION TESTS ---');

  const adminLogin = await request('http://localhost:5000/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@wondercart.pk', password: 'admin12345' }
  });
  const adminToken = adminLogin.json?.token;

  const j1 = await request('http://localhost:5000/api/settings/jazzcash', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { accountTitle: 'Wondercart Store', accountNumber: '123' } // too short
  });
  assert(j1.status === 400 && j1.json?.message?.includes('accountNumber'), 'Rejects too short JazzCash account number with 400', JSON.stringify(j1.json));

  console.log('\n====================================================');
  console.log(`🏁 VALIDATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runValidationTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
