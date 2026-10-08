import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoSeedIfEmpty } from '../utils/autoSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sequelize = null;
let lastDbError = null;

export function getSequelize() {
  return sequelize;
}

export function getLastDbError() {
  return lastDbError;
}

export async function connectDB(options = {}) {
  const dialect = process.env.DB_DIALECT || 'mysql';
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const pass = process.env.DB_PASS || '';
  const name = process.env.DB_NAME || 'wondercart';

  try {
    if (dialect === 'sqlite') {
      const storagePath = path.resolve(__dirname, '..', `${name}.sqlite`);
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: storagePath,
        logging: false,
        retry: {
          max: 5,
        },
        pool: {
          max: 1,
          idle: 10000,
        },
      });
      await sequelize.query('PRAGMA journal_mode = WAL;');
      await sequelize.query('PRAGMA busy_timeout = 5000;');
      console.log(`✅ SQLite connected: ${storagePath}`);
    } else {
      // MySQL
      try {
        const mysql = (await import('mysql2/promise')).default;
        const connection = await mysql.createConnection({
          host,
          port,
          user,
          password: pass,
        });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await connection.end();
      } catch (dbCreateErr) {
        // Warning if connection check fails
      }

      sequelize = new Sequelize(name, user, pass, {
        host,
        port,
        dialect: 'mysql',
        logging: false,
        dialectOptions: {
          connectTimeout: 8000,
        },
        pool: {
          max: 10,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      });
      try {
        await sequelize.authenticate();
        console.log(`✅ MySQL connected: ${host}:${port}/${name}`);
      } catch (mysqlAuthErr) {
        console.warn(`⚠️ MySQL connection failed (${mysqlAuthErr.message}). Falling back to SQLite so the application stays online.`);
        const storagePath = path.resolve(__dirname, '..', `${name}.sqlite`);
        sequelize = new Sequelize({
          dialect: 'sqlite',
          storage: storagePath,
          logging: false,
          retry: { max: 5 },
          pool: { max: 1, idle: 10000 },
        });
        await sequelize.query('PRAGMA journal_mode = WAL;');
        await sequelize.query('PRAGMA busy_timeout = 5000;');
        console.log(`✅ SQLite fallback connected: ${storagePath}`);
      }
    }

    // Import and initialise all models + associations
    const { initModels } = await import('../models/index.js');
    initModels(sequelize);

    // Sync tables safely
    try {
      await sequelize.sync();
      console.log('✅ Database tables synced.');
    } catch (syncErr) {
      console.warn('Sync notice (non-fatal):', syncErr.message);
    }

    // Ensure all model columns exist safely (if running MySQL or SQLite)
    const alterQueries = [
      "ALTER TABLE `products` ADD COLUMN `meta_title` VARCHAR(500) DEFAULT ''",
      "ALTER TABLE `products` ADD COLUMN `meta_description` TEXT",
      "ALTER TABLE `products` ADD COLUMN `keywords` JSON",
      "ALTER TABLE `products` ADD COLUMN `tags` JSON",
      "ALTER TABLE `products` ADD COLUMN `additional_categories` JSON",
      "ALTER TABLE `products` ADD COLUMN `video` VARCHAR(1000) DEFAULT ''",
      "ALTER TABLE `products` ADD COLUMN `cost_price` DECIMAL(12, 2) DEFAULT 0",
      "ALTER TABLE `products` ADD COLUMN `sku` VARCHAR(100) DEFAULT ''",
      "ALTER TABLE `products` ADD COLUMN `barcode` VARCHAR(100) DEFAULT ''",
      "ALTER TABLE `products` ADD COLUMN `badge` VARCHAR(100) DEFAULT ''",
      "ALTER TABLE `products` ADD COLUMN `rich_description` LONGTEXT",
      "ALTER TABLE `categories` ADD COLUMN `parent_id` INT UNSIGNED DEFAULT NULL",
      "ALTER TABLE `messages` ADD COLUMN `image_url` VARCHAR(500) DEFAULT ''",
      "ALTER TABLE `settings` ADD COLUMN `facebook_url` VARCHAR(1000) DEFAULT 'https://facebook.com'",
      "ALTER TABLE `settings` ADD COLUMN `instagram_url` VARCHAR(1000) DEFAULT 'https://instagram.com'",
      "ALTER TABLE `settings` ADD COLUMN `facebook_app_id` VARCHAR(100) DEFAULT '970580869378166'",
      "ALTER TABLE `settings` ADD COLUMN `facebook_app_secret` VARCHAR(255) DEFAULT ''",
      "ALTER TABLE `settings` ADD COLUMN `facebook_page_name` VARCHAR(255) DEFAULT ''",
      "ALTER TABLE `settings` ADD COLUMN `instagram_username` VARCHAR(255) DEFAULT ''",
    ];
    for (const q of alterQueries) {
      try {
        await sequelize.query(q);
      } catch (colErr) {
        // Column probably already exists, safe to ignore
      }
    }

    // Auto-seed if database has no categories (unless skipped by manual seeders)
    if (!options.skipAutoSeed && !process.env.SKIP_AUTO_SEED) {
      autoSeedIfEmpty().catch((e) => console.warn('Auto-seed warning:', e.message));
    }

    return sequelize;
  } catch (err) {
    lastDbError = err.message || String(err);
    console.error('❌ Database initialization failed:', err.message);
    try {
      const storagePath = path.resolve(__dirname, '..', `wondercart.sqlite`);
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: storagePath,
        logging: false,
      });
      const { initModels } = await import('../models/index.js');
      initModels(sequelize);
      await sequelize.sync();
      if (!options.skipAutoSeed && !process.env.SKIP_AUTO_SEED) {
        autoSeedIfEmpty().catch(() => {});
      }
      return sequelize;
    } catch (fallbackErr) {
      console.error('❌ Critical SQLite fallback error:', fallbackErr.message);
      return null;
    }
  }
}
