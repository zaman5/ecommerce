// Vercel serverless entry point for the Wondercart API.
import { createApp } from '../server/app.js';
import { connectServerless } from '../server/config/serverlessDb.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectServerless();
  } catch (err) {
    console.error('MySQL connection failed:', err);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: 'Database unavailable. Check DB_HOST, DB_USER, DB_NAME settings.' }));
    return;
  }

  return app(req, res);
}
