import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';

import { env } from './src/config/env.js';
import { errorHandler, notFoundHandler } from './src/lib/errors.js';
import { apiRoutes } from './src/routes/index.js';

/**
 * Creates the express app. Kept separate from `index.js` so tests can import a
 * fresh app without binding a port or booting socket.io.
 */
export const createApp = () => {
  const app = express();

  // Behind the preview/production reverse proxy: honour X-Forwarded-Proto so
  // `req.secure` is correct and the refresh cookie can be SameSite=None;Secure.
  app.set('trust proxy', 1);

  const allowedOrigins = [env.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin/server-to-server calls and the configured frontend.
        if (!origin || allowedOrigins.includes(origin) || env.nodeEnv !== 'production') {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );

  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buffer) => {
        if (['/api/payments/stripe/webhook', '/api/payments/razorpay/webhook'].includes(req.path)) {
          req.rawBody = Buffer.from(buffer);
        }
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  const uploadsDir = path.resolve(process.cwd(), env.uploads.dir);
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', index: false }));

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};