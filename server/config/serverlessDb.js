// Connection helper for serverless (Vercel) invocations.
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cache = (globalThis.__wondercartMySQL ??= { sequelize: null, ready: null });

export function connectServerless() {
  if (cache.sequelize) return cache.ready;

  const dialect = process.env.DB_DIALECT || 'mysql';
  const host = process.env.DB_HOST || '193.203.166.165';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'u813227609_root';
  const pass = process.env.DB_PASS || 'Gateway@12345@4';
  const name = process.env.DB_NAME || 'u813227609_wondercart';

  if (dialect === 'sqlite') {
    const storagePath = path.resolve(__dirname, '..', `${name}.sqlite`);
    cache.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: storagePath,
      logging: false,
    });
  } else {
    if (!name) {
      return Promise.reject(new Error('DB_NAME is not set in environment variables.'));
    }

    cache.sequelize = new Sequelize(name, user, pass, {
      host,
      port,
      dialect: 'mysql',
      logging: false,
      dialectOptions: {
        connectTimeout: 8000,
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 10000,
        idle: 5000,
      },
    });
  }

  cache.ready = (async () => {
    try {
      await cache.sequelize.authenticate();

      const { initModels } = await import('../models/index.js');
      initModels(cache.sequelize);
      await cache.sequelize.sync();

      const { autoSeedIfEmpty } = await import('../utils/autoSeed.js');
      autoSeedIfEmpty().catch(() => {});

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
