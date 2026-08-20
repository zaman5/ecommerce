import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from multiple potential locations
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'server', '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

import { connectDB } from './config/db.js';
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 5000;

// Start server immediately
const server = app.listen(PORT, () => {
  console.log(`🚀 Wondercart Server running on port ${PORT}`);
});

// Connect to MySQL asynchronously
connectDB().catch((err) => {
  console.error('Initial MySQL connection error:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
