import { prisma } from "../../config/prisma.js";

import { asyncHandler } from "../../utils/asyncHandler.js";

import { ApiError } from "../../utils/apiError.js";

import {
    slug,
    sku,
    bool,
    num,
    date,
    tags,
    searchBy,
    image,
} from "../../utils/common.js";

import {
    getPagination,
    getMeta,
} from "../../utils/pagination.js";

import { deleteFiles } from "../../utils/deleteFiles.js";

const wishlistInclude = (
    userId
) =>
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
        : false;

export const productController =
{
    getProducts:
        asyncHandler(
            async (req, res) => {

                const {
                    search,
                    categoryId,
                    isActive,
                } = req.query;

                const userId =
                    req.user?.id;

                const {
                    page,
                    limit,
                    skip,
                } = getPagination(
                    req.query
                );

                const where = {
                    isDeleted: false,

                    ...searchBy(
                        "name",
                        search
                    ),

                    ...(categoryId && {
                        categoryId:
                            Number(
                                categoryId
                            ),
                    }),

                    ...(isActive !==
                        undefined && {
                        isActive:
                            bool(
                                isActive
                            ),
                    }),
                };

                const [
                    total,
                    products,
                ] = await Promise.all([
                    prisma.product.count({
                        where,
                    }),

                    prisma.product.findMany({
                        where,

                        skip,
                        take: limit,

                        orderBy: {
                            createdAt:
                                "desc",
                        },

                        include: {
                            category: true,
                            images: true,

                            wishlistItems:
                                wishlistInclude(
                                    userId
                                ),
                        },
                    }),
                ]);

                res.json({
                    success: true,

                    data:
                        products.map(
                            ({
                                wishlistItems,
                                ...p
                            }) => ({
                                ...p,

                                isWishlisted:
                                    !!wishlistItems?.length,
                            })
                        ),

                    pagination:
                        getMeta(
                            total,
                            page,
                            limit
                        ),
                });
            }
        ),

    createProduct: asyncHandler(async (req, res) => {

        const b = req.body;

        const category = await prisma.category.findUnique({
            where: {
                id: Number(b.categoryId),
            },
        });

        if (!category) {
            throw new ApiError(404, "Category not found");
        }

        const productSlug = slug(b.name);

        const exists = await prisma.product.findFirst({
            where: { slug: productSlug },
        });

        if (exists) {
            throw new ApiError(400, "Product already exists");
        }

        const product = await prisma.product.create({
            data: {
                name: b.name,
                slug: productSlug,

                sku:
                    b.sku ||
                    sku(b.name, category.name),

                description: b.description,

                price: num(b.price),
                stock: num(b.stock),
                lowStock: num(b.lowStock) || 5,

                isActive: bool(b.isActive),
                isFeatured: bool(b.isFeatured),

                brand: b.brand || null,
                tags: tags(b.tags),

                ...(b.discountType && {
                    discountType: b.discountType,
                }),

                ...(b.discountValue && {
                    discountValue: num(
                        b.discountValue
                    ),
                }),

                ...(b.discountStart && {
                    discountStart: date(
                        b.discountStart
                    ),
                }),

                ...(b.discountEnd && {
                    discountEnd: date(
                        b.discountEnd
                    ),
                }),

                categoryId: Number(
                    b.categoryId
                ),

                ...(req.files?.length && {
                    images: {
                        create: req.files.map(
                            (file) => ({
                                url: image(file),
                            })
                        ),
                    },
                }),
            },

            include: {
                category: true,
                images: true,
            },
        });

        res.status(201).json({
            success: true,
            message: "Product created",
            data: product,
        });

    }),

    updateProduct: asyncHandler(async (req, res) => {

        const id = Number(req.params.id);
        const b = req.body;

        const product = await prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            deleteFiles(req.files);
            throw new ApiError(404, "Product not found");
        }

        if (b.categoryId) {
            const category = await prisma.category.findUnique({
                where: {
                    id: Number(b.categoryId),
                },
            });

            if (!category) {
                throw new ApiError(404, "Category not found");
            }
        }

        const productSlug = b.name
            ? slug(b.name)
            : product.slug;

        if (b.name) {
            const exists = await prisma.product.findFirst({
                where: {
                    slug: productSlug,
                    NOT: { id },
                },
            });

            if (exists) {
                throw new ApiError(400, "Product already exists");
            }
        }

        if (b.deleteImages) {

            const ids = Array.isArray(
                b.deleteImages
            )
                ? b.deleteImages.map(Number)
                : [Number(b.deleteImages)];

            await prisma.productImage.deleteMany({
                where: {
                    id: {
                        in: ids,
                    },
                },
            });
        }

        const updated = await prisma.product.update({
            where: { id },

            data: {
                ...(b.name && {
                    name: b.name,
                    slug: productSlug,
                }),

                ...(b.sku && {
                    sku: b.sku,
                }),

                ...(b.description !== undefined && {
                    description: b.description,
                }),

                ...(b.price && {
                    price: num(b.price),
                }),

                ...(b.stock && {
                    stock: num(b.stock),
                }),

                ...(b.lowStock && {
                    lowStock: num(b.lowStock),
                }),

                ...(b.isActive !== undefined && {
                    isActive: bool(b.isActive),
                }),

                ...(b.isFeatured !== undefined && {
                    isFeatured: bool(b.isFeatured),
                }),

                ...(b.brand !== undefined && {
                    brand: b.brand,
                }),

                ...(b.tags && {
                    tags: tags(b.tags),
                }),

                ...(b.discountType && {
                    discountType: b.discountType,
                }),

                ...(b.discountValue && {
                    discountValue: num(
                        b.discountValue
                    ),
                }),

                ...(b.discountStart && {
                    discountStart: date(
                        b.discountStart
                    ),
                }),

                ...(b.discountEnd && {
                    discountEnd: date(
                        b.discountEnd
                    ),
                }),

                ...(b.categoryId && {
                    categoryId: Number(
                        b.categoryId
                    ),
                }),

                ...(req.files?.length && {
                    images: {
                        create: req.files.map(
                            (file) => ({
                                url: image(file),
                            })
                        ),
                    },
                }),
            },

            include: {
                category: true,
                images: true,
            },
        });

        res.json({
            success: true,
            message: "Product updated",
            data: updated,
        });

    }),

    deleteProduct:
        asyncHandler(
            async (req, res) => {

                const id = Number(
                    req.params.id
                );

                const product =
                    await prisma.product.findUnique(
                        {
                            where: { id },
                        }
                    );

                if (!product)
                    throw new ApiError(
                        404,
                        "Product not found"
                    );

                await prisma.product.update(
                    {
                        where: { id },

                        data: {
                            isDeleted: true,
                            isActive: false,
                        },
                    }
                );

                res.json({
                    success: true,
                    message:
                        "Product deleted",
                });
            }
        ),

    getProductById:
        asyncHandler(
            async (req, res) => {

                const userId =
                    req.user?.id;

                const product =
                    await prisma.product.findUnique(
                        {
                            where: {
                                id: Number(
                                    req.params.id
                                ),

                                isDeleted:
                                    false,
                            },

                            include: {
                                category:
                                    true,

                                images:
                                    true,

                                wishlistItems:
                                    wishlistInclude(
                                        userId
                                    ),
                            },
                        }
                    );

                if (!product)
                    throw new ApiError(
                        404,
                        "Product not found"
                    );

                res.json({
                    success: true,

                    data: {
                        ...product,

                        isWishlisted:
                            !!product
                                .wishlistItems
                                ?.length,
                    },
                });
            }
        ),
};