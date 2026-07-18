import { adminMiddleware } from "../../middleware/admin.js";
import { authMiddleware } from "../../middleware/auth.js";
import { upload } from "../../middleware/upload.js";
import { productController } from "../../controller/ecommerce/product.js";
import { categoryController } from "../../controller/ecommerce/category.js";
import { adminController } from "../../controller/ecommerce/Admin/admin.js";
import { adminOrderController } from "../../controller/ecommerce/Admin/order.js";
import { adminCustomerController } from "../../controller/ecommerce/Admin/customer.js";
import { campaignController } from "../../controller/ecommerce/Admin/campaign.js";
import { adminNotificationController } from "../../controller/ecommerce/Admin/notification.js";

export const adminRoutes = (app) => {

    app.get(
        "/admin/dashboard",
        authMiddleware,
        adminMiddleware,
        adminController.dashboard
    );

    app.get(
        "/admin/products",
        authMiddleware,
        adminMiddleware,
        productController.getProducts
    );

    app.get(
        "/admin/products/:id",
        authMiddleware,
        adminMiddleware,
        productController.getProductById
    );

    app.post(
        "/admin/products",
        authMiddleware,
        adminMiddleware,
        upload.array("images", 5),
        productController.createProduct
    );

    app.put(
        "/admin/products/:id",
        authMiddleware,
        adminMiddleware,
        upload.array("images", 5),
        productController.updateProduct
    );

    app.delete(
        "/admin/products/:id",
        authMiddleware,
        adminMiddleware,
        productController.deleteProduct
    );

    app.get(
        "/admin/categories",
        authMiddleware,
        adminMiddleware,
        categoryController.getCategories
    );

    app.get(
        "/admin/categories/:id",
        authMiddleware,
        adminMiddleware,
        categoryController.getCategoryById
    );

    app.post(
        "/admin/categories",
        authMiddleware,
        adminMiddleware,
        upload.single("image"),
        categoryController.createCategory
    );

    app.put(
        "/admin/categories/:id",
        authMiddleware,
        adminMiddleware,
        upload.single("image"),
        categoryController.updateCategory
    );

    app.delete(
        "/admin/categories/:id",
        authMiddleware,
        adminMiddleware,
        categoryController.deleteCategory
    );

    app.get(
        "/admin/orders",
        authMiddleware,
        adminMiddleware,
        adminOrderController.getAllOrders
    );

    app.get(
        "/admin/orders/:id",
        authMiddleware,
        adminMiddleware,
        adminOrderController.getOrderById
    );

    app.put(
        "/admin/orders/:id/status",
        authMiddleware,
        adminMiddleware,
        adminOrderController.updateOrderStatus
    );

    app.put(
        "/admin/orders/:id/payment",
        authMiddleware,
        adminMiddleware,
        adminOrderController.updatePaymentStatus
    );

    app.get(
        "/admin/customers",
        authMiddleware,
        adminMiddleware,
        adminCustomerController.getAllCustomers
    )

    app.post(
        "/admin/campaigns/notifications",
        authMiddleware,
        adminMiddleware,
        campaignController.sendNotification
    )

    app.get(
        "/admin/campaigns/notifications",
        authMiddleware,
        adminMiddleware,
        campaignController.getAllNotifications
    )

    app.get(
        "/admin/notifications",
        authMiddleware,
        adminMiddleware,
        adminNotificationController.getNotifications
    )

    app.put(
        "/admin/notifications/:id/read",
        authMiddleware,
        adminMiddleware,
        adminNotificationController.markAsRead
    )

    app.put(
        "/admin/notifications/read-all",
        authMiddleware,
        adminMiddleware,
        adminNotificationController.markAllRead
    )

    app.delete(
        "/admin/notifications/:id/delete",
        authMiddleware,
        adminMiddleware,
        adminNotificationController.deleteNotification
    )

    app.delete(
        "/admin/notifications/delete-all",
        authMiddleware,
        adminMiddleware,
        adminNotificationController.deleteAllNotifications
    )
};