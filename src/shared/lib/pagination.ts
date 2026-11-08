export function paginate<T>(items: T[], requestedPage: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.max(1, Math.min(requestedPage, pageCount));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page, pageCount, start, total: items.length, pageSize };
}
