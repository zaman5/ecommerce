import http from 'http';
import { rateLimitConfig } from '../config/rateLimitConfig.js';
import { resetAuthRateLimit } from '../middleware/rateLimiter.js';

const BASE = 'http://localhost:5000/api';

function request(method, reqPath, body = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + reqPath);
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

    const data = body ? JSON.stringify(body) : null;
    if (data) reqHeaders['Content-Length'] = Buffer.byteLength(data);

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  console.log('===============================================================');
  console.log('🛡️  TESTING TIERED RATE LIMITING & EXPONENTIAL BACKOFF ON AUTH');
  console.log('===============================================================\n');

  // 1. Configuration Verification
  console.log('--- 1. CONFIGURABLE THRESHOLDS VERIFICATION ---');
  assert(typeof rateLimitConfig.public.windowMs === 'number', 'Public windowMs is configurable number');
  assert(typeof rateLimitConfig.public.max === 'number', 'Public max limit is configurable number');
  assert(typeof rateLimitConfig.authenticated.max === 'number', 'Authenticated max limit is configurable number');
  assert(typeof rateLimitConfig.auth.ipMax === 'number', 'Auth IP max limit is configurable number');
  assert(typeof rateLimitConfig.auth.accountMax === 'number', 'Auth account max limit is configurable number');
  assert(typeof rateLimitConfig.auth.failuresBeforeBackoff === 'number', 'Auth failuresBeforeBackoff is configurable number');
  assert(typeof rateLimitConfig.auth.backoffBaseMs === 'number', 'Auth backoffBaseMs is configurable number');
  assert(typeof rateLimitConfig.auth.backoffFactor === 'number', 'Auth backoffFactor is configurable number');
  assert(typeof rateLimitConfig.auth.backoffMaxMs === 'number', 'Auth backoffMaxMs is configurable number');
  assert(typeof rateLimitConfig.passwordReset.max === 'number', 'Password reset max is configurable number');

  // 2. Moderate Public Endpoint Limits & Standard Headers
  console.log('\n--- 2. MODERATE PUBLIC ENDPOINT LIMITS & HEADERS ---');
  const pubRes = await request('GET', '/products');
  assert(pubRes.status === 200, 'Public GET /products returned 200');
  assert(pubRes.headers['x-ratelimit-limit'] !== undefined, 'Contains X-RateLimit-Limit header');
  assert(pubRes.headers['x-ratelimit-remaining'] !== undefined, 'Contains X-RateLimit-Remaining header');
  assert(pubRes.headers['x-ratelimit-reset'] !== undefined, 'Contains X-RateLimit-Reset header');

  // 3. Looser Authenticated Limits
  console.log('\n--- 3. LOOSER AUTHENTICATED USER LIMITS ---');
  const loginRes = await request('POST', '/auth/login', { email: 'admin@wondercart.pk', password: 'admin12345' });
  assert(loginRes.status === 200, 'Admin authenticated successfully');
  const adminToken = loginRes.data.token;

  const authProfileRes = await request('GET', '/auth/me', null, adminToken);
  assert(authProfileRes.status === 200, 'Authenticated GET /auth/me returned 200');
  assert(authProfileRes.headers['x-ratelimit-limit'] !== undefined, 'Contains Authenticated limit header');

  // 4. Stricter Auth Routes: Exponential Backoff progression
  console.log('\n--- 4. STRICTER AUTH ROUTES: EXPONENTIAL BACKOFF ---');
  const testEmail = `backoff_test_${Date.now()}@wondercart.pk`;
  const testIp = '198.51.100.42'; // Simulated client IP

  resetAuthRateLimit(testIp, testEmail);

  // Send 3 consecutive wrong login attempts
  for (let i = 1; i <= rateLimitConfig.auth.failuresBeforeBackoff; i++) {
    const wrongRes = await request(
      'POST',
      '/auth/login',
      { email: testEmail, password: 'wrongpassword' },
      null,
      { 'x-forwarded-for': testIp }
    );
    assert(wrongRes.status === 401, `Attempt ${i} rejected with 401 (recorded failure ${i})`);
  }

  // 4th attempt should immediately trigger Exponential Backoff (429) rather than a permanent lockout
  const backoffRes1 = await request(
    'POST',
    '/auth/login',
    { email: testEmail, password: 'wrongpassword' },
    null,
    { 'x-forwarded-for': testIp }
  );
  assert(backoffRes1.status === 429, '4th failed attempt triggered 429 Too Many Requests (Exponential Backoff)');
  assert(backoffRes1.data.type === 'exponential_backoff', 'Response type confirmed as "exponential_backoff"');
  assert(backoffRes1.headers['retry-after'] !== undefined, 'Includes standard Retry-After header');
  assert(backoffRes1.headers['x-ratelimit-backoff-delay'] !== undefined, 'Includes X-RateLimit-Backoff-Delay header');

  const waitTimeSec = Number(backoffRes1.headers['retry-after']) || 1;
  console.log(`  ⏳ Waiting ${waitTimeSec + 0.2}s for backoff window to expire...`);
  await sleep((waitTimeSec + 0.2) * 1000);

  // After waiting, the request is allowed through again
  const afterWaitRes = await request(
    'POST',
    '/auth/login',
    { email: testEmail, password: 'wrongpassword' },
    null,
    { 'x-forwarded-for': testIp }
  );
  assert(afterWaitRes.status === 401, 'Request accepted after backoff cooldown elapsed (non-permanent lockout verified)');

  // 5. Successful Authentication Immediately Resets Failure Counters
  console.log('\n--- 5. IMMEDIATE RESET UPON SUCCESSFUL AUTHENTICATION ---');
  // Register a test user
  const regEmail = `reset_test_${Date.now()}@wondercart.pk`;
  const regRes = await request('POST', '/auth/register', {
    name: 'Reset Test',
    email: regEmail,
    password: 'ValidPassword123',
    phone: '03001234567',
  });
  assert(regRes.status === 201, 'Test user registered');

  // Trigger 3 failed attempts
  for (let i = 1; i <= rateLimitConfig.auth.failuresBeforeBackoff; i++) {
    await request('POST', '/auth/login', { email: regEmail, password: 'wrongpassword' });
  }

  // Wait for the 1s backoff cooldown to elapse
  await sleep(1200);

  // Now perform a valid login with correct password
  const successfulLogin = await request('POST', '/auth/login', {
    email: regEmail,
    password: 'ValidPassword123',
  });
  assert(successfulLogin.status === 200, 'User successfully logged in with valid password');

  // Immediately perform another action / login without waiting - failure counter was reset to 0 upon success
  const subsequentLogin = await request('POST', '/auth/login', {
    email: regEmail,
    password: 'ValidPassword123',
  });
  assert(subsequentLogin.status === 200, 'Subsequent login succeeded immediately with zero backoff delay');

  // 6. Strictest Password Reset Rate Limiting
  console.log('\n--- 6. PASSWORD RESET RATE LIMITING ---');
  const forgotRes = await request('POST', '/auth/forgot-password', {
    email: 'admin@wondercart.pk',
  });
  assert(forgotRes.status === 200, 'POST /auth/forgot-password returned 200 with generic confirmation');
  assert(forgotRes.headers['x-ratelimit-limit'] !== undefined, 'Password reset includes strict rate limit headers');

  console.log('\n===============================================================');
  console.log(`🏁 RATE LIMITING TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
