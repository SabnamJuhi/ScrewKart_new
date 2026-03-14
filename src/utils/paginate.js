
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

exports.getPaginationOptions = (query) => {
  let { page, limit, sortBy, order } = query;

  // Convert to numbers
  page = parseInt(page) || DEFAULT_PAGE;
  limit = parseInt(limit) || DEFAULT_LIMIT;

  // Prevent negative values
  if (page < 1) page = DEFAULT_PAGE;
  if (limit < 1) limit = DEFAULT_LIMIT;

  // Prevent abuse (very important in production)
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const offset = (page - 1) * limit;

  // Sorting
  const sortField = sortBy || "createdAt";
  // Optional: whitelist allowed sort fields
  const allowedSortFields = ["createdAt", "updatedAt", "totalAmount", "status"];

  if (!allowedSortFields.includes(sortField)) {
    sortField = "createdAt";
  }
  const sortOrder = order === "asc" ? "ASC" : "DESC";

  return {
    limit,
    offset,
    currentPage: page,
    order: [[sortField, sortOrder]],
  };
};

exports.formatPagination = (data, page, limit) => {
  const { count, rows } = data;

  const totalPages = Math.ceil(count / limit);

  return {
    data: rows,
    pagination: {
      totalItems: count,
      totalPages,
      currentPage: page,
      pageSize: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};
