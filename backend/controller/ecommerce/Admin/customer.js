import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../utils/AsyncHandler.js";
import { getPagination, getMeta } from "../../../utils/pagination.js";
import { searchBy } from "../../../utils/common.js";

export const adminCustomerController = {

    getAllCustomers: asyncHandler(
        async (req, res) => {

            const {
                search,
                page = 1,
            } = req.query;

            const { limit } =
                getPagination(req.query);

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
    )

};