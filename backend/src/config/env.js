import 'dotenv/config';

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) =>
  value === undefined || value === '' ? fallback : ['1', 'true', 'yes'].includes(String(value).toLowerCase());

/**
 * Single source of truth for runtime configuration.
 * Values are read once at boot so typos surface immediately instead of mid-request.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 5000),
  appUrl: process.env.APP_URL ?? `http://localhost:${toNumber(process.env.PORT, 5000)}`,
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET ?? 'dev-access-secret-change-me',
  refreshSecret: process.env.REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtlDays: toNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 7),

  databaseUrl: process.env.DATABASE_URL,

  // Money / fulfilment defaults consumed by the pricing service.
  // Asnif Store trades in India, so amounts are INR and the tax rate is GST.
  currency: (process.env.STORE_CURRENCY ?? 'INR').toUpperCase(),
  shippingFee: toNumber(process.env.DEFAULT_SHIPPING_FEE, 49),
  freeShippingThreshold: toNumber(process.env.FREE_SHIPPING_THRESHOLD, 999),
  taxRatePercent: toNumber(process.env.TAX_RATE_PERCENT, 18),

  // How long an unpaid online order stays alive (minutes).
  paymentWindowMinutes: toNumber(process.env.PAYMENT_WINDOW_MINUTES, 15),

  payments: {
    mode: process.env.PAYMENT_MODE ?? 'auto', // auto | live | mock
    paypalClientId: process.env.PAYPAL_CLIENT_ID,
    paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET,
    paypalMode: process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox',
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  uploads: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxImages: toNumber(process.env.MAX_PRODUCT_IMAGES, 6),
  },

  seed: {
    adminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@store.dev',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
    userEmail: process.env.SEED_USER_EMAIL ?? 'shopper@store.dev',
    userPassword: process.env.SEED_USER_PASSWORD ?? 'Shopper@123',
  },
};

export const isProduction = env.nodeEnv === 'production';
export const isTest = env.nodeEnv === 'test';
export const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};
export { toBool, toNumber };
