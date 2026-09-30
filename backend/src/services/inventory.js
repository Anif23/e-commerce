import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { createAdminNotification } from './notifications.js';

/**
 * Stock is the single most fragile part of a store, so every mutation goes
 * through this service: it writes a StockLog audit row and raises low-stock
 * alerts in one place.
 */

const LOW_STOCK_COOLDOWN_MS = 1000 * 60 * 60; // at most one alert per product per hour

const shouldNotifyLowStock = async (productId, stock) => {
  const recent = await prisma.adminNotification.findFirst({
    where: {
      type: 'LOW_STOCK',
      message: { contains: `(#${productId})` },
      createdAt: { gte: new Date(Date.now() - LOW_STOCK_COOLDOWN_MS) },
    },
    select: { id: true },
  });

  return !recent;
};

/**
 * Applies a stock change inside a transaction.
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 */
export const applyStockChange = async (tx, { productId, variantId = null, change, reason }) => {
  if (variantId) {
    const variant = await tx.productVariant.update({
      where: { id: variantId },
      data: { stock: { increment: change } },
    });

    await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: change } },
    });

    await tx.stockLog.create({ data: { productId, variantId, change, reason } });

    return { level: variant.stock, variant };
  }

  const product = await tx.product.update({
    where: { id: productId },
    data: { stock: { increment: change } },
  });

  await tx.stockLog.create({ data: { productId, change, reason } });

  return { level: product.stock, product };
};

/** Removes stock for each order line and raises low-stock alerts. */
export const reserveStockForOrder = async (tx, items) => {
  const alerts = [];

  for (const item of items) {
    const { level } = await applyStockChange(tx, {
      productId: item.productId,
      variantId: item.variantId ?? null,
      change: -Math.abs(item.quantity),
      reason: `Order #${item.orderId ?? 'draft'} placed`,
    });

    const product = await tx.product.findUnique({ where: { id: item.productId }, select: { name: true, lowStock: true } });

    if (level <= (product?.lowStock ?? 5)) {
      alerts.push({ productId: item.productId, name: product?.name, level });
    }
  }

  // Notifications are created after the transaction commits in the caller to
  // avoid long locks; returning them keeps the caller simple.
  return alerts;
};

/** Puts stock back when an order is cancelled or refunded. */
export const restoreStockForOrder = async (tx, order) => {
  for (const item of order.items) {
    await applyStockChange(tx, {
      productId: item.productId,
      variantId: item.variantId ?? null,
      change: Math.abs(item.quantity),
      reason: `Order #${order.id} cancelled`,
    });
  }
};

/** Admin-facing manual adjustment. */
export const adjustStock = async ({ productId, variantId = null, change, reason, actor = 'admin' }) => {
  return prisma.$transaction(async (tx) => {
    const result = await applyStockChange(tx, {
      productId,
      variantId,
      change,
      reason: reason || `Manual adjustment by ${actor}`,
    });

    const product =
      result.product ?? (await tx.product.findUnique({ where: { id: productId } }));

    if (product && result.level <= product.lowStock && (await shouldNotifyLowStock(productId, result.level))) {
      await createAdminNotification({
        title: 'Low stock',
        message: `${product.name} is running low (${result.level} left) (#${productId})`,
        type: 'LOW_STOCK',
        link: `/admin/inventory`,
      });
    }

    return result;
  });
};

/** Guards checkout: ensures every line still has enough stock. */
export const assertStockAvailable = (lines) => {
  for (const line of lines) {
    const available = line.variant ? line.variant.stock : line.product.stock;

    if (available < line.quantity) {
      throw ApiError.badRequest(
        `${line.product.name}${line.variant ? ` (${line.variantLabel})` : ''} only has ${available} left`,
      );
    }
  }
};
