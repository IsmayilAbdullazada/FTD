import { useEffect, useRef, useState } from "react";
import { CaseSensitive, RotateCcw } from "lucide-react";

import {
  DEFAULT_FONT_SIZE,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SIZE_STEP,
} from "../hooks/useFontSize";

import type { FontSize } from "../hooks/useFontSize";

interface FontSizeSelectorProps {
  fontSize: FontSize;
  onFontSizeChange: (size: FontSize) => void;
}

export function FontSizeSelector({
  fontSize,
  onFontSizeChange,
}: FontSizeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Adjust text size"
        aria-expanded={isOpen}
        title="Adjust text size"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex min-h-[44px] min-w-[44px]
          items-center justify-center rounded-lg
          text-slate-600 transition-colors
          hover:bg-slate-100
          focus-visible:outline-2
          focus-visible:outline-blue-700
          dark:text-slate-300
          dark:hover:bg-slate-800"
      >
        <CaseSensitive className="h-6 w-6" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50
            mt-2 w-[280px] max-w-[calc(100vw-2rem)]
            rounded-xl border border-slate-200
            bg-white p-4 shadow-lg
            dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <label
              htmlFor="font-size-slider"
              className="text-sm font-semibold
                text-slate-900 dark:text-white"
            >
              Text size
            </label>

            <span
              className="text-sm font-semibold
                text-[#002D72] dark:text-sky-400"
            >
              {fontSize}%
            </span>
          </div>

          <p className="mb-4 mt-1 text-xs
            text-slate-500 dark:text-slate-400"
          >
            Adjust text for comfortable reading.
          </p>

          {/* Font size slider */}
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="text-xs font-semibold"
            >
              A
            </span>

            <input
              id="font-size-slider"
              type="range"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={FONT_SIZE_STEP}
              value={fontSize}
              aria-valuetext={`${fontSize}%`}
              onChange={(event) =>
                onFontSizeChange(Number(event.target.value))
              }
              className="min-w-0 flex-1 cursor-pointer
                accent-[#002D72] dark:accent-sky-400"
            />

            <span
              aria-hidden="true"
              className="text-xl font-semibold"
            >
              A
            </span>
          </div>

          <div className="mt-1 flex justify-between
            text-xs text-slate-500 dark:text-slate-400"
          >
            <span>{MIN_FONT_SIZE}%</span>
            <span>{MAX_FONT_SIZE}%</span>
          </div>

          <div className="mt-4 border-t border-slate-200
            pt-3 dark:border-slate-700"
          >
            <button
              type="button"
              onClick={() =>
                onFontSizeChange(DEFAULT_FONT_SIZE)
              }
              className="flex w-full items-center
                justify-center gap-2 rounded-lg py-2
                text-xs font-medium text-slate-600
                hover:bg-slate-100
                dark:text-slate-300
                dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}