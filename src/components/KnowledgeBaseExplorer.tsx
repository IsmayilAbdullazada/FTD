import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  ExternalLink,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Plus,
  X,
  Sparkles,
} from 'lucide-react';
import { ClinicalResource, CurrentUser } from '../types';
import { api } from '../services/api';

interface KnowledgeBaseExplorerProps {
  initialResourceId?: string | null;
  onClearInitialResource?: () => void;
  currentUser?: CurrentUser;
}

export const KnowledgeBaseExplorer: React.FC<KnowledgeBaseExplorerProps> = ({
  initialResourceId,
  onClearInitialResource,
  currentUser,
}) => {
  const [resources, setResources] = useState<ClinicalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeResource, setActiveResource] = useState<ClinicalResource | null>(null);

  // Add Source Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ClinicalResource['category']>('BEHAVIORAL_AGITATION');
  const [newSummary, setNewSummary] = useState('');
  const [newContentBody, setNewContentBody] = useState('');
  const [newKeyTakeaways, setNewKeyTakeaways] = useState('');
  const [newExternalUrl, setNewExternalUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const isClinician = currentUser?.role === 'CLINICIAN_MODERATOR' || currentUser?.role === 'SYSTEM_ADMIN';

  const loadResources = async () => {
    try {
      const data = await api.getResources();
      setResources(data);
      if (initialResourceId) {
        const match = data.find((r) => r.id === initialResourceId);
        if (match) setActiveResource(match);
      }
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [initialResourceId]);

  const categories = [
    { key: 'ALL', label: 'All Disciplines' },
    { key: 'BEHAVIORAL_AGITATION', label: 'Sensory & Agitation' },
    { key: 'INCONTINENCE', label: 'Toileting & Incontinence' },
    { key: 'SAFETY_WANDERING', label: 'Wandering & Driving Safety' },
    { key: 'LEGAL_MEDICAID', label: 'Legal & Medicaid Spend-Down' },
    { key: 'COMMUNICATION_PPA', label: 'Speech & Communication (PPA)' },
    { key: 'NUTRITION_DIET', label: 'Nutrition & Swallowing' },
  ];

  const filtered = resources.filter((res) => {
    const matchesCategory = selectedCategory === 'ALL' || res.category === selectedCategory;
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.contentBody.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContentBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const takeawaysList = newKeyTakeaways
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const created = await api.createResource({
        title: newTitle.trim(),
        category: newCategory,
        summary: newSummary.trim() || newTitle.trim(),
        contentBody: newContentBody.trim(),
        keyTakeaways: takeawaysList.length > 0 ? takeawaysList : [newSummary.trim() || newTitle.trim()],
        externalUrl: newExternalUrl.trim() || undefined,
        diseaseDomain: 'FTD',
      });

      setResources((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewTitle('');
      setNewSummary('');
      setNewContentBody('');
      setNewKeyTakeaways('');
      setNewExternalUrl('');
      setSuccessToast(`Clinical guide "${created.title}" successfully published.`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      console.error('Failed to create guide:', err);
      alert('Could not save guide. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Clinical Knowledge Base
            </h1>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3 text-emerald-700" />
              <span>Vetted</span>
            </span>
          </div>
          <p className="text-slate-500 text-xs">
            Approved caregiving protocols curated by Dr. Seema Gulyani and AFTD.
          </p>
        </div>

        {/* Clinician Action: Add Source */}
        {isClinician && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-[#002D72] hover:bg-blue-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Clinical Source</span>
          </button>
        )}
      </div>

      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-3.5 py-2 rounded-lg flex items-center justify-between animate-in fade-in">
          <span>{successToast}</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>
      )}

      {/* FILTER AND SEARCH BAR (No horizontal scrolling capsules) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search toileting, agitation, Medicaid, wandering..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#002D72] bg-white"
          />
        </div>

        {/* Clean Dropdown Filter for Disciplines */}
        <div className="flex items-center gap-2">
          <label htmlFor="discipline-select" className="text-xs text-slate-500 whitespace-nowrap font-medium">
            Discipline:
          </label>
          <select
            id="discipline-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002D72]"
          >
            {categories.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RESOURCES LIST */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">
          Loading clinical protocols...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs space-y-1">
          <p className="font-semibold text-slate-700">No resources found.</p>
          <p className="text-slate-400">Try changing your search terms or selecting another discipline.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((res) => (
            <article
              key={res.id}
              onClick={() => setActiveResource(res)}
              className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 hover:border-[#002D72]/40 hover:shadow-2xs transition cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-[#002D72]">
                    {categories.find((c) => c.key === res.category)?.label || res.category}
                  </span>
                  <span>{new Date(res.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                </div>

                <h3 className="font-semibold text-xs sm:text-sm text-slate-900 leading-snug">
                  {res.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {res.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-[#002D72] font-semibold">
                <span>View Full Protocol →</span>
                {res.externalUrl && (
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ACTIVE RESOURCE MODAL */}
      {activeResource && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between gap-3 bg-white">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-[#002D72] uppercase tracking-wider">
                  {categories.find((c) => c.key === activeResource.category)?.label || activeResource.category}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                  {activeResource.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setActiveResource(null);
                  if (onClearInitialResource) onClearInitialResource();
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-slate-700">
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 text-xs text-slate-800 space-y-1">
                <div className="font-semibold text-[#002D72]">Clinical Summary</div>
                <p>{activeResource.summary}</p>
              </div>

              {/* Protocol Content */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                  Protocol Guidelines
                </div>
                <div className="whitespace-pre-line text-xs sm:text-sm font-sans text-slate-800 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {activeResource.contentBody}
                </div>
              </div>

              {/* Key Takeaways */}
              {activeResource.keyTakeaways && activeResource.keyTakeaways.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                    Key Recommendations
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    {activeResource.keyTakeaways.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              {activeResource.externalUrl ? (
                <a
                  href={activeResource.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#002D72] hover:underline font-semibold flex items-center gap-1"
                >
                  <span>Official AFTD Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-slate-400">Johns Hopkins Internal Protocol</span>
              )}

              <button
                onClick={() => {
                  setActiveResource(null);
                  if (onClearInitialResource) onClearInitialResource();
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DR. SEEMA ADD SOURCE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">
                  Add Clinical Source / Protocol
                </h3>
                <p className="text-[11px] text-slate-500">
                  Publish verified guidance to the caregiver knowledge base and RAG search.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGuide} className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Swallowing Assessment & Choking Prevention in bvFTD"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Discipline / Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ClinicalResource['category'])}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] bg-white"
                >
                  <option value="BEHAVIORAL_AGITATION">Sensory & Agitation</option>
                  <option value="INCONTINENCE">Toileting & Incontinence</option>
                  <option value="SAFETY_WANDERING">Wandering & Driving Safety</option>
                  <option value="LEGAL_MEDICAID">Legal & Medicaid Spend-Down</option>
                  <option value="COMMUNICATION_PPA">Speech & Communication (PPA)</option>
                  <option value="NUTRITION_DIET">Nutrition & Swallowing</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Brief Summary / Abstract
                </label>
                <textarea
                  rows={2}
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="Short 1-2 sentence overview shown in search results..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Clinical Protocol Content
                </label>
                <textarea
                  rows={6}
                  value={newContentBody}
                  onChange={(e) => setNewContentBody(e.target.value)}
                  placeholder="Detailed step-by-step guidance, de-escalation methods, safety warnings..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] font-sans"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Key Recommendations (one per line)
                </label>
                <textarea
                  rows={3}
                  value={newKeyTakeaways}
                  onChange={(e) => setNewKeyTakeaways(e.target.value)}
                  placeholder="Consult speech-language pathologist early&#10;Tuck chin downward while swallowing&#10;Avoid straw use for thin liquids"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  External Citation or AFTD Reference URL (Optional)
                </label>
                <input
                  type="url"
                  value={newExternalUrl}
                  onChange={(e) => setNewExternalUrl(e.target.value)}
                  placeholder="https://www.theaftd.org/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-300 text-white rounded-lg font-semibold transition"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Guide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
