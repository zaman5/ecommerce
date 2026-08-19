import mongoose from 'mongoose';
import { autoSeedIfEmpty } from '../utils/autoSeed.js';

export async function connectDB(uri) {
  if (!uri) {
    console.warn('⚠️ MONGO_URI environment variable is missing.');
    return null;
  }
  mongoose.set('strictQuery', true);
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    
    // Auto-seed if database has no categories
    autoSeedIfEmpty().catch((e) => console.warn('Auto-seed warning:', e.message));
    
    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('👉 Tip: Check MONGO_URI in your environment variables and make sure MongoDB Atlas Network Access allows 0.0.0.0/0');
    return null;
  }
}


