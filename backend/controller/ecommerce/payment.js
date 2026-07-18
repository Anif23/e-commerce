import { prisma } from "../../config/prisma.js";
import paypalClient from "../../config/paypal.js";
import { OrdersController } from "@paypal/paypal-server-sdk";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { io } from "../../index.js";

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

        console.log("paypalOrderId", paypalOrderId);

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
        });

    })

};