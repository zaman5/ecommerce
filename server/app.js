import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { notFound, errorHandler } from './middleware/error.js';

// The Express app is built here (and exported) so tests can mount it with
// supertest without opening a port. server.js owns the DB connect + listen.
export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || '*' }));
  app.use(express.json({ limit: '2mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/analytics', analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export default createApp;
