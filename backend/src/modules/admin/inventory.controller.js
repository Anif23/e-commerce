import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination } from '../../lib/query.js';
import { adjustStock } from '../../services/inventory.js';
import { round2 } from '../../lib/money.js';

const adjustSchema = z.object({
  change: z.coerce.number().int(),
  reason: z.string().trim().max(140).optional(),
  variantId: z.coerce.number().int().positive().optional().nullable(),
});

export const inventoryController = {
  /** GET /api/admin/inventory */
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);
    const search = req.query.search ? String(req.query.search).trim() : null;
    const status = req.query.status ? String(req.query.status) : null;

    const where = {
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status === 'out' && { stock: 0 }),
    };

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { stock: 'asc' },
        include: {
          category: { select: { id: true, name: true } },
          images: { select: { url: true }, take: 1 },
          variants: { select: { id: true, sku: true, stock: true, combination: true } },
        },
      }),
    ]);

    // `low` is computed after fetching because it compares two columns.
    const rows = products
      .filter((product) => (status === 'low' ? product.stock > 0 && product.stock <= product.lowStock : true))
      .map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        image: product.images[0]?.url ?? null,
        category: product.category,
        stock: product.stock,
        lowStock: product.lowStock,
        price: round2(product.price),
        soldCount: product.soldCount,
        status: product.stock === 0 ? 'OUT_OF_STOCK' : product.stock <= product.lowStock ? 'LOW' : 'HEALTHY',
        variants: product.variants,
      }));

    res.json({ success: true, data: rows, pagination: getMeta(total, page, limit) });
  }),

  /** PATCH /api/admin/inventory/:id */
  adjust: asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const body = adjustSchema.parse(req.body);

    if (body.change === 0) throw ApiError.badRequest('Stock change cannot be zero');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    const result = await adjustStock({
      productId,
      variantId: body.variantId ?? null,
      change: body.change,
      reason: body.reason || 'Manual adjustment',
      actor: req.user?.username ?? 'admin',
    });

    res.json({
      success: true,
      message: 'Stock updated',
      data: { productId, stock: result.level },
    });
  }),

  /** GET /api/admin/inventory/:id/logs */
  logs: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);

    const where = { productId: Number(req.params.id) };

    const [total, logs] = await Promise.all([
      prisma.stockLog.count({ where }),
      prisma.stockLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);

    res.json({ success: true, data: logs, pagination: getMeta(total, page, limit) });
  }),
};
