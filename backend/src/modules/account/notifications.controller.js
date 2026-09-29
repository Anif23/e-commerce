import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';

export const notificationsController = {
  list: asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unread = notifications.filter((item) => !item.isRead).length;

    res.json({ success: true, data: notifications, unread });
  }),

  markRead: asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data: { isRead: true },
    });

    if (!result.count) throw ApiError.notFound('Notification not found');

    res.json({ success: true, message: 'Notification read' });
  }),

  markAllRead: asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });

    res.json({ success: true, message: 'All notifications read' });
  }),

  remove: asyncHandler(async (req, res) => {
    await prisma.notification.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } });

    res.json({ success: true, message: 'Notification deleted' });
  }),

  clearAll: asyncHandler(async (req, res) => {
    await prisma.notification.deleteMany({ where: { userId: req.user.id } });

    res.json({ success: true, message: 'Notifications cleared' });
  }),
};
