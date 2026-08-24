import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getSequelize } from './config/db.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import flashSaleRoutes from './routes/flashSaleRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import shopManagerRoutes from './routes/shopManagerRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import uploadRoutes, { UPLOAD_DIR } from './routes/uploadRoutes.js';
import compression from 'compression';
import { notFound, errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(compression());
  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*' }));
  app.use(express.json({ limit: '2mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', async (req, res) => {
    const sequelize = getSequelize();
    let isConnected = false;
    if (sequelize) {
      try {
        await sequelize.authenticate();
        isConnected = true;
      } catch {
        isConnected = false;
      }
    }
    res.json({
      status: 'ok',
      time: new Date(),
      database: {
        status: isConnected ? 'connected' : 'disconnected',
        connected: isConnected,
        dialect: 'mysql',
        database: process.env.DB_NAME || 'wondercart',
      },
    });
  });

  // Remote database seed endpoint (can be called via browser or API)
  app.all('/api/seed', async (req, res) => {
    try {
      const { populateFullDatabase } = await import('./utils/autoSeed.js');
      await populateFullDatabase();
      res.json({
        success: true,
        message: 'Database populated with all products, categories, colors, banners, and admin accounts!',
      });
    } catch (err) {
      console.error('[Database Seed Error]', err);
      res.status(500).json({ success: false, message: 'Database initialization failed. Please check server logs.' });
    }
  });

  app.use(
    '/uploads',
    express.static(UPLOAD_DIR, {
      maxAge: '7d',
      index: false,
      dotfiles: 'ignore',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; media-src 'self'; img-src 'self'; style-src 'unsafe-inline'");
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/banners', bannerRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/flash-sale', flashSaleRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/shop-managers', shopManagerRoutes);
  app.use('/api/settings', settingRoutes);
  app.use('/api/email-templates', emailRoutes);
  app.use('/api/uploads', uploadRoutes);

  // ── Serve Angular frontend in production ──
  function getClientDist() {
    const possibleDistPaths = [
      path.join(process.cwd(), 'client', 'dist', 'wondercart-client', 'browser'),
      path.join(process.cwd(), 'client', 'dist', 'wondercart-client'),
      path.join(process.cwd(), 'dist', 'wondercart-client', 'browser'),
      path.join(process.cwd(), 'dist', 'wondercart-client'),
      path.join(process.cwd(), 'dist', 'browser'),
      path.join(process.cwd(), 'dist'),
      path.join(__dirname, '..', 'client', 'dist', 'wondercart-client', 'browser'),
      path.join(__dirname, '..', 'client', 'dist', 'wondercart-client'),
      path.join(__dirname, '..', 'dist', 'wondercart-client', 'browser'),
      path.join(__dirname, '..', 'dist', 'wondercart-client'),
      path.join(__dirname, '..', 'dist', 'browser'),
      path.join(__dirname, '..', 'dist'),
    ];
    return possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];
  }

  const clientDist = getClientDist();

  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else if (/\.(js|css|woff2?|png|jpe?g|gif|svg|ico)$/i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // SPA fallback ONLY for HTML navigation routes (do NOT serve index.html for missing .js/.css/.json files!)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
    // If request has a file extension (e.g. .js, .css, .ico, .png), do NOT serve index.html
    if (/\.[a-zA-Z0-9]+$/.test(req.path)) {
      return res.status(404).type('text/plain').send('Not found');
    }
    const currentDist = getClientDist();
    const indexPath = path.join(currentDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(indexPath);
    }
    next();
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
