import { Router } from 'express';

import { authController } from './auth.controller.js';
import { authMiddleware } from '../../middleware/auth.js';
import { rateLimit } from '../../middleware/rateLimit.js';

export const authRoutes = Router();

const authLimiter = rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'auth' });

authRoutes.post('/register', authLimiter, authController.register);
authRoutes.post('/login', authLimiter, authController.login);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authMiddleware, authController.me);
