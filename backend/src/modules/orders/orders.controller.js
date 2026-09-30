import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination } from '../../lib/query.js';
import { cancelOrder, getOrderOrThrow, serializeOrder } from './order.service.js';

export const ordersController = {
  /** GET /api/orders */
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 10, 50);
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;

    const where = {
      userId: req.user.id,
      ...(status && { status }),
    };

    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product: { include: { images: { select: { url: true } } } },
              variant: true,
            },
          },
          payment: true,
          address: true,
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

  /** GET /api/orders/:id */
  detail: asyncHandler(async (req, res) => {
    const order = await getOrderOrThrow(req.params.id);

    if (order.userId !== req.user.id) throw ApiError.forbidden('This order is not yours');

    res.json({ success: true, data: serializeOrder(order) });
  }),

  /** POST /api/orders/:id/cancel */
  cancel: asyncHandler(async (req, res) => {
    const order = await getOrderOrThrow(req.params.id);

    if (order.userId !== req.user.id) throw ApiError.forbidden('This order is not yours');

    const updated = await cancelOrder({
      order,
      reason: req.body?.reason || 'Cancelled by customer',
      actor: req.user.username,
    });

    res.json({ success: true, message: 'Order cancelled', data: serializeOrder(updated) });
  }),

  /** GET /api/orders/:id/track — compact payload for the tracking view */
  track: asyncHandler(async (req, res) => {
    const order = await getOrderOrThrow(req.params.id);

    if (order.userId !== req.user.id) throw ApiError.forbidden('This order is not yours');

    const steps = [
      { key: 'PLACED', label: 'Order placed', status: 'PENDING_PAYMENT' },
      { key: 'PAID', label: 'Payment confirmed', status: 'PAID' },
      { key: 'PROCESSING', label: 'Packed & ready', status: 'PROCESSING' },
      { key: 'SHIPPED', label: 'On the way', status: 'SHIPPED' },
      { key: 'DELIVERED', label: 'Delivered', status: 'DELIVERED' },
    ];

    const orderIndex = steps.findIndex((step) => step.status === order.status);
    const cancelled = order.status === 'CANCELLED' || order.status === 'EXPIRED';

    res.json({
      success: true,
      data: {
        id: order.id,
        status: order.status,
        cancelled,
        placedAt: order.placedAt,
        deliveredAt: order.deliveredAt,
        tracking: { number: order.trackingNumber, carrier: order.trackingCarrier, url: order.trackingUrl },
        currentStep: cancelled ? null : Math.max(0, orderIndex),
        steps: steps.map((step, index) => ({
          ...step,
          done: !cancelled && index <= Math.max(0, orderIndex),
        })),
        timeline: (order.events ?? []).map((event) => ({
          status: event.status,
          message: event.message,
          actor: event.actor,
          createdAt: event.createdAt,
        })),
      },
    });
  }),

  /** GET /api/orders/stats/summary — little counters for the account page */
  stats: asyncHandler(async (req, res) => {
    const [grouped, spent] = await Promise.all([
      prisma.order.groupBy({ by: ['status'], where: { userId: req.user.id }, _count: { _all: true } }),
      prisma.order.aggregate({
        where: { userId: req.user.id, status: { notIn: ['CANCELLED', 'EXPIRED'] } },
        _sum: { total: true },
      }),
    ]);

    const counts = grouped.reduce((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        total: Object.values(counts).reduce((sum, value) => sum + value, 0),
        byStatus: counts,
        lifetimeSpend: spent._sum.total ?? 0,
      },
    });
  }),
};
