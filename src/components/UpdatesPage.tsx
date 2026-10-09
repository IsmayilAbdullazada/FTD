import React, { useState, useEffect } from 'react';
import { Search, Plus, X, ExternalLink, Trash2, CheckCircle2, FlaskConical, Pill, Microscope, MessageSquareQuote } from 'lucide-react';
import { CurrentUser, ClinicUpdate, UpdateCategory, TrialStatus } from '../types';
import { api } from '../services/api';

const CATEGORY_META: Record<UpdateCategory, { label: string; badge: string; Icon: React.ElementType }> = {
  CLINICAL_TRIAL: {
    label: 'Clinical Trials',
    badge: 'bg-violet-50 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-100 dark:border-violet-900/60',
    Icon: FlaskConical,
  },
  MEDICATION: {
    label: 'New Medications',
    badge: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/60',
    Icon: Pill,
  },
  RESEARCH: {
    label: 'Scientific Discoveries',
    badge: 'bg-blue-50 dark:bg-blue-950/50 text-[#002D72] dark:text-blue-300 border-blue-100 dark:border-blue-900/60',
    Icon: Microscope,
  },
  ANNOUNCEMENT: {
    label: 'Clinic Announcements',
    badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-100 dark:border-amber-900/60',
    Icon: MessageSquareQuote,
  },
};

const CONDITION_LABEL: Record<ClinicUpdate['condition'], string> = {
  FTD: 'FTD',
  AD: "Alzheimer's",
  BOTH: 'FTD & Alzheimer\'s',
};

