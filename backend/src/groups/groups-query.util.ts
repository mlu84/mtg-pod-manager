export function resolveSearchPagination(page?: number, pageSize?: number): {
  page: number;
  pageSize: number;
} {
  const safePage =
    typeof page === 'number' && Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize =
    typeof pageSize === 'number' && Number.isFinite(pageSize) && pageSize > 0
      ? Math.min(pageSize, 20)
      : 10;

  return { page: safePage, pageSize: safePageSize };
}

