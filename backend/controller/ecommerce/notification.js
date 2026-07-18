import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/AsyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

export const notificationController = {

    // GET ALL
    getNotifications:
        asyncHandler(
            async (req, res) => {

                const notifications =
                    await prisma.notification.findMany({
                        where: {
                            userId: req.user.id,
                        },

                        orderBy: {
                            createdAt: "desc",
                        },
                    });

                res.json({
                    success: true,
                    data: notifications,
                });
            }
        ),

    // MARK SINGLE READ
    markAsRead: asyncHandler(
        async (req, res) => {

            const id =
                Number(req.params.id);

            await prisma.notification.update({
                where: {
                    id,
                    userId: req.user.id,
                },

                data: {
                    isRead: true,
                },
            });

            res.json({
                success: true,
                message:
                    "Notification marked as read",
            });
        }
    ),

    // MARK ALL READ
    markAllRead: asyncHandler(
        async (req, res) => {

            await prisma.notification.updateMany({
                where: {
                    userId: req.user.id,
                    isRead: false,
                },

                data: {
                    isRead: true,
                },
            });

            res.json({
                success: true,
                message:
                    "All notifications marked as read",
            });
        }
    ),

    // DELETE SINGLE
    deleteNotification: asyncHandler(
        async (req, res) => {

            const id =
                Number(req.params.id);

            await prisma.notification.delete({
                where: {
                    id,
                    userId: req.user.id,
                },
            });

            res.json({
                success: true,
                message:
                    "Notification deleted",
            });
        }
    ),

    // DELETE ALL
    deleteAllNotifications:
        asyncHandler(
            async (req, res) => {

                await prisma.notification.deleteMany({
                    where: {
                        userId: req.user.id,
                    },
                });

                res.json({
                    success: true,
                    message:
                        "All notifications deleted",
                });
            }
        ),
};