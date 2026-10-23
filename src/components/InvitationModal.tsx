import React, { useState } from 'react';
import {
  Mail,
  UserPlus,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  X,
  ExternalLink,
  Send,
} from 'lucide-react';
import { CommunityGroup, Condition, getProperGroupName } from '../types';
import { api } from '../services/api';

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
    cohorts.find((c) => !c.isGeneralBoard)?.slug || 'central-maryland'
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

  if (!isOpen) return null;

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !condition) return;

    setIsSubmitting(true);
    setErrorNotice(null);
    try {
      const res = await api.issueInvitation({
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
        url: `${window.location.origin}${res.registrationUrl}`,
        emailSent: res.emailSent,
        emailPreviewUrl: res.emailPreviewUrl,
        recipientEmail: email.trim(),
      });
    } catch (err: any) {
      console.error('Failed to issue invitation:', err);
      setErrorNotice(err?.message || 'Unable to issue invitation. Please verify the email and try again.');
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
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[calc(100dvh-1.25rem)] sm:max-h-[calc(100dvh-3.5rem)] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 cursor-default transition-colors"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-[#002D72] dark:text-blue-400 shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif font-semibold text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">
                Invite Care Partner
              </h3>
              <p className="text-[10.5px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate">
                Verified caregiver access invitation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {generatedInvite ? (
          /* Result View */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 overscroll-contain flex-1">
            {/* Real Email Dispatch Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm space-y-2 text-emerald-950 dark:text-emerald-100 font-sans">
              <div className="flex items-center gap-2 font-semibold text-emerald-900 dark:text-emerald-200 text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Invitation Issued & Email Dispatched</span>
              </div>
              <p className="text-xs text-emerald-900 dark:text-emerald-300">
                An official Johns Hopkins invitation email was dispatched to <strong>{generatedInvite.recipientEmail}</strong> for the <strong>{condition}</strong> community.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-800 dark:text-emerald-400 pt-0.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Expires: {new Date(generatedInvite.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (72 Hours)
                </span>
              </div>

              {generatedInvite.emailPreviewUrl && (
                <div className="pt-2 border-t border-emerald-200/70 dark:border-emerald-900/40">
                  <a
                    href={generatedInvite.emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>View Sent Email in Web Inbox</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Registration Link
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInvite.url}
                  className="flex-1 p-2 sm:p-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono select-all"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 sm:py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 shrink-0 transition cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <a
                href={`mailto:${generatedInvite.recipientEmail}?subject=${encodeURIComponent(
                  `Invitation to Johns Hopkins Care Partner Connect (${condition} Community)`
                )}&body=${encodeURIComponent(
                  `Hello,\n\nYou have been invited to join Johns Hopkins Care Partner Connect for the ${condition} community.\n\nRegister securely here: ${generatedInvite.url}\n\nSecurity Token: ${generatedInvite.token}\n\nJohns Hopkins Memory and Alzheimer's Treatment Center`
                )}`}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5 transition"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open in Email App</span>
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
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer text-center"
              >
                Issue Another Invite
              </button>
            </div>
          </div>
        ) : (
          /* Form View with Scrollable Content & Fixed Action Footer */
          <form onSubmit={handleIssue} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="p-3.5 sm:p-5 overflow-y-auto space-y-3 text-xs overscroll-contain flex-1">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                Only vetted family members and verified caregivers can access this closed community.
              </p>

              {errorNotice && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 text-xs p-3 rounded-xl font-sans">
                  {errorNotice}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Caregiver First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Carol"
                    className="w-full p-2 sm:p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Caregiver Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Jenkins"
                    className="w-full p-2 sm:p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Caregiver Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="first.last@example.com"
                    className="w-full p-2 sm:p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                    Phone Number <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(123) 456-7890"
                    className="w-full p-2 sm:p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                  Which community?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([['FTD', 'FTD'], ['AD', 'Alzheimer\'s (AD)']] as [Condition, string][]).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCondition(value)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
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
                <label className="block font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                  Assigned Primary Regional Cohort
                </label>
                <select
                  value={primaryCohortSlug}
                  onChange={(e) => setPrimaryCohortSlug(e.target.value)}
                  className="w-full p-2 sm:p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 text-xs cursor-pointer"
                >
                  {cohorts
                    .filter((c) => !c.isGeneralBoard)
                    .map((c) => (
                      <option key={c.id} value={c.slug} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                        {getProperGroupName(c)}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Fixed Action Footer - Always visible on mobile screens */}
            <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/60 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !condition}
                className="px-4 py-1.5 sm:py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Sending Email & Issuing...' : 'Send Invitation Email'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
