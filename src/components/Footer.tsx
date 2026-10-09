import React, { useState } from 'react';
import { Shield, X, FileText, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAssistant?: () => void;
  onOpenAudit?: () => void;
  isClinician?: boolean;
}

type PolicyKey = 'privacy' | 'npp' | 'nondiscrimination' | 'rights' | null;

interface PolicyContent {
  title: string;
  badge: string;
  sections: { title: string; text: string }[];
}

const POLICY_DETAILS: Record<Exclude<PolicyKey, null>, PolicyContent> = {
  privacy: {
    title: 'Johns Hopkins Medicine Privacy Policy',
    badge: 'Privacy & Data Protection',
    sections: [
      {
        title: 'Commitment to Family Care Partners',
        text: 'Johns Hopkins Medicine is committed to protecting the personal privacy and confidential communications of family care partners and clinicians participating in the Care Partner Connect platform.',
      },
      {
        title: 'Anonymous Handles & Protected Communications',
        text: 'To ensure a safe and candid peer environment, all caregivers participate using pseudonym handles. Direct personal identifying information is segregated from peer discussion channels and visible only to credentialed Johns Hopkins clinical moderators.',
      },
      {
        title: 'Information Usage & Security Standards',
        text: 'We do not sell, rent, or monetize caregiver data. All application transmissions are protected with TLS 1.3 encryption, and data stores comply with institutional security safeguards and role-based access controls.',
      },
      {
        title: 'Inquiries & Contact',
        text: 'Questions regarding website privacy practices may be directed to the Johns Hopkins Medicine Privacy Office at privacy@jhmi.edu.',
      },
    ],
  },
  npp: {
    title: 'Notice of Privacy Practices (HIPAA Compliance)',
    badge: 'HIPAA & Health Privacy',
    sections: [
      {
        title: 'Your Protected Health Information',
        text: 'This notice describes how health information about you or your care recipient may be protected, used, and accessed under federal and state privacy statutes including the Health Insurance Portability and Accountability Act (HIPAA).',
      },
      {
        title: 'Clinical Care & Educational Coordination',
        text: 'Information shared within this platform is utilized by the Johns Hopkins Frontotemporal Dementia Center multidisciplinary team to coordinate educational support, triage safety concerns, and provide evidence-based dementia guidance.',
      },
      {
        title: 'Your Rights Under HIPAA',
        text: 'You have the right to inspect relevant health records, request restrictions on disclosures, receive confidential communications, and obtain an electronic copy of your records from the Johns Hopkins Health System.',
      },
      {
        title: 'Privacy Official Contact',
        text: 'For questions or to file a privacy grievance, contact the Johns Hopkins Privacy Officer at (410) 735-6509 or via HIPAA hotline at (888) 546-3965.',
      },
    ],
  },
  nondiscrimination: {
    title: 'Johns Hopkins Medicine Non-Discrimination Policy',
    badge: 'Equal Access & Civil Rights',
    sections: [
      {
        title: 'Equal Access to Care & Support',
        text: 'Johns Hopkins Medicine complies with applicable federal civil rights laws and does not discriminate, exclude people, or treat them differently on the basis of race, color, national origin, age, disability, religion, sex, sexual orientation, or gender identity.',
      },
      {
        title: 'Language Assistance & Accommodations',
        text: 'Johns Hopkins Medicine provides free aids and services to people with disabilities to communicate effectively, such as qualified sign language interpreters and written information in alternate formats, as well as free language services for individuals whose primary language is not English.',
      },
      {
        title: 'Filing a Civil Rights Grievance',
        text: 'If you believe Johns Hopkins Medicine has failed to provide these services or discriminated in another way, you can file a grievance with the Office of Institutional Equity, 600 N. Wolfe Street, Baltimore, MD 21287.',
      },
    ],
  },
  rights: {
    title: 'Patient & Family Care Partner Rights',
    badge: 'Dignity & Care Standards',
    sections: [
      {
        title: 'Respectful, Compassionate Engagement',
        text: 'Every care partner and patient has the right to respectful, considerate care and communication that recognizes personal values, cultural beliefs, and personal dignity throughout the dementia journey.',
      },
      {
        title: 'Clinical Transparency & Evidence-Based Guidance',
        text: 'Care partners have the right to receive accurate, transparent, and evidence-grounded information regarding disease progression, behavioral management protocols, and institutional support resources.',
      },
      {
        title: 'Safety, Confidentiality & Non-Retaliation',
        text: 'Participants have the right to personal safety, confidentiality, and freedom from harassment. Expressing concerns or requesting clinical reviews will never adversely impact your access to care or support services at Johns Hopkins Medicine.',
      },
    ],
  },
};

export const Footer: React.FC<FooterProps> = () => {
  const [activePolicy, setActivePolicy] = useState<PolicyKey>(null);

  const selectedPolicyData = activePolicy ? POLICY_DETAILS[activePolicy] : null;

  return (
    <>
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 py-3 sm:py-3.5 pb-20 md:pb-3.5 text-xs font-sans transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 lg:gap-6 text-center lg:text-left">
            {/* Institutional Attribution Group */}
            <div className="space-y-0.5 min-w-0">
              <p className="text-[11px] sm:text-xs text-slate-700 dark:text-slate-300 font-normal leading-normal">
                © 2026 The Johns Hopkins University, The Johns Hopkins Hospital, and Johns Hopkins Health System. All rights reserved.
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Department of Neurology · Division of Cognitive Neurology · Baltimore, MD
              </p>
            </div>

            {/* Legal & Compliance Links Group */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end gap-x-2.5 sm:gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <button
                type="button"
                onClick={() => setActivePolicy('privacy')}
                className="hover:text-[#002D72] dark:hover:text-sky-400 transition cursor-pointer underline-offset-2 hover:underline focus:outline-hidden focus-visible:underline"
              >
                Privacy Policy
              </button>
              <span className="text-slate-300 dark:text-slate-700 select-none" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setActivePolicy('npp')}
                className="hover:text-[#002D72] dark:hover:text-sky-400 transition cursor-pointer underline-offset-2 hover:underline focus:outline-hidden focus-visible:underline"
              >
                Notice of Privacy Practices
              </button>
              <span className="text-slate-300 dark:text-slate-700 select-none" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setActivePolicy('nondiscrimination')}
                className="hover:text-[#002D72] dark:hover:text-sky-400 transition cursor-pointer underline-offset-2 hover:underline focus:outline-hidden focus-visible:underline"
              >
                Non-Discrimination Policy
              </button>
              <span className="text-slate-300 dark:text-slate-700 select-none" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setActivePolicy('rights')}
                className="hover:text-[#002D72] dark:hover:text-sky-400 transition cursor-pointer underline-offset-2 hover:underline focus:outline-hidden focus-visible:underline"
              >
                Patient Rights
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* INSTITUTIONAL POLICY MODAL */}
      {selectedPolicyData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="policy-modal-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => setActivePolicy(null)}
          />

          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-[#002D72] dark:text-sky-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400 block">
                    {selectedPolicyData.badge}
                  </span>
                  <h3
                    id="policy-modal-title"
                    className="text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    {selectedPolicyData.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition cursor-pointer"
                aria-label="Close policy modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-sans leading-relaxed">
              {selectedPolicyData.sections.map((section, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span>{section.title}</span>
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm pl-5">
                    {section.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Johns Hopkins Medicine · Official Compliance Statement</span>
              </span>
              <button
                type="button"
                onClick={() => setActivePolicy(null)}
                className="px-3 py-1 rounded-md bg-[#002D72] hover:bg-[#001D4A] dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
