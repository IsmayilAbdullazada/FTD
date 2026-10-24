import React from 'react';
import { Audience, GuideCondition } from '../types';

const STYLES: Record<string, { label: string; cls: string }> = {
  FTD:     { label: 'FTD',     cls: 'bg-ftd-50 text-ftd-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/60' },
  AD:      { label: 'AD',      cls: 'bg-ad-50 text-ad-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-900/60' },
  GENERAL: { label: 'General', cls: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
};

export const AudienceBadge: React.FC<{ condition?: Audience | GuideCondition | string }> = ({ condition }) => {
  if (!condition || condition === 'BOTH') return null;
  const s = STYLES[condition] || STYLES.FTD;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
};