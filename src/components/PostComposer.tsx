import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  ArrowLeft,
  CheckCircle,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createPost({
        title: title.trim(),
        content: content.trim(),
        targetCohortId: selectedCohortId,
        authorId: currentUser.id,
      });

      onPostSubmitted();
    } catch (err) {
      console.error('Failed to submit post:', err);
      alert('Failed to submit question. Please try again.');
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
    <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to discussions</span>
        </button>
        <span className="text-xs text-slate-400">
          Posting as: <strong className="text-slate-700">{currentUser.anonymousHandle}</strong>
        </span>
      </div>

      {solvedByDeflection ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-2 animate-in fade-in">
          <CheckCircle className="w-6 h-6 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">
            Glad the clinical resource was helpful!
          </h3>
          <p className="text-xs text-slate-500">
            Returning you to discussions...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deflection Tip (Gentle, single line, no giant cards) */}
          {deflectionMatches.length > 0 && (
            <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-700" />
                  <span>Clinical resource available:</span>
                </span>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="text-xs text-emerald-700 hover:underline font-semibold"
                >
                  ✓ This answers my question
                </button>
              </div>

              <div className="text-slate-700 font-medium truncate">
                {deflectionMatches[0].title}
              </div>

              {deflectionMatches[0].id && (
                <button
                  type="button"
                  onClick={() => onOpenResource(deflectionMatches[0].id!)}
                  className="text-[#002D72] hover:underline flex items-center gap-1 text-[11px] font-semibold"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>View clinical protocol</span>
                </button>
              )}
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Question or Topic
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Managing resistance when bathing"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] bg-white"
              required
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Details
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share what is happening, what strategies you've tried, or what advice would be helpful..."
              className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] leading-relaxed bg-white font-sans"
              required
            />
          </div>

          {/* Audience selection */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Audience
            </label>
            <select
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] bg-white text-slate-700"
            >
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.isGeneralBoard ? '(Clinic-Wide)' : `(${c.geographicRegion})`}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            All inquiries are reviewed within 24 hours by Dr. Seema Gulyani. Personal names or addresses are automatically sanitized before publication.
          </p>

          {/* Clear, well-placed action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={!title.trim() || !content.trim() || isSubmitting}
              className="w-full py-2.5 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-300 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
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
