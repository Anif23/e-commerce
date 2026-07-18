import cron from "node-cron";
import { prisma } from "../config/prisma.js";

export const startOrderExpiryJob = () => {

    cron.schedule("* * * * *", async () => {

        try {

            const expiredOrders = await prisma.order.findMany({
                where: {
                    status: "PENDING_PAYMENT",

                    expiresAt: {
                        not: null,
                        lt: new Date(),
                    },
                },
            });

            if (!expiredOrders.length)
                return;

            const ids =
                expiredOrders.map(o => o.id);

            await prisma.order.updateMany({

                where: {
                    id: {
                        in: ids,
                    },
                },

                data: {
                    status: "EXPIRED",
                },

            });

            await prisma.payment.updateMany({

                where: {
                    orderId: {
                        in: ids,
                    },
                },

                data: {
                    status: "FAILED",
                },

            });

        } catch (err) {

            console.error(err);

        }
    });

};