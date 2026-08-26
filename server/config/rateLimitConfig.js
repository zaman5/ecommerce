/**
 * Rate Limiting Configuration
 * All thresholds are fully configurable via environment variables with production-ready defaults.
 */

function parseNum(val, fallback) {
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const rateLimitConfig = {
  enabled: process.env.RATE_LIMIT_ENABLED !== 'false',

  // 1. Moderate Public routes (products, categories, banners, search, sitemap, contact)
  public: {
    windowMs: parseNum(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    max: parseNum(process.env.RATE_LIMIT_PUBLIC_MAX, 300), // 300 requests per window per IP
    message: 'Too many requests from this IP. Please try again later.',
  },

  // 2. Looser Authenticated user actions (checkout, reviews, orders, profile updates, dashboard)
  authenticated: {
    windowMs: parseNum(process.env.RATE_LIMIT_AUTHENTICATED_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    max: parseNum(process.env.RATE_LIMIT_AUTHENTICATED_MAX, 1000), // 1000 requests per window per user
    message: 'Too many actions performed in a short period. Please try again in a few moments.',
  },

  // 3. Stricter Auth routes (login, register, signup) with IP + Account limits & Exponential Backoff
  auth: {
    windowMs: parseNum(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    ipMax: parseNum(process.env.RATE_LIMIT_AUTH_IP_MAX, 30), // Max 30 attempts per IP per window
    accountMax: parseNum(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX, 15), // Max 15 attempts per account per window

    // Exponential Backoff parameters (avoids permanent hard lockout by requiring progressive delays)
    failuresBeforeBackoff: parseNum(process.env.RATE_LIMIT_AUTH_FAILURES_BEFORE_BACKOFF, 3), // Backoff starts after 3 consecutive failures
    backoffBaseMs: parseNum(process.env.RATE_LIMIT_AUTH_BACKOFF_BASE_MS, 1000), // 1s base delay (1s, 2s, 4s, 8s, 16s...)
    backoffFactor: parseNum(process.env.RATE_LIMIT_AUTH_BACKOFF_FACTOR, 2), // 2x exponential multiplier
    backoffMaxMs: parseNum(process.env.RATE_LIMIT_AUTH_BACKOFF_MAX_MS, 60 * 1000), // Max 60s delay cap
  },

  // 4. Stricter Password Reset & Recovery routes
  passwordReset: {
    windowMs: parseNum(process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    max: parseNum(process.env.RATE_LIMIT_PASSWORD_RESET_MAX, 5), // Max 5 password reset requests per window
    message: 'Too many password reset requests. Please try again in a few minutes.',
  },

  // 5. Upload routes (media files, screenshots, video)
  upload: {
    windowMs: parseNum(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    max: parseNum(process.env.RATE_LIMIT_UPLOAD_MAX, 100), // Max 100 uploads per window
    message: 'Upload limit exceeded. Please wait a few minutes before uploading more files.',
  },
};

export default rateLimitConfig;

