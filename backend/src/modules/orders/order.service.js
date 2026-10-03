import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { env } from '../../config/env.js';
import { summarizeCart } from '../cart/cart.service.js';
import { getStoreSettings } from '../store/storeSettings.service.js';
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

const ONLINE_PROVIDERS = ['RAZORPAY', 'STRIPE'];

class PaymentStockUnavailable extends Error {}

const reserveStockForPaidOrder = async (tx, item, orderId) => {
  const quantity = Math.abs(Number(item.quantity) || 0);
  const reason = `Order #${orderId} paid`;

  if (item.variantId) {
    const variant = await tx.productVariant.updateMany({
      where: { id: item.variantId, productId: item.productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (!variant.count) throw new PaymentStockUnavailable('Stock changed before payment confirmation');

    const product = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (!product.count) throw new PaymentStockUnavailable('Product stock changed before payment confirmation');

    await tx.stockLog.create({ data: { productId: item.productId, variantId: item.variantId, change: -quantity, reason } });
  } else {
    const product = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: quantity } },
      data: { stock: { decrement: quantity } },
    });
    if (!product.count) throw new PaymentStockUnavailable('Stock changed before payment confirmation');
    await tx.stockLog.create({ data: { productId: item.productId, change: -quantity, reason } });
  }

  await tx.product.update({ where: { id: item.productId }, data: { soldCount: { increment: quantity } } });
};

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
    taxName: order.taxName,
    taxRatePercent: order.taxRatePercent,
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
        gatewayOrderId: order.payment.gatewayOrderId,
        payerEmail: order.payment.payerEmail,
        payerContact: order.payment.payerContact,
        currency: order.payment.currency,
        method: order.payment.method,
        capturedAt: order.payment.capturedAt,
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

const recordSuccessfulPayment = (tx, order, result) =>
  tx.payment.update({
    where: { orderId: order.id },
    data: {
      status: 'SUCCESS',
      paymentId: result.reference ?? order.payment?.paymentId ?? null,
      payerEmail: result.payerEmail ?? null,
      payerId: result.payerId ?? null,
      payerContact: result.payerContact ?? null,
      method: result.method ?? null,
      currency: result.currency ?? order.payment?.currency ?? env.currency,
      capturedAt: new Date(),
      failureCode: null,
    },
  });

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
 * Finds an unpaid order that still matches the current cart so a shopper who
 * lets a payment lapse (or hits "pay again") reuses the same order instead of
 * spawning a duplicate. This mirrors how Flipkart/Amazon keep one order per
 * checkout and simply reopen the payment window.
 */
const findReusableOrder = async ({ userId, lines }) => {
  const candidate = await prisma.order.findFirst({
    where: { userId, status: { in: ['PENDING_PAYMENT', 'EXPIRED'] } },
    orderBy: { id: 'desc' },
    include: { items: true, payment: true },
  });

  if (!candidate) return null;

  const identical =
    candidate.items.length === lines.length &&
    lines.every((line) =>
      candidate.items.some(
        (item) =>
          item.productId === line.productId &&
          (item.variantId ?? null) === (line.variantId ?? null) &&
          item.quantity === line.quantity,
      ),
    );

  return identical ? candidate : null;
};

/**
 * Reopens the payment window on an order that is still unpaid. Safe because
 * online orders only reserve stock once payment is confirmed, so nothing has to
 * be restocked — we simply extend the deadline and restart the gateway payment.
 */
export const reopenOrderForPayment = async (order) => {
  const expiresAt = new Date(Date.now() + env.paymentWindowMinutes * 60_000);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: { in: ['PENDING_PAYMENT', 'EXPIRED'] } },
      data: { status: 'PENDING_PAYMENT', expiresAt },
    });

    if (!claimed.count) throw ApiError.badRequest('This order is no longer awaiting payment');

    await tx.payment.update({
      where: { orderId: order.id },
      data: { status: 'PENDING', amount: order.total, currency: env.currency, failureCode: null },
    });

    if (order.status === 'EXPIRED') {
      await addEvent(tx, {
        orderId: order.id,
        status: 'PENDING_PAYMENT',
        message: 'Payment window reopened',
        actor: 'customer',
      });
    }
  });

  return getOrderOrThrow(order.id);
};

