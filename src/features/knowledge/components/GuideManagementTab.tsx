import type { Dispatch, SetStateAction } from 'react';
import {
  Bot,
  Check,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Play,
  Search,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { AudienceBadge } from '@/shared/components/AudienceBadge';
import { Pagination } from '@/shared/components/Pagination';
import type { ChatbotGuideFile, ChatbotGuideTestResult } from '@/features/knowledge/types';

interface PaginationModel<T> {
  items: T[];
  page: number;
  pageCount: number;
  start: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
}

type GuideStatusFilter = 'ALL' | 'DRAFT' | 'APPROVED';

interface GuideManagementTabProps {
  guides: ChatbotGuideFile[];
  loading: boolean;
  searchFilter: string;
  onSearchFilterChange: Dispatch<SetStateAction<string>>;
  statusFilter: GuideStatusFilter;
  onStatusFilterChange: Dispatch<SetStateAction<GuideStatusFilter>>;
  pagination: PaginationModel<ChatbotGuideFile>;
  testQuery: string;
  onTestQueryChange: Dispatch<SetStateAction<string>>;
  testing: boolean;
  testResult: ChatbotGuideTestResult | null;
  onOpenUpload: Dispatch<SetStateAction<boolean>>;
  onResetUpload: () => void;
  onOpenReview: (guide: ChatbotGuideFile) => void;
  onQuickApprove: (guide: ChatbotGuideFile) => void;
  onToggleGuide: (guide: ChatbotGuideFile) => void;
  onRequestDelete: (guide: ChatbotGuideFile) => void;
  onRunTestQuery: (queryOverride?: string) => void;
}

export function GuideManagementTab({
  guides: chatbotGuides,
  loading: loadingGuides,
  searchFilter: guideSearchFilter,
  onSearchFilterChange: setGuideSearchFilter,
  statusFilter: guideStatusFilter,
  onStatusFilterChange: setGuideStatusFilter,
  pagination: guidePage,
  testQuery,
  onTestQueryChange: setTestQuery,
  testing: isTesting,
  testResult,
  onOpenUpload: setShowUploadGuideModal,
  onResetUpload: resetUploadModal,
  onOpenReview: handleOpenReviewModal,
  onQuickApprove: handleQuickApprove,
  onToggleGuide: handleToggleGuide,
  onRequestDelete: handleRequestDeleteGuide,
  onRunTestQuery: handleRunTestQuery,
}: GuideManagementTabProps) {
  return (
        <div className="space-y-6">
          {/* Top Banner */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#002D72]/10 dark:bg-blue-900/30 text-[#002D72] dark:text-sky-300 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Guides
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Upload institutional care protocols and guidelines (PDF). Dr. Seema's Assistant uses these verified documents to formulate grounded guidance for family care partners.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowUploadGuideModal(true)}
              className="px-4 py-2.5 bg-[#002D72] hover:bg-blue-900 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer shrink-0"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Guide</span>
            </button>
          </div>

          {/* Guide Files Management Table / List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                  Uploaded Guides ({chatbotGuides.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {chatbotGuides.filter((g) => g.isActive && (g.status === 'APPROVED' || !g.status)).length} approved & active · {chatbotGuides.filter((g) => g.status === 'DRAFT').length} drafts pending review
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Draft / Approved Filter Pills */}
                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setGuideStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      guideStatusFilter === 'ALL'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All ({chatbotGuides.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuideStatusFilter('DRAFT')}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                      guideStatusFilter === 'DRAFT'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                    }`}
                  >
                    <span>Drafts</span>
                    <span className="text-[10px] px-1 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                      {chatbotGuides.filter((g) => g.status === 'DRAFT').length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuideStatusFilter('APPROVED')}
                    className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                      guideStatusFilter === 'APPROVED'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
                    }`}
                  >
                    <span>Approved</span>
                    <span className="text-[10px] px-1 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
                      {chatbotGuides.filter((g) => g.status === 'APPROVED' || !g.status).length}
                    </span>
                  </button>
                </div>

                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={guideSearchFilter}
                    onChange={(e) => setGuideSearchFilter(e.target.value)}
                    placeholder="Search guides..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {loadingGuides ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                Loading guide documents...
              </div>
            ) : chatbotGuides.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="font-semibold text-slate-900 dark:text-white text-sm">
                  No Guides Uploaded Yet
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Upload verified PDF guidelines from public/resources. Use the side-by-side preview to inspect the extraction and approve documents for the knowledge assistant.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetUploadModal();
                      setShowUploadGuideModal(true);
                    }}
                    className="px-4 py-2 bg-[#002D72] text-white rounded-xl text-xs font-semibold hover:bg-blue-900 transition flex items-center gap-1.5 cursor-pointer shadow-xs mx-auto"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Guide</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {guidePage.items
                  .map((guide, idx) => {
                    const isDraft = guide.status === 'DRAFT';
                    return (
                      <div
                        key={guide.id ? `${guide.id}-${idx}` : idx}
                        className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition"
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div
                            className={`p-2.5 rounded-xl shrink-0 mt-0.5 border ${
                              isDraft
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/40'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/40'
                            }`}
                          >
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                                {guide.title}
                              </h4>
                              <AudienceBadge condition={guide.condition || 'FTD'} />
                              {isDraft && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60">
                                  <Clock className="w-2.5 h-2.5" />
                                  Draft (Pending Review)
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-x-2">
                              <span>{guide.fileName}</span>
                              {guide.pages && guide.pages.length > 0 ? (
                                <span>· {guide.pages.length} {guide.pages.length === 1 ? 'page' : 'pages'} ({guide.totalChunks || guide.pages.reduce((a, b) => a + b.chunkCount, 0)} chunks)</span>
                              ) : guide.totalChunks ? (
                                <span>· {guide.totalChunks} chunks</span>
                              ) : null}
                              {guide.topicTag ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10.5px]">
                                  #{guide.topicTag}
                                </span>
                              ) : guide.category ? (
                                <span>· {guide.category.replace(/_/g, ' ')}</span>
                              ) : null}
                              <span>· {guide.wordCount?.toLocaleString() || '—'} words</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {isDraft ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenReviewModal(guide)}
                                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[#002D72] dark:text-blue-300 text-xs font-semibold flex items-center gap-1.5 border border-blue-200/70 dark:border-blue-800/60 transition cursor-pointer"
                                title="Open side-by-side PDF preview and text reviewer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Review Side-by-Side</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickApprove(guide)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Approve this draft immediately"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleGuide(guide)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                                  guide.isActive
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                                }`}
                                title={guide.isActive ? 'Active for assistant guidance' : 'Paused'}
                              >
                                {guide.isActive ? (
                                  <>
                                    <ToggleRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <ToggleLeft className="w-4 h-4 text-slate-400" />
                                    <span>Paused</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenReviewModal(guide)}
                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                                title="Review Side-by-Side & Edit"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Review</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRequestDeleteGuide(guide)}
                            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                            title="Delete Guide"
                            aria-label={`Delete ${guide.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {!loadingGuides && <Pagination label="Guides" {...guidePage} />}

          {/* Test Assistant Guidance */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
                <Play className="w-4 h-4 text-[#002D72] dark:text-sky-400 fill-current" />
                <span>Test Assistant Guidance</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Type any caregiver inquiry to test how Dr. Seema's Assistant uses your uploaded guides to generate answers.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRunTestQuery();
                }}
                placeholder="e.g. Dad refuses to shower and becomes combative..."
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => handleRunTestQuery()}
                disabled={isTesting || !testQuery.trim()}
                className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 cursor-pointer"
              >
                {isTesting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Test Guidance</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Test Prompt Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Quick tests:</span>
              {[
                'Dad refuses to shower and becomes combative',
                'How to safely prevent driving in FTD',
                'What if loved one makes violent threats?',
                'Can I increase Seroquel dose?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleRunTestQuery(suggestion)}
                  disabled={isTesting}
                  className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Test Query Output */}
            {testResult && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in">
                {/* RAG Retrieval Debug View: Chunks & Scores */}
                {testResult.retrievedChunks && testResult.retrievedChunks.length > 0 && (
                  <div className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Retrieved Chunks & Vector Cosine Similarity ({testResult.retrievedChunks.length})</span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        Cutoff: ≥ 0.58
                      </span>
                    </div>

                    <div className="space-y-2">
                      {testResult.retrievedChunks.map((chunk, idx) => {
                        const scorePercent = (chunk.score * 100).toFixed(1);
                        const isAboveCutoff = chunk.score >= 0.58;
                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border text-xs transition-colors ${
                              isAboveCutoff
                                ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60'
                                : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#002D72] dark:text-sky-300">
                                  [{idx + 1}]
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[260px] sm:max-w-md">
                                  {chunk.guideTitle}
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  Page {chunk.page}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10.5px] font-mono font-semibold ${
                                    isAboveCutoff
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  }`}
                                >
                                  {scorePercent}% match ({chunk.score})
                                </span>
                                <a
                                  href={`/resources/${chunk.fileName}#page=${chunk.page}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
                                  title="View page in PDF"
                                >
                                  <span>PDF</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>

                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3 hover:line-clamp-none transition-all cursor-pointer text-[11px] bg-slate-50 dark:bg-slate-950/50 p-2 rounded border border-slate-100 dark:border-slate-800 font-mono">
                              {chunk.content}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grounded Guide Summary */}
                {testResult.matchedGuide && (
                  <div className="text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white">Top Grounded Guide: </span>
                      <span>{testResult.matchedGuide.title} ({testResult.matchedGuide.fileName})</span>
                      {testResult.matchedGuide.page && (
                        <span className="ml-1 text-slate-500 dark:text-slate-400 font-medium">— Page {testResult.matchedGuide.page}</span>
                      )}
                    </div>
                    {testResult.citedResources && testResult.citedResources.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {testResult.citedResources.map((c, i) => (
                          <a
                            key={i}
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10.5px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 hover:underline"
                          >
                            <span>[{i + 1}] Page {c.page || 1}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Assistant Output */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Assistant Response (Strictly Grounded):
                    </span>
                    {testResult.isMedicationRefusal && (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        Medication Refusal Triggered
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-sans">
                    {testResult.answer}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
  );
}

