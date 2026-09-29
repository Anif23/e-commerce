/** Money helpers — every monetary value is rounded to cents before it is persisted. */

export const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const percentOf = (value, percent) => round2((Number(value) * Number(percent)) / 100);

/** True when a product discount is currently active. */
export const isDiscountActive = (product, now = new Date()) => {
  if (!product?.discountValue || !product?.discountType) return false;
  if (product.discountStart && new Date(product.discountStart) > now) return false;
  if (product.discountEnd && new Date(product.discountEnd) < now) return false;
  return true;
};

/** Product price after an active promotion. */
export const effectiveProductPrice = (product, now = new Date()) => {
  if (!product) return 0;

  if (isDiscountActive(product, now)) {
    const discount =
      product.discountType === 'PERCENTAGE'
        ? percentOf(product.price, product.discountValue)
        : Number(product.discountValue);

    return round2(Math.max(0, product.price - discount));
  }

  return round2(product.price);
};

/** Price of a specific variant (falls back to the discounted product price). */
export const variantPrice = (product, variant, now = new Date()) => {
  const base = effectiveProductPrice(product, now);

  if (!variant) return base;

  const absolute = variant.price === null || variant.price === undefined ? null : Number(variant.price);

  return round2(Math.max(0, absolute ?? base + Number(variant.priceAdjustment ?? 0)));
};

/** Human readable key for a variant combination, e.g. "Size: M / Color: Black". */
export const variantLabel = (variant) => {
  if (!variant?.combination || typeof variant.combination !== 'object') return null;

  return Object.entries(variant.combination)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' / ');
};
