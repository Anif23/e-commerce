import { round2, variantLabel, variantPrice } from '../lib/money.js';

/**
 * The pricing engine is intentionally pure: it takes plain data (cart lines,
 * coupon, settings) and returns the money breakdown. Controllers, the checkout
 * summary endpoint and the test suite all share it.
 */

/** Turns cart rows (with product/variant relations) into priced lines. */
export const buildLines = (items, now = new Date()) =>
  items.map((item) => {
    const product = item.product;
    const unitPrice = variantPrice(product, item.variant ?? null, now);
    const quantity = Math.max(1, Number(item.quantity) || 1);

    return {
      productId: product.id,
      variantId: item.variantId ?? null,
      name: product.name,
      slug: product.slug,
      image: item.variant?.image ?? product.images?.[0]?.url ?? null,
      variantLabel: item.variant ? variantLabel(item.variant) : null,
      unitPrice,
      quantity,
      total: round2(unitPrice * quantity),
      stock: item.variant ? item.variant.stock : product.stock,
    };
  });

/**
 * Validates a coupon against a subtotal.
 * @returns {{ valid: boolean, message?: string, discount: number }}
 */
export const evaluateCoupon = (coupon, { subtotal, userUsageCount = 0 }) => {
  if (!coupon) return { valid: false, message: 'Coupon not found', discount: 0 };

  const now = new Date();

  if (!coupon.isActive) return { valid: false, message: 'This coupon is no longer active', discount: 0 };
  if (coupon.startAt && new Date(coupon.startAt) > now) return { valid: false, message: 'This coupon is not active yet', discount: 0 };
  if (coupon.endAt && new Date(coupon.endAt) < now) return { valid: false, message: 'This coupon has expired', discount: 0 };
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: 'This coupon has reached its usage limit', discount: 0 };
  }
  if (coupon.perUserLimit && userUsageCount >= coupon.perUserLimit) {
    return { valid: false, message: 'You have already used this coupon', discount: 0 };
  }
  if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
    return {
      valid: false,
      message: `Minimum order of ${Number(coupon.minOrder).toFixed(2)} required for this coupon`,
      discount: 0,
    };
  }

  let discount =
    coupon.type === 'PERCENTAGE'
      ? round2((subtotal * Number(coupon.value)) / 100)
      : round2(Number(coupon.value));

  if (coupon.maxDiscount) discount = Math.min(discount, round2(Number(coupon.maxDiscount)));
  discount = Math.min(discount, subtotal);

  return { valid: true, discount: round2(discount) };
};

/**
 * Full order quote: subtotal -> discount -> shipping -> tax -> total.
 */
export const quote = ({
  lines,
  coupon = null,
  userUsageCount = 0,
  shippingFee = 0,
  freeShippingThreshold = 0,
  taxRatePercent = 0,
}) => {
  const subtotal = round2(lines.reduce((sum, line) => sum + line.total, 0));
  const couponResult = coupon
    ? evaluateCoupon(coupon, { subtotal, userUsageCount })
    : { valid: false, discount: 0, message: null };

  const discount = couponResult.valid ? couponResult.discount : 0;
  const taxable = round2(Math.max(0, subtotal - discount));

  const shipping =
    subtotal === 0 ? 0 : taxable >= freeShippingThreshold && freeShippingThreshold > 0 ? 0 : round2(shippingFee);

  const tax = round2((taxable * Number(taxRatePercent)) / 100);
  const total = round2(taxable + shipping + tax);

  return {
    subtotal,
    discount,
    shipping,
    tax,
    total,
    coupon: coupon
      ? { code: coupon.code, type: coupon.type, value: Number(coupon.value), valid: couponResult.valid, message: couponResult.message ?? null }
      : null,
  };
};
