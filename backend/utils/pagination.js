export const getPagination = () => {
  const page =
    Number(
      process.env.PAGE ||
      1
    );

  const limit =
    Number(
      process.env.LIMIT ||
      10
    );

  return {
    page,
    limit,
  };
};

export const getMeta = (
  total,
  page,
  limit
) => {
  const totalPages =
    Math.ceil(
      total / limit
    );

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext:
      page <
      totalPages,
    hasPrev:
      page > 1,
  };
};

export const searchBy = (
  field,
  value
) =>
  value
    ? {
      [field]: {
        contains:
          value,
        mode:
          "insensitive",
      },
    }
    : {};