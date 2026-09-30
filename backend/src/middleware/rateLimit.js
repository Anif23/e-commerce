import { ApiError } from '../lib/errors.js';

/**
 * Tiny in-memory rate limiter — enough to protect auth and coupon endpoints on a
 * single instance without pulling a Redis dependency into the default setup.
 */
const buckets = new Map();

export const rateLimit = ({ windowMs = 60_000, max = 30, keyPrefix = 'rl' } = {}) => {
  const key = (req) => `${keyPrefix}:${req.ip ?? 'unknown'}`;

  return (req, _res, next) => {
    const now = Date.now();
    const bucketKey = key(req);
    const entry = buckets.get(bucketKey);

    if (!entry || now > entry.resetAt) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      return next(ApiError.badRequest('Too many requests, please slow down'));
    }

    entry.count += 1;
    next();
  };
};

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, 60_000).unref?.();
