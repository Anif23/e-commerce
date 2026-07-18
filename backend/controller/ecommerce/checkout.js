import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { checkoutSchema } from "../../validations/ecommerce.js";
import { createAdminNotification } from "../../utils/AdminNotification.js";
import { io } from "../../index.js";

export const checkoutController = {
  checkout: asyncHandler(async (req, res) => {
    const { paymentMethod } = checkoutSchema.parse(req.body);

    const cart = await prisma.cart.findUnique({
      where: {
        userId: req.user.id,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, "Cart is empty");
    }

    const address = await prisma.address.findFirst({
      where: {
        userId: req.user.id,
        isDefault: true,
      },
    });

    if (!address) {
      throw new ApiError(400, "Please set a default address");
    }

    let total = 0;

    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new ApiError(
          400,
          `${item.product.name} is out of stock`
        );
      }

      total += item.product.price * item.quantity;
    }

    // Only PayPal expires
    const expiresAt =
      paymentMethod === "PAYPAL"
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

    const orderStatus =
      paymentMethod === "PAYPAL"
        ? "PENDING_PAYMENT"
        : "PROCESSING";

    const order = await prisma.$transaction(async (tx) => {

      const order = await tx.order.create({
        data: {
          userId: req.user.id,
          total,
          addressId: address.id,
          status: orderStatus,
          expiresAt,

          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.product.price,
            })),
          },
        },
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          provider: paymentMethod,
          status: "PENDING",
        },
      });

      // COD only
      if (paymentMethod === "COD") {

        for (const item of cart.items) {

          await tx.product.update({
            where: {
              id: item.productId,
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          const updated = await tx.product.findUnique({
            where: {
              id: item.productId,
            },
          });

          if (updated.stock <= updated.lowStock) {
            await tx.adminNotification.create({
              data: {
                title: "Low Stock",
                message: `${updated.name} is low on stock (${updated.stock})`,
                type: "LOW_STOCK",
              },
            });
          }
        }

        // Empty cart immediately
        await tx.cartItem.deleteMany({
          where: {
            cartId: cart.id,
          },
        });
      }

      return order;
    });

    await createAdminNotification({
      title: "New Order",
      message: `Order #${order.id} created`,
      type: "ORDER",
      link: `/admin/ecommerce/orders/${order.id}`,
    });

    io.emit("order_updated", {
      type: "CREATED",
      orderId: order.id,
    });

    return res.json({
      success: true,
      message:
        paymentMethod === "PAYPAL"
          ? "Order created. Complete your PayPal payment."
          : "Order placed successfully.",
      data: {
        orderId: order.id,
        paymentMethod,
        total,
      },
    });
  }),
};