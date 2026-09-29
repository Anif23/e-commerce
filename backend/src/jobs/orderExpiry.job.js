import cron from 'node-cron';

import { prisma } from '../lib/prisma.js';

/**
 * Expires unpaid online orders once their payment window closes so stock is
 * never held hostage by an abandoned checkout.
 */
export const expirePendingOrders = async () => {
  const now = new Date();

  const expired = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', expiresAt: { not: null, lt: now } },
    select: { id: true, userId: true },
  });

  if (!expired.length) return 0;

  const ids = expired.map((order) => order.id);

  await prisma.$transaction([
    prisma.order.updateMany({ where: { id: { in: ids } }, data: { status: 'EXPIRED' } }),
    prisma.payment.updateMany({ where: { orderId: { in: ids } }, data: { status: 'FAILED', failureCode: 'EXPIRED' } }),
    prisma.orderEvent.createMany({
      data: expired.map((order) => ({
        orderId: order.id,
        status: 'EXPIRED',
        message: 'Payment window closed',
        actor: 'system',
      })),
    }),
  ]);

  return ids.length;
};

export const startOrderExpiryJob = () => {
  if (process.env.NODE_ENV === 'test') return null;

  // Every minute.
  return cron.schedule('* * * * *', async () => {
    try {
      await expirePendingOrders();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[order-expiry]', error.message);
    }
  });
};
