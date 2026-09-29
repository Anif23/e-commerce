import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/errors.js';
import { round2 } from '../../lib/money.js';

const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const RANGES = {
  '7d': { days: 7, bucket: 'day' },
  '30d': { days: 30, bucket: 'day' },
  '90d': { days: 90, bucket: 'week' },
  '12m': { days: 365, bucket: 'month' },
};

export const reportsController = {
  /** GET /api/admin/reports?range=30d */
  overview: asyncHandler(async (req, res) => {
    const range = RANGES[req.query.range] ? req.query.range : '30d';
    const { days, bucket } = RANGES[range];

    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);

    const [series, totals, previousTotals, topProducts, categoryRows, couponRows, newCustomers] = await Promise.all([
      prisma.$queryRaw`
        SELECT date_trunc(${bucket}, "createdAt") AS bucket,
               COUNT(*)::int AS orders,
               COALESCE(SUM(total), 0)::float AS revenue
        FROM "Order"
        WHERE "createdAt" >= ${start} AND status::text IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY 1
        ORDER BY 1
      `,
      prisma.order.aggregate({
        where: { createdAt: { gte: start }, status: { in: REVENUE_STATUSES } },
        _sum: { total: true, discount: true },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: { createdAt: { gte: previousStart, lt: start }, status: { in: REVENUE_STATUSES } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { createdAt: { gte: start }, status: { in: REVENUE_STATUSES } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 8,
      }),
      prisma.$queryRaw`
        SELECT c.name AS category,
               COALESCE(SUM(oi.total), 0)::float AS revenue,
               COALESCE(SUM(oi.quantity), 0)::int AS units
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        JOIN "Product" p ON p.id = oi."productId"
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE o."createdAt" >= ${start} AND o.status::text IN ('PAID','PROCESSING','SHIPPED','DELIVERED')
        GROUP BY 1
        ORDER BY 2 DESC
      `,
      prisma.coupon.findMany({
        where: { usedCount: { gt: 0 } },
        select: { id: true, code: true, type: true, value: true, usedCount: true },
        orderBy: { usedCount: 'desc' },
        take: 5,
      }),
      prisma.user.count({ where: { role: 'USER', createdAt: { gte: start } } }),
    ]);

    const productIds = topProducts.map((row) => row.productId);
    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, slug: true, images: { select: { url: true }, take: 1 } },
        })
      : [];

    const revenue = round2(totals._sum.total ?? 0);
    const previousRevenue = round2(previousTotals._sum.total ?? 0);
    const orders = totals._count._all;

    res.json({
      success: true,
      data: {
        range,
        summary: {
          revenue,
          orders,
          averageOrderValue: orders ? round2(revenue / orders) : 0,
          discountsGiven: round2(totals._sum.discount ?? 0),
          newCustomers,
          revenueChangePercent:
            previousRevenue > 0 ? round2(((revenue - previousRevenue) / previousRevenue) * 100) : revenue > 0 ? 100 : 0,
          ordersChangePercent:
            previousTotals._count._all > 0
              ? round2(((orders - previousTotals._count._all) / previousTotals._count._all) * 100)
              : orders > 0
                ? 100
                : 0,
        },
        series: series.map((row) => ({
          date: row.bucket,
          orders: Number(row.orders),
          revenue: round2(Number(row.revenue)),
        })),
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
        categories: categoryRows.map((row) => ({
          category: row.category,
          revenue: round2(Number(row.revenue)),
          units: Number(row.units),
        })),
        coupons: couponRows.map((coupon) => ({
          code: coupon.code,
          type: coupon.type,
          value: Number(coupon.value),
          uses: coupon.usedCount,
        })),
      },
    });
  }),

  /** GET /api/admin/reports/inventory */
  inventory: asyncHandler(async (_req, res) => {
    const products = await prisma.product.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        stock: true,
        lowStock: true,
        price: true,
        soldCount: true,
        category: { select: { name: true } },
      },
      orderBy: { stock: 'asc' },
    });

    const valuation = products.reduce((sum, product) => sum + product.stock * product.price, 0);

    res.json({
      success: true,
      data: {
        valuation: round2(valuation),
        outOfStock: products.filter((product) => product.stock === 0).length,
        lowStock: products.filter((product) => product.stock > 0 && product.stock <= product.lowStock).length,
        products,
      },
    });
  }),
};
