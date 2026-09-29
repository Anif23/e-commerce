import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { summarizeCart } from '../cart/cart.service.js';
import { round2 } from '../../lib/money.js';
import { assertStockAvailable, applyStockChange } from '../../services/inventory.js';
import { createPayment } from '../../services/payments/index.js';
import { createAdminNotification, createUserNotification } from '../../services/notifications.js';
import { emitOrderUpdate } from '../../realtime/socket.js';

/**
 * Order lifecycle: placement, payment finalisation, cancellation.
 * Every state change writes an OrderEvent so the tracking timeline is a real
 * audit trail rather than something reconstructed from timestamps.
 */

const ONLINE_PROVIDERS = ['PAYPAL', 'STRIPE', 'MOCK'];

export const isOnlinePayment = (provider) => ONLINE_PROVIDERS.includes(provider);

const orderInclude = {
  items: {
    include: {
      product: { include: { images: { select: { url: true } }, category: { select: { id: true, name: true, slug: true } } } },
      variant: true,
    },
  },
  payment: true,
  address: true,
  events: { orderBy: { createdAt: 'asc' } },
  user: { select: { id: true, username: true, email: true } },
};

export const getOrderOrThrow = async (id) => {
  const order = await prisma.order.findUnique({ where: { id: Number(id) }, include: orderInclude });

  if (!order) throw ApiError.notFound('Order not found');

  return order;
};

export const serializeOrder = (order) => ({
  id: order.id,
  status: order.status,
  placedAt: order.placedAt ?? order.createdAt,
  shippedAt: order.shippedAt,
  deliveredAt: order.deliveredAt,
  cancelledAt: order.cancelledAt,
  expiresAt: order.expiresAt,
  totals: {
    subtotal: round2(order.subtotal),
    discount: round2(order.discount),
    shipping: round2(order.shipping),
    tax: round2(order.tax),
    total: round2(order.total),
  },
  couponCode: order.couponCode,
  customerNote: order.customerNote,
  tracking: {
    number: order.trackingNumber,
    carrier: order.trackingCarrier,
    url: order.trackingUrl,
  },
  address: order.address,
  items: order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    name: item.name,
    slug: item.product?.slug ?? null,
    image: item.image ?? item.product?.images?.[0]?.url ?? null,
    variantLabel: item.variantLabel,
    price: round2(item.price),
    quantity: item.quantity,
    total: round2(item.total),
  })),
  payment: order.payment
    ? {
        id: order.payment.id,
        provider: order.payment.provider,
        status: order.payment.status,
        amount: round2(order.payment.amount),
        reference: order.payment.paymentId,
        payerEmail: order.payment.payerEmail,
        updatedAt: order.payment.updatedAt,
      }
    : null,
  timeline: (order.events ?? []).map((event) => ({
    id: event.id,
    status: event.status,
    message: event.message,
    actor: event.actor,
    createdAt: event.createdAt,
  })),
  user: order.user,
});

/** Appends an event to the tracking timeline. */
export const addEvent = async (tx, { orderId, status, message, actor = 'system' }) =>
  tx.orderEvent.create({ data: { orderId, status, message, actor } });

const bookCouponUsage = async (tx, { couponId, userId, orderId }) => {
  if (!couponId) return;

  await tx.couponUsage.create({ data: { couponId, userId, orderId } });
  await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
};

const clearCart = async (tx, userId) => {
  const cart = await tx.cart.findUnique({ where: { userId }, select: { id: true } });

  if (!cart) return;

  await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
  await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
};

/**
 * Places an order from the current cart.
 * Online payments stay PENDING_PAYMENT until the gateway confirms; COD moves
 * straight to PROCESSING and reserves stock immediately.
 */
export const placeOrder = async ({ userId, addressId, provider, customerNote }) => {
  const { cart, lines, coupon, totals } = await summarizeCart(userId);

  if (!lines.length) throw ApiError.badRequest('Your cart is empty');

  const address = await prisma.address.findFirst({
    where: {
      userId,
      ...(addressId ? { id: Number(addressId) } : { isDefault: true }),
    },
  });

  if (!address) throw ApiError.badRequest(addressId ? 'Address not found' : 'Add a delivery address first');

  assertStockAvailable(
    cart.items.map((item, index) => ({
      product: item.product,
      variant: item.variant,
      quantity: item.quantity,
      variantLabel: lines[index]?.variantLabel ?? null,
    })),
  );

  if (totals.total <= 0) throw ApiError.badRequest('Order total must be greater than zero');

  const online = isOnlinePayment(provider);

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        addressId: address.id,
        status: online ? 'PENDING_PAYMENT' : 'PROCESSING',
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
        total: totals.total,
        couponId: coupon?.id ?? null,
        couponCode: totals.discount > 0 ? coupon.code : null,
        customerNote: customerNote ?? null,
        expiresAt: online ? new Date(Date.now() + env.paymentWindowMinutes * 60_000) : null,
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            name: line.name,
            image: line.image,
            variantLabel: line.variantLabel,
            price: line.unitPrice,
            quantity: line.quantity,
            total: line.total,
          })),
        },
      },
    });

    await tx.payment.create({
      data: {
        orderId: created.id,
        amount: totals.total,
        provider,
        status: 'PENDING',
      },
    });

    await addEvent(tx, {
      orderId: created.id,
      status: created.status,
      message: online ? 'Order placed — waiting for payment' : 'Order placed (cash on delivery)',
      actor: 'customer',
    });

    if (!online) {
      for (const line of lines) {
        await applyStockChange(tx, {
          productId: line.productId,
          variantId: line.variantId ?? null,
          change: -Math.abs(line.quantity),
          reason: `Order #${created.id}`,
        });

        await tx.product.update({ where: { id: line.productId }, data: { soldCount: { increment: line.quantity } } });
      }

      await bookCouponUsage(tx, { couponId: coupon?.id, userId, orderId: created.id });
      await clearCart(tx, userId);

      await addEvent(tx, { orderId: created.id, status: 'PROCESSING', message: 'Payment collected on delivery', actor: 'system' });
    }

    return created;
  });

  const full = await getOrderOrThrow(order.id);

  await createAdminNotification({
    title: 'New order',
    message: `Order #${order.id} for ${totals.total.toFixed(2)}`,
    type: 'ORDER',
    link: `/admin/orders/${order.id}`,
  });

  await createUserNotification({
    userId,
    title: 'Order placed',
    message: `We received your order #${order.id}`,
    type: 'ORDER',
    link: `/orders/${order.id}`,
  });

  emitOrderUpdate(order, 'CREATED');

  return { order: full, totals, online };
};

