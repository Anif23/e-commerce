import { z } from 'zod';

import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination } from '../../lib/query.js';
import { createUserNotification } from '../../services/notifications.js';
import { emitToUser, emitToAdmins } from '../../realtime/socket.js';

const createSchema = z.object({
  subject: z.string().trim().min(3, 'Add a short subject').max(140),
  message: z.string().trim().min(5, 'Tell us a bit more').max(2000),
  orderId: z.coerce.number().int().positive().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).optional(),
});

const replySchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000),
});

const include = {
  messages: { orderBy: { createdAt: 'asc' } },
  user: { select: { id: true, username: true, email: true } },
};

const ownedTicket = async (id, user) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: Number(id) }, include });

  if (!ticket) throw ApiError.notFound('Ticket not found');
  if (ticket.userId !== user.id && user.role !== 'ADMIN') throw ApiError.forbidden('Ticket not found');

  return ticket;
};

/** Customer messages posted after the admin last opened the ticket. */
const countUnread = (ticket) => {
  const readAt = ticket.adminLastReadAt ? new Date(ticket.adminLastReadAt).getTime() : 0;

  return (ticket.messages ?? []).reduce(
    (count, message) => (!message.isAdmin && new Date(message.createdAt).getTime() > readAt ? count + 1 : count),
    0,
  );
};

export const supportController = {
  /** POST /api/support/tickets */
  create: asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: req.user.id,
        subject: body.subject,
        orderId: body.orderId ?? null,
        priority: body.priority ?? 'NORMAL',
        messages: { create: [{ message: body.message, userId: req.user.id, isAdmin: false }] },
      },
      include,
    });

    emitToAdmins('admin_support', { id: ticket.id, subject: ticket.subject });

    res.status(201).json({ success: true, message: 'Support request sent', data: ticket });
  }),

  /** GET /api/support/tickets */
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 10, 50);

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where: { userId: req.user.id } }),
      prisma.supportTicket.findMany({
        where: { userId: req.user.id },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { messages: true } } },
      }),
    ]);

    res.json({ success: true, data: tickets, pagination: getMeta(total, page, limit) });
  }),

  /** GET /api/support/tickets/:id */
  detail: asyncHandler(async (req, res) => {
    const ticket = await ownedTicket(req.params.id, req.user);

    res.json({ success: true, data: ticket });
  }),

  /** POST /api/support/tickets/:id/messages */
  reply: asyncHandler(async (req, res) => {
    const ticket = await ownedTicket(req.params.id, req.user);
    const { message } = replySchema.parse(req.body);

    const isAdmin = req.user.role === 'ADMIN';

    await prisma.supportMessage.create({
      data: { ticketId: ticket.id, message, userId: req.user.id, isAdmin },
    });

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: isAdmin ? 'PENDING' : 'OPEN',
        updatedAt: new Date(),
        // An admin who replies has clearly read the thread.
        ...(isAdmin ? { adminLastReadAt: new Date() } : {}),
      },
    });

    if (isAdmin) {
      await createUserNotification({
        userId: ticket.userId,
        title: 'Support replied',
        message: `We replied to "${ticket.subject}"`,
        type: 'SYSTEM',
        link: `/support/${ticket.id}`,
      });

      emitToUser(ticket.userId, 'support_update', { ticketId: ticket.id });
    } else {
      // Customer replied: fan out to the admin console so the queue and unread
      // badge update live instead of only on the next manual refresh.
      emitToAdmins('admin_support', { ticketId: ticket.id, subject: ticket.subject });
    }

    const updated = await ownedTicket(ticket.id, req.user);

    res.json({ success: true, message: 'Message sent', data: updated });
  }),

  /** POST /api/support/tickets/:id/close */
  close: asyncHandler(async (req, res) => {
    const ticket = await ownedTicket(req.params.id, req.user);

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED' },
    });

    res.json({ success: true, message: 'Ticket closed', data: updated });
  }),

  /** GET /api/support/faq — lightweight self-serve answers */
  faq: asyncHandler(async (_req, res) => {
    res.json({
      success: true,
      data: [
        {
          question: 'How long does delivery take?',
          answer: 'Orders are packed within 24 hours and typically arrive in 3–5 business days.',
        },
        {
          question: 'Can I change or cancel my order?',
          answer: 'Yes — while the order is still "Processing" you can cancel it from the order page.',
        },
        {
          question: 'Which payment methods do you accept?',
          answer: 'When configured, we accept payments through Razorpay or Stripe, as well as cash on delivery where available.',
        },
        {
          question: 'How do I return an item?',
          answer: 'Open a support ticket with your order number within 14 days of delivery.',
        },
      ],
    });
  }),

  /* ---------------------------------- admin --------------------------------- */

  adminList: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);
    const status = req.query.status ? String(req.query.status).toUpperCase() : null;

    const where = { ...(status && { status }) };

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { ...include, _count: { select: { messages: true } } },
      }),
    ]);

    // Customer messages newer than the admin's last read marker are unread.
    const withUnread = tickets.map((ticket) => ({
      ...ticket,
      unread: countUnread(ticket),
    }));

    res.json({ success: true, data: withUnread, pagination: getMeta(total, page, limit) });
  }),

  /** GET /api/admin/support/unread — total tickets awaiting an admin reply. */
  adminUnread: asyncHandler(async (_req, res) => {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM "SupportTicket" t
      WHERE t.status <> 'CLOSED'
        AND EXISTS (
          SELECT 1 FROM "SupportMessage" m
          WHERE m."ticketId" = t.id
            AND m."isAdmin" = false
            AND m."createdAt" > COALESCE(t."adminLastReadAt", '-infinity'::timestamp)
        )
    `;

    res.json({ success: true, data: { unread: Number(rows[0]?.count ?? 0) } });
  }),

  adminDetail: asyncHandler(async (req, res) => {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: Number(req.params.id) }, include });

    if (!ticket) throw ApiError.notFound('Ticket not found');

    // Opening the conversation marks it read, clearing the unread badge.
    const readAt = new Date();
    await prisma.supportTicket.update({ where: { id: ticket.id }, data: { adminLastReadAt: readAt } });

    res.json({ success: true, data: { ...ticket, adminLastReadAt: readAt, unread: 0 } });
  }),

  adminStatus: asyncHandler(async (req, res) => {
    const { status } = req.body ?? {};

    if (!['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'].includes(status)) {
      throw ApiError.badRequest('Invalid status');
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: Number(req.params.id) },
      data: { status },
    });

    res.json({ success: true, message: 'Ticket updated', data: ticket });
  }),
};
