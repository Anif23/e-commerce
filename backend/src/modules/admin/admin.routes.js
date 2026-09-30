import { Router } from 'express';

import { adminMiddleware, authMiddleware } from '../../middleware/auth.js';
import { dashboardController } from './dashboard.controller.js';
import { reportsController } from './reports.controller.js';
import { customersController } from './customers.controller.js';
import { inventoryController } from './inventory.controller.js';
import { adminOrdersController } from './orders.controller.js';
import { adminNotificationsController } from './notifications.controller.js';
import { adminReviewsRoutes } from '../reviews/reviews.routes.js';
import { adminSupportRoutes } from '../support/support.routes.js';
import { adminPromotionsRoutes } from '../promotions/promotions.routes.js';
import { announcementsController } from '../promotions/announcements.controller.js';
import { storeSettingsController } from '../store/storeSettings.controller.js';
import { upload } from '../../middleware/upload.js';

export const adminRoutes = Router();

adminRoutes.use(authMiddleware, adminMiddleware);

/* store settings */
adminRoutes.get('/settings', storeSettingsController.adminGet);
adminRoutes.put('/settings', storeSettingsController.update);
adminRoutes.post('/settings/logo', upload.single('logo'), storeSettingsController.uploadLogo);

/* dashboard & reports */
adminRoutes.get('/dashboard', dashboardController.stats);
adminRoutes.get('/dashboard/activity', dashboardController.activity);
adminRoutes.get('/reports', reportsController.overview);
adminRoutes.get('/reports/inventory', reportsController.inventory);

/* orders */
adminRoutes.get('/orders/stats/counters', adminOrdersController.counters);
adminRoutes.get('/orders', adminOrdersController.list);
adminRoutes.get('/orders/:id', adminOrdersController.detail);
adminRoutes.patch('/orders/:id/status', adminOrdersController.updateStatus);
adminRoutes.patch('/orders/:id/payment', adminOrdersController.updatePayment);

/* customers */
adminRoutes.get('/customers', customersController.list);
adminRoutes.get('/customers/:id', customersController.detail);
adminRoutes.patch('/customers/:id/role', customersController.setRole);
adminRoutes.patch('/customers/:id/block', customersController.setBlocked);

/* inventory */
adminRoutes.get('/inventory', inventoryController.list);
adminRoutes.patch('/inventory/:id', inventoryController.adjust);
adminRoutes.get('/inventory/:id/logs', inventoryController.logs);

/* notifications */
adminRoutes.get('/notifications', adminNotificationsController.list);
adminRoutes.put('/notifications/read-all', adminNotificationsController.markAllRead);
adminRoutes.put('/notifications/:id/read', adminNotificationsController.markRead);
adminRoutes.delete('/notifications', adminNotificationsController.clearAll);
adminRoutes.delete('/notifications/:id', adminNotificationsController.remove);

/* nested feature routers */
adminRoutes.use('/reviews', adminReviewsRoutes);
adminRoutes.use('/support', adminSupportRoutes);
adminRoutes.use('/', adminPromotionsRoutes);

export { announcementsController };
