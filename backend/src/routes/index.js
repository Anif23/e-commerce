import { Router } from 'express';

import { authRoutes } from '../modules/auth/auth.routes.js';
import { catalogRoutes } from '../modules/catalog/catalog.routes.js';
import { cartRoutes } from '../modules/cart/cart.routes.js';
import { checkoutRoutes } from '../modules/checkout/checkout.routes.js';
import { paymentsRoutes } from '../modules/payments/payments.routes.js';
import { ordersRoutes } from '../modules/orders/orders.routes.js';
import { accountRoutes } from '../modules/account/account.routes.js';
import { reviewsRoutes } from '../modules/reviews/reviews.routes.js';
import { supportRoutes } from '../modules/support/support.routes.js';
import { promotionsRoutes } from '../modules/promotions/promotions.routes.js';
import { announcementsController } from '../modules/promotions/announcements.controller.js';
import { adminRoutes } from '../modules/admin/admin.routes.js';
import { todosController } from '../modules/todos/todos.controller.js';
import { storeSettingsController } from '../modules/store/storeSettings.controller.js';
import { authMiddleware } from '../middleware/auth.js';

export const apiRoutes = Router();

apiRoutes.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
});

apiRoutes.get('/store/settings', storeSettingsController.public);

apiRoutes.use('/auth', authRoutes);

// catalog mounts both storefront (/products, /categories) and admin sub-routes
apiRoutes.use('/', catalogRoutes);

apiRoutes.get('/announcements/active', announcementsController.active);
apiRoutes.use('/', promotionsRoutes);

apiRoutes.use('/cart', cartRoutes);
apiRoutes.use('/checkout', checkoutRoutes);
apiRoutes.use('/payments', paymentsRoutes);
apiRoutes.use('/orders', ordersRoutes);
apiRoutes.use('/', accountRoutes); // /profile, /addresses, /wishlist, /notifications
apiRoutes.use('/reviews', reviewsRoutes);
apiRoutes.use('/support', supportRoutes);
apiRoutes.use('/admin', adminRoutes);

apiRoutes.get('/todos', authMiddleware, todosController.list);
apiRoutes.post('/todos', authMiddleware, todosController.create);
apiRoutes.put('/todos/:id', authMiddleware, todosController.update);
apiRoutes.delete('/todos/:id', authMiddleware, todosController.remove);
