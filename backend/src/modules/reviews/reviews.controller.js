import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { round2 } from '../../lib/money.js';
import { getMeta, getPagination } from '../../lib/query.js';
import { createAdminNotification } from '../../services/notifications.js';

const reviewSchema = z.object({
  productId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1, 'Rate at least 1 star').max(5, 'Rating cannot exceed 5 stars'),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().max(1000).optional(),
});

const updateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().max(1000).optional(),
});

/** Recomputes the denormalised rating counters on the product row. */
export const syncProductRating = async (productId) => {
  const stats = await prisma.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      ratingAvg: round2(stats._avg.rating ?? 0),
      ratingCount: stats._count._all,
    },
  });
};

const hasPurchased = async (userId, productId) => {
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } },
    },
    select: { id: true },
  });

  return Boolean(orderItem);
};

export const reviewsController = {
  /** POST /api/reviews — create or update the caller's review for a product */
  upsert: asyncHandler(async (req, res) => {
    const body = reviewSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: body.productId },
      select: { id: true, name: true, isDeleted: true },
    });

    if (!product || product.isDeleted) throw ApiError.notFound('Product not found');

    const verified = await hasPurchased(req.user.id, body.productId);

    if (!verified) {
      throw ApiError.forbidden('You can only review products you have purchased');
    }

    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId: req.user.id, productId: body.productId } },
    });

    const data = {
      rating: body.rating,
      title: body.title ?? null,
      comment: body.comment ?? null,
      isVerifiedPurchase: verified,
      isApproved: true,
    };

    const review = existing
      ? await prisma.review.update({ where: { id: existing.id }, data })
      : await prisma.review.create({ data: { ...data, userId: req.user.id, productId: body.productId } });

    await syncProductRating(body.productId);

    await createAdminNotification({
      title: 'New review',
      message: `${req.user.username} reviewed ${product.name} (${body.rating}/5)`,
      type: 'REVIEW',
      link: '/admin/reviews',
    }).catch(() => {});

    res.status(existing ? 200 : 201).json({
      success: true,
      message: existing ? 'Review updated' : 'Thanks for the review',
      data: review,
    });
  }),

  /** PATCH /api/reviews/:id — edit own review */
  update: asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);

    const review = await prisma.review.findUnique({ where: { id: Number(req.params.id) } });
    if (!review) throw ApiError.notFound('Review not found');
    if (review.userId !== req.user.id) throw ApiError.forbidden('You can only edit your own review');

    const updated = await prisma.review.update({ where: { id: review.id }, data });

    await syncProductRating(updated.productId);

    res.json({ success: true, message: 'Review updated', data: updated });
  }),

  /** DELETE /api/reviews/:id */
  remove: asyncHandler(async (req, res) => {
    const review = await prisma.review.findUnique({ where: { id: Number(req.params.id) } });
    if (!review) throw ApiError.notFound('Review not found');

    if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw ApiError.forbidden('You can only delete your own review');
    }

    await prisma.review.delete({ where: { id: review.id } });
    await syncProductRating(review.productId);

    res.json({ success: true, message: 'Review deleted' });
  }),

  /** GET /api/reviews/me — the caller's reviews with the product attached */
  mine: asyncHandler(async (req, res) => {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: { select: { url: true }, take: 1 } },
        },
      },
    });

    res.json({
      success: true,
      data: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isApproved: review.isApproved,
        createdAt: review.createdAt,
        product: {
          id: review.product.id,
          name: review.product.name,
          slug: review.product.slug,
          image: review.product.images[0]?.url ?? null,
        },
      })),
    });
  }),

  /** GET /api/reviews/eligibility/:productId — can the caller review this? */
  eligibility: asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);

    const [existing, purchased] = await Promise.all([
      prisma.review.findUnique({
        where: { userId_productId: { userId: req.user.id, productId } },
        select: { id: true, rating: true, title: true, comment: true },
      }),
      hasPurchased(req.user.id, productId),
    ]);

    res.json({
      success: true,
      data: { canReview: purchased, hasReviewed: Boolean(existing), review: existing ?? null },
    });
  }),

  /* ---------------------------------- admin --------------------------------- */

  adminList: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);
    const where = {
      ...(req.query.productId && { productId: Number(req.query.productId) }),
      ...(req.query.approved !== undefined && { isApproved: req.query.approved === 'true' }),
    };

    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, email: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    res.json({ success: true, data: reviews, pagination: getMeta(total, page, limit) });
  }),

  moderate: asyncHandler(async (req, res) => {
    const isApproved = req.body?.isApproved === true || req.body?.isApproved === 'true';

    const review = await prisma.review.update({
      where: { id: Number(req.params.id) },
      data: { isApproved },
    });

    await syncProductRating(review.productId);

    res.json({ success: true, message: isApproved ? 'Review approved' : 'Review hidden', data: review });
  }),
};
