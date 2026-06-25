import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";

export const addressController = {

    getUserAddresses: asyncHandler(async (req, res) => {

        const addresses =
            await prisma.address.findMany({
                where: {
                    userId: req.user.id
                },

                orderBy: {
                    isDefault: "desc",
                },
            });

        res.json({
            success: true,
            data: addresses
        });
    }),

    addAddress: asyncHandler(async (req, res) => {

        const {
            fullName,
            phone,
            address1,
            address2,
            city,
            state,
            country,
            zipCode,
            isDefault,
        } = req.body;

        if (
            !fullName ||
            !phone ||
            !address1 ||
            !city ||
            !state ||
            !country ||
            !zipCode
        ) {
            throw new ApiError(
                400,
                "Please fill all required fields"
            );
        }

        // remove old default
        if (isDefault) {

            await prisma.address.updateMany({
                where: {
                    userId: req.user.id,
                },

                data: {
                    isDefault: false,
                },
            });
        }

        const address =
            await prisma.address.create({
                data: {
                    userId: req.user.id,

                    fullName,
                    phone,
                    address1,
                    address2,
                    city,
                    state,
                    country,
                    zipCode,

                    isDefault:
                        Boolean(isDefault),
                },
            });

        res.json({
            success: true,
            message: "Address added",
            data: address,
        });
    }),

    updateAddress: asyncHandler(async (req, res) => {

        const id =
            Number(req.params.id);

        const existing =
            await prisma.address.findFirst({
                where: {
                    id,
                    userId: req.user.id,
                },
            });

        if (!existing) {
            throw new ApiError(
                404,
                "Address not found"
            );
        }

        const {
            isDefault,
            ...rest
        } = req.body;

        if (isDefault) {

            await prisma.address.updateMany({
                where: {
                    userId: req.user.id,
                },

                data: {
                    isDefault: false,
                },
            });
        }

        const updated =
            await prisma.address.update({
                where: { id },

                data: {
                    ...rest,

                    ...(typeof isDefault !== "undefined" && {
                        isDefault
                    }),
                },
            });

        res.json({
            success: true,
            message: "Address updated",
            data: updated,
        });
    }),

    deleteAddress: asyncHandler(async (req, res) => {

        const id =
            Number(req.params.id);

        const address =
            await prisma.address.findFirst({
                where: {
                    id,
                    userId: req.user.id,
                },
            });

        if (!address) {
            throw new ApiError(
                404,
                "Address not found"
            );
        }

        await prisma.address.delete({
            where: { id },
        });

        res.json({
            success: true,
            message: "Address deleted",
        });
    }),

    setDefaultAddress: asyncHandler(async (req, res) => {

        const id =
            Number(req.params.id);

        const address =
            await prisma.address.findFirst({
                where: {
                    id,
                    userId: req.user.id,
                },
            });

        if (!address) {
            throw new ApiError(
                404,
                "Address not found"
            );
        }

        await prisma.address.updateMany({
            where: {
                userId: req.user.id,
            },

            data: {
                isDefault: false,
            },
        });

        const updated =
            await prisma.address.update({
                where: { id },

                data: {
                    isDefault: true,
                },
            });

        res.json({
            success: true,
            message: "Default address updated",
            data: updated,
        });
    }),
};