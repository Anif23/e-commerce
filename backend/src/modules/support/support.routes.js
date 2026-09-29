import { Router } from 'express';

import { supportController } from './support.controller.js';
import { adminMiddleware, authMiddleware } from '../../middleware/auth.js';

export const supportRoutes = Router();

supportRoutes.use(authMiddleware);

supportRoutes.get('/faq', supportController.faq);
supportRoutes.get('/tickets', supportController.list);
supportRoutes.post('/tickets', supportController.create);
supportRoutes.get('/tickets/:id', supportController.detail);
supportRoutes.post('/tickets/:id/messages', supportController.reply);
supportRoutes.post('/tickets/:id/close', supportController.close);

export const adminSupportRoutes = Router();

adminSupportRoutes.use(authMiddleware, adminMiddleware);
adminSupportRoutes.get('/', supportController.adminList);
adminSupportRoutes.get('/:id', supportController.adminDetail);
adminSupportRoutes.patch('/:id/status', supportController.adminStatus);
adminSupportRoutes.post('/:id/messages', supportController.reply);
