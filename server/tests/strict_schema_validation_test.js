process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = 'audit_test_db';
process.env.JWT_SECRET = 'audit_super_secret_jwt_key_2026_test';

import http from 'http';
import path from 'path';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { getUser } from '../models/User.js';
import { signToken } from '../utils/token.js';

let server;
let port;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const reqHeaders = { 'Content-Type': 'application/json' };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    if (data) reqHeaders['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { json = raw; }
        resolve({ status: res.statusCode, headers: res.headers, body: raw, json });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} -> ${details}`);
    failed++;
    failures.push({ testName, details });
  }
}

async function runValidationTests() {
  console.log('====================================================');
  console.log('🛡️ STRICT INPUT SCHEMA VALIDATION TEST SUITE');
  console.log('====================================================\n');

  process.env.DB_STORAGE = path.join(process.cwd(), 'audit_test_db.sqlite');
  await connectDB();
  const app = createApp();
  server = app.listen(0);
  port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✅ Test server running on ${baseUrl}\n`);

  const User = getUser();
  let adminUser = await User.findOne({ where: { email: 'admin@wondercart.pk' } });
  if (!adminUser) {
    adminUser = User.build({ name: 'Super Admin', email: 'admin@wondercart.pk', phone: '03001234567', role: 'admin' });
    await adminUser.setPassword('admin12345');
    await adminUser.save();
  }
  const adminToken = signToken(adminUser);

  // 1. REJECT INVALID TYPES
  console.log('--- 1. TYPE VALIDATION & REJECTION ---');
  // Stock as string instead of integer
  const typeRes1 = await request('POST', '/api/products', {
    name: 'Test Product',
    price: 150,
    stock: 'one hundred', // Invalid type: string instead of integer
    categoryId: '1',
  }, adminToken);
  assert(
    typeRes1.status === 400 && typeRes1.json?.details?.some((d) => d.includes('must be a valid integer')),
    'Rejects string passed where integer is required (stock)',
    `Status: ${typeRes1.status}, Details: ${JSON.stringify(typeRes1.json?.details)}`
  );

  // Price as boolean
  const typeRes2 = await request('POST', '/api/products', {
    name: 'Test Product',
    price: true, // Invalid type: boolean instead of number
    stock: 50,
    categoryId: '1',
  }, adminToken);
  assert(
    typeRes2.status === 400 && typeRes2.json?.details?.some((d) => d.includes('must be a valid number')),
    'Rejects boolean passed where number is required (price)',
    `Status: ${typeRes2.status}, Details: ${JSON.stringify(typeRes2.json?.details)}`
  );

  // Colors as string instead of array
  const typeRes3 = await request('POST', '/api/products', {
    name: 'Test Product',
    price: 150,
    stock: 50,
    categoryId: '1',
    colors: 'Red, Blue, Green', // Invalid type: string instead of array
  }, adminToken);
  assert(
    typeRes3.status === 400 && typeRes3.json?.details?.some((d) => d.includes('must be an array')),
    'Rejects string passed where array is required (colors)',
    `Status: ${typeRes3.status}, Details: ${JSON.stringify(typeRes3.json?.details)}`
  );

  // 2. REJECT INVALID LENGTHS (MIN & MAX BOUNDS)
  console.log('\n--- 2. LENGTH & RANGE BOUNDS VALIDATION ---');
  // Registration with name too short
  const lenRes1 = await request('POST', '/api/auth/register', {
    name: 'A', // minLength is 2
    email: 'valid.user@test.com',
    password: 'password123',
    phone: '03001234567',
  });
  assert(
    lenRes1.status === 400 && lenRes1.json?.details?.some((d) => d.includes('at least 2 characters')),
    'Rejects string shorter than minLength (name < 2 chars)',
    `Status: ${lenRes1.status}, Details: ${JSON.stringify(lenRes1.json?.details)}`
  );

  // Review with rating > 5
  const lenRes2 = await request('POST', '/api/products/deluxe-hypoallergenic-baby-wipes/reviews', {
    rating: 6, // max is 5
    comment: 'Too high rating test',
  }, adminToken);
  assert(
    lenRes2.status === 400 && lenRes2.json?.details?.some((d) => d.includes('cannot exceed 5')),
    'Rejects numeric value exceeding maximum bound (rating > 5)',
    `Status: ${lenRes2.status}, Details: ${JSON.stringify(lenRes2.json?.details)}`
  );

  // Empty cart / empty items array
  const lenRes3 = await request('POST', '/api/orders', {
    items: [], // minItems is 1
    shippingAddress: {
      fullName: 'John Doe',
      line1: '123 Main Street',
      city: 'Lahore',
      phone: '03001234567',
    },
    paymentMethod: 'cod',
  }, adminToken);
  assert(
    lenRes3.status === 400 && lenRes3.json?.details?.some((d) => d.includes('at least 1 item')),
    'Rejects empty array where minItems >= 1 is required (items: [])',
    `Status: ${lenRes3.status}, Details: ${JSON.stringify(lenRes3.json?.details)}`
  );

  // 3. REJECT INVALID FORMATS (REGEX PATTERNS & ENUMS)
  console.log('\n--- 3. FORMAT & REGEX PATTERN VALIDATION ---');
  // Invalid email format
  const fmtRes1 = await request('POST', '/api/auth/register', {
    name: 'Valid Name',
    email: 'not-an-email-at-all', // Fails EMAIL regex
    password: 'password123',
    phone: '03001234567',
  });
  assert(
    fmtRes1.status === 400 && fmtRes1.json?.details?.some((d) => d.includes('valid email address')),
    'Rejects invalid email format against strict RFC pattern',
    `Status: ${fmtRes1.status}, Details: ${JSON.stringify(fmtRes1.json?.details)}`
  );

  // Invalid phone format
  const fmtRes2 = await request('POST', '/api/auth/register', {
    name: 'Valid Name',
    email: 'valid_email@test.com',
    password: 'password123',
    phone: 'abc-no-digits', // Fails PHONE regex
  });
  assert(
    fmtRes2.status === 400 && fmtRes2.json?.details?.some((d) => d.includes('valid phone number')),
    'Rejects invalid phone number format against strict pattern',
    `Status: ${fmtRes2.status}, Details: ${JSON.stringify(fmtRes2.json?.details)}`
  );

  // Password missing numbers
  const fmtRes3 = await request('POST', '/api/auth/register', {
    name: 'Valid Name',
    email: 'valid_email2@test.com',
    password: 'onlylettersnopassword', // Fails PASSWORD regex (no numbers)
    phone: '03001234567',
  });
  assert(
    fmtRes3.status === 400 && fmtRes3.json?.details?.some((d) => d.includes('contain both letters and numbers')),
    'Rejects weak password lacking alphanumeric mix against strict pattern',
    `Status: ${fmtRes3.status}, Details: ${JSON.stringify(fmtRes3.json?.details)}`
  );

  // Invalid enum value on payment method
  const fmtRes4 = await request('POST', '/api/orders', {
    items: [{ product: '1', qty: 1 }],
    shippingAddress: {
      fullName: 'John Doe',
      line1: '123 Main Street',
      city: 'Lahore',
      phone: '03001234567',
    },
    paymentMethod: 'bitcoin_unsupported', // Invalid enum (only 'cod', 'jazzcash' allowed)
  }, adminToken);
  assert(
    fmtRes4.status === 400 && fmtRes4.json?.details?.some((d) => d.includes('must be one of: cod, jazzcash')),
    'Rejects disallowed enum choice (paymentMethod: bitcoin_unsupported)',
    `Status: ${fmtRes4.status}, Details: ${JSON.stringify(fmtRes4.json?.details)}`
  );

  // 4. REJECT UNKNOWN / DISALLOWED INJECTED PROPERTIES (STRICT MODE)
  console.log('\n--- 4. STRICT UNKNOWN PROPERTY REJECTION ---');
  // Attempting to inject role escalation in registration
  const strictRes1 = await request('POST', '/api/auth/register', {
    name: 'Attacker',
    email: 'attacker@test.com',
    password: 'password123',
    phone: '03001234567',
    role: 'admin', // Disallowed/unknown in registerSchema
    isAdmin: true,
  });
  assert(
    strictRes1.status === 400 && strictRes1.json?.details?.some((d) => d.includes("disallowed property: 'role'")),
    'Strict schema rejects unknown/injected properties (role escalation attempt)',
    `Status: ${strictRes1.status}, Details: ${JSON.stringify(strictRes1.json?.details)}`
  );

  // Attempting to inject arbitrary fields in order checkout
  const strictRes2 = await request('POST', '/api/orders', {
    items: [{ product: '1', qty: 1 }],
    shippingAddress: {
      fullName: 'John Doe',
      line1: '123 Main Street',
      city: 'Lahore',
      phone: '03001234567',
      overrideDiscount: 99.9, // Injected unknown property
    },
    paymentMethod: 'cod',
  }, adminToken);
  assert(
    strictRes2.status === 400 && strictRes2.json?.details?.some((d) => d.includes('disallowed property')),
    'Strict schema rejects nested disallowed properties in shippingAddress',
    `Status: ${strictRes2.status}, Details: ${JSON.stringify(strictRes2.json?.details)}`
  );

  // 5. QUERY PARAMETERS STRICT BOUNDS & TYPE CHECKS
  console.log('\n--- 5. QUERY PARAMETERS VALIDATION ---');
  // Invalid sort enum in query
  const queryRes1 = await request('GET', '/api/products?sort=hacked_sort_order');
  assert(
    queryRes1.status === 400 && queryRes1.json?.details?.some((d) => d.includes('must be one of: newest')),
    'Rejects invalid sort enum in GET /api/products query',
    `Status: ${queryRes1.status}, Details: ${JSON.stringify(queryRes1.json?.details)}`
  );

  // Negative minPrice in query
  const queryRes2 = await request('GET', '/api/products?minPrice=-50');
  assert(
    queryRes2.status === 400 && queryRes2.json?.details?.some((d) => d.includes('must be at least 0')),
    'Rejects out-of-bound negative numbers in GET /api/products query',
    `Status: ${queryRes2.status}, Details: ${JSON.stringify(queryRes2.json?.details)}`
  );

  await server.close();

  console.log('\n====================================================');
  console.log(`🏁 STRICT VALIDATION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    console.error('❌ Validation Failures:');
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f.testName} (${f.details})`));
    process.exit(1);
  } else {
    console.log('🎉 ALL INPUTS ARE STRICTLY VALIDATED AND REJECTED ACCORDING TO SCHEMA SPECIFICATIONS!');
    process.exit(0);
  }
}

runValidationTests().catch((err) => {
  console.error('Fatal validation test error:', err);
  if (server) server.close();
  process.exit(1);
});
