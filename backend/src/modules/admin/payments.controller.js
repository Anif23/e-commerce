import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination } from '../../lib/query.js';
import { round2 } from '../../lib/money.js';

/**
 * A payments-first view for the admin console: every gateway/COD payment with
 * its order context, filterable by status, provider and period, so finance can
 * see how each order was paid without opening every order.
 */

const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED'];
const PROVIDERS = ['COD', 'RAZORPAY', 'STRIPE', 'PAYPAL', 'MOCK'];

const rangeToDateFilter = (range) => {
  const days = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }[range];
  if (!days) return {};
  return { createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } };
};

const serializePayment = (payment) => ({
  id: payment.id,
  orderId: payment.orderId,
  amount: round2(payment.amount),
  currency: payment.currency,
  status: payment.status,
  provider: payment.provider,
  method: payment.method,
  reference: payment.paymentId,
  gatewayOrderId: payment.gatewayOrderId,
  payerEmail: payment.payerEmail,
  payerContact: payment.payerContact,
  failureCode: payment.failureCode,
  capturedAt: payment.capturedAt,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
  order: payment.order
    ? {
        id: payment.order.id,
        status: payment.order.status,
        total: round2(payment.order.total),
        placedAt: payment.order.createdAt,
        customer: payment.order.user
          ? { id: payment.order.user.id, username: payment.order.user.username, email: payment.order.user.email }
          : null,
      }
    : null,
});

export const adminPaymentsController = {
  /** GET /api/admin/payments */
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);

    const status = req.query.status ? String(req.query.status).toUpperCase() : null;
    const provider = req.query.provider ? String(req.query.provider).toUpperCase() : null;
    const range = req.query.range ? String(req.query.range) : null;
    const search = req.query.q ? String(req.query.q).trim() : null;

    const where = {
      ...(status && PAYMENT_STATUSES.includes(status) ? { status } : {}),
      ...(provider && PROVIDERS.includes(provider) ? { provider } : {}),
      ...rangeToDateFilter(range),
      ...(search
        ? {
            OR: [
              { paymentId: { contains: search, mode: 'insensitive' } },
              { gatewayOrderId: { contains: search, mode: 'insensitive' } },
              { payerEmail: { contains: search, mode: 'insensitive' } },
              { order: { id: Number.isFinite(Number(search)) ? Number(search) : undefined } },
            ].filter((clause) => Object.values(clause).some((value) => value !== undefined)),
          }
        : {}),
    };

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { order: { include: { user: { select: { id: true, username: true, email: true } } } } },
      }),
    ]);

    res.json({
      success: true,
      data: payments.map(serializePayment),
      pagination: getMeta(total, page, limit),
    });
  }),

  /** GET /api/admin/payments/stats */
  stats: asyncHandler(async (req, res) => {
    const range = req.query.range ? String(req.query.range) : null;
    const dateFilter = rangeToDateFilter(range);

    const grouped = await prisma.payment.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: { _all: true },
      _sum: { amount: true },
    });

    const byProvider = await prisma.payment.groupBy({
      by: ['provider'],
      where: dateFilter,
      _count: { _all: true },
      _sum: { amount: true },
    });

    const byStatus = Object.fromEntries(PAYMENT_STATUSES.map((status) => [status, 0]));
    let captured = 0;
    let pending = 0;
    let refunded = 0;

    for (const row of grouped) {
      byStatus[row.status] = row._count._all;
      if (row.status === 'SUCCESS') captured += row._sum.amount ?? 0;
      if (row.status === 'PENDING') pending += row._sum.amount ?? 0;
      if (row.status === 'REFUNDED') refunded += row._sum.amount ?? 0;
    }

    res.json({
      success: true,
      data: {
        range: range ?? 'all',
        byStatus,
        byProvider: byProvider.map((row) => ({
          provider: row.provider,
          count: row._count._all,
          amount: round2(row._sum.amount ?? 0),
        })),
        totals: {
          captured: round2(captured),
          pending: round2(pending),
          refunded: round2(refunded),
        },
      },
    });
  }),
};
