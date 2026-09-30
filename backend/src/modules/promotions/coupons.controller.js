import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination, searchBy } from '../../lib/query.js';
import { evaluateCoupon } from '../../services/pricing.js';

export const couponSchema = z.object({
  code: z.string().trim().min(2).max(32).transform((value) => value.toUpperCase()),
  description: z.string().trim().max(200).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.coerce.number().positive('Discount value must be greater than zero'),
  minOrder: z.coerce.number().nonnegative().optional(),
  maxDiscount: z.coerce.number().nonnegative().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  perUserLimit: z.coerce.number().int().positive().default(1),
  isActive: z.boolean().default(true),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
});

const optionalDate = (value) => (value ? new Date(value) : null);

export const couponsController = {
  /**
   * POST /api/coupons/validate
   * Public preview of what a code would do for the current cart subtotal.
   */
  validate: asyncHandler(async (req, res) => {
    const { code, subtotal } = z
      .object({ code: z.string().trim().min(2), subtotal: z.coerce.number().nonnegative() })
      .parse(req.body);

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon) throw ApiError.badRequest('That coupon code is not valid');

    const usageCount = req.user
      ? await prisma.couponUsage.count({ where: { couponId: coupon.id, userId: req.user.id } })
      : 0;

    const result = evaluateCoupon(coupon, { subtotal, userUsageCount: usageCount });

    if (!result.valid) throw ApiError.badRequest(result.message ?? 'Coupon cannot be applied');

    res.json({
      success: true,
      data: {
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        discount: result.discount,
      },
    });
  }),

  /* ---------------------------------- admin --------------------------------- */

  adminList: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);
    const where = { ...searchBy('code', req.query.search) };

    const [total, coupons] = await Promise.all([
      prisma.coupon.count({ where }),
      prisma.coupon.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);

    res.json({ success: true, data: coupons, pagination: getMeta(total, page, limit) });
  }),

  create: asyncHandler(async (req, res) => {
    const data = couponSchema.parse(req.body);

    const duplicate = await prisma.coupon.findUnique({ where: { code: data.code }, select: { id: true } });
    if (duplicate) throw ApiError.conflict('That coupon code already exists');

    const coupon = await prisma.coupon.create({
      data: { ...data, startAt: optionalDate(data.startAt), endAt: optionalDate(data.endAt) },
    });

    res.status(201).json({ success: true, message: 'Coupon created', data: coupon });
  }),

  update: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = couponSchema.partial().parse(req.body);

    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw ApiError.notFound('Coupon not found');

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        ...(data.startAt !== undefined && { startAt: optionalDate(data.startAt) }),
        ...(data.endAt !== undefined && { endAt: optionalDate(data.endAt) }),
      },
    });

    res.json({ success: true, message: 'Coupon updated', data: updated });
  }),

  remove: asyncHandler(async (req, res) => {
    await prisma.coupon.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true, message: 'Coupon deleted' });
  }),
};
