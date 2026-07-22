import { prisma } from "../../../config/prisma.js";
import { asyncHandler } from "../../../utils/AsyncHandler.js";
import { io } from "../../../index.js";
import { ApiError } from "../../../utils/ApiError.js";
import { getMeta, getPagination } from "../../../utils/pagination.js";

export const campaignController = {

    sendAnnouncement: asyncHandler(async (req, res) => {

        const {
            title,
            message,
            startAt,
            endAt,
        } = req.body;

        if (startAt && endAt) {

            if (new Date(endAt) < new Date(startAt)) {

                return res.status(400).json({

                    success: false,
                    message:
                        "End date must be greater than start date."

                });

            }

        }

        const announcement =
            await prisma.announcement.create({
                data: {
                    title,
                    message,

                    startAt: startAt
                        ? new Date(startAt)
                        : null,

                    endAt: endAt
                        ? new Date(endAt)
                        : null,
                },
            });

        io.emit(
            "announcement",
            announcement
        );

        res.json({
            success: true,
            data: announcement,
            message:
                "Announcement published successfully",
        });

    }),


    announcements: asyncHandler(
        async (req, res) => {

            const {
                search,
                status,
                page = 1,
            } = req.query;

            const {
                limit,
            } = getPagination(req.query);

            const currentPage =
                Number(page);

            const where = {

                ...(search && {
                    title: {
                        contains: search,
                        mode: "insensitive",
                    },
                }),

                ...(status === "ACTIVE" && {
                    isActive: true,
                }),

                ...(status === "INACTIVE" && {
                    isActive: false,
                }),

            };

            const total =
                await prisma.announcement.count({
                    where,
                });

            const announcements =
                await prisma.announcement.findMany({

                    where,

                    skip:
                        (currentPage - 1) *
                        limit,

                    take: limit,

                    orderBy: {
                        createdAt: "desc",
                    },

                });

            console.log(announcements, 'sjsj')

            res.json({

                success: true,

                data: announcements,

                pagination:
                    getMeta(
                        total,
                        currentPage,
                        limit
                    ),

            });

        }
    ),

    updateAnnouncementStatus:
        asyncHandler(
            async (req, res) => {

                const { id } =
                    req.params;

                const announcement =
                    await prisma.announcement.findUnique({
                        where: {
                            id: Number(id),
                        },
                    });

                if (!announcement) {

                    throw new ApiError(
                        404,
                        "Announcement not found"
                    );

                }

                const data =
                    await prisma.announcement.update({
                        where: {
                            id: Number(id),
                        },

                        data: {
                            isActive:
                                !announcement.isActive,
                        },
                    });

                res.json({
                    success: true,
                    data,
                    message:
                        data.isActive
                            ? "Announcement activated successfully."
                            : "Announcement deactivated successfully.",
                });

            }
        ),


    deleteAnnouncement:
        asyncHandler(
            async (req, res) => {

                const { id } =
                    req.params;

                const announcement =
                    await prisma.announcement.findUnique({
                        where: {
                            id: Number(id),
                        },
                    });

                if (!announcement) {

                    throw new ApiError(
                        404,
                        "Announcement not found"
                    );

                }

                await prisma.announcement.delete({
                    where: {
                        id: Number(id),
                    },
                });

                res.json({
                    success: true,
                    message:
                        "Announcement deleted successfully.",
                });

            }
        ),

};