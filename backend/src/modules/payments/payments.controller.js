import { z } from 'zod';

import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getOrderOrThrow, isOnlinePayment, finalizePayment, serializeOrder } from '../orders/order.service.js';
import { confirmPayment, listPaymentMethods } from '../../services/payments/index.js';
import { createAdminNotification, createUserNotification } from '../../services/notifications.js';
import { emitOrderUpdate } from '../../realtime/socket.js';
import { constructWebhookEvent } from '../../services/payments/stripe.js';
import { prisma } from '../../lib/prisma.js';

const confirmSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  payload: z.record(z.string(), z.any()).optional(),
});

export const paymentsController = {
  /** GET /api/payments/methods */
  methods: asyncHandler(async (_req, res) => {
    res.json({ success: true, data: listPaymentMethods() });
  }),

  /**
   * POST /api/payments/confirm
   * Single entry point for every gateway: the provider is read from the order's
   * payment row, so the frontend never has to branch on gateway specifics.
   */
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

    const { failed, alreadyProcessed } = await finalizePayment({ order, result });

    if (!failed && !alreadyProcessed) {
      const updated = await getOrderOrThrow(orderId);

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

      return res.json({
        success: true,
        message: 'Payment confirmed — your order is on its way',
        data: { order: serializeOrder(updated) },
      });
    }

    if (failed) {
      return res.status(402).json({
        success: false,
        message: 'We could not process that payment. Please try again.',
        data: { order: serializeOrder(await getOrderOrThrow(orderId)) },
      });
    }

    res.json({ success: true, message: 'Payment already confirmed', data: { order: serializeOrder(await getOrderOrThrow(orderId)) } });
  }),

  /**
   * POST /api/payments/stripe/webhook
   * Raw-body endpoint so Stripe signature verification works. Orders are
   * finalised from the webhook as well as the client callback — whichever wins.
   */
  stripeWebhook: asyncHandler(async (req, res) => {
    const event = constructWebhookEvent(req.body, req.headers['stripe-signature']);

    if (!event) {
      return res.json({ success: true, message: 'Stripe webhook not configured' });
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object;
      const orderId = Number(intent.metadata?.orderId);

      if (orderId) {
        const order = await getOrderOrThrow(orderId).catch(() => null);

        if (order && order.status === 'PENDING_PAYMENT') {
          await finalizePayment({
            order,
            result: { status: 'SUCCESS', reference: intent.id, payerEmail: intent.receipt_email ?? null },
          });
        }
      }
    }

    res.json({ success: true, received: true });
  }),

  /** POST /api/payments/:orderId/fail — records a cancelled/abandoned gateway attempt */
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
