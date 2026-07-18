import { prisma } from "../config/prisma.js";
import { io } from "../index.js";

export const createUserNotification = async ({
  title,
  message,
  type,
  link,
  userId,
}) => {
  const notification = await prisma.notification.create({
    data: {
      title,
      message,
      type,
      link,
      userId,
    },
  });

  const socketId = global.onlineUsers.get(userId);

  if (socketId) {
    io.to(socketId).emit("user_notification", notification);
  }

  return notification;
};