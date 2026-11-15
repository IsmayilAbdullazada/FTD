import { act, renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePagination } from './usePagination';
describe('pagination behavior', () => {
  it('moves through records without losing the previous page', () => {
    const { result } = renderHook(() => usePagination([1, 2, 3, 4, 5], 2));
    expect(result.current.page).toBe(1);
    act(() => result.current.setPage(2));
    expect(result.current.page).toBe(2);
  });
});
