import http from 'http';
import fs from 'fs';
import path from 'path';

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

async function runVideoTests() {
  console.log('==============================================');
  console.log('🎥 RUNNING PRODUCT VIDEO FEATURE TEST SUITE');
  console.log('==============================================\n');

  // Admin login
  const adminLogin = await request('POST', '/auth/login', { email: 'admin@wondercart.pk', password: 'admin12345' });
  const adminToken = adminLogin.data.token;

  // 1. Upload Video File
  console.log('--- 1. VIDEO UPLOAD ENDPOINT ---');
  const dummyVideo = Buffer.from('FAKE_MP4_VIDEO_HEADER_AND_STREAM_DATA_FOR_TESTING');
  const uploadRes = await uploadMultipart(
    '/uploads/video',
    'video',
    'demo_product_video.mp4',
    dummyVideo,
    'video/mp4',
    adminToken
  );
  assert(uploadRes.status === 201, 'POST /api/uploads/video successfully uploaded video');
  assert(uploadRes.data.url && uploadRes.data.url.startsWith('/uploads/vid-'), `Uploaded video URL: ${uploadRes.data.url}`);
  const uploadedVideoUrl = uploadRes.data.url;

  // 2. Create Product with Video
  console.log('\n--- 2. CREATE PRODUCT WITH VIDEO ---');
  const cats = await request('GET', '/categories');
  const catId = cats.data[0]._id;

  const newProdRes = await request(
    'POST',
    '/products',
    {
      name: `Video Demo Product ${Date.now()}`,
      category: catId,
      price: 3499,
      stock: 15,
      description: '<p>Includes HD demonstration video</p>',
      images: ['https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80'],
      video: uploadedVideoUrl,
    },
    adminToken
  );
  assert(newProdRes.status === 201, 'Created product with video field');
  assert(newProdRes.data.video === uploadedVideoUrl, 'Product record contains video URL');
  const prodSlug = newProdRes.data.slug;

  // 3. Fetch Product Detail from Storefront
  console.log('\n--- 3. STOREFRONT FETCH WITH VIDEO ---');
  const storeRes = await request('GET', `/products/${prodSlug}`);
  assert(storeRes.status === 200, 'GET /products/:slug returns 200');
  assert(storeRes.data.video === uploadedVideoUrl, 'Storefront API returned product video property');

  // 4. Update Product Video
  console.log('\n--- 4. UPDATE PRODUCT VIDEO ---');
  const updatedVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
  const updateRes = await request(
    'PUT',
    `/products/${newProdRes.data._id}`,
    {
      video: updatedVideoUrl,
    },
    adminToken
  );
  assert(updateRes.status === 200, 'PUT /products/:id updated video URL');
  assert(updateRes.data.video === updatedVideoUrl, 'Updated video verified');

  // 5. Cleanup
  console.log('\n--- 5. CLEANUP ---');
  const delRes = await request('DELETE', `/products/${newProdRes.data._id}`, null, adminToken);
  assert(delRes.status === 200, 'Test product deleted successfully');

  console.log('\n==============================================');
  console.log(`🏁 VIDEO TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('==============================================');
}

runVideoTests().catch((err) => {
  console.error('Video test suite error:', err);
});
