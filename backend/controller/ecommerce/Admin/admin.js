
import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiError } from "../../../utils/apiError.js";

export const adminController = {
    dashboard: asyncHandler(async (req, res) => {
        const now = new Date();

        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
        );

        const last6Months = [];

        for (let i = 5; i >= 0; i--) {
            last6Months.push(
                new Date(
                    now.getFullYear(),
                    now.getMonth() - i,
                    1
                )
            );
        }

        const [
            totalProducts,
            totalCategories,
            totalUsers,
            totalOrders,
            pendingOrders,
            deliveredOrders,
            lowStockProducts,
            orders,
        ] = await Promise.all([
            prisma.product.count(),

            prisma.category.count(),

            prisma.user.count({
                where: { role: "USER" },
            }),

            prisma.order.count(),

            prisma.order.count({
                where: {
                    status: "PROCESSING",
                },
            }),

            prisma.order.count({
                where: {
                    status: "DELIVERED",
                },
            }),

            prisma.product.count({
                where: {
                    stock: {
                        lte: prisma.product.fields.lowStock,
                    },
                },
            }),

            prisma.order.findMany({
                where: {
                    createdAt: {
                        gte: last6Months[0],
                    },
                },
                select: {
                    total: true,
                    createdAt: true,
                },
            }),
        ]);

        const totalRevenue = orders.reduce(
            (sum, item) => sum + item.total,
            0
        );

        const monthlySales = last6Months.map(
            (monthDate) => {
                const month =
                    monthDate.toLocaleString(
                        "default",
                        {
                            month: "short",
                        }
                    );

                const total = orders
                    .filter(
                        (o) =>
                            o.createdAt.getMonth() ===
                            monthDate.getMonth() &&
                            o.createdAt.getFullYear() ===
                            monthDate.getFullYear()
                    )
                    .reduce(
                        (sum, item) =>
                            sum + item.total,
                        0
                    );

                return {
                    month,
                    total,
                };
            }
        );

        res.json({
            success: true,
            data: {
                totalProducts,
                totalCategories,
                totalUsers,
                totalOrders,
                pendingOrders,
                deliveredOrders,
                lowStockProducts,
                totalRevenue,
                monthlySales,
            },
        });
    })
}