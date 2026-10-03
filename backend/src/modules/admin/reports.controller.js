import PDFDocument from 'pdfkit';

import { prisma } from '../../lib/prisma.js';
import { asyncHandler, ApiError } from '../../lib/errors.js';
import { round2 } from '../../lib/money.js';

const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const RANGES = {
  '7d': { days: 7, bucket: 'day' },
  '30d': { days: 30, bucket: 'day' },
  '90d': { days: 90, bucket: 'week' },
  '12m': { days: 365, bucket: 'month' },
};

/** Resolves a report window from either a preset range or explicit from/to. */
const resolveWindow = (query) => {
  const from = query.from ? new Date(String(query.from)) : null;
  const to = query.to ? new Date(String(query.to)) : null;

  if (from && to) {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw ApiError.badRequest('Invalid from/to date');
    }
    // Include the whole end day.
    const end = new Date(to.getTime());
    end.setUTCHours(23, 59, 59, 999);
    return { start: from, end, label: `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}` };
  }

  const range = RANGES[query.range] ? query.range : '30d';
  const { days } = RANGES[range];
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { start, end: new Date(), label: `Last ${days} days` };
};

const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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

  /**
   * GET /api/admin/reports/export?format=csv|pdf&range=30d  (or &from=&to=)
   * Streams a downloadable sales report for the selected period.
   */
  export: asyncHandler(async (req, res) => {
    const format = String(req.query.format ?? 'csv').toLowerCase();
    if (!['csv', 'pdf'].includes(format)) throw ApiError.badRequest('Format must be csv or pdf');

    const { start, end, label } = resolveWindow(req.query);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { in: REVENUE_STATUSES } },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        user: { select: { username: true, email: true } },
        payment: { select: { provider: true, status: true } },
      },
    });

    const revenue = round2(orders.reduce((sum, order) => sum + order.total, 0));
    const discount = round2(orders.reduce((sum, order) => sum + order.discount, 0));
    const aov = orders.length ? round2(revenue / orders.length) : 0;

    const rows = orders.map((order) => ({
      order: `#${order.id}`,
      date: order.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      customer: order.user?.username ?? '—',
      email: order.user?.email ?? '',
      status: order.status,
      payment: order.payment?.provider ?? '—',
      items: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: round2(order.subtotal),
      discount: round2(order.discount),
      shipping: round2(order.shipping),
      tax: round2(order.tax),
      total: round2(order.total),
    }));

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const header = ['Order', 'Date', 'Customer', 'Email', 'Status', 'Payment', 'Items', 'Subtotal', 'Discount', 'Shipping', 'Tax', 'Total'];
      const lines = [
        `Sales report,${csvCell(label)}`,
        `Generated,${stamp},Orders,${orders.length},Revenue,${revenue},Discounts,${discount},AOV,${aov}`,
        '',
        header.join(','),
        ...rows.map((row) =>
          [row.order, row.date, row.customer, row.email, row.status, row.payment, row.items, row.subtotal, row.discount, row.shipping, row.tax, row.total]
            .map(csvCell)
            .join(','),
        ),
      ];

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${stamp}.csv"`);
      return res.send(lines.join('\n'));
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${stamp}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text('Sales report', { align: 'left' });
    doc.fontSize(10).fillColor('#555').text(`Period: ${label}   ·   Generated: ${stamp}`);
    doc.moveDown(0.5);

    doc.fillColor('#000').fontSize(11);
    doc.text(`Orders: ${orders.length}      Revenue: ${revenue}      Discounts: ${discount}      Avg order: ${aov}`);
    doc.moveDown();

    const columns = [
      { key: 'order', label: 'Order', width: 55 },
      { key: 'date', label: 'Date', width: 95 },
      { key: 'customer', label: 'Customer', width: 90 },
      { key: 'status', label: 'Status', width: 70 },
      { key: 'payment', label: 'Payment', width: 70 },
      { key: 'items', label: 'Qty', width: 30 },
      { key: 'total', label: 'Total', width: 70 },
    ];

    const drawHeader = () => {
      let x = doc.page.margins.left;
      const y = doc.y;
      doc.fontSize(9).fillColor('#000');
      columns.forEach((column) => {
        doc.text(column.label, x, y, { width: column.width, continued: false });
        x += column.width;
      });
      doc.moveTo(doc.page.margins.left, doc.y + 2).lineTo(doc.page.width - doc.page.margins.right, doc.y + 2).stroke();
      doc.moveDown(0.6);
    };

    drawHeader();

    rows.forEach((row) => {
      if (doc.y > doc.page.height - 70) {
        doc.addPage();
        drawHeader();
      }
      let x = doc.page.margins.left;
      const y = doc.y;
      doc.fontSize(8).fillColor('#222');
      columns.forEach((column) => {
        doc.text(String(row[column.key] ?? ''), x, y, { width: column.width, height: 12, ellipsis: true });
        x += column.width;
      });
      doc.y = y + 14;
      doc.x = doc.page.margins.left;
    });

    if (!rows.length) {
      doc.fontSize(10).fillColor('#555').text('No paid orders in this period.');
    }

    doc.end();
  }),
};
