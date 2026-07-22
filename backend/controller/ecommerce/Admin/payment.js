import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../utils/AsyncHandler.js";
import { getMeta, getPagination } from "../../../utils/pagination.js";

export const adminPaymentController = {

    getAllPayments: asyncHandler(
        async (req, res) => {

            const {
                search,
                status,
                provider,
                page = 1,
            } = req.query;

            const { limit } =
                getPagination(req.query);

            const currentPage =
                Number(page);

            const where = {

                ...(search && {
                    OR: [
                        {
                            payerEmail: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            paymentId: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                        {
                            order: {
                                user: {
                                    username: {
                                        contains: search,
                                        mode: "insensitive",
                                    },
                                },
                            },
                        },
                    ],
                }),

                ...(status && {
                    status,
                }),

                ...(provider && {
                    provider,
                }),
            };

            const total =
                await prisma.payment.count({
                    where,
                });

            const data =
                await prisma.payment.findMany({

                    where,

                    skip:
                        (currentPage - 1) *
                        limit,

                    take: limit,

                    orderBy: {
                        createdAt: "desc",
                    },

                    include: {
                        order: {
                            include: {
                                user: true,
                                items: {
                                    include: {
                                        product: true,
                                    },
                                },
                            },
                        },
                    },
                });

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
};