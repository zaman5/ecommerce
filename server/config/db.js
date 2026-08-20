import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import { autoSeedIfEmpty } from '../utils/autoSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sequelize = null;

export function getSequelize() {
  return sequelize;
}

export async function connectDB(options = {}) {
  const dialect = process.env.DB_DIALECT || 'mysql';
  const host = process.env.DB_HOST || 'localhost';
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
      });
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
      await sequelize.authenticate();
      console.log(`✅ MySQL connected: ${host}:${port}/${name}`);
    }

    // Import and initialise all models + associations
    const { initModels } = await import('../models/index.js');
    initModels(sequelize);

    // Sync tables
    await sequelize.sync();
    console.log('✅ Database tables synced.');

    // Auto-seed if database has no categories (unless skipped by manual seeders)
    if (!options.skipAutoSeed && !process.env.SKIP_AUTO_SEED) {
      autoSeedIfEmpty().catch((e) => console.warn('Auto-seed warning:', e.message));
    }

    return sequelize;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('👉 Tip: For MySQL, check DB_HOST, DB_USER, DB_PASS, DB_NAME and make sure MySQL is running.');
    return null;
  }
}
