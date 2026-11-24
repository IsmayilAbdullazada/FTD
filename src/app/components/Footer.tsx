import { CLINIC_AFFILIATION } from '@/shared/lib/siteContent';
import { useState } from 'react';
import { CommunityGuidelinesModal } from '@/features/policies/components/CommunityGuidelinesModal';

interface FooterProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAssistant?: () => void;
  onOpenAudit?: () => void;
  isClinician?: boolean;
}
export function Footer(_props: FooterProps) {
  const [showGuidelines, setShowGuidelines] = useState(false);
  return (
    <>
      <footer
        data-site-footer
        className="relative z-10 bg-[#001D4A] dark:bg-[#030611] border-t-2 border-[#002D72] dark:border-slate-800 text-slate-200 font-sans mb-[calc(4rem+1px+env(safe-area-inset-bottom,0px))] xl:mb-0"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid gap-5 lg:grid-cols-2 lg:gap-10">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <img
                src="/website_logo.png"
                alt="Hopkins Care Partner Connect logo"
                width={96}
                height={96}
                className="h-18 w-18 sm:h-24 sm:w-24 object-contain shrink-0"
              />
              <div className="space-y-2 min-w-0">
                <p className="text-lg leading-snug font-semibold text-white">
                  Hopkins Care Partner Connect
                </p>
                <p className="text-sm leading-relaxed text-blue-100">
                  {CLINIC_AFFILIATION} · Baltimore, MD
                </p>
              </div>
            </div>
            <nav
              aria-label="Community information"
              className="flex items-start lg:justify-end"
            >
              <button
                type="button"
                onClick={() => setShowGuidelines(true)}
                className="min-h-11 rounded-lg px-3 py-2 text-left text-sm font-semibold text-blue-100 underline decoration-blue-300/50 underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                Community Guidelines
              </button>
            </nav>
          </div>
          <div className="mt-5 sm:mt-6 border-t border-blue-200/20 pt-4">
            <p className="text-sm leading-relaxed text-blue-100/90">
              © 2026 The Johns Hopkins University, The Johns Hopkins Hospital,
              and Johns Hopkins Health System. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {showGuidelines && (
        <CommunityGuidelinesModal onClose={() => setShowGuidelines(false)} />
      )}
    </>
  );
}
