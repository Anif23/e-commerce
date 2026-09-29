import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';

export const adminNotificationsController = {
  list: asyncHandler(async (_req, res) => {
    const notifications = await prisma.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    const unread = notifications.filter((item) => !item.isRead).length;

    res.json({ success: true, data: notifications, unread });
  }),

  markRead: asyncHandler(async (req, res) => {
    const result = await prisma.adminNotification.updateMany({
      where: { id: Number(req.params.id) },
      data: { isRead: true },
    });

    if (!result.count) throw ApiError.notFound('Notification not found');

    res.json({ success: true, message: 'Notification read' });
  }),

  markAllRead: asyncHandler(async (_req, res) => {
    await prisma.adminNotification.updateMany({ where: { isRead: false }, data: { isRead: true } });

    res.json({ success: true, message: 'All notifications read' });
  }),

  remove: asyncHandler(async (req, res) => {
    await prisma.adminNotification.deleteMany({ where: { id: Number(req.params.id) } });

    res.json({ success: true, message: 'Notification deleted' });
  }),

  clearAll: asyncHandler(async (_req, res) => {
    await prisma.adminNotification.deleteMany({});

    res.json({ success: true, message: 'Notifications cleared' });
  }),
};
