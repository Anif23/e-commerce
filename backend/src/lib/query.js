/**
 * Small, explicit helpers shared by every paginated/filtered list endpoint.
 */

export const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getPagination = (query, defaultLimit = 12, maxLimit = 60) => {
  const page = Math.max(1, parseNumber(query.page, 1));
  const requested = Math.max(1, parseNumber(query.limit, defaultLimit));
  const limit = Math.min(requested, maxLimit);

  return { page, limit, skip: (page - 1) * limit };
};

export const getMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/** Builds a case-insensitive `contains` filter only when a value is present. */
export const searchBy = (field, value) =>
  value ? { [field]: { contains: String(value).trim(), mode: 'insensitive' } } : {};

export const bool = (value) => ['true', '1', true, 1].includes(value);

export const optionalBool = (value) => {
  if (value === undefined || value === '' || value === null) return undefined;
  return bool(value);
};

export const optionalNumber = (value) => {
  if (value === undefined || value === '' || value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const optionalInt = (value) => {
  const parsed = optionalNumber(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
};

/** Splits a comma separated list (categories=1,2,3) into numbers. */
export const numberList = (value) => {
  if (!value) return undefined;
  const list = String(value)
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
  return list.length ? list : undefined;
};

export const stringList = (value) => {
  if (!value) return undefined;
  const list = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
};

export const SORT_MAP = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  name_asc: { name: 'asc' },
  name_desc: { name: 'desc' },
  rating: { ratingAvg: 'desc' },
  best_selling: { soldCount: 'desc' },
};

export const resolveSort = (sort, fallback = 'newest') => SORT_MAP[sort] ?? SORT_MAP[fallback];
