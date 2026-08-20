// Vercel serverless entry point for the Wondercart API.
import { createApp } from '../server/app.js';
import { connectServerless } from '../server/config/serverlessDb.js';

const app = createApp();

export default async function handler(req, res) {
  try {
    await connectServerless();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        message: 'Database unavailable.',
        error: err.message,
        hint: 'Check DB_HOST, DB_USER, DB_PASS, DB_NAME in your hosting environment variables.',
      })
    );
    return;
  }

  return app(req, res);
}
