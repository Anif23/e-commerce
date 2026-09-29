import express from 'express';
import { Router } from 'express';

import { paymentsController } from './payments.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

export const paymentsRoutes = Router();

paymentsRoutes.get('/methods', paymentsController.methods);

// Stripe needs the raw body for signature verification.
paymentsRoutes.post(
  '/stripe/webhook',
  express.raw({ type: 'application/json' }),
  paymentsController.stripeWebhook,
);

paymentsRoutes.use(authMiddleware);

paymentsRoutes.post('/confirm', paymentsController.confirm);
paymentsRoutes.post('/:orderId/fail', paymentsController.fail);
