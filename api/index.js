// Vercel serverless entry point for the Wondercart API.
//
// vercel.json rewrites every /api/* request here. The Express app already
// mounts its routes under /api, so the URL passes through unchanged and the
// app can be handed the raw (req, res) pair.
//
// Nothing third-party is imported directly in this file — every import goes
// through server/, so the API runs on exactly one copy of mongoose (see
// server/config/serverlessDb.js).
import { createApp } from '../server/app.js';
import { connectServerless } from '../server/config/serverlessDb.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectServerless();
  } catch (err) {
    console.error('MongoDB connection failed:', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Database unavailable. Check MONGO_URI and Atlas network access.' }));
    return;
  }

  return app(req, res);
}
