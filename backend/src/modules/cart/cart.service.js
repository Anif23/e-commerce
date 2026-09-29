import { prisma } from '../../lib/prisma.js';
import { buildLines, quote } from '../../services/pricing.js';
import { env } from '../../config/env.js';
import { cardInclude } from '../catalog/catalog.service.js';

/**
 * Cart reads are centralised here: every consumer (page load, coupon apply,
 * checkout) gets the same priced, validated snapshot.
 */

export const cartInclude = {
  items: {
    orderBy: { id: 'asc' },
    include: {
      variant: true,
      product: { include: cardInclude },
    },
  },
};

export const getCart = async (userId) =>
  prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  });

/** Looks up the coupon attached to the cart (or the one being validated). */
export const resolveCoupon = async (code) => {
  if (!code) return null;

  return prisma.coupon.findFirst({
    where: { code: String(code).trim().toUpperCase() },
  });
};

export const couponUsageCount = async (couponId, userId) =>
  prisma.couponUsage.count({ where: { couponId, userId } });

/**
 * @returns cart rows + priced lines + totals (after coupon, shipping and tax)
 */
export const summarizeCart = async (userId, { couponCode } = {}) => {
  const cart = await getCart(userId);
  const code = couponCode ?? cart.couponCode;
  const coupon = await resolveCoupon(code);

  const lines = buildLines(cart.items);

  const totals = quote({
    lines,
    coupon,
    userUsageCount: coupon ? await couponUsageCount(coupon.id, userId) : 0,
    shippingFee: env.shippingFee,
    freeShippingThreshold: env.freeShippingThreshold,
    taxRatePercent: env.taxRatePercent,
  });

  return { cart, lines, coupon, totals };
};

export const serializeCart = (cart, lines, totals) => ({
  id: cart.id,
  couponCode: cart.couponCode,
  items: cart.items.map((item, index) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    product: item.product,
    variant: item.variant
      ? {
          id: item.variant.id,
          sku: item.variant.sku,
          label: lines[index]?.variantLabel ?? null,
          stock: item.variant.stock,
        }
      : null,
    unitPrice: lines[index]?.unitPrice ?? 0,
    lineTotal: lines[index]?.total ?? 0,
    availableStock: lines[index]?.stock ?? 0,
  })),
  totals,
});
