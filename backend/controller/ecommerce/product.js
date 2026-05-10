import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { createProductSchema, updateProductSchema } from "../../validations/ecommerce.js";
import fs from "fs";
import path from "path";
import { deleteFiles } from "../../utils/deleteFiles.js";

import {
    generateSlug,
    generateSKU,
    cleanBody,
    parseTags,
    toDate,
    normalizeValue,
    toBoolean
} from "../../utils/productUtils.js";

export const productController = {

    getProducts:
        asyncHandler(async (req, res) => {

            const {
                search,
                categoryId,
                page = 1,
                limit = 3,
                isActive,
            } = req.query;

            const userId =
                req.user?.id;

            const currentPage =
                Number(page);

            const perPage =
                Number(limit);

            const where = {
                isDeleted: false,
                isActive: true,

                ...(search && {
                    name: {
                        contains: search,
                        mode: "insensitive",
                    },
                }),

                ...(categoryId && {
                    categoryId:
                        Number(categoryId),
                }),

                ...(typeof isActive !==
                    "undefined" && {
                    isActive:
                        toBoolean(isActive),
                }),
            };

            const total =
                await prisma.product.count({
                    where,
                });

            const products =
                await prisma.product.findMany({
                    where,

                    skip:
                        (currentPage - 1) *
                        perPage,

                    take: perPage,

                    orderBy: {
                        createdAt: "desc",
                    },

                    include: {
                        category: true,
                        images: true,

                        wishlistItems:
                            userId
                                ? {
                                    where: {
                                        wishlist: {
                                            userId,
                                        },
                                    },

                                    select: {
                                        id: true,
                                    },
                                }
                                : false,
                    },
                });

            const data =
                products.map((p) => ({
                    ...p,

                    isWishlisted:
                        p.wishlistItems
                            ?.length > 0,

                    wishlistItems:
                        undefined,
                }));

            const totalPages =
                Math.ceil(
                    total / perPage
                );

            res.json({
                success: true,

                data,

                pagination: {
                    total,
                    page: currentPage,
                    limit: perPage,
                    totalPages,

                    hasNext:
                        currentPage <
                        totalPages,

                    hasPrev:
                        currentPage > 1,
                },
            });
        }),

    createProduct: asyncHandler(async (req, res) => {
        const body = createProductSchema.parse(req.body);

        const category = await prisma.category.findUnique({
            where: { id: Number(body.categoryId) }
        });

        if (!category) throw new ApiError(404, "Category not found");

        const slug = generateSlug(body.name);

        const existing = await prisma.product.findFirst({
            where: { slug }
        });

        if (existing) {
            throw new ApiError(400, "Product already exists");
        }

        // AUTO SKU (fallback if not provided)
        const sku =
            body.sku && body.sku !== "null"
                ? body.sku
                : generateSKU(body.name, category.name);

        const images =
            req.files?.map((f) => ({
                url: `http://localhost:8000/uploads/${f.filename}`
            })) || [];

        const product = await prisma.product.create({
            data: {
                name: body.name,
                slug,
                sku,

                description: body.description,
                price: Number(body.price),
                stock: Number(body.stock),
                lowStock: Number(body.lowStock ?? 5),

                isActive: toBoolean.isActive ?? true,
                isFeatured: toBoolean.isFeatured ?? false,

                brand: body.brand || null,
                tags: parseTags(body.tags),

                discountType: body.discountType || null,
                discountValue: body.discountValue ? Number(body.discountValue) : null,
                discountStart: toDate(body.discountStart),
                discountEnd: toDate(body.discountEnd),

                categoryId: Number(body.categoryId),

                images: {
                    create: images
                }
            },
            include: {
                images: true,
                category: true
            }
        });

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product
        });
    }),

    updateProduct: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const productId = Number(id);

        const body = updateProductSchema.parse(req.body);
        const clean = Object.fromEntries(
            Object.entries(body).map(([k, v]) => [k, normalizeValue(v)])
        );

        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: { images: true }
        });

        if (!product) {
            deleteFiles(req.files);
            throw new ApiError(404, "Product not found");
        }

        // CATEGORY CHECK
        if (clean.categoryId) {
            const category = await prisma.category.findUnique({
                where: { id: Number(clean.categoryId) }
            });

            if (!category) throw new ApiError(404, "Category not found");
        }

        // SLUG + NAME
        let slug = product.slug;

        if (clean.name) {
            slug = generateSlug(clean.name);

            const duplicate = await prisma.product.findFirst({
                where: {
                    slug,
                    NOT: { id: productId }
                }
            });

            if (duplicate) {
                throw new ApiError(400, "Duplicate product name");
            }
        }

        // SKU (allow update OR keep old OR regenerate)
        let sku = product.sku;

        if (clean.sku) {
            sku = clean.sku;
        } else if (!sku) {
            const category = await prisma.category.findUnique({
                where: { id: product.categoryId }
            });

            sku = generateSKU(clean.name || product.name, category?.name || "PROD");
        }

        // DELETE IMAGES
        let deleteIds = clean.deleteImages;

        if (deleteIds) {
            deleteIds = Array.isArray(deleteIds) ? deleteIds : [deleteIds];

            const toDelete = product.images.filter((img) =>
                deleteIds.includes(img.id)
            );

            toDelete.forEach((img) => {
                const filePath = path.join(
                    "uploads",
                    img.url.split("/uploads/")[1]
                );
                fs.unlink(filePath, () => { });
            });

            await prisma.productImage.deleteMany({
                where: { id: { in: deleteIds } }
            });
        }

        const newImages =
            req.files?.map((f) => ({
                url: `http://localhost:8000/uploads/${f.filename}`
            })) || [];

        const updated = await prisma.product.update({
            where: { id: productId },
            data: {
                name: clean.name,
                slug,
                sku,

                description: clean.description,
                price: clean.price ? Number(clean.price) : undefined,
                stock: clean.stock ? Number(clean.stock) : undefined,
                lowStock: clean.lowStock ? Number(clean.lowStock) : undefined,

                isActive: toBoolean.isActive,
                isFeatured: toBoolean.isFeatured,

                brand: clean.brand || null,
                tags: parseTags(clean.tags),

                discountType: clean.discountType || null,
                discountValue: clean.discountValue ? Number(clean.discountValue) : null,
                discountStart: toDate(clean.discountStart),
                discountEnd: toDate(clean.discountEnd),

                categoryId: clean.categoryId ? Number(clean.categoryId) : undefined,

                images: {
                    create: newImages
                }
            },
            include: {
                images: true,
                category: true
            }
        });

        res.json({
            success: true,
            message: "Product updated successfully",
            data: updated
        });
    }),

    deleteProduct: asyncHandler(async (req, res) => {
        const { id } = req.params;

        const productId = Number(id);

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) throw new ApiError(404, "Product not found");

        await prisma.product.update({
            where: { id: productId },
            data: {
                isDeleted: true,
                isActive: false
            }
        });

        res.json({
            success: true,
            message: "Product deleted successfully"
        });
    }),

    getProductById: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const userId = req.user?.id;

        const product = await prisma.product.findUnique({
            where: { id: Number(id), isDeleted: false },
            include: {
                category: true,
                images: true,

                wishlistItems: userId
                    ? {
                        where: {
                            wishlist: {
                                userId,
                            },
                        },
                        select: { id: true },
                    }
                    : false,
            },
        });

        if (!product) throw new ApiError(404, "Product not found");

        res.json({
            success: true,
            data: {
                ...product,
                isWishlisted: userId ? product.wishlistItems.length > 0 : false,
            },
        });
    })
};