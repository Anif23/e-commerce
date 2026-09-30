import { z } from 'zod';

import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getOrderOrThrow, isOnlinePayment, finalizePayment, serializeOrder } from '../orders/order.service.js';
import { confirmPayment, listPaymentMethods } from '../../services/payments/index.js';
import { constructWebhookEvent as constructStripeWebhookEvent } from '../../services/payments/stripe.js';
import { constructWebhookEvent as constructRazorpayWebhookEvent } from '../../services/payments/razorpay.js';
import { createAdminNotification, createUserNotification } from '../../services/notifications.js';
import { emitOrderUpdate } from '../../realtime/socket.js';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';

const confirmSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  payload: z.record(z.string(), z.any()).optional(),
});

const unavailableWebhook = (gateway) => ({
  success: false,
  message: `${gateway} webhook is not configured`,
});

/** Finalize at most once, and fan out notifications only for the winning transition. */
const processPaymentResult = async ({ order, result }) => {
  const finalized = await finalizePayment({ order, result });

  if (finalized.latePayment) {
    const updated = await getOrderOrThrow(order.id);
    await createAdminNotification({
      title: 'Payment needs review',
      message: `Payment for order #${order.id} was captured, but the order could not be fulfilled; review a refund.`,
      type: 'PAYMENT',
      link: `/admin/orders/${order.id}`,
    });
    await createUserNotification({
      userId: order.userId,
      title: 'Payment needs review',
      message: `Payment for order #${order.id} was captured, but the order could not be completed. Our team will review it and any refund.`,
      type: 'ORDER',
      link: `/orders/${order.id}`,
    });
    emitOrderUpdate(updated, 'LATE_PAYMENT');
    return { ...finalized, updated };
  }

  if (finalized.failed || finalized.pending || finalized.alreadyProcessed) {
    return { ...finalized, updated: await getOrderOrThrow(order.id) };
  }

  const updated = await getOrderOrThrow(order.id);
  await createUserNotification({
    userId: order.userId,
    title: 'Payment received',
    message: `Thanks! Payment for order #${order.id} was confirmed`,
    type: 'ORDER',
    link: `/orders/${order.id}`,
  });
  await createAdminNotification({
    title: 'Payment received',
    message: `Order #${order.id} was paid`,
    type: 'PAYMENT',
    link: `/admin/orders/${order.id}`,
  });
  emitOrderUpdate(updated, 'PAID');

  return { ...finalized, updated };
};

const webhookOrderId = (metadata) => {
  const value = Number(metadata?.orderId);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};

