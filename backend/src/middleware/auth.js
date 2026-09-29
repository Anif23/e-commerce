import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { env } from '../config/env.js';

const extractToken = (req) => {
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) return header.slice(7);

  return req.cookies?.accessToken ?? null;
};

/** Verifies the bearer access token and attaches the user record. */
export const authMiddleware = async (req, _res, next) => {
  try {
    const token = extractToken(req);

    if (!token) throw ApiError.unauthorized('Authentication required');

    const payload = jwt.verify(token, env.jwtSecret);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, username: true, role: true, isBlocked: true },
    });

    if (!user) throw ApiError.unauthorized('Account no longer exists');
    if (user.isBlocked) throw ApiError.forbidden('Your account has been suspended');

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Session expired'));
    }
    next(error);
  }
};

/** Same as above, but a guest request simply continues. */
export const optionalAuth = async (req, _res, next) => {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = jwt.verify(token, env.jwtSecret);
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { id: true, email: true, username: true, role: true, isBlocked: true },
      });

      if (user && !user.isBlocked) req.user = user;
    }
  } catch {
    // Invalid/expired token on a public route: treat the visitor as a guest.
  }

  next();
};

export const adminMiddleware = (req, _res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== 'ADMIN') return next(ApiError.forbidden('Admin access only'));

  next();
};
