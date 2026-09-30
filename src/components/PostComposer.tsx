import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  ArrowLeft,
  CheckCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { CurrentUser, CommunityGroup, DeflectionMatch } from '../types';
import { api } from '../services/api';

interface PostComposerProps {
  currentUser: CurrentUser;
  cohorts: CommunityGroup[];
  onPostSubmitted: () => void;
  onCancel: () => void;
  onOpenResource: (resourceId: string) => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({
  currentUser,
  cohorts,
  onPostSubmitted,
  onCancel,
  onOpenResource,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState(
    cohorts.find((c) => !c.isGeneralBoard)?.id || cohorts[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedPostData, setSubmittedPostData] = useState<{
    title: string;
    cohortName: string;
  } | null>(null);

  // Deflection state
  const [deflectionMatches, setDeflectionMatches] = useState<DeflectionMatch[]>([]);
  const [solvedByDeflection, setSolvedByDeflection] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subtle deflection lookup
  useEffect(() => {
    if (solvedByDeflection) return;

    const queryText = `${title} ${content}`.trim();
    if (queryText.length < 18) {
      setDeflectionMatches([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.deflectQuery(queryText);
        setDeflectionMatches(res.deflectionMatches || []);
      } catch (err) {
        console.error('Deflection lookup error:', err);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [title, content, solvedByDeflection]);

  // Auto fadeout confirmation after 3.5 seconds
  useEffect(() => {
    if (!submittedPostData) return;

    const timer = setTimeout(() => {
      onPostSubmitted();
    }, 3500);

    return () => clearTimeout(timer);
  }, [submittedPostData, onPostSubmitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const assignedCohort = cohorts.find((c) => c.id === selectedCohortId);
      await api.createPost({
        title: title.trim(),
        content: content.trim(),
        targetCohortId: selectedCohortId,
        authorId: currentUser.id,
      });

      // Show comprehensive confirmation screen
      setSubmittedPostData({
        title: title.trim(),
        cohortName: assignedCohort
          ? assignedCohort.name.replace(/\s+Cohort$/i, '')
          : 'General Clinic-Wide',
      });
    } catch (err) {
      console.error('Failed to submit post:', err);
      setSubmitError('Failed to submit question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDiscardDraft = () => {
    setSolvedByDeflection(true);
    setTitle('');
    setContent('');
    setTimeout(() => {
      onCancel();
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to discussions</span>
        </button>
        <span className="text-xs sm:text-sm text-slate-500">
          Posting as: <strong className="text-slate-800">{currentUser.anonymousHandle}</strong>
        </span>
      </div>

      {submitError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-sm p-4 rounded-xl">
          {submitError}
        </div>
      )}

      {submittedPostData ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-9 text-center space-y-5 shadow-xs animate-in fade-in">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-2xl font-semibold text-slate-900 tracking-tight">
              Question Submitted for Clinical Review
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed font-sans">
              Thank you, {currentUser.firstName}. Your question has been safely received by Dr. Seema Gulyani.
            </p>
          </div>

          {/* Submission Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 text-left max-w-lg mx-auto space-y-3 text-xs sm:text-sm font-sans">
            <div>
              <span className="text-slate-400 block text-xs">Topic / Question:</span>
              <span className="font-semibold text-slate-900 text-sm sm:text-base">
                {submittedPostData.title}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-slate-600">
              <span>Assigned Group:</span>
              <span className="font-semibold text-slate-800">{submittedPostData.cohortName}</span>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 text-emerald-800 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Personal details are automatically verified & clinical safety checked</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Standard review time: within 24 hours</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onPostSubmitted()}
              className="w-full sm:w-auto px-6 py-3 bg-[#002D72] hover:bg-blue-900 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <span>View in Discussions</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSubmittedPostData(null);
                setTitle('');
                setContent('');
              }}
              className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold transition"
            >
              Ask Another Question
            </button>
          </div>

          <p className="text-xs text-slate-400 pt-1">
            Returning to discussions automatically in 3 seconds...
          </p>
        </div>
      ) : solvedByDeflection ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2 shadow-xs animate-in fade-in">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="font-serif text-lg font-semibold text-slate-900">
            Glad the clinical resource was helpful!
          </h3>
          <p className="text-sm text-slate-500">
            Returning you to discussions...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 space-y-5 shadow-xs">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900 tracking-tight">
              Ask a Question
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Connect with fellow care partners and receive guidance verified by Dr. Seema Gulyani.
            </p>
          </div>

          {/* Deflection Tip (Gentle, single line, no giant cards) */}
          {deflectionMatches.length > 0 && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-sm space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#002D72] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-700" />
                  <span>Clinical resource available:</span>
                </span>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-xs sm:text-sm text-emerald-700 hover:underline font-semibold"
                >
                  ✓ This answers my question
                </button>
              </div>

              <div className="text-slate-800 font-medium truncate">
                {deflectionMatches[0].title}
              </div>

              {deflectionMatches[0].id && (
                <button
                  type="button"
                  onClick={() => onOpenResource(deflectionMatches[0].id!)}
                  className="text-[#002D72] hover:underline flex items-center gap-1 text-xs font-semibold pt-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View clinical protocol</span>
                </button>
              )}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Question or Topic
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Managing resistance when bathing"
              className="w-full px-4 py-2.5 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] bg-white transition"
              required
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Details
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share what is happening, what strategies you've tried, or what advice would be helpful..."
              className="w-full p-4 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] leading-relaxed bg-white font-sans transition"
              required
            />
          </div>

          {/* Audience selection */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Target Group
            </label>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] bg-white text-slate-700 transition"
            >
              {cohorts.map((c) => {
                const cleanName = c.name.replace(/\s+Cohort$/i, '');
                return (
                  <option key={c.id} value={c.id}>
                    {cleanName}
                  </option>
                );
              })}
            </select>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-sans">
            All inquiries are reviewed within 24 hours by Dr. Seema Gulyani. Personal names or addresses are automatically sanitized before publication.
          </p>

          {/* Clear, well-placed action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
              className="w-full py-3 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Question'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
