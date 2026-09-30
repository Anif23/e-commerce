import { Router } from 'express';

import { reviewsController } from './reviews.controller.js';
import { adminMiddleware, authMiddleware } from '../../middleware/auth.js';

export const reviewsRoutes = Router();

reviewsRoutes.use(authMiddleware);

reviewsRoutes.get('/me', reviewsController.mine);
reviewsRoutes.get('/eligibility/:productId', reviewsController.eligibility);
reviewsRoutes.post('/', reviewsController.upsert);
reviewsRoutes.patch('/:id', reviewsController.update);
reviewsRoutes.delete('/:id', reviewsController.remove);

export const adminReviewsRoutes = Router();

adminReviewsRoutes.use(authMiddleware, adminMiddleware);
adminReviewsRoutes.get('/', reviewsController.adminList);
adminReviewsRoutes.patch('/:id/moderate', reviewsController.moderate);
adminReviewsRoutes.delete('/:id', reviewsController.remove);
