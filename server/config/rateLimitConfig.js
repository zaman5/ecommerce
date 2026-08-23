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

  // Public routes (products, categories, banners, search, etc.)
  public: {
    windowMs: parseNum(process.env.RATE_LIMIT_PUBLIC_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    max: parseNum(process.env.RATE_LIMIT_PUBLIC_MAX, 300), // 300 requests per window per IP
    message: 'Too many requests from this IP. Please try again later.',
  },

  // Authenticated user actions (checkout, reviews, orders, profile updates)
  authenticated: {
    windowMs: parseNum(process.env.RATE_LIMIT_AUTHENTICATED_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    max: parseNum(process.env.RATE_LIMIT_AUTHENTICATED_MAX, 1000), // 1000 requests per window per user
    message: 'Too many actions performed in a short period. Please try again in a few moments.',
  },

  // Auth routes (login, register, password reset)
  auth: {
    windowMs: parseNum(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000), // 15 minutes
    ipMax: parseNum(process.env.RATE_LIMIT_AUTH_IP_MAX, 30), // Max 30 attempts per IP per window
    accountMax: parseNum(process.env.RATE_LIMIT_AUTH_ACCOUNT_MAX, 15), // Max 15 attempts per account per window

    // Exponential Backoff parameters (avoids permanent hard lockout)
    failuresBeforeBackoff: parseNum(process.env.RATE_LIMIT_AUTH_FAILURES_BEFORE_BACKOFF, 3), // Backoff starts after 3 consecutive failures
    backoffBaseMs: parseNum(process.env.RATE_LIMIT_AUTH_BACKOFF_BASE_MS, 1000), // 1s base delay
    backoffFactor: parseNum(process.env.RATE_LIMIT_AUTH_BACKOFF_FACTOR, 2), // 2x exponential multiplier
    backoffMaxMs: parseNum(process.env.RATE_LIMIT_AUTH_BACKOFF_MAX_MS, 60 * 1000), // Max 60s delay cap
  },
};

export default rateLimitConfig;
