import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { cardInclude, toProductCard } from '../catalog/catalog.service.js';

const mergeSchema = z.object({
  items: z.array(z.object({ productId: z.coerce.number().int().positive() })).max(100).default([]),
});

const getWishlist = async (userId) =>
  prisma.wishlist.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: { items: { orderBy: { id: 'desc' }, include: { product: { include: cardInclude } } } },
  });

export const wishlistController = {
  /** GET /api/wishlist */
  get: asyncHandler(async (req, res) => {
    const wishlist = await getWishlist(req.user.id);

    res.json({
      success: true,
      data: wishlist.items
        .filter((item) => !item.product.isDeleted)
        .map((item) => ({ id: item.id, addedAt: item.createdAt, product: { ...toProductCard(item.product), isWishlisted: true } })),
    });
  }),

  /** POST /api/wishlist/:productId — toggle */
  toggle: asyncHandler(async (req, res) => {
    const productId = Number(req.params.productId);

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw ApiError.notFound('Product not found');

    const wishlist = await getWishlist(req.user.id);

    const existing = wishlist.items.find((item) => item.productId === productId);

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });

      return res.json({ success: true, wishlisted: false, message: 'Removed from wishlist' });
    }

    await prisma.wishlistItem.create({ data: { wishlistId: wishlist.id, productId } });

    res.json({ success: true, wishlisted: true, message: 'Saved to wishlist' });
  }),

  /** DELETE /api/wishlist/:productId */
  remove: asyncHandler(async (req, res) => {
    const wishlist = await getWishlist(req.user.id);

    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId: Number(req.params.productId) },
    });

    res.json({ success: true, wishlisted: false, message: 'Removed from wishlist' });
  }),

  /** DELETE /api/wishlist */
  clear: asyncHandler(async (req, res) => {
    const wishlist = await getWishlist(req.user.id);

    await prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });

    res.json({ success: true, message: 'Wishlist cleared' });
  }),

  /** POST /api/wishlist/merge — syncs a guest wishlist after login */
  merge: asyncHandler(async (req, res) => {
    const { items } = mergeSchema.parse(req.body ?? {});

    if (!items.length) return res.json({ success: true, merged: 0 });

    const wishlist = await getWishlist(req.user.id);
    const existing = new Set(wishlist.items.map((item) => item.productId));

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((item) => item.productId) }, isDeleted: false },
      select: { id: true },
    });

    const toCreate = products
      .map((product) => product.id)
      .filter((productId) => !existing.has(productId))
      .map((productId) => ({ wishlistId: wishlist.id, productId }));

    if (toCreate.length) {
      await prisma.wishlistItem.createMany({ data: toCreate });
    }

    res.json({ success: true, merged: toCreate.length });
  }),
};
