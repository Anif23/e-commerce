import { Router } from 'express';

import { productsController } from './products.controller.js';
import { categoriesController } from './categories.controller.js';
import { optionalAuth } from '../../middleware/auth.js';
import { adminMiddleware, authMiddleware } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';

const admin = [authMiddleware, adminMiddleware];

export const catalogRoutes = Router();

/* ---------------------------- storefront ---------------------------- */

catalogRoutes.get('/products/filters', productsController.filters);
catalogRoutes.get('/products/featured', optionalAuth, productsController.featured);
catalogRoutes.get('/products', optionalAuth, productsController.list);
catalogRoutes.get('/products/:idOrSlug/reviews', productsController.reviews);
catalogRoutes.get('/products/:idOrSlug', optionalAuth, productsController.detail);

catalogRoutes.get('/categories', categoriesController.list);
catalogRoutes.get('/categories/:idOrSlug', categoriesController.detail);

/* ------------------------------- admin ------------------------------ */

catalogRoutes.get('/admin/categories', admin, categoriesController.adminList);
catalogRoutes.post('/admin/categories', admin, upload.single('image'), categoriesController.create);
catalogRoutes.put('/admin/categories/:id', admin, upload.single('image'), categoriesController.update);
catalogRoutes.delete('/admin/categories/:id', admin, categoriesController.remove);

catalogRoutes.get('/admin/products', admin, productsController.adminList);
catalogRoutes.get('/admin/products/:id', admin, productsController.adminDetail);
catalogRoutes.post('/admin/products', admin, upload.array('images', 6), productsController.create);
catalogRoutes.put('/admin/products/:id', admin, upload.array('images', 6), productsController.update);
catalogRoutes.delete('/admin/products/:id', admin, productsController.remove);
catalogRoutes.post('/admin/products/:id/restore', admin, productsController.restore);
catalogRoutes.patch('/admin/products/:id/stock', admin, productsController.adjustStock);
catalogRoutes.post('/admin/products/:id/variants', admin, productsController.createVariant);
catalogRoutes.put('/admin/products/:id/variants/:variantId', admin, productsController.updateVariant);
catalogRoutes.delete('/admin/products/:id/variants/:variantId', admin, productsController.deleteVariant);
catalogRoutes.post('/admin/products/:id/options', admin, productsController.setOptions);
