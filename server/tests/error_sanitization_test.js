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

function request(method, path, body = null, token = null, rawHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const reqHeaders = { 'Content-Type': 'application/json', ...rawHeaders };
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

async function runErrorSanitizationTests() {
  console.log('====================================================');
  console.log('🔒 ERROR HANDLING & INFORMATION LEAKAGE TEST SUITE');
  console.log('====================================================\n');

  process.env.DB_STORAGE = path.join(process.cwd(), 'audit_test_db.sqlite');
  await connectDB();
  
  // Create an express instance with errorHandler attached
  const express = (await import('express')).default;
  const { notFound, errorHandler } = await import('../middleware/error.js');
  
  const testApp = express();
  testApp.use(express.json());
  
  testApp.get('/api/test-internal-error', (req, res, next) => {
    const err = new Error('Database disk fault at C:\\Users\\Administrator\\secret\\db.sqlite: row corrupted in SELECT * FROM sensitive_table');
    next(err);
  });
  
  testApp.post('/api/test-db-error', (req, res, next) => {
    const { DatabaseError } = require ? {} : {};
    const err = new Error('SQLITE_ERROR: no such table: internal_secret_table');
    err.name = 'SequelizeDatabaseError';
    next(err);
  });

  testApp.use(notFound);
  testApp.use(errorHandler);

  server = testApp.listen(0);
  port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✅ Test server running on ${baseUrl}\n`);

  // 1. UNHANDLED 500 ERROR SANITIZATION
  console.log('--- 1. INTERNAL SERVER ERROR SANITIZATION ---');
  const errRes = await request('GET', '/api/test-internal-error');
  console.log('Response body:', errRes.body);

  assert(errRes.status === 500, 'Internal error returns HTTP 500 status');
  assert(!errRes.body.includes('stack'), 'Response does NOT contain "stack" property');
  assert(!errRes.body.includes('C:\\Users'), 'Response does NOT leak Windows internal filesystem paths');
  assert(!errRes.body.includes('SELECT * FROM'), 'Response does NOT leak internal SQL query syntax');
  assert(errRes.json?.message === 'An unexpected server error occurred. Please try again later.', 'Response returns generic user-facing message');

  // 2. MALFORMED JSON BODY ERROR
  console.log('\n--- 2. MALFORMED JSON BODY SANITIZATION ---');
  const jsonErrRes = await request('POST', '/api/auth/login', '{ invalid_json_syntax: [');
  assert(jsonErrRes.status === 400, 'Malformed JSON body returns HTTP 400 Bad Request');
  assert(jsonErrRes.json?.message === 'Invalid JSON payload in request body.', 'Returns clean JSON error message');
  assert(!jsonErrRes.body.includes('at JSON.parse'), 'No V8 JSON parser stack traces leaked');

  // 3. UNKNOWN ROUTE 404 SANITIZATION
  console.log('\n--- 3. 404 NOT FOUND SANITIZATION ---');
  const notFoundRes = await request('GET', '/api/routes/that/do/not/exist');
  assert(notFoundRes.status === 404, 'Unknown route returns HTTP 404 Not Found');
  assert(notFoundRes.json?.error === 'Not Found', 'Returns structured JSON error');
  assert(!notFoundRes.body.includes('Cannot GET'), 'Does not leak default Express HTML stack page');

  await server.close();

  console.log('\n====================================================');
  console.log(`🏁 ERROR SANITIZATION TEST COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    console.error('❌ Failures:');
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f.testName} (${f.details})`));
    process.exit(1);
  } else {
    console.log('🎉 ZERO LEAKS: All client responses are clean and properly sanitized!');
    process.exit(0);
  }
}

runErrorSanitizationTests().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});
