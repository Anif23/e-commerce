import { describe, expect, it } from 'vitest';

import { buildLines, evaluateCoupon, quote } from '../src/services/pricing.js';
import { clamp, effectiveProductPrice, isDiscountActive, percentOf, round2, variantPrice } from '../src/lib/money.js';

const now = new Date('2026-01-15T12:00:00Z');

const product = (overrides = {}) => ({
  id: 1,
  name: 'Test Product',
  price: 100,
  discountValue: null,
  discountType: null,
  discountStart: null,
  discountEnd: null,
  ...overrides,
});

describe('money helpers', () => {
  it('rounds to two decimals', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
    expect(round2(0)).toBe(0);
  });

  it('clamps values', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('computes percentages', () => {
    expect(percentOf(250, 8)).toBe(20);
  });

  it('detects active discount windows', () => {
    expect(isDiscountActive(product({ discountValue: 10, discountType: 'FIXED' }), now)).toBe(true);
    expect(
      isDiscountActive(
        product({ discountValue: 10, discountType: 'FIXED', discountStart: new Date('2026-02-01') }),
        now,
      ),
    ).toBe(false);
    expect(
      isDiscountActive(
        product({ discountValue: 10, discountType: 'FIXED', discountEnd: new Date('2026-01-01') }),
        now,
      ),
    ).toBe(false);
  });

  it('applies percentage and fixed discounts to the product price', () => {
    expect(effectiveProductPrice(product({ discountValue: 25, discountType: 'PERCENTAGE' }), now)).toBe(75);
    expect(effectiveProductPrice(product({ discountValue: 30, discountType: 'FIXED' }), now)).toBe(70);
    expect(effectiveProductPrice(product(), now)).toBe(100);
  });

  it('never drops below zero', () => {
    expect(effectiveProductPrice(product({ discountValue: 500, discountType: 'FIXED' }), now)).toBe(0);
  });

  it('prices variants with absolute prices or adjustments', () => {
    expect(variantPrice(product(), { price: 88, priceAdjustment: 0 }, now)).toBe(88);
    expect(variantPrice(product(), { price: null, priceAdjustment: 20 }, now)).toBe(120);
    expect(variantPrice(product(), null, now)).toBe(100);
  });
});

describe('pricing engine', () => {
  const line = (unitPrice, quantity = 1) => ({ unitPrice, quantity, total: round2(unitPrice * quantity) });

  it('prices cart lines from products and variants', () => {
    const lines = buildLines(
      [
        { productId: 1, variantId: null, quantity: 2, product: product(), variant: null },
        {
          productId: 2,
          variantId: 5,
          quantity: 1,
          product: product({ id: 2, price: 50 }),
          variant: { id: 5, price: null, priceAdjustment: 10, combination: { Size: 'M' } },
        },
      ],
      now,
    );

    expect(lines[0].total).toBe(200);
    expect(lines[1].unitPrice).toBe(60);
    expect(lines[1].variantLabel).toBe('Size: M');
  });

  it('enforces minimum order value', () => {
    const coupon = { code: 'X', type: 'FIXED', value: 10, minOrder: 100, isActive: true, perUserLimit: 1 };

    expect(evaluateCoupon(coupon, { subtotal: 50 }).valid).toBe(false);
    expect(evaluateCoupon(coupon, { subtotal: 150 }).discount).toBe(10);
  });

  it('caps percentage discounts', () => {
    const coupon = { code: 'X', type: 'PERCENTAGE', value: 20, maxDiscount: 25, isActive: true, perUserLimit: 1 };

    expect(evaluateCoupon(coupon, { subtotal: 500 }).discount).toBe(25);
    expect(evaluateCoupon(coupon, { subtotal: 100 }).discount).toBe(20);
  });

  it('respects usage limits', () => {
    const coupon = {
      code: 'X',
      type: 'FIXED',
      value: 10,
      isActive: true,
      usageLimit: 5,
      usedCount: 5,
      perUserLimit: 1,
    };

    expect(evaluateCoupon(coupon, { subtotal: 100 }).valid).toBe(false);
    expect(evaluateCoupon({ ...coupon, usedCount: 4 }, { subtotal: 100, userUsageCount: 1 }).valid).toBe(false);
  });

  it('discounts coupon codes outside their window', () => {
    const coupon = {
      code: 'X',
      type: 'FIXED',
      value: 10,
      isActive: true,
      startAt: new Date('2026-02-01'),
      endAt: new Date('2026-03-01'),
      perUserLimit: 1,
    };

    expect(evaluateCoupon(coupon, { subtotal: 100 }).valid).toBe(false);
    expect(evaluateCoupon({ ...coupon, startAt: null }, { subtotal: 100 }).valid).toBe(false);
  });

  it('waives shipping above the free-shipping threshold', () => {
    const withShipping = quote({
      lines: [line(40)],
      shippingFee: 5,
      freeShippingThreshold: 75,
      taxRatePercent: 10,
    });

    expect(withShipping.shipping).toBe(5);
    expect(withShipping.tax).toBe(4);
    expect(withShipping.total).toBe(49);

    const free = quote({ lines: [line(80)], shippingFee: 5, freeShippingThreshold: 75, taxRatePercent: 10 });

    expect(free.shipping).toBe(0);
    expect(free.tax).toBe(8);
    expect(free.total).toBe(88);
  });

  it('applies the discount before tax', () => {
    const result = quote({
      lines: [line(100)],
      coupon: { code: 'SAVE', type: 'FIXED', value: 20, isActive: true, perUserLimit: 1 },
      shippingFee: 5,
      freeShippingThreshold: 500,
      taxRatePercent: 10,
    });

    expect(result.subtotal).toBe(100);
    expect(result.discount).toBe(20);
    expect(result.tax).toBe(8); // 10% of 80
    expect(result.total).toBe(93);
  });

  it('treats an empty cart as free', () => {
    const result = quote({ lines: [], shippingFee: 5, freeShippingThreshold: 75, taxRatePercent: 10 });

    expect(result.total).toBe(0);
    expect(result.shipping).toBe(0);
  });
});
