import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { checkoutSchema } from "../../validations/ecommerce.js";
import { createAdminNotification } from "../../utils/AdminNotification.js";

export const checkoutController = {

  checkout: asyncHandler(async (req, res) => {
    const { paymentMethod } = checkoutSchema.parse(req.body);

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: { product: true }
        }
      }
    });
    
    const address = await prisma.address.findFirst({
      where: {
        userId: req.user.id,
        isDefault: true
      }
    });

    if (!address) {
      throw new ApiError(400, "Please set a default address before checkout");
    }

    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, "Cart is empty");
    }

    let total = 0;

    //  calculate total + stock check
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new ApiError(400, `${item.product.name} out of stock`);
      }

      total += item.product.price * item.quantity;
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user.id,
        total,
        addressId: address.id,
        items: {
          create: cart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price
          }))
        }
      },
      include: { items: true }
    });

    // update stock
    for (const item of cart.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity }
        }
      });

      const updated = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (updated.stock <= updated.lowStock) {
        await prisma.notification.create({
          data: {
            message: `${updated.name} is low on stock (${updated.stock})`
          }
        });
      }
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: total,
        provider: paymentMethod,
        status: paymentMethod === "RAZORPAY" ? "SUCCESS" : "PENDING",
        paymentId: paymentMethod === "RAZORPAY" ? `RAZORPAY-${Date.now()}` : null
      }
    });

    await createAdminNotification({
      title: "New Order",
      message: `Order #${order.id} created`,
      type: "ORDER",
      link: `/admin/ecommerce/orders/${order.id}`,
    });

    res.json({
      success: true,
      message: "Order placed",
      data: order
    });
  })
};