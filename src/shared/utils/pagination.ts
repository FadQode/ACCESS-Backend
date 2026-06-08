export interface PaginationInput {
  limit?: number;
  page?: number;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
  page: number;
}

export const normalizePagination = ({
  limit = 10,
  page = 1,
}: PaginationInput): PaginationOptions => {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const safePage = Math.max(Math.trunc(page), 1);

  return {
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
    page: safePage,
  };
};