export const UpdatesPage: React.FC<{ currentUser: CurrentUser }> = ({ currentUser }) => {
  const canEdit = currentUser.role === 'CLINICIAN_MODERATOR' || currentUser.role === 'SYSTEM_ADMIN';

  const [updates, setUpdates] = useState<ClinicUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | UpdateCategory>('ALL');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | 'FTD' | 'AD'>('ALL');
  const [active, setActive] = useState<ClinicUpdate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ClinicUpdate | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    summary: '',
    body: '',
    category: 'CLINICAL_TRIAL' as UpdateCategory,
    condition: 'FTD' as ClinicUpdate['condition'],
    trialStatus: 'RECRUITING' as TrialStatus,
    externalUrl: '',
  });

  useEffect(() => {
    api
      .getUpdates()
      .then(setUpdates)
      .finally(() => setLoading(false));
  }, []);

  const filtered = updates.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      u.title.toLowerCase().includes(q) || u.summary.toLowerCase().includes(q) || u.body.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'ALL' || u.category === categoryFilter;
    const matchesCondition = conditionFilter === 'ALL' || u.condition === conditionFilter || u.condition === 'BOTH';
    return matchesSearch && matchesCategory && matchesCondition;
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const created = await api.createUpdate({
        title: form.title.trim(),
        summary: form.summary.trim() || form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        condition: form.condition,
        trialStatus: form.category === 'CLINICAL_TRIAL' ? form.trialStatus : undefined,
        externalUrl: form.externalUrl.trim() || undefined,
        authorId: currentUser.id,
      });
      setUpdates((prev) => [created, ...prev]);
      setShowAddModal(false);
      setForm({ ...form, title: '', summary: '', body: '', externalUrl: '' });
      showToast(`Update "${created.title}" published.`);
    } catch (err) {
      console.error(err);
      showToast('Could not publish update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (u: ClinicUpdate) => {
    await api.deleteUpdate(u.id, currentUser.id);
    setUpdates((prev) => prev.filter((x) => x.id !== u.id));
    setActive(null);
    setPendingDelete(null);
    showToast(`Update "${u.title}" deleted.`);
  };

  const inputCls =
    'w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
            Updates (Clinical or Scientific)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Clinical trials, newly approved medications, scientific discoveries, and announcements from the clinic.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Update</span>
          </button>
        )}
      </div>

      {toast && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-sm px-4 py-2.5 rounded-xl flex items-center justify-between animate-in fade-in">
          <span>{toast}</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trials, medications, research, announcements..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="update-category" className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">Topic:</label>
          <select
            id="update-category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | UpdateCategory)}
            className="px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Updates</option>
            {Object.entries(CATEGORY_META).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value as 'ALL' | 'FTD' | 'AD')}
            className="px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-500 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Conditions</option>
            <option value="FTD">FTD</option>
            <option value="AD">Alzheimer's</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-sm">Loading updates...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400 text-sm space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-200">No updates found.</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">Try different keywords or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((u) => {
            const meta = CATEGORY_META[u.category];
            return (
              <article
                key={u.id}
                onClick={() => setActive(u)}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group text-left"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-semibold ${meta.badge}`}>
                      <meta.Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <h3 className="font-serif font-semibold text-lg sm:text-xl text-slate-900 dark:text-white leading-snug group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                    {u.title}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-sans">{u.summary}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">{CONDITION_LABEL[u.condition]}</span>
                    {u.category === 'CLINICAL_TRIAL' && u.trialStatus && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.trialStatus === 'RECRUITING'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {u.trialStatus === 'RECRUITING' ? 'Recruiting' : 'Closed'}
                      </span>
                    )}
                  </div>
                  <span className="text-[#002D72] dark:text-blue-400 font-semibold group-hover:underline">Read more →</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {active && (
        <div
          onClick={() => setActive(null)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#002D72] dark:text-blue-400 uppercase tracking-wider">
                  {CATEGORY_META[active.category].label} · {CONDITION_LABEL[active.condition]}
                  {active.category === 'CLINICAL_TRIAL' && active.trialStatus
                    ? ` · ${active.trialStatus === 'RECRUITING' ? 'Recruiting' : 'Closed'}`
                    : ''}
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-snug tracking-tight">
                  {active.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Posted {new Date(active.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setActive(null)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-7 overflow-y-auto space-y-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl p-4 text-sm text-slate-800 dark:text-slate-200 space-y-1.5">
                <div className="font-semibold text-[#002D72] dark:text-blue-400 text-xs uppercase tracking-wider">Summary</div>
                <p>{active.summary}</p>
              </div>
              <div className="whitespace-pre-line text-sm sm:text-[15px] text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                {active.body}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between text-xs sm:text-sm gap-3">
              <div className="flex items-center gap-4">
                {active.externalUrl ? (
                  <a
                    href={active.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#002D72] dark:text-blue-400 hover:underline font-semibold flex items-center gap-1.5"
                  >
                    <span>Learn more</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">Johns Hopkins FTD Center</span>
                )}
                {canEdit && (
                  <button
                    onClick={() => setPendingDelete(active)}
                    className="text-red-600 dark:text-red-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
              <button
                onClick={() => setActive(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal (clinicians only) */}
      {canEdit && showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">Add Clinical or Scientific Update</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Visible to all care partners once published.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    className={inputCls}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as UpdateCategory })}
                  >
                    {Object.entries(CATEGORY_META).map(([key, m]) => (
                      <option key={key} value={key}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Condition</label>
                  <select
                    className={inputCls}
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value as ClinicUpdate['condition'] })}
                  >
                    <option value="FTD">FTD</option>
                    <option value="AD">Alzheimer's</option>
                    <option value="BOTH">Both</option>
                  </select>
                </div>
              </div>

              {form.category === 'CLINICAL_TRIAL' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Trial Status</label>
                  <select
                    className={inputCls}
                    value={form.trialStatus}
                    onChange={(e) => setForm({ ...form, trialStatus: e.target.value as TrialStatus })}
                  >
                    <option value="RECRUITING">Recruiting</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Short Summary</label>
                <textarea
                  rows={2}
                  className={inputCls}
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  placeholder="1-2 sentences shown on the card..."
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Details</label>
                <textarea
                  rows={6}
                  className={inputCls}
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Eligibility, how to participate, what changed, key findings..."
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Link (optional)</label>
                <input
                  type="url"
                  className={inputCls}
                  value={form.externalUrl}
                  onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 dark:bg-blue-600 dark:hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-lg font-semibold transition"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {canEdit && pendingDelete && (
        <div
            onClick={() => setPendingDelete(null)}
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-2xs z-[60] flex items-center justify-center p-4 cursor-pointer"
        >
            <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 cursor-default"
            >
            <div className="space-y-1.5">
                <h3 className="font-semibold text-slate-900 dark:text-white">Delete this update?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                "{pendingDelete.title}" will be removed for all care partners. This can't be undone.
                </p>
            </div>
            <div className="flex items-center justify-end gap-2">
                <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition"
                >
                Cancel
                </button>
                <button
                onClick={() => handleDelete(pendingDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition"
                >
                Delete
                </button>
            </div>
            </div>
        </div>
        )}
    </div>
  );
};