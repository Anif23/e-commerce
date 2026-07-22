import { prisma } from "../../config/prisma.js";
import paypalClient from "../../config/paypal.js";
import { OrdersController } from "@paypal/paypal-server-sdk";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { io } from "../../index.js";
import { getPagination, getMeta } from "../../utils/pagination.js";

const ordersController = new OrdersController(paypalClient);

export const paymentController = {

    createPaypalOrder: asyncHandler(async (req, res) => {

        const { orderId } = req.body;

        const order = await prisma.order.findUnique({
            where: {
                id: orderId
            },
            include: {
                payment: true
            }
        });

        if (!order) {
            throw new ApiError(404, "Order not found");
        }

        if (order.status === "PAID") {
            throw new ApiError(400, "Order is already paid");
        }

        const collect = {
            body: {
                intent: "CAPTURE",
                purchaseUnits: [
                    {
                        referenceId: String(order.id),
                        amount: {
                            currencyCode: "USD",
                            value: order.total.toFixed(2),
                        }
                    }
                ]
            },
            prefer: "return=representation"
        };

        const response = await ordersController.createOrder(collect);

        const paypalOrder = response.result;

        await prisma.payment.update({
            where: {
                orderId: order.id,
            },
            data: {
                paymentId: paypalOrder.id,
            },
        });

        return res.json({
            success: true,
            paypalOrderId: paypalOrder.id,
            status: paypalOrder.status,
            links: paypalOrder.links,
        });

    }),

    capturePaypalOrder: asyncHandler(async (req, res) => {

        const { paypalOrderId } = req.body;

        if (!paypalOrderId) {
            throw new ApiError(400, "paypalOrderId is required");
        }

        const payment = await prisma.payment.findFirst({
            where: {
                paymentId: paypalOrderId
            },
            include: {
                order: {
                    include: {
                        items: true
                    }
                }
            }
        });

        if (payment.status === "SUCCESS") {
            throw new ApiError(400, "Payment already captured");
        }

        if (!payment) {
            throw new ApiError(404, "Payment not found");
        }

        const collect = {
            id: paypalOrderId,
            prefer: "return=representation"
        };

        const response = await ordersController.captureOrder(collect);

        const result = response.result;

        if (result.status !== "COMPLETED") {
            throw new ApiError(400, "Payment failed");
        }

        if (
            payment.order.expiresAt &&
            payment.order.expiresAt < new Date()
        ) {

            throw new ApiError(
                400,
                "Order payment window expired."
            );

        }

        const capture = result.purchaseUnits[0].payments.captures[0];

        const payer = result.payer;

        try {
            await prisma.$transaction(async (tx) => {

                await tx.payment.update({
                    where: {
                        orderId: payment.order.id,
                    },
                    data: {
                        status: "SUCCESS",
                        provider: "PAYPAL",
                        paymentId: capture.id,
                        payerId: payer.payerId,
                        payerEmail: payer.emailAddress,
                    },
                });

                await tx.order.update({
                    where: {
                        id: payment.order.id,
                    },
                    data: {
                        status: "PAID",
                    },
                });

                io.emit("order_updated", {
                    type: "PAID",
                    orderId: payment.order.id,
                });

                for (const item of payment.order.items) {
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
                }

                const cart = await tx.cart.findUnique({
                    where: {
                        userId: payment.order.userId,
                    },
                });

                if (cart) {

                    await tx.cartItem.deleteMany({
                        where: {
                            cartId: cart.id,
                        },
                    });
                }
            });
        } catch (err) {
            console.error(err);
            throw err;
        }

        res.json({
            success: true,
            message: "Your payment was successful and your order has been placed.",
            transaction: {
                transactionId: capture.id,
                amount: capture.amount.value,
                currency: capture.amount.currencyCode,
                status: capture.status,
                payerEmail: payer.emailAddress,
            },
        });

    }),


    getMyPayments: asyncHandler(
        async (req, res) => {

            const {
                page = 1,
                search,
                status,
                provider,
            } = req.query;

            const { limit } =
                getPagination(req.query);

            const currentPage =
                Number(page);

            const where = {

                order: {
                    userId: req.user.id,
                },

                ...(status && {
                    status,
                }),

                ...(provider && {
                    provider,
                }),

                ...(search && {
                    OR: [
                        {
                            paymentId: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            payerEmail: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    ],
                }),
            };

            const total =
                await prisma.payment.count({
                    where,
                });

            const data =
                await prisma.payment.findMany({

                    where,

                    skip:
                        (currentPage - 1) *
                        limit,

                    take: limit,

                    orderBy: {
                        createdAt: "desc",
                    },

                    include: {
                        order: {
                            include: {
                                items: {
                                    include: {
                                        product: true,
                                    },
                                },
                            },
                        },
                    },
                });

            res.json({
                success: true,
                data,
                pagination:
                    getMeta(
                        total,
                        currentPage,
                        limit
                    ),
            });
        }
    )


};