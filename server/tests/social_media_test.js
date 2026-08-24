import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
const envPaths = [
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

import { connectDB } from '../config/db.js';
import { createApp } from '../app.js';

let PORT = 5055;
let BASE = `http://localhost:${PORT}/api`;

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

async function runTests() {
  console.log('🚀 Booting server and connecting database for test...\n');
  await connectDB();
  const app = createApp();

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  console.log(`📡 Test server listening on port ${PORT}\n`);
  console.log('🧪 Starting Facebook & Instagram Social Integration Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // 1. Admin Login
    console.log('1️⃣ Authenticating as Admin...');
    const loginRes = await request('POST', '/auth/login', {
      email: 'admin@wondercart.pk',
      password: 'admin12345',
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Admin login succeeds and returns token');
    const adminToken = loginRes.data.token;

    // 2. Fetch Initial Social Settings
    console.log('\n2️⃣ Testing GET /api/settings/social...');
    const getRes = await request('GET', '/settings/social', null, adminToken);
    assert(getRes.status === 200, 'GET /settings/social returns 200 OK');
    assert('facebookPageId' in getRes.data, 'Response includes facebookPageId field');
    assert('facebookAutoPost' in getRes.data, 'Response includes facebookAutoPost field');
    assert('socialPostTemplate' in getRes.data, 'Response includes socialPostTemplate field');

    // 3. Update Social Settings
    console.log('\n3️⃣ Testing PUT /api/settings/social...');
    const updateRes = await request(
      'PUT',
      '/settings/social',
      {
        facebookPageId: '104829104928172',
        facebookPageAccessToken: 'EAABtest_sample_token_wondercart',
        facebookAutoPost: true,
        instagramAccountId: '17841400000000000',
        instagramAutoPost: false,
        socialPostTemplate: '✨ {product_name} ✨\nPrice: Rs {price}\n{discount_text}\nShop now: {product_url}',
      },
      adminToken
    );
    assert(updateRes.status === 200, 'PUT /settings/social returns 200 OK');
    assert(updateRes.data.facebookPageId === '104829104928172', 'facebookPageId correctly saved');
    assert(updateRes.data.facebookAutoPost === true, 'facebookAutoPost correctly set to true');
    assert(updateRes.data.isConfigured === true, 'isConfigured is true when pageId and token are set');

    // 4. Test Social Connection endpoint (with invalid/mock token)
    console.log('\n4️⃣ Testing POST /api/settings/social/test...');
    const testConnRes = await request(
      'POST',
      '/settings/social/test',
      {
        facebookPageId: '104829104928172',
        facebookPageAccessToken: 'EAABinvalid_test_token',
      },
      adminToken
    );
    // Graph API will return 400 with helpful error message
    assert(testConnRes.status === 400, 'POST /settings/social/test handles invalid Meta token properly');
    assert(testConnRes.data.success === false, 'Test connection returns success: false for invalid token');
    assert(typeof testConnRes.data.message === 'string', 'Test connection returns human-readable error message');

    // 5. Test Product Creation with Facebook & Instagram checkboxes
    console.log('\n5️⃣ Testing Product Creation with Social Auto-Post payload...');
    const catsRes = await request('GET', '/categories');
    const categoryId = catsRes.data?.[0]?.id || catsRes.data?.[0]?._id || 1;
    const testName = `Test Social Baby Romper ${Date.now()}`;

    const newProdRes = await request(
      'POST',
      '/products',
      {
        name: testName,
        description: '<p>Super cute and soft baby cotton romper.</p>',
        brand: 'WonderCart Baby',
        categoryId,
        price: 1500,
        compareAtPrice: 2000,
        stock: 25,
        images: ['https://images.unsplash.com/photo-1522771930-78848d9293e8'],
        colors: [{ name: 'Sky Blue', hex: '#0ea5e9' }],
        postToFacebook: true,
        postToInstagram: false,
        socialCustomMessage: 'Special launch! Test Social Baby Romper now in stock!',
      },
      adminToken
    );
    assert(newProdRes.status === 201, 'POST /products with postToFacebook succeeds (201 Created)');
    assert(newProdRes.data.id || newProdRes.data._id, 'Product created with valid ID');
    const createdProductId = newProdRes.data.id || newProdRes.data._id;

    // 6. Test Manual On-Demand Social Share (POST /api/products/:id/share-social)
    console.log('\n6️⃣ Testing POST /api/products/:id/share-social...');
    const shareRes = await request(
      'POST',
      `/products/${createdProductId}/share-social`,
      {
        postToFacebook: true,
        postToInstagram: false,
        customMessage: 'On demand share test for Test Social Baby Romper',
      },
      adminToken
    );
    assert(shareRes.status === 400 || shareRes.status === 200, 'POST /products/:id/share-social processes request properly');
    assert('results' in shareRes.data || 'message' in shareRes.data, 'Response includes operation results or message');

    // 7. Cleanup created test product
    console.log('\n7️⃣ Cleaning up test product...');
    const delRes = await request('DELETE', `/products/${createdProductId}`, null, adminToken);
    assert(delRes.status === 200, 'Test product deleted successfully');

    console.log(`\n========================================`);
    console.log(`🎉 Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
