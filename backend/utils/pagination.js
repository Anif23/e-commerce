export const getPagination = (
  query
) => {
  const page =
    Number(query.page) || 1;

  const limit =
    Number(query.limit) || 10;

  return {
    page,
    limit,
    skip:
      (page - 1) * limit,
  };
};

export const getMeta = (
  total,
  page,
  limit
) => {
  const totalPages =
    Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext:
      page < totalPages,
    hasPrev: page > 1,
  };
};