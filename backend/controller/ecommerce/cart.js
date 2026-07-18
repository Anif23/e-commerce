import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { cartSchema } from "../../validations/ecommerce.js";

export const cartController = {

    getCart: asyncHandler(async (req, res) => {

        let existingOrder = await prisma.order.findFirst({
            where: {
                userId: req.user.id,
                status: "PENDING_PAYMENT",
                expiresAt: {
                    not: null,
                },
            },
            include: {
                payment: true,
            },
        });

        if (
            existingOrder &&
            existingOrder.expiresAt &&
            existingOrder.expiresAt <= new Date()
        ) {
            await prisma.$transaction(async (tx) => {
                await tx.order.update({
                    where: { id: existingOrder.id },
                    data: { status: "EXPIRED" },
                });

                await tx.payment.update({
                    where: { orderId: existingOrder.id },
                    data: { status: "FAILED" },
                });
            });

            existingOrder = null;
        }

        const cart = await prisma.cart.findUnique({
            where: {
                userId: req.user.id,
            },
            include: {
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
            data: {
                cart,
                existingOrder,
            },
        });
    }),

    addToCart: asyncHandler(async (req, res) => {
        const body = cartSchema.parse(req.body);

        const product = await prisma.product.findUnique({
            where: { id: body.productId }
        });

        if (!product || !product.isActive) {
            throw new ApiError(404, "Product not available");
        }

        if (product.stock < body.quantity) {
            throw new ApiError(400, "Insufficient stock");
        }

        // find or create cart
        let cart = await prisma.cart.findUnique({
            where: { userId: req.user.id }
        });

        if (!cart) {
            cart = await prisma.cart.create({
                data: { userId: req.user.id }
            });
        }

        // check existing item
        const existingItem = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId: body.productId
            }
        });

        if (existingItem) {
            await prisma.cartItem.update({
                where: { id: existingItem.id },
                data: {
                    quantity: existingItem.quantity + body.quantity
                }
            });
        } else {
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: body.productId,
                    quantity: body.quantity
                }
            });
        }

        res.json({ success: true, message: "Added to cart" });
    }),

    updateCartItem: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            throw new ApiError(400, "Quantity must be at least 1");
        }

        const item = await prisma.cartItem.findUnique({
            where: { id: Number(id) },
            include: { product: true }
        });

        if (!item) throw new ApiError(404, "Cart item not found");

        if (item.product.stock < quantity) {
            throw new ApiError(400, "Insufficient stock");
        }

        const updated = await prisma.cartItem.update({
            where: { id: Number(id) },
            data: { quantity }
        });

        res.json({ success: true, data: updated });
    }),

    removeCartItem: asyncHandler(async (req, res) => {
        const { id } = req.params;

        await prisma.cartItem.delete({
            where: { id: Number(id) }
        });

        res.json({ success: true, message: "Item removed" });
    }),

    clearCart: asyncHandler(async (req, res) => {
        const cart = await prisma.cart.findUnique({
            where: { userId: req.user.id }
        });

        if (!cart) return res.json({ success: true });

        await prisma.cartItem.deleteMany({
            where: { cartId: cart.id }
        });

        res.json({ success: true, message: "Cart cleared" });
    })
};