export const paymentsController = {
  /** GET /api/payments/methods */
  methods: asyncHandler(async (_req, res) => {
    res.json({ success: true, data: listPaymentMethods() });
  }),

  /** Authenticated confirmation always verifies status directly with the gateway. */
  confirm: asyncHandler(async (req, res) => {
    const { orderId, payload = {} } = confirmSchema.parse(req.body);
    const order = await getOrderOrThrow(orderId);

    if (order.userId !== req.user.id) throw ApiError.forbidden('This order is not yours');
    if (!isOnlinePayment(order.payment?.provider)) {
      throw ApiError.badRequest('This order does not require an online payment');
    }

    if (order.status === 'PAID') {
      return res.json({ success: true, message: 'Payment already confirmed', data: { order: serializeOrder(order) } });
    }
    if (order.status !== 'PENDING_PAYMENT') {
      throw ApiError.badRequest('This order is no longer awaiting payment');
    }

    const result = await confirmPayment({
      provider: order.payment.provider,
      payment: order.payment,
      payload,
      order,
      amount: order.total,
    });
    const outcome = await processPaymentResult({ order, result });

    if (outcome.failed) {
      return res.status(402).json({
        success: false,
        message: outcome.expired
          ? 'The payment window expired before payment confirmation.'
          : 'We could not verify that payment. Please try again.',
        data: { order: serializeOrder(outcome.updated) },
      });
    }

    if (outcome.pending) {
      return res.status(202).json({
        success: true,
        message: 'Your payment is processing. We will update this order when the gateway confirms it.',
        data: { order: serializeOrder(outcome.updated), paymentPending: true },
      });
    }

    if (outcome.latePayment) {
      return res.json({
        success: true,
        message: 'Payment was captured but the order could not be completed. Our team has been notified to review the order and any refund.',
        data: { order: serializeOrder(outcome.updated), paymentLate: true },
      });
    }

    return res.json({
      success: true,
      message: 'Payment confirmed — your order is on its way',
      data: { order: serializeOrder(outcome.updated) },
    });
  }),

  /** Stripe sends signed events to this raw-body endpoint. */
  stripeWebhook: asyncHandler(async (req, res) => {
    const event = constructStripeWebhookEvent(req.rawBody, req.headers['stripe-signature']);
    if (!event) return res.status(503).json(unavailableWebhook('Stripe'));

    const intent = event.data?.object;
    if (!intent) return res.json({ success: true, received: true });

    const isSuccess = event.type === 'payment_intent.succeeded';
    const isFailure = ['payment_intent.payment_failed', 'payment_intent.canceled'].includes(event.type);
    if (!isSuccess && !isFailure) return res.json({ success: true, received: true });

    const orderId = webhookOrderId(intent.metadata);
    if (!orderId) return res.json({ success: true, received: true });
    const order = await getOrderOrThrow(orderId).catch(() => null);

    if (
      order?.payment?.provider === 'STRIPE' &&
      order.payment.paymentId === intent.id &&
      order.status === 'PENDING_PAYMENT'
    ) {
      const amountMatches = Number(intent.amount_received || intent.amount) === Math.round(order.total * 100);
      const currencyMatches = String(intent.currency).toUpperCase() === env.currency;
      const result = isSuccess && amountMatches && currencyMatches
        ? {
            status: 'SUCCESS',
            reference: intent.id,
            payerEmail: intent.receipt_email ?? null,
            method: intent.payment_method_types?.[0] ?? null,
            currency: env.currency,
          }
        : {
            status: 'FAILED',
            reference: intent.id,
            failureCode: isSuccess ? 'AMOUNT_OR_CURRENCY_MISMATCH' : intent.last_payment_error?.code ?? intent.status,
          };

      await processPaymentResult({ order, result });
    }

    res.json({ success: true, received: true });
  }),

  /** Razorpay signs both checkout callbacks and webhooks; verify server-side. */
  razorpayWebhook: asyncHandler(async (req, res) => {
    const event = constructRazorpayWebhookEvent(req.rawBody, req.headers['x-razorpay-signature']);
    if (!event) return res.status(503).json(unavailableWebhook('Razorpay'));

    const isSuccess = event.event === 'payment.captured';
    const isFailure = event.event === 'payment.failed';
    if (!isSuccess && !isFailure) return res.json({ success: true, received: true });

    const gatewayPayment = event.payload?.payment?.entity;
    if (!gatewayPayment?.order_id || !gatewayPayment?.id) return res.json({ success: true, received: true });

    const payment = await prisma.payment.findFirst({
      where: { provider: 'RAZORPAY', gatewayOrderId: String(gatewayPayment.order_id) },
    });
    if (!payment) return res.json({ success: true, received: true });

    const order = await getOrderOrThrow(payment.orderId).catch(() => null);
    if (order?.status === 'PENDING_PAYMENT' && order.payment?.provider === 'RAZORPAY') {
      const amountMatches = Number(gatewayPayment.amount) === Math.round(order.total * 100);
      const currencyMatches = String(gatewayPayment.currency).toUpperCase() === env.currency;
      const result = isSuccess && gatewayPayment.status === 'captured' && amountMatches && currencyMatches
        ? {
            status: 'SUCCESS',
            reference: gatewayPayment.id,
            payerEmail: gatewayPayment.email ?? null,
            payerContact: gatewayPayment.contact ?? null,
            method: gatewayPayment.method ?? null,
            currency: env.currency,
          }
        : {
            status: 'FAILED',
            reference: gatewayPayment.id,
            failureCode: isSuccess ? 'AMOUNT_OR_CURRENCY_MISMATCH' : gatewayPayment.error_code ?? 'PAYMENT_FAILED',
          };

      await processPaymentResult({ order, result });
    }

    res.json({ success: true, received: true });
  }),

  /** Records a shopper closing or abandoning an online attempt. */
  fail: asyncHandler(async (req, res) => {
    const order = await getOrderOrThrow(req.params.orderId);
    if (order.userId !== req.user.id) throw ApiError.forbidden('This order is not yours');

    if (order.payment && order.status === 'PENDING_PAYMENT') {
      await prisma.payment.update({
        where: { orderId: order.id },
        data: { status: 'CANCELLED', failureCode: 'ABANDONED' },
      });
    }

    res.json({ success: true, message: 'Payment attempt cancelled' });
  }),
};
