import { Router } from 'express';

import { cartController } from './cart.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

export const cartRoutes = Router();

cartRoutes.use(authMiddleware);

cartRoutes.get('/', cartController.get);
cartRoutes.post('/items', cartController.addItem);
cartRoutes.patch('/items/:id', cartController.updateItem);
cartRoutes.delete('/items/:id', cartController.removeItem);
cartRoutes.delete('/', cartController.clear);
cartRoutes.post('/coupon', cartController.applyCoupon);
cartRoutes.delete('/coupon', cartController.removeCoupon);
cartRoutes.post('/validate', cartController.validate);
