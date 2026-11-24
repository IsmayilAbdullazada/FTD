import { useEffect, useState } from 'react';

export type FontSize = number;

export const MIN_FONT_SIZE = 100;
export const MAX_FONT_SIZE = 130;
export const DEFAULT_FONT_SIZE = 100;
export const FONT_SIZE_STEP = 5;

const STORAGE_KEY = 'ftdcare-font-size';

function normalizeFontSize(value: number): FontSize {
  if (!Number.isFinite(value)) {
    return DEFAULT_FONT_SIZE;
  }

  const rounded = Math.round(value / FONT_SIZE_STEP) * FONT_SIZE_STEP;

  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, rounded));
}

function getSavedFontSize(): FontSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    // Support previously saved font size preferences.
    if (saved === 'default') return 100;
    if (saved === 'large') return 125;
    if (saved === 'extra-large') return 130;

    return normalizeFontSize(Number(saved ?? DEFAULT_FONT_SIZE));
  } catch {
    return DEFAULT_FONT_SIZE;
  }
}

export function useFontSize() {
  const [fontSize, setFontSize] = useState<FontSize>(getSavedFontSize);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-font-size',
      `${fontSize}%`,
    );

    try {
      localStorage.setItem(STORAGE_KEY, String(fontSize));
    } catch {
      // preference still works for the current session.
    }
  }, [fontSize]);

  return {
    fontSize,
    setFontSize,
  };
}
