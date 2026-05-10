import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";

export const orderController = {

    getUserOrders: asyncHandler(async (req, res) => {
        const orders = await prisma.order.findMany({
            where: { userId: req.user.id },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                images: true
                            }
                        }
                    }
                },
                payment: true
            },
            orderBy: { createdAt: "desc" }
        });

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });
    }),

    getOrderById: asyncHandler(async (req, res) => {
        const orderId = Number(req.params.id);

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            include: { images: true }
                        }
                    }
                },
                payment: true
            }
        });

        if (!order) {
            throw new ApiError(404, "Order not found");
        }

        if (order.userId !== req.user.id) {
            throw new ApiError(403, "Access denied");
        }

        res.json({
            success: true,
            data: order
        });
    })
};