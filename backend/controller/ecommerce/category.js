import { prisma } from "../../config/prisma.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/apiError.js";

import { createCategorySchema } from "../../validations/ecommerce.js";

import {
  getPagination,
  getMeta,
} from "../../utils/pagination.js";

import {
  slug,
  image,
  searchBy,
} from "../../utils/common.js";

import { deleteFiles } from "../../utils/deleteFiles.js";

export const categoryController =
{
  createCategory:
    asyncHandler(
      async (req, res) => {

        const body =
          createCategorySchema.parse(
            req.body
          );

        const exists =
          await prisma.category.findFirst({
            where: {
              slug: slug(
                body.name
              ),
            },
          });

        if (exists)
          throw new ApiError(
            400,
            "Category already exists"
          );

        const category =
          await prisma.category.create({
            data: {
              ...body,

              slug: slug(
                body.name
              ),

              parentId:
                body.parentId ||
                null,

              image: image(
                req.file
              ),
            },
          });

        res.status(201).json({
          success: true,
          data: category,
        });
      }
    ),

  updateCategory:
    asyncHandler(
      async (req, res) => {

        const id = Number(
          req.params.id
        );

        const body =
          createCategorySchema
            .partial()
            .parse(req.body);

        const category =
          await prisma.category.findUnique(
            {
              where: { id },
            }
          );

        if (!category) {
          deleteFiles(req.file);

          throw new ApiError(
            404,
            "Category not found"
          );
        }

        const updated =
          await prisma.category.update(
            {
              where: { id },

              data: {
                ...body,

                ...(body.name && {
                  slug: slug(
                    body.name
                  ),
                }),

                ...(req.file && {
                  image: image(
                    req.file
                  ),
                }),
              },
            }
          );

        res.json({
          success: true,
          data: updated,
        });
      }
    ),

  getCategories:
    asyncHandler(
      async (req, res) => {

        const {
          search,
        } = req.query;

        const {
          page,
          limit,
          skip,
        } = getPagination(
          req.query
        );

        const where = {
          parentId: null,

          ...searchBy(
            "name",
            search
          ),
        };

        const [
          total,
          data,
        ] = await Promise.all([
          prisma.category.count({
            where,
          }),

          prisma.category.findMany({
            where,
            skip,
            take: limit,

            orderBy: {
              createdAt:
                "desc",
            },

            include: {
              children: true,
            },
          }),
        ]);

        res.json({
          success: true,

          data,

          pagination:
            getMeta(
              total,
              page,
              limit
            ),
        });
      }
    ),

  getCategoryById:
    asyncHandler(
      async (req, res) => {

        const category =
          await prisma.category.findUnique(
            {
              where: {
                id: Number(
                  req.params.id
                ),
              },

              include: {
                children: true,
                products: true,
              },
            }
          );

        if (!category)
          throw new ApiError(
            404,
            "Category not found"
          );

        res.json({
          success: true,
          data: category,
        });
      }
    ),

  deleteCategory:
    asyncHandler(
      async (req, res) => {

        const id = Number(
          req.params.id
        );

        const product =
          await prisma.product.findFirst({
            where: {
              categoryId: id,
            },
          });

        if (product)
          throw new ApiError(
            400,
            "Category has products"
          );

        await prisma.category.delete({
          where: { id },
        });

        res.json({
          success: true,
          message:
            "Category deleted",
        });
      }
    ),
};