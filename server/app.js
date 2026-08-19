import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

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
import { notFound, errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The Express app is built here (and exported) so tests can mount it with
// supertest without opening a port. server.js owns the DB connect + listen.
export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*' }));
  app.use(express.json({ limit: '2mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

  // Uploaded product photos. Served from disk, which works for a normal Node
  // host but NOT on a serverless platform like Vercel, where the filesystem is
  // ephemeral — move to Cloudinary/S3 before deploying there.
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

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
  // Angular 17 with the "application" builder outputs to dist/<name>/browser/
  const clientDist = path.join(__dirname, '..', 'client', 'dist', 'wondercart-client', 'browser');
  app.use(express.static(clientDist, { maxAge: '7d' }));

  // SPA fallback: any non-API route returns index.html so Angular Router works
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'), (err) => {
      if (err) next(); // fall through to notFound if file doesn't exist
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;

