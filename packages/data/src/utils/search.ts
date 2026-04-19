type SearchableQuery = {
  or: (filters: string) => SearchableQuery;
};

export function applySupabaseSearch(
  query: SearchableQuery,
  search: string | undefined,
  fields: string[],
) {
  const normalized = search?.trim();
  if (!normalized || fields.length === 0) {
    return query;
  }

  const safe = normalized.replace(/[,]/g, " ");
  const searchFilter = fields.map((field) => `${field}.ilike.%${safe}%`).join(",");
  return query.or(searchFilter);
}
