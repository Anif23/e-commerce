import { prisma } from '../lib/prisma.js';
import { emitToAdmins, emitToUser } from '../realtime/socket.js';

/**
 * Notification writers. They are deliberately fire-and-forget friendly: a failed
 * notification must never roll back the business transaction that created it.
 */

export const createUserNotification = async ({ userId, title, message, type = 'SYSTEM', link }) => {
  if (!userId) return null;

  const notification = await prisma.notification.create({
    data: { userId, title, message, type, link },
  });

  emitToUser(userId, 'notification', notification);

  return notification;
};

export const createAdminNotification = async ({ title, message, type = 'SYSTEM', link }) => {
  const notification = await prisma.adminNotification.create({
    data: { title, message, type, link },
  });

  emitToAdmins('admin_notification', notification);

  return notification;
};

/** Broadcasts a campaign to every customer (and stores a copy per recipient). */
export const broadcastAnnouncement = async ({ title, message, type = 'ANNOUNCEMENT', link }) => {
  const users = await prisma.user.findMany({ where: { role: 'USER' }, select: { id: true } });

  if (!users.length) return 0;

  await prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      title,
      message,
      type,
      link,
    })),
  });

  for (const user of users) {
    emitToUser(user.id, 'notification', { title, message, type, link });
  }

  return users.length;
};
