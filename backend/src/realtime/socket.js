import { Server } from 'socket.io';
import { env } from '../config/env.js';

/**
 * Socket.IO is created lazily so the express app (and the test suite) can be
 * imported without booting a server.
 */
let io = null;

/** userId -> socket id, used to push notifications to a single customer. */
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join', (userId) => {
      if (!userId) return;
      onlineUsers.set(Number(userId), socket.id);
      socket.join(`user:${userId}`);
      socket.join('admins', () => {});
    });

    socket.on('joinAdmin', () => {
      socket.join('admins');
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) onlineUsers.delete(userId);
      }
    });
  });

  return io;
};

export const getIO = () => io;

export const isUserOnline = (userId) => onlineUsers.has(Number(userId));

/** Emits to one customer (all of their tabs) and to the admin room. */
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
