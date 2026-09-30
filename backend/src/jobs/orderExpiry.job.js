import cron from 'node-cron';

import { prisma } from '../lib/prisma.js';
import { createUserNotification } from '../services/notifications.js';
import { emitOrderUpdate } from '../realtime/socket.js';

/** Closes unpaid online orders once their checkout window expires. */
export const expirePendingOrders = async () => {
  const now = new Date();
  const candidates = await prisma.order.findMany({
    where: { status: 'PENDING_PAYMENT', expiresAt: { not: null, lt: now } },
    select: { id: true },
  });

  if (!candidates.length) return 0;

  const expiredIds = await prisma.$transaction(async (tx) => {
    const claimedIds = [];

    // The conditional update is the concurrency guard: a payment confirmation
    // may have marked an order PAID after the initial candidate query.
    for (const { id } of candidates) {
      const updated = await tx.order.updateMany({
        where: { id, status: 'PENDING_PAYMENT', expiresAt: { not: null, lt: now } },
        data: { status: 'EXPIRED', expiresAt: null },
      });
      if (updated.count) claimedIds.push(id);
    }

    if (!claimedIds.length) return [];

    await tx.payment.updateMany({
      where: { orderId: { in: claimedIds }, status: { not: 'SUCCESS' } },
      data: { status: 'FAILED', failureCode: 'EXPIRED' },
    });
    await tx.orderEvent.createMany({
      data: claimedIds.map((orderId) => ({
        orderId,
        status: 'EXPIRED',
        message: 'Payment window closed',
        actor: 'system',
      })),
    });

    return claimedIds;
  });

  if (!expiredIds.length) return 0;

  const expiredOrders = await prisma.order.findMany({
    where: { id: { in: expiredIds } },
    select: { id: true, userId: true, status: true },
  });
  await Promise.all(
    expiredOrders.map(async (order) => {
      try {
        await createUserNotification({
          userId: order.userId,
          title: 'Payment window expired',
          message: `Order #${order.id} expired before payment was completed.`,
          type: 'ORDER',
          link: `/orders/${order.id}`,
        });
      } catch (error) {
        console.error('[order-expiry] notification failed:', error.message);
      }
      emitOrderUpdate(order, 'EXPIRED');
    }),
  );

  return expiredIds.length;
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
