import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";
import { createCategorySchema } from "../../validations/ecommerce.js";
import slugify from "slugify";
import fs from "fs";
import path from "path";
import { deleteFiles } from "../../utils/deleteFiles.js";

export const categoryController = {

  createCategory: asyncHandler(async (req, res) => {
    const body = createCategorySchema.parse(req.body);
    const slug = slugify(body.name, { lower: true, strict: true });

    const image = req.file
      ? `http://localhost:8000/uploads/${req.file.filename}`
      : null;

    const existingCategory = await prisma.category.findFirst({
      where: { slug }
    });

    if (existingCategory) {
      throw new ApiError(400, "Category with this name already exists");
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        parentId: body.parentId ?? null,
        image
      }
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  }),

  updateCategory: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const body = createCategorySchema.partial().parse(req.body);

    const category = await prisma.category.findUnique({
      where: { id: Number(id) }
    });

    if (!category) {
      deleteFiles(req.file ? [req.file] : []);
      throw new ApiError(404, "Category not found");
    }

    let slug;
    if (body.name) {
      slug = slugify(body.name, { lower: true, strict: true });
    }

    // replace image
    let image;
    if (req.file) {
      // delete old image
      if (category.image) {
        const filePath = path.join(
          "uploads",
          category.image.split("/uploads/")[1]
        );

        fs.unlink(filePath, err => {
          if (err) console.error(err);
        });
      }

      image = `http://localhost:8000/uploads/${req.file.filename}`;
    }

    const updatedCategory = await prisma.category.update({
      where: { id: Number(id) },
      data: {
        ...(body.name && { name: body.name }),
        ...(slug && { slug }),
        ...(body.parentId !== undefined && {
          parentId: body.parentId
        }),
        ...(image && { image })
      }
    });

    res.json({
      success: true,
      data: updatedCategory
    });
  }),

  getCategories: asyncHandler(async (req, res) => {
    const {
      search = "",
      page = 1,
      limit = 8,
    } = req.query;

    const currentPage =
      Number(page) || 1;

    const perPage =
      Number(limit) || 8;

    const skip =
      (currentPage - 1) *
      perPage;

    const where = {
      parentId: null,

      ...(search && {
        name: {
          contains: search,
          mode:
            "insensitive",
        },
      })
    };

    const total =
      await prisma.category.count(
        { where }
      );

    const categories =
      await prisma.category.findMany(
        {
          where,
          skip,
          take: perPage,
          orderBy: {
            createdAt:
              "desc",
          },
          include: {
            children: true,
          },
        }
      );

    const totalPages =
      Math.ceil(
        total /
        perPage
      );

    res.json({
      success: true,
      data: categories,
      pagination: {
        total,
        page:
          currentPage,
        limit:
          perPage,
        totalPages,
        hasNext:
          currentPage <
          totalPages,
        hasPrev:
          currentPage >
          1,
      },
    });
  }),

  getCategoryById: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
      include: {
        children: true,
        products: true
      }
    });

    if (!category) throw new ApiError(404, "Category not found");

    res.json({
      success: true,
      data: category
    });
  }),

  deleteCategory: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const productExists = await prisma.product.findFirst({
      where: { categoryId: Number(id) }
    });

    if (productExists) {
      throw new ApiError(
        400,
        "Cannot delete category with existing products"
      );
    }

    await prisma.category.delete({
      where: { id: Number(id) }
    });

    res.json({
      success: true,
      message: "Category deleted successfully"
    });
  })
};