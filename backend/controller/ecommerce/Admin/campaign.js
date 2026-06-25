import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../utils/AsyncHandler.js";
import { io } from "../../../index.js";

export const campaignController = {

    sendNotification:
        asyncHandler(
            async (req, res) => {

                const {
                    title,
                    message,
                    userId,
                } = req.body;

                // SINGLE USER
                if (userId) {

                    const notification =
                        await prisma.notification.create({
                            data: {
                                title,
                                message,
                                userId: Number(userId),
                            },
                        });

                    const socketId =
                        global.onlineUsers.get(
                            userId
                        );

                    if (socketId) {

                        io.to(socketId).emit(
                            "new_notification",
                            notification
                        );
                    }

                    return res.json({
                        success: true,
                        data: notification,
                    });
                }

                // ALL USERS
                const users =
                    await prisma.user.findMany({
                        select: {
                            id: true,
                        },
                    });

                const notifications =
                    await prisma.notification.createMany({
                        data: users.map(
                            (u) => ({
                                title,
                                message,
                                userId: u.id,
                            })
                        ),
                    });

                io.emit(
                    "new_notification",
                    {
                        title,
                        message,
                    }
                );

                res.json({
                    success: true,
                    data: notifications,
                });
            }
        ),

    getAllNotifications:
        asyncHandler(
            async (req, res) => {

                const {
                    userId,
                } = req.query;

                const notifications =
                    await prisma.notification.findMany({
                        where: {
                            ...(userId && {
                                userId: Number(userId),
                            }),
                        },

                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                },
                            },
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
}