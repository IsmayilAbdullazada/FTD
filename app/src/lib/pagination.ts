import { z } from 'zod';

const positiveInteger = z.coerce.number().int().positive();

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function parsePagination(
  query: Record<string, unknown>,
  defaultPageSize = 25,
  maxPageSize = 100,
) {
  const page = positiveInteger.max(1_000_000).default(1).parse(query.page);
  const requestedPageSize = positiveInteger
    .default(defaultPageSize)
    .parse(query.pageSize);
  const pageSize = Math.min(requestedPageSize, maxPageSize);

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  };
}

export function paginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}
