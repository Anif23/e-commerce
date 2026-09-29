import { Router } from 'express';

import { addressesController } from './addresses.controller.js';
import { wishlistController } from './wishlist.controller.js';
import { profileController } from './profile.controller.js';
import { notificationsController } from './notifications.controller.js';
import { authMiddleware } from '../../middleware/auth.js';

export const accountRoutes = Router();

accountRoutes.use(authMiddleware);

/* profile */
accountRoutes.get('/profile', profileController.get);
accountRoutes.patch('/profile', profileController.update);
accountRoutes.put('/profile/password', profileController.changePassword);

/* addresses */
accountRoutes.get('/addresses', addressesController.list);
accountRoutes.post('/addresses', addressesController.create);
accountRoutes.put('/addresses/:id', addressesController.update);
accountRoutes.delete('/addresses/:id', addressesController.remove);
accountRoutes.patch('/addresses/:id/default', addressesController.setDefault);

/* wishlist */
accountRoutes.get('/wishlist', wishlistController.get);
accountRoutes.post('/wishlist/merge', wishlistController.merge);
accountRoutes.post('/wishlist/:productId', wishlistController.toggle);
accountRoutes.delete('/wishlist', wishlistController.clear);
accountRoutes.delete('/wishlist/:productId', wishlistController.remove);

/* notifications */
accountRoutes.get('/notifications', notificationsController.list);
accountRoutes.put('/notifications/read-all', notificationsController.markAllRead);
accountRoutes.put('/notifications/:id/read', notificationsController.markRead);
accountRoutes.delete('/notifications', notificationsController.clearAll);
accountRoutes.delete('/notifications/:id', notificationsController.remove);
