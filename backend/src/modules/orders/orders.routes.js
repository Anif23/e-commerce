import { Router } from 'express';

import { ordersController } from './orders.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

export const ordersRoutes = Router();

ordersRoutes.use(authMiddleware);

// Specific routes first so :id never swallows them.
ordersRoutes.get('/stats/summary', ordersController.stats);
ordersRoutes.get('/', ordersController.list);
ordersRoutes.get('/:id/track', ordersController.track);
ordersRoutes.get('/:id', ordersController.detail);
ordersRoutes.post('/:id/cancel', ordersController.cancel);
