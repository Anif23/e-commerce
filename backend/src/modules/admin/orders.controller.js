import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination } from '../../lib/query.js';
import { round2 } from '../../lib/money.js';
import { addEvent, getOrderOrThrow, serializeOrder } from '../orders/order.service.js';
import { createUserNotification } from '../../services/notifications.js';
import { emitOrderUpdate } from '../../realtime/socket.js';

const statusSchema = z.object({
  status: z.enum(['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'EXPIRED']),
  trackingNumber: z.string().trim().max(80).optional(),
  trackingCarrier: z.string().trim().max(80).optional(),
  trackingUrl: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional(),
});

const paymentSchema = z.object({
  status: z.enum(['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED']),
});

/** Guards against nonsense transitions (e.g. DELIVERED -> PROCESSING). */
const ALLOWED_TRANSITIONS = {
  PENDING_PAYMENT: ['PAID', 'PROCESSING', 'CANCELLED', 'EXPIRED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export const adminOrdersController = {
  /** GET /api/admin/orders */
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    const search = req.query.search ? String(req.query.search).trim() : null;
    const paymentStatus = req.query.paymentStatus ? String(req.query.paymentStatus).toUpperCase() : null;

    const where = {
      ...(status && { status }),
      ...(paymentStatus && { payment: { status: paymentStatus } }),
      ...(search && {
        OR: [
          { user: { username: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          ...(Number.isInteger(Number(search)) ? [{ id: Number(search) }] : []),
        ],
      }),
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: { include: { images: { select: { url: true } } } }, variant: true } },
          payment: true,
          address: true,
          user: { select: { id: true, username: true, email: true } },
          events: { orderBy: { createdAt: 'asc' } },
        },
      }),
    ]);

    res.json({
      success: true,
      data: orders.map((order) => serializeOrder(order)),
      pagination: getMeta(total, page, limit),
    });
  }),

  /** GET /api/admin/orders/:id */
  detail: asyncHandler(async (req, res) => {
    const order = await getOrderOrThrow(req.params.id);

    res.json({ success: true, data: serializeOrder(order) });
  }),

  /** PATCH /api/admin/orders/:id/status */
  updateStatus: asyncHandler(async (req, res) => {
    const body = statusSchema.parse(req.body);
    const order = await getOrderOrThrow(req.params.id);

    if (order.status !== body.status && !ALLOWED_TRANSITIONS[order.status]?.includes(body.status)) {
      throw ApiError.badRequest(`Cannot move an order from ${order.status} to ${body.status}`);
    }

    const data = { status: body.status };

    if (body.status === 'SHIPPED') data.shippedAt = new Date();
    if (body.status === 'DELIVERED') data.deliveredAt = new Date();
    if (body.status === 'CANCELLED') data.cancelledAt = new Date();

    if (body.trackingNumber !== undefined) data.trackingNumber = body.trackingNumber || null;
    if (body.trackingCarrier !== undefined) data.trackingCarrier = body.trackingCarrier || null;
    if (body.trackingUrl !== undefined) data.trackingUrl = body.trackingUrl || null;

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data });

      await addEvent(tx, {
        orderId: order.id,
        status: body.status,
        message: body.note || `Order marked ${body.status.toLowerCase().replace('_', ' ')}`,
        actor: 'admin',
      });

      if (body.status === 'DELIVERED' && order.payment?.provider === 'COD') {
        await tx.payment.update({ where: { orderId: order.id }, data: { status: 'SUCCESS' } });
      }
    });

    const updated = await getOrderOrThrow(order.id);

    await createUserNotification({
      userId: order.userId,
      title: 'Order update',
      message: `Order #${order.id} is now ${body.status.toLowerCase().replace('_', ' ')}`,
      type: 'ORDER',
      link: `/orders/${order.id}`,
    });

    emitOrderUpdate(updated, body.status);

    res.json({ success: true, message: 'Order updated', data: serializeOrder(updated) });
  }),

  /** PATCH /api/admin/orders/:id/payment */
  updatePayment: asyncHandler(async (req, res) => {
    const { status } = paymentSchema.parse(req.body);
    const order = await getOrderOrThrow(req.params.id);

    if (!order.payment) throw ApiError.badRequest('This order has no payment record');

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { orderId: order.id }, data: { status } });

      if (status === 'REFUNDED') {
        await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });

        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });

          await tx.stockLog.create({
            data: {
              productId: item.productId,
              variantId: item.variantId,
              change: item.quantity,
              reason: `Order #${order.id} refunded`,
            },
          });
        }

        await addEvent(tx, { orderId: order.id, status: 'CANCELLED', message: 'Payment refunded', actor: 'admin' });
      }
    });

    const updated = await getOrderOrThrow(order.id);

    res.json({ success: true, message: 'Payment updated', data: serializeOrder(updated) });
  }),

  /** GET /api/admin/orders/stats/counters */
  counters: asyncHandler(async (_req, res) => {
    const rows = await prisma.order.groupBy({ by: ['status'], _count: { _all: true } });

    const counters = rows.reduce((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const today = await prisma.order.aggregate({
      where: { createdAt: { gte: todayStart } },
      _count: { _all: true },
      _sum: { total: true },
    });

    res.json({
      success: true,
      data: { counters, today: { orders: today._count._all, revenue: round2(today._sum.total ?? 0) } },
    });
  }),
};
