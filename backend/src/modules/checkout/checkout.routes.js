import { Router } from 'express';

import { checkoutController } from './checkout.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

export const checkoutRoutes = Router();

checkoutRoutes.use(authMiddleware);

checkoutRoutes.get('/summary', checkoutController.summary);
checkoutRoutes.post('/', checkoutController.checkout);
checkoutRoutes.post('/:orderId/pay', checkoutController.pay);
