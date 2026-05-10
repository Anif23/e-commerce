import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../utils/AsyncHandler.js";
import { getPagination, getMeta, searchBy } from "../../../utils/pagination.js";
import { io } from "../../../index.js";

export const adminCustomerController = {

    getAllCustomers: asyncHandler(
        async (req, res) => {

            const {
                search,
                page = 1,
            } = req.query;

            const { limit } =
                getPagination();

            const currentPage =
                Number(page);

            const where = {
                role: "USER",

                ...searchBy(
                    "username",
                    search
                ),
            };

            const total =
                await prisma.user.count({
                    where,
                });

            const users =
                await prisma.user.findMany({
                    where,

                    skip:
                        (currentPage - 1) *
                        limit,

                    take: limit,

                    orderBy: {
                        createdAt: "desc",
                    },

                    include: {
                        orders: true,

                        wishlist: {
                            include: {
                                items: true,
                            },
                        },

                        notifications: {
                            orderBy: {
                                createdAt: "desc",
                            },

                            take: 5,
                        },
                    },
                });

            const data =
                users.map((u) => ({
                    id: u.id,

                    username:
                        u.username,

                    email:
                        u.email,

                    createdAt:
                        u.createdAt,

                    orderCount:
                        u.orders.length,

                    wishlistCount:
                        u.wishlist?.items
                            ?.length || 0,

                    totalSpent:
                        u.orders.reduce(
                            (acc, item) =>
                                acc +
                                item.totalAmount,
                            0
                        ),

                    notifications:
                        u.notifications,
                }));

            res.json({
                success: true,

                data,

                pagination:
                    getMeta(
                        total,
                        currentPage,
                        limit
                    ),
            });
        }
    ),

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
                                userId,
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
        )
};