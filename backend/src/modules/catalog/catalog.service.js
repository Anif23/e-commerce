import { effectiveProductPrice, isDiscountActive, round2, variantLabel, variantPrice } from '../../lib/money.js';
import { numberList, optionalBool, optionalInt, optionalNumber, searchBy, stringList } from '../../lib/query.js';

/**
 * Shared catalog query building + response mapping.
 * Keeping this in one place means the storefront, the admin tables and the
 * search page all return the same shape.
 */

/** Relations needed to render a product card (also used by cart/wishlist). */
export const cardInclude = {
  category: { select: { id: true, name: true, slug: true } },
  images: { select: { id: true, url: true }, orderBy: { id: 'asc' } },
  variants: {
    where: { isActive: true },
    select: { id: true, sku: true, price: true, priceAdjustment: true, stock: true, image: true, combination: true },
    orderBy: { id: 'asc' },
  },
};

export const wishlistInclude = (userId) =>
  userId
    ? {
        where: { wishlist: { userId } },
        select: { id: true },
      }
    : false;

export const buildProductWhere = (query = {}, { includeInactive = false } = {}) => {
  const where = {
    isDeleted: includeInactive ? undefined : false,
  };

  if (query.search) {
    const term = String(query.search).trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { description: { contains: term, mode: 'insensitive' } },
      { brand: { contains: term, mode: 'insensitive' } },
      { tags: { hasSome: [term] } },
    ];
  }

  // `category` accepts either ids (1,2,3) or slugs (audio,homeware) so the
  // storefront can link straight to a category page.
  const categoryIds = numberList(query.category ?? query.categoryId ?? query.categories);
  const categorySlugs = stringList(query.categorySlug ?? (categoryIds ? undefined : query.category));

  if (categoryIds) where.categoryId = { in: categoryIds };
  if (categorySlugs) where.category = { slug: { in: categorySlugs } };

  const brands = stringList(query.brand ?? query.brands);
  if (brands) where.brand = { in: brands };

  const tags = stringList(query.tags);
  if (tags) where.tags = { hasSome: tags };

  const minPrice = optionalNumber(query.minPrice);
  const maxPrice = optionalNumber(query.maxPrice);
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = { ...(minPrice !== undefined && { gte: minPrice }), ...(maxPrice !== undefined && { lte: maxPrice }) };
  }

  const rating = optionalInt(query.rating);
  if (rating !== undefined) where.ratingAvg = { gte: rating };

  if (optionalBool(query.inStock) === true) where.stock = { gt: 0 };
  if (optionalBool(query.featured) === true) where.isFeatured = true;
  if (optionalBool(query.isFeatured) === true) where.isFeatured = true;

  const isActive = optionalBool(query.isActive);
  if (isActive !== undefined) where.isActive = isActive;

  // Admin-only filters
  if (optionalBool(query.lowStock) === true) {
    where.stock = { lte: 5 };
  }

  return where;
};

/** Removes `undefined` keys so Prisma does not receive explicit nulls. */
const compact = (where) =>
  Object.fromEntries(Object.entries(where).filter(([, value]) => value !== undefined));

export const productWhere = (query, options) => compact(buildProductWhere(query, options));

/**
 * Maps a product row (with cardInclude) to the storefront card/DTO shape.
 */
export const toProductCard = (product, now = new Date()) => {
  const discountActive = isDiscountActive(product, now);
  const price = effectiveProductPrice(product, now);
  const images = (product.images ?? []).map((image) => image.url);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    brand: product.brand,
    price,
    compareAtPrice: discountActive ? round2(product.price) : null,
    discountPercent: discountActive && product.price > 0 ? Math.round(((product.price - price) / product.price) * 100) : 0,
    stock: product.stock,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    isDeleted: product.isDeleted,
    tags: product.tags ?? [],
    ratingAvg: Number(product.ratingAvg ?? 0),
    ratingCount: product.ratingCount ?? 0,
    soldCount: product.soldCount ?? 0,
    category: product.category ?? null,
    images,
    image: images[0] ?? null,
    variants: product.variants
      ? product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          price: variantPrice(product, variant, now),
          stock: variant.stock,
          label: variantLabel(variant),
          combination: variant.combination,
          image: variant.image ?? null,
        }))
      : [],
    hasVariants: (product.variants ?? []).length > 0,
    isWishlisted: Boolean(product.wishlistItems?.length),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
};

/** Adds the heavier fields used on the product detail page. */
export const toProductDetail = (product, now = new Date()) => {
  const card = toProductCard(product, now);

  return {
    ...card,
    description: product.description ?? null,
    lowStock: product.lowStock,
    discount: product.discountValue
      ? {
          value: Number(product.discountValue),
          type: product.discountType,
          start: product.discountStart,
          end: product.discountEnd,
        }
      : null,
    options: (product.options ?? []).map((option) => ({
      id: option.id,
      name: option.name,
      values: option.values,
    })),
    reviews:
      product.reviews?.map((review) => ({
        id: review.id,
        rating: review.rating,
        title: review.title,
        comment: review.comment,
        isVerifiedPurchase: review.isVerifiedPurchase,
        createdAt: review.createdAt,
        user: { id: review.user?.id, username: review.user?.username },
      })) ?? [],
  };
};
