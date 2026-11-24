import { EDUCATIONAL_SUPPORT } from '@/shared/lib/siteContent';
import {
  HeartHandshake,
  ShieldAlert,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

interface CommunityGuidelinesProps {
  variant?: 'page' | 'embedded';
}

export function CommunityGuidelines({
  variant = 'page',
}: CommunityGuidelinesProps) {
  const Heading = variant === 'page' ? 'h2' : 'h3';
  return (
    <div
      className={
        variant === 'page'
          ? 'min-h-screen bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:py-14'
          : 'bg-white dark:bg-slate-900'
      }
    >
      <div
        className={
          variant === 'page' ? 'mx-auto max-w-4xl space-y-6' : 'space-y-4'
        }
      >
        {/* Page Header */}
        {variant === 'page' && (
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#002D72] dark:bg-blue-900/30 dark:text-blue-300">
              <HeartHandshake className="h-6 w-6" />
            </div>

            <h1 className="font-serif text-3xl font-bold text-slate-900 dark:text-white sm:text-4xl">
              Community Guidelines
            </h1>
          </div>
        )}

        {/* Do's */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <Heading className="font-serif text-xl font-bold text-slate-900 dark:text-white">
              Community Expectations
            </Heading>
          </div>

          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <li>Keep posts focused on FTD and young-onset dementias.</li>
            <li>
              Stay on topic so the conversation stays helpful and easy to
              follow.
            </li>
            <li>Be kind, respectful, and supportive to others.</li>
          </ul>
        </section>

        {/* Don'ts */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            <Heading className="font-serif text-xl font-bold text-slate-900 dark:text-white">
              What Not to Post
            </Heading>
          </div>

          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <li>
              Personal details such as names, phone numbers, addresses, or email
              addresses.
            </li>
            <li>Hateful, threatening, violent, or offensive language.</li>
            <li>Political opinions, campaign messages, or endorsements.</li>
            <li>Advertisements or sales messages.</li>
            <li>Messages regarding donations or fundraising support.</li>
          </ul>
        </section>

        {/* Privacy */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-[#002D72] dark:text-blue-400" />
            <Heading className="font-serif text-xl font-bold text-slate-900 dark:text-white">
              Privacy
            </Heading>
          </div>

          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Please be thoughtful about the personal information you share.
            Anything you post may be visible to others and could be used in ways
            you may not expect.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            <strong>Educational support:</strong> {EDUCATIONAL_SUPPORT}
          </p>
        </section>

        {/* Moderation */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#002D72] dark:text-blue-400" />
            <Heading className="font-serif text-xl font-bold text-slate-900 dark:text-white">
              Moderation
            </Heading>
          </div>

          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            Moderators may remove posts or limit access if someone does not
            follow the guidelines. Moderators do not provide clinical guidance
            through this portal. For questions requiring clinical support,
            please contact your care team through EPIC.
          </p>
        </section>
      </div>
    </div>
  );
}
