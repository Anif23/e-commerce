import { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/errors.js';
import { round2 } from '../../lib/money.js';

const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const monthsBack = (count) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
  return start;
};

export const dashboardController = {
  /** GET /api/admin/dashboard */
  stats: asyncHandler(async (_req, res) => {
    const start = monthsBack(6);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalProducts,
      activeProducts,
      totalCategories,
      totalCustomers,
      totalOrders,
      pendingOrders,
      lowStockProducts,
      outOfStock,
      revenueAgg,
      monthRevenue,
      prevMonthRevenue,
      monthlyRows,
      statusRows,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      prisma.product.count({ where: { isDeleted: false } }),
      prisma.product.count({ where: { isDeleted: false, isActive: true } }),
      prisma.category.count(),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: { in: ['PENDING_PAYMENT', 'PAID', 'PROCESSING'] } } }),
      prisma.product.findMany({
        where: { isDeleted: false },
        select: { id: true, name: true, stock: true, lowStock: true, soldCount: true },
      }),
      prisma.product.count({ where: { isDeleted: false, stock: 0 } }),
      prisma.order.aggregate({ where: { status: { in: REVENUE_STATUSES } }, _sum: { total: true } }),
      prisma.order.aggregate({
        where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: { in: REVENUE_STATUSES },
          createdAt: { gte: prevMonthStart, lt: monthStart },
        },
        _sum: { total: true },
      }),
      prisma.$queryRaw`
        SELECT date_trunc('month', "createdAt") AS month,
               COUNT(*)::int AS orders,
               COALESCE(SUM(total), 0)::float AS revenue
        FROM "Order"
        WHERE "createdAt" >= ${start} AND status::text IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true, email: true } }, payment: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const productIds = topProducts.map((row) => row.productId);
    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, slug: true, images: { select: { url: true }, take: 1 } },
        })
      : [];

    const lowStock = lowStockProducts
      .filter((product) => product.stock <= product.lowStock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6);

    // Fill missing months so charts always render a continuous series.
    const monthlySales = Array.from({ length: 6 }, (_unused, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const row = monthlyRows.find((entry) => new Date(entry.month).getTime() === date.getTime());

      return {
        month: date.toLocaleString('default', { month: 'short' }),
        orders: Number(row?.orders ?? 0),
        revenue: round2(Number(row?.revenue ?? 0)),
      };
    });

    const revenue = round2(revenueAgg._sum.total ?? 0);
    const thisMonth = round2(monthRevenue._sum.total ?? 0);
    const lastMonth = round2(prevMonthRevenue._sum.total ?? 0);

    res.json({
      success: true,
      data: {
        cards: {
          revenue,
          orders: totalOrders,
          customers: totalCustomers,
          products: totalProducts,
          activeProducts,
          categories: totalCategories,
          pendingOrders,
          outOfStock,
          lowStockCount: lowStock.length,
          revenueThisMonth: thisMonth,
          revenueGrowthPercent: lastMonth > 0 ? round2(((thisMonth - lastMonth) / lastMonth) * 100) : thisMonth > 0 ? 100 : 0,
          averageOrderValue: totalOrders ? round2(revenue / totalOrders) : 0,
        },
        monthlySales,
        ordersByStatus: statusRows.map((row) => ({ status: row.status, count: row._count._all })),
        lowStock,
        topProducts: topProducts.map((row) => {
          const product = products.find((entry) => entry.id === row.productId);
          return {
            id: row.productId,
            name: product?.name ?? 'Removed product',
            slug: product?.slug ?? null,
            image: product?.images?.[0]?.url ?? null,
            units: row._sum.quantity ?? 0,
            revenue: round2(row._sum.total ?? 0),
          };
        }),
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          total: round2(order.total),
          status: order.status,
          createdAt: order.createdAt,
          paymentStatus: order.payment?.status ?? null,
          customer: order.user,
        })),
      },
    });
  }),

  /** GET /api/admin/dashboard/activity — notifications feed */
  activity: asyncHandler(async (_req, res) => {
    const notifications = await prisma.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    res.json({ success: true, data: notifications });
  }),
};
