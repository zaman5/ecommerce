import { Router } from 'express';
import { getProduct as getProductModel } from '../models/Product.js';
import { getCategory as getCategoryModel } from '../models/Category.js';
import { publicRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getBaseUrl(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/+$/, '');
  }
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  return `${protocol}://${host}`;
}

// GET /sitemap.xml or /api/sitemap.xml
export async function getSitemapXml(req, res) {
  try {
    const Product = getProductModel();
    const Category = getCategoryModel();
    const baseUrl = getBaseUrl(req);
    const now = new Date().toISOString();

    const staticRoutes = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/shop`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/about`, priority: '0.5', changefreq: 'monthly' },
      { loc: `${baseUrl}/contact`, priority: '0.6', changefreq: 'monthly' },
      { loc: `${baseUrl}/faq`, priority: '0.6', changefreq: 'weekly' },
      { loc: `${baseUrl}/privacy`, priority: '0.3', changefreq: 'yearly' },
      { loc: `${baseUrl}/terms`, priority: '0.3', changefreq: 'yearly' },
      { loc: `${baseUrl}/returns`, priority: '0.4', changefreq: 'monthly' },
    ];

    let categories = [];
    if (Category) {
      categories = await Category.findAll({
        attributes: ['slug', 'name', 'updatedAt'],
        raw: true,
      });
    }

    let products = [];
    if (Product) {
      products = await Product.findAll({
        where: { isActive: true },
        attributes: ['slug', 'name', 'images', 'updatedAt'],
        raw: true,
      });
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    // Static pages
    for (const page of staticRoutes) {
      xml += `  <url>
    <loc>${escapeXml(page.loc)}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    // Category pages
    for (const cat of categories) {
      const catUrl = `${baseUrl}/shop?category=${encodeURIComponent(cat.slug)}`;
      const catDate = cat.updatedAt ? new Date(cat.updatedAt).toISOString() : now;
      xml += `  <url>
    <loc>${escapeXml(catUrl)}</loc>
    <lastmod>${catDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
    }

    // Product pages
    for (const prod of products) {
      const prodUrl = `${baseUrl}/product/${encodeURIComponent(prod.slug)}`;
      const prodDate = prod.updatedAt ? new Date(prod.updatedAt).toISOString() : now;
      
      let imgXml = '';
      let images = [];
      try {
        images = typeof prod.images === 'string' ? JSON.parse(prod.images) : (prod.images || []);
      } catch (e) {
        images = [];
      }

      if (Array.isArray(images)) {
        for (const img of images.slice(0, 5)) {
          if (!img) continue;
          const fullImgUrl = img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
          imgXml += `    <image:image>
      <image:loc>${escapeXml(fullImgUrl)}</image:loc>
      <image:title>${escapeXml(prod.name)}</image:title>
    </image:image>
`;
        }
      }

      xml += `  <url>
    <loc>${escapeXml(prodUrl)}</loc>
    <lastmod>${prodDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
${imgXml}  </url>
`;
    }

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(xml);
  } catch (err) {
    console.error('Error generating sitemap:', err);
    res.status(500).type('text/plain').send('Error generating sitemap.xml');
  }
}

// GET /robots.txt
export function getRobotsTxt(req, res) {
  const baseUrl = getBaseUrl(req);
  const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /
Allow: /shop
Allow: /product/
Allow: /about
Allow: /contact
Allow: /faq
Allow: /privacy
Allow: /terms
Allow: /returns
Allow: /uploads/
Allow: /assets/
Allow: /sitemap.xml
Allow: /api/sitemap.xml

Disallow: /admin/
Disallow: /admin/*
Disallow: /shop-manager/
Disallow: /shop-manager/*
Disallow: /checkout
Disallow: /account/
Disallow: /account/*
Disallow: /api/auth/
Disallow: /api/admin/
Disallow: /api/orders/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  return res.send(robots);
}

router.get('/sitemap.xml', publicRateLimiter, getSitemapXml);
router.get('/robots.txt', publicRateLimiter, getRobotsTxt);

export default router;
