import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

export const adminNotificationController =
{
    getNotifications:
        asyncHandler(
            async (req, res) => {

                const notifications =
                    await prisma.adminNotification.findMany({
                        orderBy: {
                            createdAt:
                                "desc",
                        },
                    });

                res.json({
                    success: true,
                    data: notifications,
                });
            }
        ),

    markAsRead:
        asyncHandler(
            async (req, res) => {

                await prisma.adminNotification.update({
                    where: {
                        id: Number(
                            req.params.id
                        ),
                    },

                    data: {
                        isRead: true,
                    },
                });

                res.json({
                    success: true,
                });
            }
        ),

    markAllRead:
        asyncHandler(
            async (req, res) => {

                await prisma.adminNotification.updateMany({
                    data: {
                        isRead: true,
                    },
                });

                res.json({
                    success: true,
                });
            }
        ),

    deleteNotification:
        asyncHandler(
            async (req, res) => {

                await prisma.adminNotification.delete({
                    where: {
                        id: Number(
                            req.params.id
                        ),
                    },
                });

                res.json({
                    success: true,
                });
            }
        ),

    deleteAllNotifications:
        asyncHandler(
            async (req, res) => {
                await prisma.adminNotification.deleteMany({});
                res.json({
                    success: true,
                });
            }
        )
};