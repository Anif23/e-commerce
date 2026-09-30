import { Router } from 'express';

import { paymentsController } from './payments.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

export const paymentsRoutes = Router();

paymentsRoutes.get('/methods', paymentsController.methods);
paymentsRoutes.post('/stripe/webhook', paymentsController.stripeWebhook);
paymentsRoutes.post('/razorpay/webhook', paymentsController.razorpayWebhook);

paymentsRoutes.use(authMiddleware);

paymentsRoutes.post('/confirm', paymentsController.confirm);
paymentsRoutes.post('/:orderId/fail', paymentsController.fail);