/**
 * Finalises a payment: marks the order paid, reserves stock, clears the cart.
 * Runs inside its own transaction so a gateway callback can never half-apply.
 */
export const finalizePayment = async ({ order, result }) =>
  prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: order.id },
      include: { items: true, payment: true },
    });

    if (!current) throw ApiError.notFound('Order not found');

    if (current.status === 'PAID' || current.status === 'DELIVERED') {
      return { alreadyProcessed: true, order: current };
    }

    if (current.payment?.status === 'SUCCESS') {
      return { alreadyProcessed: true, order: current };
    }

    if (result.status !== 'SUCCESS') {
      await tx.payment.update({
        where: { orderId: current.id },
        data: { status: 'FAILED', failureCode: result.failureCode ?? null, paymentId: result.reference ?? null },
      });

      return { alreadyProcessed: false, failed: true, order: current };
    }

    // Re-check expiry: a slow gateway callback must not resurrect a dead order.
    if (current.expiresAt && new Date(current.expiresAt) < new Date()) {
      await tx.order.update({ where: { id: current.id }, data: { status: 'EXPIRED' } });
      await tx.payment.update({ where: { orderId: current.id }, data: { status: 'FAILED', failureCode: 'EXPIRED' } });
      throw ApiError.badRequest('The payment window for this order has expired');
    }

    await tx.payment.update({
      where: { orderId: current.id },
      data: {
        status: 'SUCCESS',
        paymentId: result.reference ?? null,
        payerEmail: result.payerEmail ?? null,
        payerId: result.payerId ?? null,
        failureCode: null,
      },
    });

    const updated = await tx.order.update({
      where: { id: current.id },
      data: { status: 'PAID', expiresAt: null },
    });

    for (const item of current.items) {
      await applyStockChange(tx, {
        productId: item.productId,
        variantId: item.variantId ?? null,
        change: -Math.abs(item.quantity),
        reason: `Order #${current.id} paid`,
      });

      await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: item.quantity } } });
    }

    await bookCouponUsage(tx, {
      couponId: current.couponId,
      userId: current.userId,
      orderId: current.id,
    });

    await clearCart(tx, current.userId);

    await addEvent(tx, {
      orderId: current.id,
      status: 'PAID',
      message: `Payment received via ${current.payment?.provider ?? 'gateway'}`,
      actor: 'system',
    });

    return { alreadyProcessed: false, failed: false, order: updated };
  });

/** Cancels an order and restores stock when it had already been reserved. */
export const cancelOrder = async ({ order, reason = 'Cancelled by customer', actor = 'customer' }) => {
  if (['CANCELLED', 'DELIVERED', 'EXPIRED'].includes(order.status)) {
    throw ApiError.badRequest(`An order that is ${order.status.toLowerCase()} cannot be cancelled`);
  }

  const stockWasReserved = ['PAID', 'PROCESSING', 'SHIPPED'].includes(order.status);

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });

    if (order.payment) {
      await tx.payment.update({
        where: { orderId: order.id },
        data: { status: 'CANCELLED', failureCode: 'ORDER_CANCELLED' },
      });
    }

    if (stockWasReserved) {
      for (const item of order.items) {
        await applyStockChange(tx, {
          productId: item.productId,
          variantId: item.variantId ?? null,
          change: Math.abs(item.quantity),
          reason: `Order #${order.id} cancelled`,
        });

        // Only give back the units this order actually sold, and never below zero.
        await tx.product.update({
          where: { id: item.productId },
          data: { soldCount: { decrement: Math.max(0, Number(item.quantity) || 0) } },
        });
      }
    }

    await addEvent(tx, { orderId: order.id, status: 'CANCELLED', message: reason, actor });
  });

  const updated = await getOrderOrThrow(order.id);

  await createUserNotification({
    userId: order.userId,
    title: 'Order cancelled',
    message: `Order #${order.id} was cancelled`,
    type: 'ORDER',
    link: `/orders/${order.id}`,
  });

  emitOrderUpdate(updated, 'CANCELLED');

  return updated;
};

/** Starts the gateway payment for a pending order (idempotent per order). */
export const startPayment = async ({ order, provider }) => {
  const result = await createPayment({ provider, order, amount: order.total });

  if (result.reference) {
    await prisma.payment.update({
      where: { orderId: order.id },
      data: { paymentId: result.reference, provider },
    });
  }

  return result;
};
