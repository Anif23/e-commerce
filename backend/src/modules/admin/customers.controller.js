import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination } from '../../lib/query.js';
import { round2 } from '../../lib/money.js';

const roleSchema = z.object({ role: z.enum(['USER', 'ADMIN']) });
const blockSchema = z.object({ isBlocked: z.boolean() });

export const customersController = {
  /** GET /api/admin/customers */
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);
    const search = req.query.search ? String(req.query.search).trim() : null;

    const where = {
      ...(search && {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [total, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isBlocked: true,
          createdAt: true,
          _count: { select: { orders: true, reviews: true } },
        },
      }),
    ]);

    const ids = customers.map((customer) => customer.id);

    const spend = ids.length
      ? await prisma.order.groupBy({
          by: ['userId'],
          where: { userId: { in: ids }, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
          _sum: { total: true },
        })
      : [];

    res.json({
      success: true,
      data: customers.map((customer) => ({
        ...customer,
        totalSpent: round2(spend.find((row) => row.userId === customer.id)?._sum.total ?? 0),
      })),
      pagination: getMeta(total, page, limit),
    });
  }),

  /** GET /api/admin/customers/:id */
  detail: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isBlocked: true,
        createdAt: true,
        addresses: true,
        _count: { select: { orders: true, reviews: true } },
      },
    });

    if (!customer) throw ApiError.notFound('Customer not found');

    const [orders, spend, tickets] = await Promise.all([
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { payment: { select: { status: true, provider: true } } },
      }),
      prisma.order.aggregate({
        where: { userId: id, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
        _sum: { total: true },
      }),
      prisma.supportTicket.count({ where: { userId: id } }),
    ]);

    res.json({
      success: true,
      data: {
        ...customer,
        totalSpent: round2(spend._sum.total ?? 0),
        openTickets: tickets,
        orders: orders.map((order) => ({
          id: order.id,
          total: round2(order.total),
          status: order.status,
          createdAt: order.createdAt,
          payment: order.payment,
        })),
      },
    });
  }),

  /** PATCH /api/admin/customers/:id/role */
  setRole: asyncHandler(async (req, res) => {
    const { role } = roleSchema.parse(req.body);

    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { role } });

    res.json({
      success: true,
      message: `${user.username} is now ${role.toLowerCase()}`,
      data: { id: user.id, role: user.role },
    });
  }),

  /** PATCH /api/admin/customers/:id/block */
  setBlocked: asyncHandler(async (req, res) => {
    const { isBlocked } = blockSchema.parse(req.body);

    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data: { isBlocked } });

    if (isBlocked) {
      await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    }

    res.json({
      success: true,
      message: isBlocked ? 'Account suspended' : 'Account reactivated',
      data: { id: user.id, isBlocked: user.isBlocked },
    });
  }),
};
