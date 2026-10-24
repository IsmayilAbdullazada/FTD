import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
interface Props { label: string; page: number; pageCount: number; total: number; start: number; pageSize: number; setPage: (page: number) => void }
export function Pagination({ label, page, pageCount, total, start, pageSize, setPage }: Props) {
  if (pageCount <= 1) return null;
  return <nav aria-label={`${label} pagination`} className="flex flex-wrap items-center justify-between gap-2 px-1 py-3 text-xs text-slate-600 dark:text-slate-400">
    <span aria-live="polite">{start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
    <div className="flex items-center gap-1">
      <button type="button" aria-label={`Previous ${label.toLowerCase()} page`} disabled={page === 1} onClick={() => setPage(page - 1)}
        className="min-h-11 min-w-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>
      <span className="px-2 whitespace-nowrap">Page {page} of {pageCount}</span>
      <button type="button" aria-label={`Next ${label.toLowerCase()} page`} disabled={page === pageCount} onClick={() => setPage(page + 1)}
        className="min-h-11 min-w-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  </nav>;
}
