// Connection helper for serverless (Vercel) invocations.
//
// Replaces the old mongoose-based helper. Uses a cached Sequelize instance so
// the pool is reused across warm invocations.
import { Sequelize } from 'sequelize';

const cache = (globalThis.__wondercartMySQL ??= { sequelize: null, ready: null });

export function connectServerless() {
  if (cache.sequelize) return cache.ready;

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const pass = process.env.DB_PASS || '';
  const name = process.env.DB_NAME || 'wondercart';

  if (!name) {
    return Promise.reject(new Error('DB_NAME is not set in the Vercel project environment variables.'));
  }

  cache.sequelize = new Sequelize(name, user, pass, {
    host,
    port,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 8000,
      idle: 5000,
    },
  });

  cache.ready = (async () => {
    try {
      await cache.sequelize.authenticate();

      const { initModels } = await import('../models/index.js');
      initModels(cache.sequelize);
      await cache.sequelize.sync();

      return cache.sequelize;
    } catch (err) {
      cache.sequelize = null;
      cache.ready = null;
      throw err;
    }
  })();

  return cache.ready;
}

export function getSequelize() {
  return cache.sequelize;
}
