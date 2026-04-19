type QueryBuilder<T> = {
  range: (from: number, to: number) => QueryBuilder<T>;
};

export function applySupabasePagination<T>(
  query: QueryBuilder<T>,
  page = 1,
  pageSize = 20,
) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  return query.range(from, to);
}
