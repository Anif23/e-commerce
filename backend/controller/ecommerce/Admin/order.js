import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../utils/AsyncHandler.js";
import { ApiError } from "../../../utils/ApiError.js";
import { getPagination, getMeta } from "../../../utils/pagination.js";
import { searchBy } from "../../../utils/common.js";
import { createUserNotification } from "../../../utils/UserNotification.js";
import { io } from "../../../index.js";

export const adminOrderController = {

    getAllOrders: asyncHandler(
        async (req, res) => {
            const {
                search,
                status,
                page = 1,
            } = req.query;

            const { limit } = getPagination(req.query);

            const currentPage = Number(page);

            const where = {
                ...searchBy("user.username", search),

                ...(status && { status }),
            };

            const total =
                await prisma.order.count(
                    {
                        where,
                    }
                );

            const data =
                await prisma.order.findMany(
                    {
                        where,

                        skip:
                            (currentPage -
                                1) *
                            limit,

                        take: limit,

                        orderBy:
                        {
                            createdAt:
                                "desc",
                        },

                        include:
                        {
                            user: true,
                            items: {
                                include:
                                {
                                    product: true,
                                },
                            },
                            payment: true
                        },
                    }
                );

            res.json({
                success:
                    true,
                data,
                pagination:
                    getMeta(
                        total,
                        currentPage,
                        limit
                    ),
            });
        }
    ),

    getOrderById: asyncHandler(async (req, res) => {
        const orderId = Number(req.params.id);

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            include: { images: true }
                        },
                    }
                },
                address: true,
                user: true,
                payment: true
            }
        });

        if (!order) {
            throw new ApiError(404, "Order not found");
        }

        res.json({
            success: true,
            data: order
        });
    }),

    updateOrderStatus: asyncHandler(async (req, res) => {

        const orderId = Number(req.params.id);
        const { status } = req.body;

        if (!status) {
            throw new ApiError(400, "Status is required");
        }

        const validStatus = [
            "PENDING_PAYMENT",
            "PAID",
            "PROCESSING",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
        ];

        if (!validStatus.includes(status)) {
            throw new ApiError(400, "Invalid status");
        }

        const order = await prisma.order.findUnique({
            where: {
                id: orderId,
            },
        });

        if (!order) {
            throw new ApiError(404, "Order not found");
        }

        const allowedTransitions = {

            PENDING_PAYMENT: [
                "PAID",
                "PROCESSING",
                "CANCELLED",
            ],

            PAID: [
                "PROCESSING",
                "CANCELLED",
            ],

            PROCESSING: [
                "SHIPPED",
                "CANCELLED",
            ],

            SHIPPED: [
                "DELIVERED",
            ],

            DELIVERED: [],

            CANCELLED: [],
        };

        if (
            !allowedTransitions[order.status].includes(status)
        ) {
            throw new ApiError(
                400,
                `Cannot change status from ${order.status} to ${status}`
            );
        }

        const updated = await prisma.order.update({
            where: {
                id: orderId,
            },
            data: {
                status,
            },
        });

        // If order marked as PAID, mark related payment as SUCCESS
        if (status === "PAID") {
            await prisma.payment.updateMany({
                where: { orderId: orderId },
                data: { status: "SUCCESS" },
            });
        }

        await createUserNotification({
            title: "Order Updated",
            message: `Order #${updated.id} status updated to ${updated.status}`,
            type: "ORDER",
            link: `/user/ecommerce/orders/${updated.id}`,
            userId: updated.userId,
        });

        io.emit("user_order_updated", {
            type: "UPDATED",
            orderId: updated.id,
        });

        res.json({
            success: true,
            message: "Order status updated",
            data: updated,
        });

    }),

    updatePaymentStatus: asyncHandler(async (req, res) => {
        const orderId = Number(req.params.id);
        const { status } = req.body;

        if (!status || status.toString().trim() === "") {
            throw new ApiError(400, "Please give a status to update");
        }

        const payment = await prisma.payment.update({
            where: { orderId: Number(orderId) },
            data: { status }
        });

        res.json({
            success: true,
            message: "Payment updated",
            data: payment
        });
    })
};