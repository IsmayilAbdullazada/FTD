import React, { useState } from 'react';
import {
  Mail,
  UserPlus,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  X,
} from 'lucide-react';
import { CommunityGroup } from '../types';
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
    cohorts.find((c) => !c.isGeneralBoard)?.slug || 'baltimore-metro'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{
    token: string;
    expiresAt: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setErrorNotice(null);
    try {
      const res = await api.issueInvitation({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        primaryCohortSlug,
      });

      setGeneratedInvite({
        token: res.inviteToken,
        expiresAt: res.inviteExpiresAt,
        url: `${window.location.origin}${res.registrationUrl}`,
      });
    } catch (err) {
      console.error('Failed to issue invitation:', err);
      setErrorNotice('Unable to issue invitation. Please verify the email and try again.');
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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-[#002D72]" />
            <h3 className="font-serif font-semibold text-lg text-slate-900">
              Invite Care Partner
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed font-sans">
          Only vetted family members and verified caregivers can access this closed community.
        </p>

        {errorNotice && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm p-3.5 rounded-xl font-sans">
            {errorNotice}
          </div>
        )}

        {generatedInvite ? (
          <div className="space-y-4 py-2">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm space-y-2 text-emerald-950 font-sans">
              <div className="flex items-center gap-2 font-semibold text-emerald-900 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Invitation Ready</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-900">
                A single-use invitation link has been generated and logged in the activity ledger.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 pt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Expires: {new Date(generatedInvite.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} (72 Hours)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Registration Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInvite.url}
                  className="flex-1 p-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-slate-50 font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 transition"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => {
                  setGeneratedInvite(null);
                  setEmail('');
                  setFirstName('');
                  setLastName('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition"
              >
                Issue Another Invite
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleIssue} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Caregiver First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Carol"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Caregiver Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Jenkins"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Caregiver Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carol.jenkins@example.com"
                className="w-full p-2.5 rounded-lg border border-slate-300"
                required
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                Assigned Primary Regional Cohort
              </label>
              <select
                value={primaryCohortSlug}
                onChange={(e) => setPrimaryCohortSlug(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                {cohorts
                  .filter((c) => !c.isGeneralBoard)
                  .map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name} ({c.geographicRegion})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 text-white rounded-lg font-bold"
              >
                {isSubmitting ? 'Generating...' : 'Issue Invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
