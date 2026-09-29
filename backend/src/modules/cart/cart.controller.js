import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getCart, resolveCoupon, serializeCart, summarizeCart } from './cart.service.js';
import { assertStockAvailable } from '../../services/inventory.js';
import { buildLines } from '../../services/pricing.js';

const addItemSchema = z.object({
  productId: z.coerce.number().int().positive(),
  variantId: z.coerce.number().int().positive().optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(99),
});

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').max(99),
});

const couponSchema = z.object({
  code: z.string().trim().min(2, 'Enter a coupon code').max(32),
});

/** Loads a product + variant and validates availability before touching the cart. */
const loadPurchasable = async ({ productId, variantId }) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: true, images: true },
  });

  if (!product || product.isDeleted || !product.isActive) {
    throw ApiError.badRequest('This product is no longer available');
  }

  let variant = null;

  if (variantId) {
    variant = product.variants.find((entry) => entry.id === variantId);

    if (!variant) throw ApiError.badRequest('That variant does not exist');
    if (!variant.isActive) throw ApiError.badRequest('That variant is unavailable');
  } else if (product.variants.length > 0) {
    throw ApiError.badRequest('Choose a variant before adding to cart');
  }

  return { product, variant };
};

export const cartController = {
  /** GET /api/cart */
  get: asyncHandler(async (req, res) => {
    const { cart, lines, totals } = await summarizeCart(req.user.id);

    res.json({
      success: true,
      data: serializeCart(cart, lines, totals),
    });
  }),

  /** POST /api/cart/items */
  addItem: asyncHandler(async (req, res) => {
    const { productId, variantId, quantity } = addItemSchema.parse(req.body);

    const { product, variant } = await loadPurchasable({ productId, variantId });

    const cart = await getCart(req.user.id);
    const available = variant ? variant.stock : product.stock;

    const existing = cart.items.find(
      (item) => item.productId === productId && (item.variantId ?? null) === (variantId ?? null),
    );

    const nextQuantity = (existing?.quantity ?? 0) + quantity;

    if (nextQuantity > available) {
      throw ApiError.badRequest(`Only ${available} left in stock`);
    }

    if (existing) {
      await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, variantId: variantId ?? null, quantity },
      });
    }

    const { cart: updated, lines, totals } = await summarizeCart(req.user.id);

    res.json({
      success: true,
      message: 'Added to cart',
      data: serializeCart(updated, lines, totals),
    });
  }),

  /** PATCH /api/cart/items/:id */
  updateItem: asyncHandler(async (req, res) => {
    const { quantity } = updateItemSchema.parse(req.body);

    const item = await prisma.cartItem.findUnique({
      where: { id: Number(req.params.id) },
      include: { cart: true, product: true, variant: true },
    });

    if (!item || item.cart.userId !== req.user.id) throw ApiError.notFound('Cart item not found');

    const available = item.variant ? item.variant.stock : item.product.stock;

    if (quantity > available) throw ApiError.badRequest(`Only ${available} left in stock`);

    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });

    const { cart, lines, totals } = await summarizeCart(req.user.id);

    res.json({ success: true, data: serializeCart(cart, lines, totals) });
  }),

  /** DELETE /api/cart/items/:id */
  removeItem: asyncHandler(async (req, res) => {
    const item = await prisma.cartItem.findUnique({
      where: { id: Number(req.params.id) },
      include: { cart: { select: { userId: true } } },
    });

    if (!item || item.cart.userId !== req.user.id) throw ApiError.notFound('Cart item not found');

    await prisma.cartItem.delete({ where: { id: item.id } });

    const { cart, lines, totals } = await summarizeCart(req.user.id);

    res.json({ success: true, message: 'Item removed', data: serializeCart(cart, lines, totals) });
  }),

  /** DELETE /api/cart */
  clear: asyncHandler(async (req, res) => {
    const cart = await getCart(req.user.id);

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

    const { cart: updated, lines, totals } = await summarizeCart(req.user.id);

    res.json({ success: true, message: 'Cart cleared', data: serializeCart(updated, lines, totals) });
  }),

  /** POST /api/cart/coupon */
  applyCoupon: asyncHandler(async (req, res) => {
    const { code } = couponSchema.parse(req.body);

    const coupon = await resolveCoupon(code);
    if (!coupon) throw ApiError.badRequest('That coupon code is not valid');

    // Validate against the current subtotal before persisting.
    const { cart, lines, totals } = await summarizeCart(req.user.id, { couponCode: code });

    if (totals.coupon && totals.coupon.valid === false) {
      throw ApiError.badRequest(totals.coupon.message ?? 'Coupon cannot be applied');
    }

    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: coupon.code } });

    // Re-read so the response carries the persisted coupon instead of the
    // snapshot taken before the update.
    const updated = await summarizeCart(req.user.id);

    res.json({
      success: true,
      message: `Coupon ${coupon.code} applied`,
      data: serializeCart(updated.cart, updated.lines, updated.totals),
    });
  }),

  /** DELETE /api/cart/coupon */
  removeCoupon: asyncHandler(async (req, res) => {
    const cart = await getCart(req.user.id);

    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

    const { cart: updated, lines, totals } = await summarizeCart(req.user.id);

    res.json({ success: true, message: 'Coupon removed', data: serializeCart(updated, lines, totals) });
  }),

  /**
   * POST /api/cart/validate
   * Re-checks stock for every line and reports what changed — used by the cart
   * page and right before checkout so customers never pay for missing stock.
   */
  validate: asyncHandler(async (req, res) => {
    const { cart, lines } = await summarizeCart(req.user.id);

    const issues = [];

    for (const item of cart.items) {
      const line = lines.find((entry) => entry.productId === item.productId && entry.variantId === item.variantId);

      if (!line) continue;

      if (line.stock <= 0) {
        issues.push({ itemId: item.id, type: 'OUT_OF_STOCK', name: line.name, available: 0 });
      } else if (line.stock < item.quantity) {
        issues.push({ itemId: item.id, type: 'REDUCED', name: line.name, available: line.stock, requested: item.quantity });
      }
    }

    assertStockAvailable(
      cart.items.map((item, index) => ({
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        variantLabel: lines[index]?.variantLabel ?? null,
      })),
    );

    res.json({ success: true, data: { valid: issues.length === 0, issues } });
  }),
};
