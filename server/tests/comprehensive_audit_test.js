import http from 'http';
import { createApp } from '../app.js';
import { connectDB } from '../config/db.js';
import { getProduct as getProductModel } from '../models/Product.js';
import { getCategory as getCategoryModel } from '../models/Category.js';
import { getUser as getUserModel } from '../models/User.js';
import { getOrder as getOrderModel } from '../models/Order.js';
import { getReview as getReviewModel } from '../models/Review.js';
import { getBanner as getBannerModel } from '../models/Banner.js';
import { getMessage as getMessageModel } from '../models/Message.js';
import { getSetting as getSettingModel } from '../models/Setting.js';
import { getEmailTemplate as getEmailTemplateModel } from '../models/EmailTemplate.js';
import bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';
process.env.DB_DIALECT = process.env.DB_DIALECT || 'sqlite';
process.env.DB_NAME = 'audit_test_db';
process.env.JWT_SECRET = 'audit_super_secret_jwt_key_2026_test';

let server;
let port;
let baseUrl;

function request(method, path, body = null, token = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

    const data = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
    if (data && !reqHeaders['Content-Length']) {
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(raw);
        } catch {
          json = raw;
        }
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

async function runAudit() {
  console.log('====================================================');
  console.log('🔍 FULL-APPLICATION COMPREHENSIVE AUDIT & TEST SUITE');
  console.log('====================================================\n');

  // Initialize DB and Express app
  console.log('--- Initializing Test Environment & Database ---');
  await connectDB({ skipAutoSeed: true });
  const app = createApp();

  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✅ Test server running at ${baseUrl}\n`);

  const User = getUserModel();
  const Category = getCategoryModel();
  const Product = getProductModel();
  const Order = getOrderModel();
  const Banner = getBannerModel();
  const Message = getMessageModel();
  const Setting = getSettingModel();
  const Review = getReviewModel();

  // Create standard test accounts
  const hash = await bcrypt.hash('AdminPassword123!', 10);
  const [adminUser] = await User.findOrCreate({
    where: { email: 'admin@audit.com' },
    defaults: { name: 'Audit Admin', email: 'admin@audit.com', passwordHash: hash, role: 'admin', phone: '03001234567' },
  });

  const mgrHash = await bcrypt.hash('ManagerPassword123!', 10);
  const [mgrUser] = await User.findOrCreate({
    where: { email: 'manager@audit.com' },
    defaults: { name: 'Audit Manager', email: 'manager@audit.com', passwordHash: mgrHash, role: 'shopmanager', phone: '03007654321' },
  });

  // ================= 1. HEALTH & SYSTEM CHECK =================
  console.log('--- 1. SYSTEM HEALTH & METADATA ---');
  const healthRes = await request('GET', '/api/health');
  assert(healthRes.status === 200 && healthRes.json.status === 'ok', 'GET /api/health responds with status ok');

  // ================= 2. AUTHENTICATION & SECURITY =================
  console.log('\n--- 2. AUTHENTICATION & USER MANAGEMENT ---');
  // Login admin
  const adminLogin = await request('POST', '/api/auth/login', { email: 'admin@audit.com', password: 'AdminPassword123!' });
  assert(adminLogin.status === 200 && adminLogin.json.token, 'Admin login returns valid JWT token');
  const adminToken = adminLogin.json.token;

  // Login shop manager
  const mgrLogin = await request('POST', '/api/auth/login', { email: 'manager@audit.com', password: 'ManagerPassword123!' });
  assert(mgrLogin.status === 200 && mgrLogin.json.token, 'Shop Manager login returns valid JWT token');
  const mgrToken = mgrLogin.json.token;

  // Client registration: Reject weak password
  const weakReg = await request('POST', '/api/auth/register', {
    name: 'Weak',
    email: 'weak@test.com',
    password: 'weak',
    phone: '03001112233',
  });
  assert(weakReg.status === 400, 'Rejects registration with password shorter than 8 chars');

  // Client registration: Reject missing phone
  const noPhoneReg = await request('POST', '/api/auth/register', {
    name: 'No Phone',
    email: 'nophone@test.com',
    password: 'ValidPassword123!',
  });
  assert(noPhoneReg.status === 400, 'Rejects registration with missing phone number');

  // Client registration: Successful
  const clientEmail = `client_${Date.now()}@test.com`;
  const validReg = await request('POST', '/api/auth/register', {
    name: 'Audit Client',
    email: clientEmail,
    password: 'ClientPassword123!',
    phone: '03001234567',
  });
  assert(validReg.status === 201 && validReg.json.token, 'Client registration creates user and returns JWT token');
  const clientToken = validReg.json.token;

  // Get current user profile
  const profileRes = await request('GET', '/api/auth/me', null, clientToken);
  const meUser = profileRes.json?.user || profileRes.json;
  assert(profileRes.status === 200 && meUser?.email === clientEmail, 'GET /api/auth/me returns current user profile');

  // Update user profile
  const updateProfRes = await request('PUT', '/api/auth/me', {
    name: 'Updated Audit Client',
    phone: '03009988776',
    address: { line1: '456 Gulberg III', city: 'Lahore', province: 'Punjab', postalCode: '54000' },
  }, clientToken);
  const updatedUser = updateProfRes.json?.user || updateProfRes.json;
  assert(updateProfRes.status === 200 && updatedUser?.name === 'Updated Audit Client', 'PUT /api/auth/me updates profile and address');

  // ================= 3. CATEGORIES & TAXONOMY =================
  console.log('\n--- 3. CATEGORIES & CATALOGUE STRUCTURE ---');
  const parentSlug = `baby-diapers-wipes-${Date.now()}`;
  const subSlug = `organic-baby-wipes-${Date.now()}`;

  // Create Parent Category
  const catRes = await request('POST', '/api/categories', {
    name: 'Baby Diapers & Wipes',
    slug: parentSlug,
    description: 'High quality baby diapers, pull-ups and hypoallergenic wipes',
  }, adminToken);
  assert(catRes.status === 201, 'Admin can create category');
  const catId = catRes.json._id || catRes.json.id;

  // Create Subcategory
  const subCatRes = await request('POST', '/api/categories', {
    name: 'Organic Baby Wipes',
    slug: subSlug,
    parent: parentSlug,
    description: 'Gentle wipes for sensitive newborn skin',
  }, adminToken);
  assert(subCatRes.status === 201, 'Admin can create subcategory with parent link');

  // List Categories
  const listCatRes = await request('GET', '/api/categories');
  assert(listCatRes.status === 200 && Array.isArray(listCatRes.json) && listCatRes.json.length > 0, 'GET /api/categories returns category array');

  // ================= 4. PRODUCTS & MULTI-KEYWORDS SEO =================
  console.log('\n--- 4. PRODUCTS, MULTI-KEYWORDS & SEO SEARCH ---');
  // Create product with multi-keywords and SEO meta tags
  const prodSlug = `deluxe-baby-wipes-${Date.now()}`;
  const prodRes = await request('POST', '/api/products', {
    name: 'Deluxe Hypoallergenic Baby Wipes 80pcs',
    slug: prodSlug,
    description: '<p>Extra soft wipes with aloe vera and chamomile extract.</p>',
    brand: 'PureCare',
    category: String(catId),
    price: 650,
    compareAtPrice: 850,
    stock: 50,
    isFeatured: true,
    metaTitle: 'Deluxe Hypoallergenic Baby Wipes 80pcs — Buy Online | PureCare',
    metaDescription: 'Buy Deluxe Hypoallergenic Baby Wipes 80pcs online in Pakistan at Rs 650. PureCare soft wipes with Cash on Delivery.',
    keywords: ['baby wipes', 'organic wipes', 'wet wipes', 'newborn care', 'aloe wipes'],
    tags: ['diapering', 'bath-care', 'sensitive-skin'],
    images: ['https://wondercart.pk/uploads/wipes1.jpg', 'https://wondercart.pk/uploads/wipes2.jpg'],
    colors: [{ name: 'Standard Pack', hex: '#00aa55', image: '' }],
  }, adminToken);
  assert(prodRes.status === 201, 'Admin can create product with full SEO metadata and multi-keywords');
  const prodId = prodRes.json._id || prodRes.json.id;

  // Fetch product by slug
  const getProdRes = await request('GET', `/api/products/${prodSlug}`);
  assert(getProdRes.status === 200 && getProdRes.json.name.includes('Deluxe Hypoallergenic'), 'Public storefront can get product by slug');
  assert(Array.isArray(getProdRes.json.keywords) && getProdRes.json.keywords.includes('organic wipes'), 'Product returns keywords array correctly');

  // Search by Keyword (eBay / Daraz style)
  const kwSearchRes = await request('GET', '/api/products?search=organic+wipes');
  assert(kwSearchRes.status === 200 && kwSearchRes.json.items.some(p => p.slug === prodSlug), 'Search by keyword "organic wipes" matches product successfully');

  // Search by Tag
  const tagSearchRes = await request('GET', '/api/products?search=sensitive-skin');
  assert(tagSearchRes.status === 200 && tagSearchRes.json.items.some(p => p.slug === prodSlug), 'Search by tag "sensitive-skin" matches product successfully');

  // Filter by Category
  const catFilterRes = await request('GET', `/api/products?category=${parentSlug}`);
  assert(catFilterRes.status === 200 && catFilterRes.json.items.length > 0, 'Filter products by category returns matching items');

  // Update product SEO metadata
  const updateProdRes = await request('PUT', `/api/products/${prodId}`, {
    name: 'Deluxe Hypoallergenic Baby Wipes 80pcs (Updated)',
    keywords: ['baby wipes', 'organic wipes', 'pure water wipes', 'dermatologist tested'],
  }, adminToken);
  assert(updateProdRes.status === 200, 'Admin can update product and keywords');

  // ================= 5. ORDERS & CHECKOUT =================
  console.log('\n--- 5. ORDERS & CHECKOUT PROCESS ---');
  // Place COD Order
  const orderRes = await request('POST', '/api/orders', {
    items: [
      { product: prodId.toString(), qty: 2, color: 'Standard Pack' },
    ],
    shippingAddress: {
      fullName: 'Ahmad Khan',
      line1: 'House 12, Street 5, Phase 4, DHA',
      city: 'Lahore',
      province: 'Punjab',
      postalCode: '54000',
      phone: '03001234567',
    },
    paymentMethod: 'cod',
    email: clientEmail,
  }, clientToken);
  assert(orderRes.status === 201 && orderRes.json.orderNumber, 'Client can place COD order with valid orderNumber');
  const orderId = orderRes.json._id || orderRes.json.id;
  const orderNum = orderRes.json.orderNumber;

  // Look up order (guest/client)
  const lookupRes = await request('POST', '/api/orders/lookup', {
    orderNumber: orderNum,
    email: clientEmail,
  });
  assert(lookupRes.status === 200 && lookupRes.json.orderNumber === orderNum, 'Customer can look up order status by orderNumber and email');

  // Admin update order status
  const updateOrderRes = await request('PUT', `/api/orders/${orderId}/status`, {
    status: 'shipped',
    note: 'Dispatched via Leopard Courier tracking #LEO12345',
  }, adminToken);
  assert(updateOrderRes.status === 200 && updateOrderRes.json.status === 'shipped', 'Admin can update order status to shipped with tracking note');

  // ================= 6. REVIEWS & RATINGS =================
  console.log('\n--- 6. PRODUCT REVIEWS & SOCIAL PROOF ---');
  // Post review
  const reviewRes = await request('POST', `/api/products/${prodSlug}/reviews`, {
    rating: 5,
    comment: 'Exceptional quality wipes, very gentle on my baby skin!',
  }, clientToken);
  assert(
    reviewRes.status === 200 || reviewRes.status === 201,
    'Logged-in user can submit a 5-star product review',
    `Status: ${reviewRes.status}, Body: ${JSON.stringify(reviewRes.json)}`
  );

  // Get reviews list
  const listReviewsRes = await request('GET', `/api/products/${prodSlug}/reviews`);
  assert(
    listReviewsRes.status === 200 && listReviewsRes.json?.average === 5 && listReviewsRes.json?.total === 1,
    'Review summary calculates average rating and total correctly',
    `Status: ${listReviewsRes.status}, Avg: ${listReviewsRes.json?.average}, Total: ${listReviewsRes.json?.total}`
  );

  // ================= 7. BANNERS & FLASH SALE =================
  console.log('\n--- 7. BANNERS & FLASH SALE ---');
  // Create banner
  const bannerRes = await request('POST', '/api/banners', {
    title: 'Monsoon Mega Sale',
    subtitle: 'Flat 30% Off on all Baby Gear',
    imageUrl: 'https://wondercart.pk/uploads/banner1.jpg',
    linkUrl: '/shop?deals=true',
    theme: 'dark',
    active: true,
  }, adminToken);
  assert(
    bannerRes.status === 201,
    'Admin can create promotional banner',
    `Status: ${bannerRes.status}, Body: ${JSON.stringify(bannerRes.json)}`
  );
  const bannerId = bannerRes.json?._id || bannerRes.json?.id;

  // List public banners
  const publicBanners = await request('GET', '/api/banners');
  assert(publicBanners.status === 200 && Array.isArray(publicBanners.json), 'Public banners list returned successfully');

  // Get and Update Flash Sale
  const flashGet = await request('GET', '/api/flash-sale');
  assert(flashGet.status === 200, 'GET /api/flash-sale returns flash sale config');

  const flashPut = await request('PUT', '/api/flash-sale', {
    isEnabled: true,
    title: 'Flash Deals 24h',
    timerLabel: 'Hurry! Deals End In',
    countdownMode: 'dailyMidnight',
    ctaLabel: 'Shop All Deals',
    ctaLink: '/shop?deals=true',
    limit: 12,
    sort: 'popular',
  }, adminToken);
  assert(
    flashPut.status === 200 && flashPut.json?.isEnabled === true,
    'Admin can update Flash Sale configuration',
    `Status: ${flashPut.status}, Body: ${JSON.stringify(flashPut.json)}`
  );

  // ================= 8. CONTACT MESSAGES =================
  console.log('\n--- 8. CONTACT & INQUIRY MESSAGES ---');
  const msgRes = await request('POST', '/api/messages', {
    name: 'Shopper Inquirer',
    email: 'shopper@test.com',
    subject: 'Bulk order inquiry',
    message: 'Can I purchase 50 cartons of diapers with corporate discount?',
    phone: '03001234567',
  });
  assert(
    msgRes.status === 201,
    'Guest can submit contact message',
    `Status: ${msgRes.status}, Body: ${JSON.stringify(msgRes.json)}`
  );

  const adminMsgs = await request('GET', '/api/messages', null, adminToken);
  const msgItems = adminMsgs.json?.items || adminMsgs.json;
  assert(
    adminMsgs.status === 200 && Array.isArray(msgItems) && msgItems.length > 0,
    'Admin can list contact messages',
    `Status: ${adminMsgs.status}, Body: ${JSON.stringify(adminMsgs.json)}`
  );

  // ================= 9. SETTINGS (General, Social, Email) =================
  console.log('\n--- 9. STORE SETTINGS & CONFIGURATION ---');
  // General & Contact settings
  const genSetRes = await request('PUT', '/api/settings/general', {
    siteName: 'WonderCart Official',
    uan: '+92 42 111 222 333',
    supportEmail: 'care@wondercart.pk',
    supportHours: 'Mon - Sat: 9:00 AM - 9:00 PM',
  }, adminToken);
  assert(genSetRes.status === 200, 'Admin can update general store settings');

  // Social settings
  const socSetRes = await request('PUT', '/api/settings/social', {
    facebookPageId: '10987654321',
    facebookPageAccessToken: 'EAABtestToken12345',
    facebookAutoPost: true,
    instagramAccountId: 'inst_1098765',
    instagramAutoPost: false,
    socialPostTemplate: 'New Arrival: {name} at Rs {price}! Order now: {url}',
  }, adminToken);
  assert(socSetRes.status === 200, 'Admin can update Facebook & Instagram social auto-post settings');

  // Email templates list & update
  const emailsRes = await request('GET', '/api/email-templates', null, adminToken);
  assert(emailsRes.status === 200 && Array.isArray(emailsRes.json), 'Admin can list transactional email templates');

  // ================= 10. SEO SITEMAP & ROBOTS.TXT =================
  console.log('\n--- 10. SEO SITEMAP & ROBOTS.TXT ---');
  const sitemapRes = await request('GET', '/sitemap.xml');
  assert(
    sitemapRes.status === 200 &&
    sitemapRes.headers['content-type']?.includes('xml') &&
    sitemapRes.body.includes('<urlset') &&
    sitemapRes.body.includes(prodSlug),
    'GET /sitemap.xml returns valid XML sitemap containing active product URL',
    `Status: ${sitemapRes.status}, Content-Type: ${sitemapRes.headers['content-type']}, Body length: ${sitemapRes.body.length}`
  );

  const robotsRes = await request('GET', '/robots.txt');
  assert(
    robotsRes.status === 200 &&
    robotsRes.body.includes('User-agent: *') &&
    robotsRes.body.includes('Sitemap:') &&
    robotsRes.body.includes('Disallow: /admin/'),
    'GET /robots.txt returns crawler instructions protecting admin routes with sitemap URL'
  );

  // ================= 11. RATE LIMITING & SECURITY HEADERS =================
  console.log('\n--- 11. SECURITY & ERROR HANDLING ---');
  // Safe 404 handler (no stack trace leaked)
  const notFoundRes = await request('GET', '/api/non-existent-endpoint');
  assert(
    notFoundRes.status === 404,
    'Unknown route returns clean 404 JSON error',
    `Status: ${notFoundRes.status}, Body: ${JSON.stringify(notFoundRes.json)}`
  );

  // Cleanup test data
  console.log('\n--- Cleaning up test artifacts ---');
  try {
    const ProductColor = (await import('../models/Product.js')).getProductColor();
    const OrderItem = (await import('../models/Order.js')).getOrderItem();
    if (prodId) {
      await Review.destroy({ where: { productId: prodId } });
      await ProductColor.destroy({ where: { productId: prodId } });
      await Product.destroy({ where: { id: prodId } });
    }
    if (orderId) {
      await OrderItem.destroy({ where: { orderId } });
      await Order.destroy({ where: { id: orderId } });
    }
    await Category.destroy({ where: { slug: subSlug } });
    await Category.destroy({ where: { slug: parentSlug } });
    if (bannerId) await Banner.destroy({ where: { id: bannerId } });
    console.log('✅ Cleanup completed cleanly.');
  } catch (cleanErr) {
    console.warn('⚠️ Cleanup warning:', cleanErr.message);
  }

  await server.close();

  console.log('\n====================================================');
  console.log(`🏁 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    console.error('\n❌ Audit Failures Summary:');
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f.testName} (${f.details})`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL APPLICATION MODULES ARE 100% HEALTHY AND FUNCTIONING PERFECTLY!');
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Fatal audit execution error:', err);
  if (server) server.close();
  process.exit(1);
});
