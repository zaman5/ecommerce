import 'dotenv/config';
import { connectDB } from './config/db.js';
import { createApp } from './app.js';

const app = createApp();
const PORT = process.env.PORT || 5000;

// Start server immediately so reverse proxy (Hostinger/cPanel/LiteSpeed) does not 503
const server = app.listen(PORT, () => {
  console.log(`🚀 Wondercart Server running on port ${PORT}`);
});

// Connect to MongoDB asynchronously
const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  connectDB(mongoUri).catch((err) => {
    console.error('Initial MongoDB connection error:', err.message);
  });
} else {
  console.warn('⚠️ MONGO_URI is not set. Please set MONGO_URI in your environment variables.');
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

