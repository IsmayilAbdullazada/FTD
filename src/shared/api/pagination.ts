export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export async function collectPaginatedItems<
  T,
  TResponse extends { pagination?: PaginationMeta },
>(
  loadPage: (page: number) => Promise<TResponse>,
  itemsFrom: (response: TResponse) => T[],
): Promise<{ first: TResponse; items: T[] }> {
  const first = await loadPage(1);
  const items = [...itemsFrom(first)];
  const totalPages = first.pagination?.totalPages ?? 1;

  for (let page = 2; page <= totalPages; page += 1) {
    const response = await loadPage(page);
    items.push(...itemsFrom(response));
  }

  return { first, items };
}
