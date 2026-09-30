import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';

import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

/**
 * Socket.IO is created lazily so the express app and test suite can be imported
 * without binding a port or opening a database connection.
 */
let io = null;

/** userId -> active socket ids (a shopper can be signed in on multiple tabs). */
const onlineUsers = new Map();

const allowedOrigins = env.frontendUrl.split(',').map((origin) => origin.trim()).filter(Boolean);

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: (origin, callback) => {
        if (!origin || env.nodeEnv !== 'production' || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Socket origin is not allowed'));
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Only issue rooms after authenticating the access token. Clients can no
  // longer join another customer's room by sending an arbitrary user id.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));

      const payload = jwt.verify(token, env.jwtSecret);
      const user = await prisma.user.findUnique({
        where: { id: Number(payload.id) },
        select: { id: true, role: true, isBlocked: true },
      });

      if (!user || user.isBlocked) return next(new Error('Session is not active'));

      socket.data.user = { id: user.id, role: user.role };
      next();
    } catch {
      next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.data.user;
    const sockets = onlineUsers.get(userId) ?? new Set();
    sockets.add(socket.id);
    onlineUsers.set(userId, sockets);

    socket.join(`user:${userId}`);
    if (role === 'ADMIN') socket.join('admins');

    socket.on('disconnect', () => {
      const active = onlineUsers.get(userId);
      active?.delete(socket.id);
      if (!active?.size) onlineUsers.delete(userId);
    });
  });

  return io;
};

export const getIO = () => io;

export const isUserOnline = (userId) => Boolean(onlineUsers.get(Number(userId))?.size);

/** Emits to all tabs for one customer and to the authenticated admin room. */
export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
  io.to('admins').emit(event, payload);
};

export const emitToAdmins = (event, payload) => {
  io?.to('admins').emit(event, payload);
};

/** Broadcast helper for order lifecycle changes. */
export const emitOrderUpdate = (order, type) => {
  emitToUser(order.userId, 'order_updated', {
    type,
    orderId: order.id,
    status: order.status,
  });
  emitToAdmins('admin_order_updated', {
    type,
    orderId: order.id,
    status: order.status,
  });
};
