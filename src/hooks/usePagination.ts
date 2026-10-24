import { useEffect, useState } from 'react';
import { paginate } from '../utils/pagination';
export function usePagination<T>(items: T[], pageSize: number, filterKey = '') {
  const [state, setState] = useState({ page: 1, filterKey });
  const result = paginate(items, state.filterKey === filterKey ? state.page : 1, pageSize);
  useEffect(() => {
    if (state.filterKey !== filterKey || state.page !== result.page) setState({ page: result.page, filterKey });
  }, [filterKey, result.page, state.filterKey, state.page]);
  return { ...result, setPage: (page: number) => setState({ page, filterKey }) };
}
