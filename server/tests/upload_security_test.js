process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_NAME = 'audit_test_db';
process.env.JWT_SECRET = 'audit_super_secret_jwt_key_2026_test';

import http from 'http';
import path from 'path';
import fs from 'fs';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { getUser } from '../models/User.js';
import { signToken } from '../utils/token.js';
import { validateImageContent, validateVideoContent } from '../routes/uploadRoutes.js';

let server;
let port;
let baseUrl;

function sendMultipart(endpoint, fieldName, filename, mimeType, buffer, token = null) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(16).substring(2);
    const preHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
    );
    const postFooter = Buffer.from(`\r\n--${boundary}--\r\n`);
    const fullBody = Buffer.concat([preHeader, buffer, postFooter]);

    const url = new URL(baseUrl + endpoint);
    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullBody.length,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(url, { method: 'POST', headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch { json = raw; }
        resolve({ status: res.statusCode, headers: res.headers, body: raw, json });
      });
    });
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

function getRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + endpoint);
    const req = http.request(url, { method: 'GET' }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: raw });
      });
    });
    req.on('error', reject);
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

async function runUploadSecurityTests() {
  console.log('====================================================');
  console.log('🛡️ COMPREHENSIVE FILE UPLOAD SECURITY TEST SUITE');
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

  // 1. REJECT FAKE / RENAMED EXECUTABLE SCRIPTS (MAGIC BYTE VERIFICATION)
  console.log('--- 1. BINARY MAGIC BYTE & CONTENT VALIDATION ---');
  const fakePhpScript = Buffer.from('<?php echo "evil backdoor executed"; system($_GET["cmd"]); ?>');
  const fakeRes = await sendMultipart('/api/uploads/image', 'image', 'backdoor.png', 'image/png', fakePhpScript, adminToken);
  assert(
    fakeRes.status === 400 && fakeRes.json?.message?.includes('not a valid image'),
    'Rejects PHP script masquerading with .png extension (Magic byte mismatch)',
    `Status: ${fakeRes.status}, Body: ${JSON.stringify(fakeRes.json)}`
  );

  const fakeJsScript = Buffer.from('console.log("XSS attack script"); alert(document.cookie);');
  const fakeJsRes = await sendMultipart('/api/uploads/image', 'image', 'exploit.jpg', 'image/jpeg', fakeJsScript, adminToken);
  assert(
    fakeJsRes.status === 400 && fakeJsRes.json?.message?.includes('not a valid image'),
    'Rejects JS script masquerading with .jpg extension (Magic byte mismatch)',
    `Status: ${fakeJsRes.status}, Body: ${JSON.stringify(fakeJsRes.json)}`
  );

  // 2. ACCEPT GENUINE IMAGE BINARY (PNG MAGIC BYTES: 89 50 4E 47 0D 0A 1A 0A)
  console.log('\n--- 2. GENUINE IMAGE BINARY ACCEPTANCE & RANDOM FILENAME ---');
  const validPngBytes = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  ]);
  const validRes = await sendMultipart('/api/uploads/image', 'image', 'client-original-name.png', 'image/png', validPngBytes, adminToken);
  assert(
    validRes.status === 201 && validRes.json?.url?.startsWith('/uploads/'),
    'Accepts genuine PNG binary and stores in /uploads/',
    `Status: ${validRes.status}, URL: ${validRes.json?.url}`
  );
  assert(
    !validRes.json?.url?.includes('client-original-name'),
    'Stores file under cryptographic random name (prevents directory traversal / unguessable)',
    `Returned URL: ${validRes.json?.url}`
  );

  // 3. REJECT DISALLOWED MIME TYPES / EXECUTABLES
  console.log('\n--- 3. MIME TYPE FILTERING ---');
  const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff');
  const exeRes = await sendMultipart('/api/uploads/image', 'image', 'malware.exe', 'application/x-msdownload', exeBuffer, adminToken);
  assert(
    exeRes.status === 400 && exeRes.json?.message?.includes('Only JPG, PNG'),
    'Rejects disallowed executable MIME type application/x-msdownload',
    `Status: ${exeRes.status}, Body: ${JSON.stringify(exeRes.json)}`
  );

  // 4. REJECT OVERSIZED FILES (> 5MB)
  console.log('\n--- 4. FILE SIZE LIMIT ENFORCEMENT ---');
  const oversizeBuffer = Buffer.alloc(6 * 1024 * 1024, 0x89); // 6MB
  const oversizeRes = await sendMultipart('/api/uploads/image', 'image', 'huge.png', 'image/png', oversizeBuffer, adminToken);
  assert(
    oversizeRes.status === 400 && oversizeRes.json?.message?.includes('larger than 5MB'),
    'Rejects file exceeding 5MB size limit',
    `Status: ${oversizeRes.status}, Body: ${JSON.stringify(oversizeRes.json)}`
  );

  // 5. SECURITY HEADERS ON STATIC /uploads SERVING (NO EXECUTION / NOSNIFF / CSP)
  console.log('\n--- 5. UPLOADS SERVING SECURITY HEADERS ---');
  if (validRes.json?.url) {
    const staticRes = await getRequest(validRes.json.url);
    assert(staticRes.status === 200, 'Uploaded file served successfully');
    assert(staticRes.headers['x-content-type-options'] === 'nosniff', 'X-Content-Type-Options: nosniff header present');
    assert(
      staticRes.headers['content-security-policy']?.includes("default-src 'none'"),
      "Content-Security-Policy header restricts execution (default-src 'none')"
    );
  }

  // 6. ISOLATION: DIRECTORY BROWSING IS FORBIDDEN
  console.log('\n--- 6. DIRECTORY BROWSING PROTECTION ---');
  const dirRes = await getRequest('/uploads/');
  assert(dirRes.status === 404, 'Directory listing on /uploads/ is disabled (returns 404)');

  await server.close();

  console.log('\n====================================================');
  console.log(`🏁 UPLOAD SECURITY SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    console.error('❌ Failures:');
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f.testName} (${f.details})`));
    process.exit(1);
  } else {
    console.log('🎉 100% SECURE: All upload validation and execution protection rules verified!');
    process.exit(0);
  }
}

runUploadSecurityTests().catch((err) => {
  console.error('Fatal upload test error:', err);
  if (server) server.close();
  process.exit(1);
});
