import { prisma } from '../../lib/prisma.js';
import { ApiError, asyncHandler } from '../../lib/errors.js';
import { getMeta, getPagination, resolveSort } from '../../lib/query.js';
import { cardInclude, productWhere, toProductCard, toProductDetail, wishlistInclude } from './catalog.service.js';
import { createAdminNotification } from '../../services/notifications.js';
import { adjustStock } from '../../services/inventory.js';
import { deleteFiles, deleteStoredFiles, fileUrl } from '../../middleware/upload.js';
import { variantLabel } from '../../lib/money.js';

const slugify = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);

const parseIdOrSlug = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && String(value) === String(id) ? { id } : { slug: String(value) };
};

const reviewInclude = {
  include: {
    user: { select: { id: true, username: true } },
  },
  where: { isApproved: true },
  orderBy: { createdAt: 'desc' },
  take: 10,
};

export const productsController = {
  /** GET /api/products — search + filter + sort + paginate */
  list: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 12, 48);
    const where = productWhere(req.query);
    const orderBy = resolveSort(req.query.sort, 'newest');
    const userId = req.user?.id ?? null;

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { ...cardInclude, wishlistItems: wishlistInclude(userId) },
      }),
    ]);

    res.json({
      success: true,
      data: products.map((product) => toProductCard(product)),
      pagination: getMeta(total, page, limit),
    });
  }),

  /** GET /api/products/filters — facet values for the filter sidebar */
  filters: asyncHandler(async (_req, res) => {
    const [categories, brands, priceBounds] = await Promise.all([
      prisma.category.findMany({
        select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { isDeleted: false, brand: { not: null } },
        distinct: ['brand'],
        select: { brand: true },
      }),
      prisma.product.aggregate({
        where: { isDeleted: false },
        _min: { price: true },
        _max: { price: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          count: category._count.products,
        })),
        brands: brands.map((row) => row.brand).filter(Boolean).sort(),
        price: {
          min: priceBounds._min.price ?? 0,
          max: priceBounds._max.price ?? 0,
        },
      },
    });
  }),

  /** GET /api/products/featured — homepage rails */
  featured: asyncHandler(async (req, res) => {
    const take = Math.min(Number(req.query.limit) || 8, 24);
    const userId = req.user?.id ?? null;

    const [featured, newest, bestSellers] = await Promise.all([
      prisma.product.findMany({
        where: { isDeleted: false, isActive: true, isFeatured: true },
        take,
        orderBy: { createdAt: 'desc' },
        include: { ...cardInclude, wishlistItems: wishlistInclude(userId) },
      }),
      prisma.product.findMany({
        where: { isDeleted: false, isActive: true },
        take,
        orderBy: { createdAt: 'desc' },
        include: { ...cardInclude, wishlistItems: wishlistInclude(userId) },
      }),
      prisma.product.findMany({
        where: { isDeleted: false, isActive: true },
        take,
        orderBy: { soldCount: 'desc' },
        include: { ...cardInclude, wishlistItems: wishlistInclude(userId) },
      }),
    ]);

    res.json({
      success: true,
      data: {
        featured: featured.map((product) => toProductCard(product)),
        newest: newest.map((product) => toProductCard(product)),
        bestSellers: bestSellers.map((product) => toProductCard(product)),
      },
    });
  }),

  /** GET /api/products/:idOrSlug */
  detail: asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? null;

    const product = await prisma.product.findFirst({
      where: { ...parseIdOrSlug(req.params.idOrSlug), isDeleted: false },
      include: {
        ...cardInclude,
        options: true,
        reviews: reviewInclude,
        wishlistItems: wishlistInclude(userId),
      },
    });

    if (!product) throw ApiError.notFound('Product not found');

    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, isDeleted: false, isActive: true, NOT: { id: product.id } },
      take: 4,
      orderBy: { soldCount: 'desc' },
      include: { ...cardInclude, wishlistItems: wishlistInclude(userId) },
    });

    res.json({
      success: true,
      data: {
        ...toProductDetail(product),
        related: related.map((item) => toProductCard(item)),
      },
    });
  }),

  /** GET /api/products/:id/reviews — paginated reviews for a product */
  reviews: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 10, 50);
    const product = await prisma.product.findFirst({
      where: parseIdOrSlug(req.params.idOrSlug),
      select: { id: true },
    });

    if (!product) throw ApiError.notFound('Product not found');

    const [total, reviews, distribution] = await Promise.all([
      prisma.review.count({ where: { productId: product.id, isApproved: true } }),
      prisma.review.findMany({
        where: { productId: product.id, isApproved: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, username: true } } },
      }),
      prisma.review.groupBy({
        by: ['rating'],
        where: { productId: product.id, isApproved: true },
        _count: { _all: true },
      }),
    ]);

    const buckets = [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: distribution.find((row) => row.rating === rating)?._count._all ?? 0,
    }));

    res.json({
      success: true,
      data: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isVerifiedPurchase: review.isVerifiedPurchase,
        createdAt: review.createdAt,
        user: { id: review.user.id, username: review.user.username },
      })),
      distribution: buckets,
      pagination: getMeta(total, page, limit),
    });
  }),

  /* ------------------------------------------------------------------ */
  /* Admin                                                               */
  /* ------------------------------------------------------------------ */

  adminList: asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query, 10, 100);
    const where = productWhere(req.query, { includeInactive: true });
    const orderBy = resolveSort(req.query.sort, 'newest');

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({ where, skip, take: limit, orderBy, include: cardInclude }),
    ]);

    res.json({
      success: true,
      data: products.map((product) => ({
        ...toProductCard(product),
        lowStock: product.lowStock,
        description: product.description ?? null,
      })),
      pagination: getMeta(total, page, limit),
    });
  }),

  adminDetail: asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: Number(req.params.id) },
      include: { ...cardInclude, options: true },
    });

    if (!product) throw ApiError.notFound('Product not found');

    res.json({
      success: true,
      data: {
        ...toProductDetail(product),
        // Full image rows (id + url) so the admin form can delete them by id.
        imageRows: product.images ?? [],
        discountType: product.discountType,
        discountValue: product.discountValue ? Number(product.discountValue) : null,
        discountStart: product.discountStart,
        discountEnd: product.discountEnd,
        variants: (product.variants ?? []).map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          price: variant.price,
          priceAdjustment: Number(variant.priceAdjustment),
          stock: variant.stock,
          isActive: variant.isActive,
          image: variant.image,
          combination: variant.combination,
          label: variantLabel(variant),
        })),
      },
    });
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.body ?? {};

    if (!body.name || !body.categoryId) {
      deleteFiles(req.files);
      throw ApiError.badRequest('Name and category are required');
    }

    const category = await prisma.category.findUnique({ where: { id: Number(body.categoryId) } });
    if (!category) {
      deleteFiles(req.files);
      throw ApiError.badRequest('Category not found');
    }

    const slug = body.slug ? slugify(body.slug) : slugify(body.name);

    const duplicate = await prisma.product.findFirst({ where: { slug }, select: { id: true } });
    if (duplicate) {
      deleteFiles(req.files);
      throw ApiError.conflict('A product with this name already exists');
    }

    let product;
    try {
      product = await prisma.product.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description ?? null,
        price: Number(body.price ?? 0),
        stock: Number(body.stock ?? 0),
        lowStock: Number(body.lowStock ?? 5),
        isActive: body.isActive === undefined ? true : ['true', '1', true].includes(body.isActive),
        isFeatured: ['true', '1', true].includes(body.isFeatured),
        sku: body.sku || null,
        brand: body.brand || null,
        tags: body.tags ? String(body.tags).split(',').map((tag) => tag.trim()).filter(Boolean) : [],
        discountType: body.discountType || null,
        discountValue: body.discountValue ? Number(body.discountValue) : null,
        discountStart: body.discountStart ? new Date(body.discountStart) : null,
        discountEnd: body.discountEnd ? new Date(body.discountEnd) : null,
        categoryId: category.id,
        images: req.files?.length ? { create: req.files.map((file) => ({ url: fileUrl(file) })) } : undefined,
      },
      include: cardInclude,
      });
    } catch (error) {
      await deleteFiles(req.files);
      throw error;
    }

    res.status(201).json({ success: true, message: 'Product created', data: toProductCard(product) });
  }),

  update: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body ?? {};

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      deleteFiles(req.files);
      throw ApiError.notFound('Product not found');
    }

    if (body.deleteImages) {
      const ids = (Array.isArray(body.deleteImages) ? body.deleteImages : [body.deleteImages]).map(Number);
      const removedImages = await prisma.productImage.findMany({
        where: { productId: id, id: { in: ids } },
        select: { url: true },
      });
      await prisma.productImage.deleteMany({ where: { productId: id, id: { in: ids } } });
      await deleteStoredFiles(removedImages.map((image) => image.url));
    }

    const slug = body.name && body.name !== product.name ? slugify(body.name) : undefined;

    if (slug) {
      const duplicate = await prisma.product.findFirst({ where: { slug, NOT: { id } }, select: { id: true } });
      if (duplicate) {
        deleteFiles(req.files);
        throw ApiError.conflict('Another product already uses this name');
      }
    }

    let updated;
    try {
      updated = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(slug && { slug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: Number(body.price) }),
        ...(body.stock !== undefined && { stock: Number(body.stock) }),
        ...(body.lowStock !== undefined && { lowStock: Number(body.lowStock) }),
        ...(body.isActive !== undefined && { isActive: ['true', '1', true].includes(body.isActive) }),
        ...(body.isFeatured !== undefined && { isFeatured: ['true', '1', true].includes(body.isFeatured) }),
        ...(body.sku !== undefined && { sku: body.sku || null }),
        ...(body.brand !== undefined && { brand: body.brand || null }),
        ...(body.tags !== undefined && {
          tags: String(body.tags).split(',').map((tag) => tag.trim()).filter(Boolean),
        }),
        ...(body.categoryId !== undefined && { categoryId: Number(body.categoryId) }),
        ...(body.discountType !== undefined && { discountType: body.discountType || null }),
        ...(body.discountValue !== undefined && {
          discountValue: body.discountValue ? Number(body.discountValue) : null,
        }),
        ...(body.discountStart !== undefined && {
          discountStart: body.discountStart ? new Date(body.discountStart) : null,
        }),
        ...(body.discountEnd !== undefined && {
          discountEnd: body.discountEnd ? new Date(body.discountEnd) : null,
        }),
        ...(req.files?.length && { images: { create: req.files.map((file) => ({ url: fileUrl(file) })) } }),
      },
      include: cardInclude,
      });
    } catch (error) {
      await deleteFiles(req.files);
      throw error;
    }

    res.json({ success: true, message: 'Product updated', data: toProductCard(updated) });
  }),

  remove: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw ApiError.notFound('Product not found');

    // Soft delete keeps order history intact.
    await prisma.product.update({ where: { id }, data: { isDeleted: true, isActive: false } });

    res.json({ success: true, message: 'Product deleted' });
  }),

  restore: asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const product = await prisma.product.update({
      where: { id },
      data: { isDeleted: false, isActive: true },
      include: cardInclude,
    });

    res.json({ success: true, message: 'Product restored', data: toProductCard(product) });
  }),

  /** POST /api/admin/products/:id/variants — one or many variants */
  createVariant: asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const body = req.body ?? {};

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    if (body.sku) {
      const duplicate = await prisma.productVariant.findUnique({ where: { sku: String(body.sku) } });
      if (duplicate) throw ApiError.conflict('That SKU is already used by another variant');
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: body.sku || `${product.slug.toUpperCase().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
        price: body.price !== undefined && body.price !== '' ? Number(body.price) : null,
        priceAdjustment: Number(body.priceAdjustment ?? 0),
        stock: Number(body.stock ?? 0),
        isActive: body.isActive === undefined ? true : ['true', '1', true].includes(body.isActive),
        image: body.image || null,
        combination: typeof body.combination === 'string' ? JSON.parse(body.combination) : (body.combination ?? {}),
      },
    });

    res.status(201).json({ success: true, message: 'Variant added', data: variant });
  }),

  updateVariant: asyncHandler(async (req, res) => {
    const variantId = Number(req.params.variantId);
    const body = req.body ?? {};

    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw ApiError.notFound('Variant not found');

    if (body.sku && body.sku !== variant.sku) {
      const duplicate = await prisma.productVariant.findUnique({ where: { sku: String(body.sku) } });
      if (duplicate) throw ApiError.conflict('That SKU is already used by another variant');
    }

    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(body.sku !== undefined && { sku: body.sku }),
        ...(body.price !== undefined && { price: body.price === '' ? null : Number(body.price) }),
        ...(body.priceAdjustment !== undefined && { priceAdjustment: Number(body.priceAdjustment) }),
        ...(body.stock !== undefined && { stock: Number(body.stock) }),
        ...(body.isActive !== undefined && { isActive: ['true', '1', true].includes(body.isActive) }),
        ...(body.image !== undefined && { image: body.image || null }),
        ...(body.combination !== undefined && {
          combination: typeof body.combination === 'string' ? JSON.parse(body.combination) : body.combination,
        }),
      },
    });

    res.json({ success: true, message: 'Variant updated', data: updated });
  }),

  deleteVariant: asyncHandler(async (req, res) => {
    const variantId = Number(req.params.variantId);

    await prisma.productVariant.delete({ where: { id: variantId } });

    res.json({ success: true, message: 'Variant removed' });
  }),

  /** POST /api/admin/products/:id/options — replaces the option axes */
  setOptions: asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const options = Array.isArray(req.body?.options) ? req.body.options : [];

    await prisma.variantOption.deleteMany({ where: { productId } });

    if (options.length) {
      await prisma.variantOption.createMany({
        data: options.map((option, index) => ({
          productId,
          name: option.name,
          values: Array.isArray(option.values) ? option.values : String(option.values ?? '').split(',').map((v) => v.trim()).filter(Boolean),
          position: index,
        })),
      });
    }

    const saved = await prisma.variantOption.findMany({ where: { productId }, orderBy: { position: 'asc' } });

    res.json({ success: true, data: saved });
  }),

  /** PATCH /api/admin/products/:id/stock */
  adjustStock: asyncHandler(async (req, res) => {
    const productId = Number(req.params.id);
    const change = Number(req.body?.change);
    const reason = req.body?.reason || 'Manual adjustment';

    if (!Number.isFinite(change) || change === 0) {
      throw ApiError.badRequest('A non-zero stock change is required');
    }

    const result = await adjustStock({
      productId,
      variantId: req.body?.variantId ? Number(req.body.variantId) : null,
      change: Math.trunc(change),
      reason,
      actor: req.user?.username ?? 'admin',
    });

    await createAdminNotification({
      title: 'Inventory updated',
      message: `${reason} (#${productId})`,
      type: 'LOW_STOCK',
      link: '/admin/inventory',
    }).catch(() => {});

    res.json({ success: true, message: 'Stock updated', data: { stock: result.level } });
  }),
};