/** Refreshes an existing unpaid order to the current cart/address and reopens it. */
const reuseOrder = async ({ order, address, provider, customerNote, totals }) => {
  const expiresAt = new Date(Date.now() + env.paymentWindowMinutes * 60_000);
  const wasExpired = order.status === 'EXPIRED';

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PENDING_PAYMENT',
        addressId: address.id,
        customerNote: customerNote ?? null,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
        taxName: totals.taxName,
        taxRatePercent: totals.taxRatePercent,
        total: totals.total,
        expiresAt,
      },
    });

    await tx.payment.update({
      where: { orderId: order.id },
      data: { provider, status: 'PENDING', amount: totals.total, currency: env.currency, failureCode: null },
    });

    await addEvent(tx, {
      orderId: order.id,
      status: 'PENDING_PAYMENT',
      message: wasExpired ? 'Payment window reopened' : 'Checkout restarted for the same order',
      actor: 'customer',
    });
  });

  return getOrderOrThrow(order.id);
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

  // Online only: reuse an existing unpaid order for the same cart instead of
  // creating a duplicate when the shopper retries a lapsed payment. COD orders
  // reserve stock and clear the cart immediately, so they are never reused.
  if (online) {
    const reusable = await findReusableOrder({ userId, lines });

    if (reusable) {
      const revived = await reuseOrder({ order: reusable, address, provider, customerNote, totals });

      emitOrderUpdate(revived, 'REOPENED');

      return { order: revived, totals, online, reused: true };
    }
  }

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
        taxName: totals.taxName,
        taxRatePercent: totals.taxRatePercent,
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
        currency: env.currency,
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
export const finalizePayment = async ({ order, result }) => {
  try {
    return await prisma.$transaction(async (tx) => {
    // Serialize browser confirmations and asynchronous webhooks for one order.
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
    const current = await tx.order.findUnique({
      where: { id: order.id },
      include: { items: true, payment: true },
    });

    if (!current) throw ApiError.notFound('Order not found');

    if (
      ['EXPIRED', 'CANCELLED'].includes(current.status) &&
      result.status === 'SUCCESS' &&
      current.payment &&
      current.payment.status !== 'SUCCESS'
    ) {
      await recordSuccessfulPayment(tx, current, result);
      await addEvent(tx, {
        orderId: current.id,
        status: current.status,
        message: `Late payment received via ${current.payment.provider}; refund review required`,
        actor: 'system',
      });
      return { latePayment: true, alreadyProcessed: false, order: current };
    }

    if (current.status !== 'PENDING_PAYMENT' || current.payment?.status === 'SUCCESS') {
      return { alreadyProcessed: true, order: current };
    }

    if (result.status === 'PENDING') {
      return { alreadyProcessed: false, pending: true, order: current };
    }

    if (result.status !== 'SUCCESS') {
      await tx.payment.update({
        where: { orderId: current.id },
        data: {
          status: 'FAILED',
          failureCode: result.failureCode ?? null,
          ...(result.reference ? { paymentId: result.reference } : {}),
        },
      });

      return { alreadyProcessed: false, failed: true, order: current };
    }

    // Re-check expiry: a late gateway callback must not resurrect an expired order.
    if (current.expiresAt && new Date(current.expiresAt) < new Date()) {
      await tx.order.update({ where: { id: current.id }, data: { status: 'EXPIRED', expiresAt: null } });
      await recordSuccessfulPayment(tx, current, result);
      await addEvent(tx, {
        orderId: current.id,
        status: 'EXPIRED',
        message: `Late payment received via ${current.payment?.provider ?? 'gateway'}; refund review required`,
        actor: 'system',
      });
      return { latePayment: true, alreadyProcessed: false, expired: true, order: current };
    }

    // A conditional update is the concurrency guard: webhook and browser
    // confirmation may race, but only one transaction can reserve stock.
    const claimed = await tx.order.updateMany({
      where: { id: current.id, status: 'PENDING_PAYMENT' },
      data: { status: 'PAID', expiresAt: null },
    });

    if (claimed.count === 0) return { alreadyProcessed: true, order: current };

    await recordSuccessfulPayment(tx, current, result);

    const updated = await tx.order.findUnique({ where: { id: current.id } });

    for (const item of current.items) {
      await reserveStockForPaidOrder(tx, item, current.id);
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
  } catch (error) {
    if (!(error instanceof PaymentStockUnavailable) || result.status !== 'SUCCESS') throw error;

    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
      const current = await tx.order.findUnique({
        where: { id: order.id },
        include: { payment: true },
      });
      if (!current) throw ApiError.notFound('Order not found');
      if (
        ['EXPIRED', 'CANCELLED'].includes(current.status) &&
        current.payment?.status !== 'SUCCESS'
      ) {
        await recordSuccessfulPayment(tx, current, result);
        await addEvent(tx, {
          orderId: current.id,
          status: current.status,
          message: 'Payment captured but stock is no longer available; refund review required',
          actor: 'system',
        });
        return { latePayment: true, stockUnavailable: true, alreadyProcessed: false, order: current };
      }
      if (current.status !== 'PENDING_PAYMENT' || current.payment?.status === 'SUCCESS') {
        return { alreadyProcessed: true, order: current };
      }

      const expired = Boolean(current.expiresAt && new Date(current.expiresAt) < new Date());
      const status = expired ? 'EXPIRED' : 'CANCELLED';
      await tx.order.update({
        where: { id: current.id },
        data: { status, expiresAt: null, ...(expired ? {} : { cancelledAt: new Date() }) },
      });
      await recordSuccessfulPayment(tx, current, result);
      await addEvent(tx, {
        orderId: current.id,
        status,
        message: 'Payment captured but stock is no longer available; refund review required',
        actor: 'system',
      });

      return { latePayment: true, stockUnavailable: true, expired, alreadyProcessed: false, order: current };
    });
  }
};

/** Cancels an order and restores stock when it had already been reserved. */
export const cancelOrder = async ({ order, reason = 'Cancelled by customer', actor = 'customer' }) => {
  let refundReview = false;

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${order.id} FOR UPDATE`;
    const current = await tx.order.findUnique({
      where: { id: order.id },
      include: { items: true, payment: true },
    });

    if (!current) throw ApiError.notFound('Order not found');
    if (['CANCELLED', 'DELIVERED', 'EXPIRED'].includes(current.status)) {
      throw ApiError.badRequest(`An order that is ${current.status.toLowerCase()} cannot be cancelled`);
    }

    const stockWasReserved = ['PAID', 'PROCESSING', 'SHIPPED'].includes(current.status);
    const changed = await tx.order.updateMany({
      where: { id: current.id, status: current.status },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (!changed.count) throw ApiError.conflict('This order changed while it was being cancelled');

    if (current.payment?.status === 'SUCCESS') {
      // Keep the capture visible until a real refund has been processed.
      refundReview = true;
    } else if (current.payment) {
      await tx.payment.update({
        where: { orderId: current.id },
        data: { status: 'CANCELLED', failureCode: 'ORDER_CANCELLED' },
      });
    }

    if (stockWasReserved) {
      for (const item of current.items) {
        await applyStockChange(tx, {
          productId: item.productId,
          variantId: item.variantId ?? null,
          change: Math.abs(item.quantity),
          reason: `Order #${current.id} cancelled`,
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { soldCount: { decrement: Math.max(0, Number(item.quantity) || 0) } },
        });
      }
    }

    await addEvent(tx, { orderId: current.id, status: 'CANCELLED', message: reason, actor });
  });

  const updated = await getOrderOrThrow(order.id);

  await createUserNotification({
    userId: order.userId,
    title: 'Order cancelled',
    message: `Order #${order.id} was cancelled`,
    type: 'ORDER',
    link: `/orders/${order.id}`,
  });

  if (refundReview) {
    await createAdminNotification({
      title: 'Cancelled prepaid order needs refund review',
      message: `Order #${order.id} was cancelled after payment was captured. Review its refund.`,
      type: 'PAYMENT',
      link: `/admin/orders/${order.id}`,
    });
  }

  emitOrderUpdate(updated, 'CANCELLED');

  return updated;
};

/** Starts or retries the gateway payment for a pending order. */
export const startPayment = async ({ order, provider }) => {
  const settings = await getStoreSettings();
  const result = await createPayment({ provider, order, amount: order.total, storeName: settings.storeName });

  await prisma.payment.update({
    where: { orderId: order.id },
    data: {
      provider,
      status: 'PENDING',
      currency: env.currency,
      paymentId: result.reference ?? null,
      gatewayOrderId: result.gatewayOrderId ?? null,
      failureCode: null,
    },
  });

  return result;
};
