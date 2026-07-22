import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { io } from "../../index.js";
import { getMeta, getPagination } from "../../utils/pagination.js";

export const orderController = {

    getUserOrders: asyncHandler(async (req, res) => {

        const {
            page = 1,
            search,
            status,
        } = req.query;

        const { limit } =
            getPagination(req.query);

        const currentPage =
            Number(page);

        const orderId = Number(search);

        const where = {
            userId: req.user.id,

            ...(status && { status }),

            ...(search &&
                !isNaN(orderId) && {
                id: orderId,
            }),
        };

        const total =
            await prisma.order.count({
                where,
            });

        const data =
            await prisma.order.findMany({
                where,

                skip:
                    (currentPage - 1) *
                    limit,

                take: limit,

                orderBy: {
                    createdAt: "desc",
                },

                include: {
                    payment: true,

                    items: {
                        include: {
                            product: {
                                include: {
                                    images: true,
                                },
                            },
                        },
                    },
                },
            });

        res.json({
            success: true,
            data,

            pagination: getMeta(
                total,
                currentPage,
                limit
            ),
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
    }),

    cancelOrder: asyncHandler(async (req, res) => {
        const orderId = Number(req.params.id);

        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId: req.user.id,
            },
            include: {
                payment: true,
            },
        });

        if (!order) {
            throw new ApiError(404, "Order not found");
        }

        if (order.status !== "PENDING_PAYMENT") {
            throw new ApiError(400, "Only pending payment orders can be cancelled");
        }

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: {
                    id: order.id,
                },
                data: {
                    status: "CANCELLED",
                },
            });

            await tx.payment.update({
                where: {
                    orderId: order.id,
                },
                data: {
                    status: "CANCELLED",
                },
            });
        });

        io.emit("order_updated", {
            type: "CANCELLED",
            orderId: order.id,
        });

        return res.json({
            success: true,
            message: "Order cancelled successfully",
        });
    }),

    expireOrder: asyncHandler(async (req, res) => {
        const orderId = Number(req.params.id);

        const order = await prisma.order.findFirst({
            where: {
                status: "PENDING_PAYMENT",
                expiresAt: {
                    not: null,
                    lt: new Date(),
                }
            },
            include: {
                payment: true,
            },
        });

        if (!order) {
            throw new ApiError(404, "Order not found");
        }

        if (order.status !== "PENDING_PAYMENT") {
            return res.json({
                success: true,
                message: "Order already processed",
            });
        }

        if (!order.expiresAt || order.expiresAt > new Date()) {
            throw new ApiError(400, "Order has not expired yet");
        }

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: { id: order.id },
                data: {
                    status: "EXPIRED",
                },
            });

            await tx.payment.update({
                where: {
                    orderId: order.id,
                },
                data: {
                    status: "FAILED",
                },
            });
        });

        io.emit("order_updated", {
            type: "EXPIRED",
            orderId: order.id,
        });

        return res.json({
            success: true,
            message: "Order expired",
        });
    }),
};