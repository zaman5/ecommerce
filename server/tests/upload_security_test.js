import http from 'http';
import fs from 'fs';
import path from 'path';

function requestMultipart(url, fields, fileField, fileName, fileBuffer, fileMime, token = null) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const parsed = new URL(url);

    const postData = [];

    // Add file
    if (fileField && fileName && fileBuffer) {
      postData.push(Buffer.from(`--${boundary}\r\n`));
      postData.push(Buffer.from(`Content-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\n`));
      postData.push(Buffer.from(`Content-Type: ${fileMime}\r\n\r\n`));
      postData.push(fileBuffer);
      postData.push(Buffer.from('\r\n'));
    }

    postData.push(Buffer.from(`--${boundary}--\r\n`));
    const fullBody = Buffer.concat(postData);

    const headers = {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullBody.length,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname,
      method: 'POST',
      headers,
    }, (res) => {
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
    req.write(fullBody);
    req.end();
  });
}

function requestGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

async function runUploadSecurityTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING FILE UPLOAD SECURITY & VALIDATION TEST SUITE');
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

  // 1. Valid Authentic PNG 1x1 buffer (with proper PNG magic bytes 89 50 4E 47 ...)
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG Signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR Chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);

  // Test 1: Valid payment screenshot upload succeeds
  console.log('--- 1. AUTHENTIC FILE CONTENT VALIDATION ---');
  const u1 = await requestMultipart(
    'http://localhost:5000/api/uploads/payment-screenshot',
    {},
    'image',
    'real_proof.png',
    validPngBuffer,
    'image/png'
  );
  assert(u1.status === 201 && u1.json?.url?.startsWith('/uploads/'), 'Authentic PNG upload accepted with 201', JSON.stringify(u1.json));

  // Test 2: Verify static security headers on uploaded file
  if (u1.json?.url) {
    const s1 = await requestGet(`http://localhost:5000${u1.json.url}`);
    assert(s1.headers['x-content-type-options'] === 'nosniff', 'Uploaded file served with X-Content-Type-Options: nosniff');
    assert(Boolean(s1.headers['content-security-policy']), 'Uploaded file served with Content-Security-Policy header');
  }

  // Test 3: Malicious script masquerading as PNG (MIME spoofing)
  console.log('\n--- 2. FAKE IMAGE CONTENT (MAGIC BYTE VALIDATION) ---');
  const fakePhpBuffer = Buffer.from('<?php phpinfo(); ?> // Not a real image');
  const u2 = await requestMultipart(
    'http://localhost:5000/api/uploads/payment-screenshot',
    {},
    'image',
    'exploit.png',
    fakePhpBuffer,
    'image/png' // Spoofed MIME type
  );
  assert(u2.status === 400 && u2.json?.message?.includes('not a valid image format'), 'Rejects spoofed PHP script disguised as PNG with 400', JSON.stringify(u2.json));

  // Test 4: Disallowed MIME / extension (.exe / .sh)
  console.log('\n--- 3. DISALLOWED EXTENSION / MIME FILTERING ---');
  const exeBuffer = Buffer.from('MZ executable binary payload');
  const u3 = await requestMultipart(
    'http://localhost:5000/api/uploads/payment-screenshot',
    {},
    'image',
    'virus.exe',
    exeBuffer,
    'application/x-msdownload'
  );
  assert(u3.status === 400, 'Rejects disallowed executable with 400', JSON.stringify(u3.json));

  // Test 5: File size limit (>5MB)
  console.log('\n--- 4. FILE SIZE LIMIT ENFORCEMENT ---');
  const oversizeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
  const u4 = await requestMultipart(
    'http://localhost:5000/api/uploads/payment-screenshot',
    {},
    'image',
    'large_photo.jpg',
    oversizeBuffer,
    'image/jpeg'
  );
  assert(u4.status === 400 && u4.json?.message?.includes('5MB'), 'Rejects image exceeding 5MB size limit with 400', JSON.stringify(u4.json));

  console.log('\n====================================================');
  console.log(`🏁 UPLOAD SECURITY TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runUploadSecurityTests().catch(err => {
  console.error('Upload security test execution failed:', err);
  process.exit(1);
});
