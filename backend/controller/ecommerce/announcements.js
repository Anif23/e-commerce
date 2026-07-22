import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const announcementController = {

    getAnnouncements:
        asyncHandler(
            async (req, res) => {

                const announcements = await prisma.announcement.findMany({
                    where: { isActive: true },
                    orderBy: { createdAt: "desc" },
                });


                res.json({
                    success: true,
                    data: announcements
                });

            }
        )
}