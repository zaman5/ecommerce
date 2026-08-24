import { rateLimitConfig } from '../config/rateLimitConfig.js';

/**
 * Extract client IP address safely considering proxies and load balancers.
 */
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    const clientIp = ips[0].trim();
    if (clientIp) return clientIp;
  }
  return req.headers['cf-connecting-ip'] || req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Normalize account identifier (email, username, phone)
 */
export function getAccountKey(req) {
  if (!req.body) return null;
  const raw = req.body.email || req.body.username || req.body.phone;
  return raw ? String(raw).trim().toLowerCase() : null;
}

// ─────────────────────────────────────────────────────────────
// In-Memory Storage with Automatic Expiry & Garbage Collection
// ─────────────────────────────────────────────────────────────

class RateLimitStore {
  constructor(cleanupIntervalMs = 60 * 1000) {
    this.store = new Map();
    // Periodic garbage collection
    setInterval(() => this.cleanup(), cleanupIntervalMs).unref();
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, data) {
    this.store.set(key, data);
  }

  delete(key) {
    this.store.delete(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.expiresAt && record.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
}

const publicStore = new RateLimitStore();
const authenticatedStore = new RateLimitStore();
const authStore = new RateLimitStore();

/**
 * Standard Sliding Window Rate Limiter
 */
function createSlidingLimiter({ windowMs, max, message, keyGenerator }) {
  return (req, res, next) => {
    if (!rateLimitConfig.enabled) return next();

    const key = keyGenerator(req);
    const now = Date.now();
    let record = publicStore.get(key);

    if (!record || record.expiresAt < now) {
      record = {
        timestamps: [now],
        expiresAt: now + windowMs,
      };
      publicStore.set(key, record);
    } else {
      // Filter timestamps within current window
      const windowStart = now - windowMs;
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
      record.timestamps.push(now);
      record.expiresAt = now + windowMs;
    }

    const currentHits = record.timestamps.length;
    const remaining = Math.max(0, max - currentHits);
    const resetTime = Math.ceil((record.expiresAt - now) / 1000);

    // Standard Rate Limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.expiresAt / 1000));

    if (currentHits > max) {
      res.setHeader('Retry-After', resetTime);
      return res.status(429).json({
        status: 429,
        error: 'Too Many Requests',
        message: message || 'Too many requests. Please try again later.',
        retryAfter: resetTime,
      });
    }

    next();
  };
}

/**
 * 1. Moderate Public Endpoints Rate Limiter
 */
export const publicRateLimiter = createSlidingLimiter({
  windowMs: rateLimitConfig.public.windowMs,
  max: rateLimitConfig.public.max,
  message: rateLimitConfig.public.message,
  keyGenerator: (req) => `pub:${getClientIp(req)}`,
});

/**
 * 2. Looser Authenticated User Actions Rate Limiter
 */
export const authenticatedRateLimiter = (req, res, next) => {
  if (!rateLimitConfig.enabled) return next();

  const userId = req.user?.id || req.user?._id || getClientIp(req);
  const key = `user:${userId}`;
  const now = Date.now();
  const { windowMs, max, message } = rateLimitConfig.authenticated;

  let record = authenticatedStore.get(key);
  if (!record || record.expiresAt < now) {
    record = {
      timestamps: [now],
      expiresAt: now + windowMs,
    };
    authenticatedStore.set(key, record);
  } else {
    const windowStart = now - windowMs;
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);
    record.timestamps.push(now);
    record.expiresAt = now + windowMs;
  }

  const currentHits = record.timestamps.length;
  const remaining = Math.max(0, max - currentHits);
  const resetSeconds = Math.ceil((record.expiresAt - now) / 1000);

  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(record.expiresAt / 1000));

  if (currentHits > max) {
    res.setHeader('Retry-After', resetSeconds);
    return res.status(429).json({
      status: 429,
      error: 'Too Many Requests',
      message: message || 'Too many requests. Please slow down.',
      retryAfter: resetSeconds,
    });
  }

  next();
};

/**
 * 3. Stricter Auth Routes Limiter with IP + Account limits & Exponential Backoff
 */
