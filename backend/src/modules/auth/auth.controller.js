import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { createAdminNotification } from '../../services/notifications.js';
import { loginSchema, registerSchema } from './auth.validation.js';

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = env.refreshTokenTtlDays * 24 * 60 * 60 * 1000;

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const issueAccessToken = (user) =>
  jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.accessTokenTtl });

const issueRefreshToken = async (user) => {
  // `jti` makes every refresh token unique: without it, two sign-ins inside the
  // same second produce the same JWT and the unique index rejects the second one.
  const token = jwt.sign({ id: user.id, jti: randomUUID() }, env.refreshSecret, {
    expiresIn: `${env.refreshTokenTtlDays}d`,
  });

  await prisma.refreshToken.create({
    data: { token, userId: user.id, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });

  return token;
};

const isSecureRequest = (req) =>
  Boolean(req?.secure) || req?.get?.('x-forwarded-proto') === 'https' || env.nodeEnv === 'production';

/**
 * The refresh token lives in an httpOnly cookie. When the store is served over
 * HTTPS — production or the embedded preview iframe — the cookie must be
 * `SameSite=None; Secure` or the browser drops it on cross-site XHR, which is
 * exactly what caused the spurious "logged out" / refresh 401. Over plain HTTP
 * (local dev) we fall back to `SameSite=Lax`.
 */
const refreshCookieOptions = (req) => {
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: '/',
    secure,
    sameSite: secure ? 'none' : 'lax',
    maxAge: REFRESH_TTL_MS,
  };
};

const setRefreshCookie = (res, token, req) => {
  res.cookie('refreshToken', token, refreshCookieOptions(req));
};

const clearRefreshCookie = (res, req) => {
  res.clearCookie('refreshToken', refreshCookieOptions(req));
};

export const authController = {
  register: asyncHandler(async (req, res) => {
    const { username, email, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true, email: true, username: true },
    });

    if (existing) {
      throw ApiError.conflict(
        existing.email === email ? 'An account with this email already exists' : 'That username is taken',
      );
    }

    const user = await prisma.user.create({
      data: { username, email, password: await bcrypt.hash(password, 10) },
    });

    const refreshToken = await issueRefreshToken(user);
    setRefreshCookie(res, refreshToken, req);

    await createAdminNotification({
      title: 'New customer',
      message: `${user.username} created an account`,
      type: 'USER',
      link: '/admin/customers',
    });

    res.status(201).json({
      success: true,
      message: 'Welcome aboard',
      data: { user: publicUser(user), token: issueAccessToken(user), expiresIn: ACCESS_TTL_SECONDS },
    });
  }),

  login: asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: body.email ? { email: body.email } : { username: body.username },
    });

    // Same message for unknown account and wrong password (no user enumeration).
    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      throw ApiError.badRequest('Invalid credentials');
    }

    if (user.isBlocked) throw ApiError.forbidden('Your account has been suspended');

    const refreshToken = await issueRefreshToken(user);
    setRefreshCookie(res, refreshToken, req);

    res.json({
      success: true,
      data: { user: publicUser(user), token: issueAccessToken(user), expiresIn: ACCESS_TTL_SECONDS },
    });
  }),

  refresh: asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (!token) throw ApiError.unauthorized('No refresh token');

    let payload;
    try {
      payload = jwt.verify(token, env.refreshSecret);
    } catch {
      clearRefreshCookie(res, req);
      await prisma.refreshToken.deleteMany({ where: { token } }).catch(() => {});
      throw ApiError.unauthorized('Refresh token expired or invalid');
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored) {
      clearRefreshCookie(res, req);
      throw ApiError.unauthorized('Refresh token revoked');
    }
    if (stored.expiresAt <= new Date()) {
      await prisma.refreshToken.deleteMany({ where: { token } });
      clearRefreshCookie(res, req);
      throw ApiError.unauthorized('Refresh token expired');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || user.isBlocked) {
      await prisma.refreshToken.deleteMany({ where: { token } });
      clearRefreshCookie(res, req);
      throw ApiError.unauthorized('Account is no longer active');
    }

    // Rotate: the old token is single use.
    await prisma.refreshToken.delete({ where: { token } });

    const refreshToken = await issueRefreshToken(user);
    setRefreshCookie(res, refreshToken, req);

    res.json({
      success: true,
      data: { user: publicUser(user), token: issueAccessToken(user), expiresIn: ACCESS_TTL_SECONDS },
    });
  }),

  logout: asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (token) {
      await prisma.refreshToken.deleteMany({ where: { token } });
    }

    clearRefreshCookie(res, req);
    res.json({ success: true, message: 'Logged out' });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true, reviews: true } },
        cart: { select: { _count: { select: { items: true } } } },
        wishlist: { select: { _count: { select: { items: true } } } },
      },
    });

    if (!user) throw ApiError.notFound('Account not found');

    res.json({
      success: true,
      data: {
        ...publicUser(user),
        stats: {
          orders: user._count.orders,
          reviews: user._count.reviews,
          cartItems: user.cart?._count.items ?? 0,
          wishlistItems: user.wishlist?._count.items ?? 0,
        },
      },
    });
  }),
};
