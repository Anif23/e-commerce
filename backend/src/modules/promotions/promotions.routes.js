import { Router } from 'express';

import { couponsController } from './coupons.controller.js';
import { announcementsController } from './announcements.controller.js';
import { adminMiddleware, authMiddleware, optionalAuth } from '../../middleware/auth.js';

export const promotionsRoutes = Router();

// Anyone (guest or logged in) can preview a code before signing in.
promotionsRoutes.post('/coupons/validate', optionalAuth, couponsController.validate);

export const adminPromotionsRoutes = Router();

adminPromotionsRoutes.use(authMiddleware, adminMiddleware);

adminPromotionsRoutes.get('/coupons', couponsController.adminList);
adminPromotionsRoutes.post('/coupons', couponsController.create);
adminPromotionsRoutes.put('/coupons/:id', couponsController.update);
adminPromotionsRoutes.delete('/coupons/:id', couponsController.remove);

adminPromotionsRoutes.get('/announcements', announcementsController.list);
adminPromotionsRoutes.post('/announcements', announcementsController.create);
adminPromotionsRoutes.put('/announcements/:id', announcementsController.update);
adminPromotionsRoutes.delete('/announcements/:id', announcementsController.remove);
adminPromotionsRoutes.post('/announcements/:id/send', announcementsController.send);
