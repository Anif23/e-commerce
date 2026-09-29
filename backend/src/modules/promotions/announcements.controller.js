import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { broadcastAnnouncement } from '../../services/notifications.js';

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(500),
  isActive: z.boolean().default(true),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
});

export const announcementsController = {
  /** GET /api/announcements — active banner for the storefront */
  active: asyncHandler(async (_req, res) => {
    const now = new Date();

    const announcement = await prisma.announcement.findFirst({
      where: {
        isActive: true,
        AND: [{ OR: [{ startAt: null }, { startAt: { lte: now } }] }, { OR: [{ endAt: null }, { endAt: { gte: now } }] }],
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: announcement });
  }),

  list: asyncHandler(async (_req, res) => {
    const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });

    res.json({ success: true, data: announcements });
  }),

  create: asyncHandler(async (req, res) => {
    const data = schema.parse(req.body);

    const announcement = await prisma.announcement.create({ data });

    res.status(201).json({ success: true, message: 'Announcement created', data: announcement });
  }),

  update: asyncHandler(async (req, res) => {
    const data = schema.partial().parse(req.body);

    const announcement = await prisma.announcement.update({ where: { id: Number(req.params.id) }, data });

    res.json({ success: true, message: 'Announcement updated', data: announcement });
  }),

  remove: asyncHandler(async (req, res) => {
    await prisma.announcement.delete({ where: { id: Number(req.params.id) } });

    res.json({ success: true, message: 'Announcement deleted' });
  }),

  /** POST /api/admin/announcements/:id/send — push it to every customer */
  send: asyncHandler(async (req, res) => {
    const announcement = await prisma.announcement.findUnique({ where: { id: Number(req.params.id) } });

    if (!announcement) throw ApiError.notFound('Announcement not found');

    const recipients = await broadcastAnnouncement({
      title: announcement.title,
      message: announcement.message,
      type: 'ANNOUNCEMENT',
    });

    res.json({ success: true, message: `Announcement sent to ${recipients} customers`, data: { recipients } });
  }),
};
