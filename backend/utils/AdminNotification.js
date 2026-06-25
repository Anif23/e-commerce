import { prisma } from "../config/prisma.js";
import { io } from "../index.js";

export const createAdminNotification =
  async ({
    title,
    message,
    type,
    link,
  }) => {

    const notification =
      await prisma.adminNotification.create({
        data: {
          title,
          message,
          type,
          link,
        },
      });

    io.emit(
      "admin_notification",
      notification
    );

    return notification;
  };