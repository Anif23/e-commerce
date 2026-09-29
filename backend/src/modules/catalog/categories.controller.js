import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination, searchBy } from '../../lib/query.js';
import { deleteFiles, fileUrl } from '../../middleware/upload.js';

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');

const categoryInclude = {
  children: { select: { id: true, name: true, slug: true } },
  _count: { select: { products: true } },
};

export const categoriesController = {
  /** GET /api/categories — tree with product counts */
  list: asyncHandler(async (req, res) => {
    const categories = await prisma.category.findMany({
      where: { parentId: null, ...searchBy('name', req.query.search) },
      orderBy: { name: 'asc' },
      include: categoryInclude,
    });

    res.json({
      success: true,
      data: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        productCount: category._count.products,
        children: category.children,
      })),
    });
  }),

  /** GET /api/categories/:idOrSlug */
  detail: asyncHandler(async (req, res) => {
    const id = Number(req.params.idOrSlug);
    const where = Number.isInteger(id) ? { id } : { slug: String(req.params.idOrSlug) };

    const category = await prisma.category.findFirst({
      where,
      include: { ...categoryInclude, parent: true },
    });

    if (!category) throw ApiError.notFound('Category not found');

    res.json({
      success: true,
      data: {
        ...category,
        productCount: category._count.products,
      },
    });
  }),

  adminList: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 20, 100);
    const where = { ...searchBy('name', req.query.search) };

    const [total, categories] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { ...categoryInclude, parent: { select: { id: true, name: true } } },
      }),
    ]);

    res.json({
      success: true,
      data: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        parent: category.parent,
        productCount: category._count.products,
        children: category.children,
        createdAt: category.createdAt,
      })),
      pagination: getMeta(total, page, limit),
    });
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    if (!body.name) {
      deleteFiles(req.file);
      throw ApiError.badRequest('Category name is required');
    }

    const slug = slugify(body.name);

    const duplicate = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (duplicate) {
      deleteFiles(req.file);
      throw ApiError.conflict('That category already exists');
    }

    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        slug,
        image: fileUrl(req.file),
        parentId: body.parentId ? Number(body.parentId) : null,
      },
      include: categoryInclude,
    });

    res.status(201).json({ success: true, message: 'Category created', data: category });
  }),

  update: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body ?? {};

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      deleteFiles(req.file);
      throw ApiError.notFound('Category not found');
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim(), slug: slugify(body.name) }),
        ...(body.parentId !== undefined && { parentId: body.parentId ? Number(body.parentId) : null }),
        ...(req.file && { image: fileUrl(req.file) }),
      },
      include: categoryInclude,
    });

    res.json({ success: true, message: 'Category updated', data: updated });
  }),

  remove: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const products = await prisma.product.count({ where: { categoryId: id, isDeleted: false } });
    if (products) throw ApiError.badRequest('Move or delete the products in this category first');

    await prisma.category.delete({ where: { id } });

    res.json({ success: true, message: 'Category deleted' });
  }),
};
