import { prisma } from '../../lib/prisma.js';
import { buildLines, quote } from '../../services/pricing.js';
import { cardInclude } from '../catalog/catalog.service.js';
import { getStoreSettings } from '../store/storeSettings.service.js';

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

  const settings = await getStoreSettings();
  const lines = buildLines(cart.items);

  const priced = quote({
    lines,
    coupon,
    userUsageCount: coupon ? await couponUsageCount(coupon.id, userId) : 0,
    shippingFee: settings.shippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
    taxRatePercent: settings.taxRatePercent,
  });
  const totals = {
    ...priced,
    taxName: settings.taxName,
    taxRatePercent: settings.taxRatePercent,
    shippingFee: settings.shippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
  };

  return { cart, lines, coupon, totals, settings };
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
