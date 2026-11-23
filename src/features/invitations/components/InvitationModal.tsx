import { reportError } from '@/shared/lib/logger';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';
import React, { useState } from 'react';
import {
  Mail,
  UserPlus,
  Copy,
  Check,
  Clock,
  X,
  ExternalLink,
  Send,
} from 'lucide-react';
import { authApi } from '@/features/auth/api/authApi';
import { CommunityGroup, Condition, getProperGroupName } from '@/types';

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cohorts: CommunityGroup[];
}

export const InvitationModal: React.FC<InvitationModalProps> = ({
  isOpen,
  onClose,
  cohorts,
}) => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [primaryCohortSlug, setPrimaryCohortSlug] = useState(
    cohorts.find((c) => !c.isGeneralBoard)?.slug || 'central-maryland',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    expiresAt: string;
    url: string;
    emailSent?: boolean;
    emailPreviewUrl?: string;
    recipientEmail?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [condition, setCondition] = useState<Condition | ''>('');
  const [phone, setPhone] = useState('');
  const dialogRef = useDialogFocus(isOpen, onClose);

  if (!isOpen) return null;

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !condition) return;

    setIsSubmitting(true);
    setErrorNotice(null);
    try {
      const res = await authApi.issueInvitation({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim() || undefined,
        primaryCohortSlug,
        condition,
      });

      setGeneratedInvite({
        token: res.inviteToken,
        expiresAt: res.inviteExpiresAt,
        url: new URL(res.registrationUrl, window.location.origin).href,
        emailSent: res.emailSent,
        emailPreviewUrl: res.emailPreviewUrl,
        recipientEmail: email.trim(),
      });
    } catch (err: unknown) {
      reportError('Failed to issue invitation:', err);
      setErrorNotice(
        (err instanceof Error
          ? err instanceof Error
            ? err.message
            : undefined
          : undefined) ||
          'Unable to issue invitation. Please verify the email and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto cursor-pointer"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Invite Care Partner"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 cursor-default transition-colors outline-none"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-[#002D72] dark:text-blue-400 shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900 dark:text-white leading-tight truncate">
                Invite Care Partner
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-sans truncate">
                Verified care partner access invitation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {generatedInvite ? (
          /* Result View */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 overscroll-contain flex-1">
            {/* Real Email Dispatch Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-4 text-sm space-y-2 text-emerald-950 dark:text-emerald-100 font-sans">
              <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200 text-sm">
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {generatedInvite.emailSent
                    ? 'Invitation emailed'
                    : 'Invitation created'}
                </span>
              </div>
              <p className="text-sm text-emerald-900 dark:text-emerald-300">
                {generatedInvite.emailSent ? (
                  <>
                    An invitation has been emailed to{' '}
                    <strong>{generatedInvite.recipientEmail}</strong>. You can
                    also share the secure link below.
                  </>
                ) : (
                  <>
                    Your invitation link is ready, but the email could not be
                    sent. Please copy the link below or share it using your mail
                    app.
                  </>
                )}
              </p>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-800 dark:text-emerald-400 pt-0.5">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Link expires in 3 days</span>
              </div>

              {generatedInvite.emailPreviewUrl && (
                <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-900/40">
                  <a
                    href={generatedInvite.emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-2xs transition"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Preview Email</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="generated-invitation-url"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                Invite Link
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  id="generated-invitation-url"
                  value={generatedInvite.url}
                  className="flex-1 p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="min-h-11 min-w-11 px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <a
                href={`mailto:${generatedInvite.recipientEmail}?subject=${encodeURIComponent(
                  'You are invited to Care Partner Connect',
                )}&body=${encodeURIComponent(
                  `Hello,\n\nYou have been invited to join Hopkins Care Partner Connect, a private community for care partners supported by a clinical moderation team.\n\nCreate your account using the secure link below. Your invitation is valid for three days.\n${generatedInvite.url}\n\nIf you were not expecting this invitation, you can safely ignore this email.\n\nWarm regards,\nThe Care Partner Connect team`,
                )}`}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition"
              >
                <Mail className="w-4 h-4" />
                <span>Send via Mail App</span>
              </a>

              <button
                onClick={() => {
                  setGeneratedInvite(null);
                  setEmail('');
                  setFirstName('');
                  setLastName('');
                  setPhone('');
                  setCondition('');
                }}
                className="min-h-11 min-w-11 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition cursor-pointer text-center"
              >
                Send Another Invite
              </button>
            </div>
          </div>
        ) : (
          /* Form View with Scrollable Content & Fixed Action Footer */
          <form
            onSubmit={handleIssue}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-sm overscroll-contain flex-1">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Only vetted family members and verified care partners can access
                this closed community.
              </p>

              {errorNotice && (
                <div
                  role="alert"
                  className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-sm p-3 rounded-xl font-sans"
                >
                  {errorNotice}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                    Care partner first name
                  </label>
                  <input
                    aria-label="Care partner first name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Carol"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-base sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                    Care partner last name
                  </label>
                  <input
                    aria-label="Care partner last name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Jenkins"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-base sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                    Care partner email address
                  </label>
                  <input
                    aria-label="Care partner email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="first.last@example.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-base sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone Number{' '}
                    <span className="font-normal text-slate-500 dark:text-slate-400">
                      (optional)
                    </span>
                  </label>
                  <input
                    aria-label="Phone Number"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(123) 456-7890"
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-base sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                  Which community?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['FTD', 'FTD'],
                      ['AD', "Alzheimer's (AD)"],
                    ] as [Condition, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCondition(value)}
                      className={`min-h-11 min-w-11 px-3 py-2.5 rounded-lg text-sm font-semibold border transition cursor-pointer ${
                        condition === value
                          ? 'bg-[#002D72] text-white border-[#002D72] dark:bg-blue-600 dark:border-blue-600 shadow-2xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Primary Regional Cohort
                </label>
                <select
                  aria-label="Assigned Primary Regional Cohort"
                  value={primaryCohortSlug}
                  onChange={(e) => setPrimaryCohortSlug(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-base sm:text-sm cursor-pointer"
                >
                  {cohorts
                    .filter((c) => !c.isGeneralBoard)
                    .map((c) => (
                      <option
                        key={c.id}
                        value={c.slug}
                        className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      >
                        {getProperGroupName(c)}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Fixed Action Footer - Always visible on mobile screens */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 min-w-11 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !condition}
                className="min-h-11 min-w-11 px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-sm font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending...' : 'Send Invitation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
