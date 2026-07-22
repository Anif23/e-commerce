import { productController } from "../../controller/ecommerce/product.js";
import { categoryController } from "../../controller/ecommerce/category.js";
import { cartController } from "../../controller/ecommerce/cart.js";
import { checkoutController } from "../../controller/ecommerce/checkout.js";
import { orderController } from "../../controller/ecommerce/order.js";
import { authMiddleware } from "../../middleware/auth.js";
import { mergeCart, mergeWishlist } from "../../controller/ecommerce/mergeApi.js";
import { getWishlist, updateWishlist } from "../../controller/ecommerce/wishlist.js";
import { optionalAuth } from "../../middleware/optionalAuth.js";
import { profileController } from "../../controller/ecommerce/profile.js";
import { notificationController } from "../../controller/ecommerce/notification.js";
import { addressController } from "../../controller/ecommerce/address.js";
import { paymentController } from "../../controller/ecommerce/payment.js";
import { announcementController } from "../../controller/ecommerce/announcements.js";

export const userRoutes = (app) => {
  app.get("/products", optionalAuth, productController.getProducts);
  app.get("/products/:id", optionalAuth, productController.getProductById);

  app.get("/categories", categoryController.getCategories);
  app.get("/categories/:id", categoryController.getCategoryById);

  app.get("/cart", authMiddleware, cartController.getCart);
  app.post("/cart", authMiddleware, cartController.addToCart);
  app.put("/cart/:id", authMiddleware, cartController.updateCartItem);
  app.delete("/cart/:id", authMiddleware, cartController.removeCartItem);
  app.delete("/cart", authMiddleware, cartController.clearCart);

  app.post("/checkout", authMiddleware, checkoutController.checkout);

  app.get("/orders", authMiddleware, orderController.getUserOrders);
  app.get("/orders/:id", authMiddleware, orderController.getOrderById);

  app.post("/merge/cart", authMiddleware, mergeCart);
  app.post("/merge/wishlist", authMiddleware, mergeWishlist);

  app.get("/wishlist", authMiddleware, getWishlist);
  app.post("/wishlist/:productId", authMiddleware, updateWishlist);

  app.get("/profile", authMiddleware, profileController.getProfile);
  app.put("/profile/update", authMiddleware, profileController.updateProfile);
  app.put("/profile/password", authMiddleware, profileController.changePassword);

  app.get(
    "/notifications",
    authMiddleware,
    notificationController.getNotifications
  );

  app.put(
    "/notifications/read-all",
    authMiddleware,
    notificationController.markAllRead
  );

  app.put(
    "/notifications/:id/read",
    authMiddleware,
    notificationController.markAsRead
  );

  app.delete(
    "/notifications/delete-all",
    authMiddleware,
    notificationController.deleteAllNotifications
  );

  app.delete(
    "/notifications/:id",
    authMiddleware,
    notificationController.deleteNotification
  );

  app.get(
    "/addresses",
    authMiddleware,
    addressController.getUserAddresses
  );

  app.post(
    "/addresses",
    authMiddleware,
    addressController.addAddress
  );

  app.put(
    "/addresses/:id",
    authMiddleware,
    addressController.updateAddress
  );

  app.delete(
    "/addresses/:id",
    authMiddleware,
    addressController.deleteAddress
  );

  app.patch(
    "/addresses/:id/default",
    authMiddleware,
    addressController.setDefaultAddress
  );

  app.post(
    "/paypal/create",
    authMiddleware,
    paymentController.createPaypalOrder
  );

  app.post(
    "/paypal/capture",
    authMiddleware,
    paymentController.capturePaypalOrder
  );

  app.post(
    "/orders/:id/cancel",
    authMiddleware,
    orderController.cancelOrder
  );

  app.post(
    "/orders/:id/expire",
    authMiddleware,
    orderController.expireOrder
  );

  app.get(
    "/payments",
    authMiddleware,
    paymentController.getMyPayments
  );

  app.get(
    "/announcements",
    authMiddleware,
    announcementController.getAnnouncements
  );
}