import http from 'http';

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

async function runErrorHandlingTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING ERROR HANDLING & INFORMATION LEAK TEST SUITE');
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

  function hasLeak(text) {
    if (!text) return false;
    const str = String(text);
    return (
      str.includes('node_modules') ||
      str.includes('.js:') ||
      str.includes('C:\\') ||
      str.includes('/var/') ||
      str.includes('/home/') ||
      str.includes('at Function.') ||
      str.includes('at Module.') ||
      str.includes('SequelizeDatabaseError') ||
      str.includes('SQLSTATE') ||
      /\bSELECT\b.*\bFROM\b/i.test(str)
    );
  }

  // --- 1. 404 NOT FOUND TEST ---
  console.log('--- 1. 404 NOT FOUND SANITIZATION ---');
  const r1 = await request('http://localhost:5000/api/nonexistent-route-xyz');
  assert(r1.status === 404, 'Returns HTTP 404 for nonexistent route');
  assert(!hasLeak(r1.body), 'No stack trace or internal path in 404 body', r1.body);

  // --- 2. MALFORMED JSON BODY TEST ---
  console.log('\n--- 2. MALFORMED JSON BODY TEST ---');
  const r2 = await request('http://localhost:5000/api/auth/login', {
    method: 'POST',
    body: '{"invalid_json: 123'
  });
  assert(r2.status === 400, 'Returns HTTP 400 for malformed JSON');
  assert(!hasLeak(r2.body), 'No stack trace or parser path in JSON error body', r2.body);

  // --- 3. CONFLICT / DUPLICATE REGISTRATION TEST ---
  console.log('\n--- 3. CONFLICT (409) ERROR SANITIZATION ---');
  const r3 = await request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Admin Duplicate',
      email: 'admin@wondercart.pk',
      password: 'Password123',
      phone: '03001234567'
    }
  });
  assert(r3.status === 409, 'Returns HTTP 409 for duplicate email');
  assert(!hasLeak(r3.body), 'No database index or SQL query exposed in 409 response', r3.body);

  // --- 4. INVALID PRODUCT ID FORMAT TEST ---
  console.log('\n--- 4. INVALID ID / NOT FOUND ERROR SANITIZATION ---');
  const r4 = await request('http://localhost:5000/api/products/non-existent-product-slug-999');
  assert(r4.status === 404, 'Returns HTTP 404 for unknown product');
  assert(!hasLeak(r4.body), 'No database query or stack trace in 404 product response', r4.body);

  console.log('\n====================================================');
  console.log(`🏁 ERROR HANDLING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runErrorHandlingTests().catch(err => {
  console.error('Error handling test execution failed:', err);
  process.exit(1);
});
