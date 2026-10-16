import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { ClinicalResource, CurrentUser } from "../types";
import { api } from "../services/api";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeResource, setActiveResource] = useState<ClinicalResource | null>(
    null,
  );

  const [topics, setTopics] = useState<
    import("../types/knowledge").KnowledgeTopic[]
  >([]);
  const [error, setError] = useState("");
  const loadResources = async () => {
    try {
      const [data, topics] = await Promise.all([
        api.getResources(),
        api.getTopics(),
      ]);
      setResources(data);
      setTopics(topics);
      setError("");
      setActiveResource(
        (current) =>
          data.find((r) => r.id === (current?.id || initialResourceId)) || null,
      );
    } catch (err) {
      setResources([]);
      setActiveResource(null);
      setError(
        "Unable to reach the clinical knowledge base. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
    const timer = setInterval(loadResources, 4000);
    return () => clearInterval(timer);
  }, [initialResourceId]);

  const categories = [
    { key: "ALL", label: "All Topics" },
    ...topics.map((t) => ({ key: t.id, label: t.name })),
  ];

  const filtered = resources.filter((res) => {
    const matchesCategory =
      selectedCategory === "ALL" || res.category === selectedCategory;
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.contentBody.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Guides & Care Sheets
            </h1>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/60">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Doctor approved</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
            Trauma-informed, non-pharmacological protocols curated by Johns
            Hopkins FTD specialists.
          </p>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-amber-900 dark:text-amber-200">
          {error}
        </p>
      )}

      {/* FILTER AND SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search toileting, bathing agitation, Medicaid, wandering safety..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 shadow-2xs"
          />
        </div>

        {/* Clean Dropdown Filter for Disciplines */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="discipline-select"
            className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap font-medium"
          >
            Topic:
          </label>
          <select
            id="discipline-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#002D72] dark:focus:ring-blue-400 shadow-2xs cursor-pointer"
          >
            {categories.map((cat) => (
              <option
                key={cat.key}
                value={cat.key}
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RESOURCES LIST */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 dark:text-slate-500 text-sm">
          Loading clinical protocols...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center text-slate-500 dark:text-slate-400 text-sm space-y-2">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            No resources found matching your search.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
            Try using different keywords or selecting "All Topics".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((res) => (
            <article
              key={res.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveResource(res);
                }
              }}
              onClick={() => setActiveResource(res)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between group text-left"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-[#002D72] dark:text-blue-400">
                    {categories.find((c) => c.key === res.category)?.label ||
                      res.category}
                  </span>
                  <span>
                    {new Date(res.createdAt).toLocaleDateString([], {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>

                <h3 className="font-serif font-semibold text-lg sm:text-xl text-slate-900 dark:text-white leading-snug group-hover:text-[#002D72] dark:group-hover:text-blue-400 transition">
                  {res.title}
                </h3>

                <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed font-sans">
                  {res.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm text-[#002D72] dark:text-blue-400 font-semibold">
                <span className="flex items-center gap-1 group-hover:underline">
                  <span>Read protocol</span>
                  <span>→</span>
                </span>
                {res.externalUrl && (
                  <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#002D72] dark:group-hover:text-blue-400" />
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ACTIVE RESOURCE MODAL */}
      {activeResource && (
        <div
          onClick={() => {
            setActiveResource(null);
            if (onClearInitialResource) onClearInitialResource();
          }}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-2xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 cursor-default transition-colors"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-white dark:bg-slate-900">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-[#002D72] dark:text-blue-400 uppercase tracking-wider">
                  {categories.find((c) => c.key === activeResource.category)
                    ?.label || activeResource.category}
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white leading-snug tracking-tight">
                  {activeResource.title}
                </h2>
              </div>
              <button
                onClick={() => {
                  setActiveResource(null);
                  if (onClearInitialResource) onClearInitialResource();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-5 text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300">
              <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4 text-sm text-slate-800 dark:text-slate-200 space-y-1.5">
                <div className="font-semibold text-[#002D72] dark:text-blue-400 text-xs uppercase tracking-wider">
                  Clinical Overview
                </div>
                <p className="leading-relaxed">{activeResource.summary}</p>
              </div>

              {/* Protocol Content */}
              <div className="space-y-2">
                <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Step-by-Step Care Strategies
                </div>
                <div className="whitespace-pre-line text-sm sm:text-[15px] font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200/80 dark:border-slate-750 leading-relaxed">
                  {activeResource.contentBody}
                </div>
              </div>

              {/* Key Takeaways */}
              {activeResource.keyTakeaways &&
                activeResource.keyTakeaways.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                      Key Clinical Recommendations
                    </div>
                    <ul className="space-y-2 text-sm">
                      {activeResource.keyTakeaways.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed text-slate-700 dark:text-slate-300">
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs sm:text-sm">
              {activeResource.externalUrl ? (
                <a
                  href={activeResource.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#002D72] dark:text-blue-400 hover:underline font-semibold flex items-center gap-1.5"
                >
                  <span>Official AFTD Source</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  Johns Hopkins Internal Protocol
                </span>
              )}

              <button
                onClick={() => {
                  setActiveResource(null);
                  if (onClearInitialResource) onClearInitialResource();
                }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