export function authRouteRateLimiter(req, res, next) {
  if (!rateLimitConfig.enabled) return next();

  const ip = getClientIp(req);
  const account = getAccountKey(req);
  const now = Date.now();
  const cfg = rateLimitConfig.auth;

  const ipKey = `auth_ip:${ip}`;
  const accountKey = account ? `auth_acc:${account}` : null;

  // Retrieve or initialize records
  let ipRecord = authStore.get(ipKey) || { attempts: 0, failures: 0, lastFailureAt: 0, expiresAt: now + cfg.windowMs };
  let accRecord = accountKey ? (authStore.get(accountKey) || { attempts: 0, failures: 0, lastFailureAt: 0, expiresAt: now + cfg.windowMs }) : null;

  if (ipRecord.expiresAt < now) {
    ipRecord = { attempts: 0, failures: 0, lastFailureAt: 0, expiresAt: now + cfg.windowMs };
  }
  if (accRecord && accRecord.expiresAt < now) {
    accRecord = { attempts: 0, failures: 0, lastFailureAt: 0, expiresAt: now + cfg.windowMs };
  }

  // Check Exponential Backoff Delays (avoids hard lockout by enforcing waiting gaps)
  const calculateBackoffMs = (failures) => {
    if (failures < cfg.failuresBeforeBackoff) return 0;
    const power = failures - cfg.failuresBeforeBackoff;
    const delay = cfg.backoffBaseMs * Math.pow(cfg.backoffFactor, power);
    return Math.min(delay, cfg.backoffMaxMs);
  };

  const ipBackoffMs = calculateBackoffMs(ipRecord.failures);
  const accBackoffMs = accRecord ? calculateBackoffMs(accRecord.failures) : 0;
  const maxBackoffMs = Math.max(ipBackoffMs, accBackoffMs);

  const ipWaitRemaining = ipRecord.lastFailureAt ? Math.max(0, ipRecord.lastFailureAt + ipBackoffMs - now) : 0;
  const accWaitRemaining = accRecord && accRecord.lastFailureAt ? Math.max(0, accRecord.lastFailureAt + accBackoffMs - now) : 0;
  const activeWaitMs = Math.max(ipWaitRemaining, accWaitRemaining);

  if (activeWaitMs > 0) {
    const retryAfter = Math.ceil(activeWaitMs / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Backoff-Delay', retryAfter);
    return res.status(429).json({
      status: 429,
      error: 'Too Many Requests',
      message: `Too many consecutive failed attempts. Please wait ${retryAfter} second(s) before trying again.`,
      retryAfter,
      type: 'exponential_backoff',
    });
  }

  // Check Window Attempt Limits
  if (ipRecord.attempts >= cfg.ipMax) {
    const retryAfter = Math.ceil((ipRecord.expiresAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      status: 429,
      error: 'Too Many Requests',
      message: `Too many authentication attempts from this IP. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    });
  }

  if (accRecord && accRecord.attempts >= cfg.accountMax) {
    const retryAfter = Math.ceil((accRecord.expiresAt - now) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      status: 429,
      error: 'Too Many Requests',
      message: `Too many login attempts for this account. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    });
  }

  // Increment attempt counts
  ipRecord.attempts += 1;
  authStore.set(ipKey, ipRecord);

  if (accRecord && accountKey) {
    accRecord.attempts += 1;
    authStore.set(accountKey, accRecord);
  }

  // Intercept response to update failure/success states
  res.on('finish', () => {
    const success = res.statusCode >= 200 && res.statusCode < 300;
    const isAuthFailure = res.statusCode === 401 || res.statusCode === 403;

    if (success) {
      // Reset consecutive failure counters upon successful authentication
      if (ipRecord) {
        ipRecord.failures = 0;
        ipRecord.lastFailureAt = 0;
        authStore.set(ipKey, ipRecord);
      }
      if (accountKey && accRecord) {
        accRecord.failures = 0;
        accRecord.lastFailureAt = 0;
        authStore.set(accountKey, accRecord);
      }
    } else if (isAuthFailure) {
      // Increase failure count to trigger exponential backoff
      const failTime = Date.now();
      if (ipRecord) {
        ipRecord.failures += 1;
        ipRecord.lastFailureAt = failTime;
        authStore.set(ipKey, ipRecord);
      }
      if (accountKey && accRecord) {
        accRecord.failures += 1;
        accRecord.lastFailureAt = failTime;
        authStore.set(accountKey, accRecord);
      }
    }
  });

  next();
}

/**
 * Utility to manually reset auth limits for a specific IP or Account (e.g. admin unlock)
 */
export function resetAuthRateLimit(ip, account) {
  if (ip) authStore.delete(`auth_ip:${ip}`);
  if (account) authStore.delete(`auth_acc:${String(account).trim().toLowerCase()}`);
}
