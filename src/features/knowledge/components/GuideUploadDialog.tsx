import type {
  Dispatch,
  DragEventHandler,
  RefObject,
  SetStateAction,
} from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  FileText,
  Shield,
  UploadCloud,
  X,
} from 'lucide-react';
import { INSTITUTIONAL_RESOURCE_FILES } from '@/features/knowledge/lib/guideTitle';
import type { GuideCondition, GuidePageData } from '@/features/knowledge/types';
import { useDialogFocus } from '@/shared/hooks/useDialogFocus';

interface GuideUploadDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: Dispatch<SetStateAction<string>>;
  condition: GuideCondition | null;
  onConditionChange: Dispatch<SetStateAction<GuideCondition | null>>;
  topicTag: string;
  onTopicTagChange: Dispatch<SetStateAction<string>>;
  fileName: string;
  pages: GuidePageData[];
  showExtractedInspector: boolean;
  onShowExtractedInspectorChange: Dispatch<SetStateAction<boolean>>;
  selectedInspectPage: number;
  onSelectedInspectPageChange: Dispatch<SetStateAction<number>>;
  showMoreOptions: boolean;
  onShowMoreOptionsChange: Dispatch<SetStateAction<boolean>>;
  showTechDetails: boolean;
  onShowTechDetailsChange: Dispatch<SetStateAction<boolean>>;
  pdfPreviewUrl: string | null;
  editingGuideId: string | null;
  uploading: boolean;
  extractingPdf: boolean;
  extractedPdfStats: { pages: number; words: number } | null;
  dragActive: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrag: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  onLoadResourceFile: (fileName: string) => void;
  onProcessFile: (file: File) => void;
  onSave: (status: 'DRAFT' | 'APPROVED') => void;
}

export function GuideUploadDialog({
  open: showUploadGuideModal,
  onClose: resetUploadModal,
  title: uploadTitle,
  onTitleChange: setUploadTitle,
  condition: uploadCondition,
  onConditionChange: setUploadCondition,
  topicTag: uploadTopicTag,
  onTopicTagChange: setUploadTopicTag,
  fileName: uploadFileName,
  pages: uploadPages,
  showExtractedInspector,
  onShowExtractedInspectorChange: setShowExtractedInspector,
  selectedInspectPage,
  onSelectedInspectPageChange: setSelectedInspectPage,
  showMoreOptions,
  onShowMoreOptionsChange: setShowMoreOptions,
  showTechDetails,
  onShowTechDetailsChange: setShowTechDetails,
  pdfPreviewUrl: uploadPdfPreviewUrl,
  editingGuideId,
  uploading: isUploadingGuide,
  extractingPdf: isExtractingPdf,
  extractedPdfStats,
  dragActive,
  fileInputRef,
  onDrag: handleDrag,
  onDrop: handleDrop,
  onLoadResourceFile: handleLoadResourceFile,
  onProcessFile: handleProcessFile,
  onSave: handleSaveGuide,
}: GuideUploadDialogProps) {
  const dialogRef = useDialogFocus(showUploadGuideModal);
  return (
    <>
      {/* MODAL: SIDE-BY-SIDE PDF PREVIEW & DRAFT-THEN-APPROVE REVIEW */}
      {showUploadGuideModal && (
        <div
          onClick={resetUploadModal}
          className="fixed inset-0 bg-slate-900/70 dark:bg-black/80 backdrop-blur-2xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Upload and review guide"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-[96vw] xl:max-w-7xl h-[94vh] flex flex-col overflow-hidden cursor-default transition-colors"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-sky-400 flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-900/50">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-semibold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                      {editingGuideId
                        ? `Review & Verify: ${uploadTitle || uploadFileName || 'Guide'}`
                        : 'Upload & Review Guide'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                        editingGuideId
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                      }`}
                    >
                      {editingGuideId ? 'Review Mode' : 'New Document'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Check the extracted text against the PDF.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetUploadModal}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Close and discard"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hidden file input for uploading or replacing PDF */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />

            {/* Split Screen Container: Left (PDF) vs Right (Metadata & Verification) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
              
              {/* LEFT PANE: PDF Document Viewer */}
              <div className="flex flex-col min-h-0 bg-slate-100 dark:bg-slate-950">
                {/* PDF Toolbar */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      title={uploadFileName || undefined}
                      className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm break-all font-mono select-text"
                    >
                      {uploadFileName || 'No PDF Document Selected'}
                    </span>
                    {extractedPdfStats && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-750 text-slate-700 dark:text-slate-300 shrink-0 font-mono">
                        {extractedPdfStats.pages ? `${extractedPdfStats.pages} pages · ` : ''}
                        {extractedPdfStats.words.toLocaleString()} words
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {uploadPdfPreviewUrl && (
                      <a
                        href={uploadPdfPreviewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#002D72] dark:text-sky-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40 transition"
                        title="Open PDF in a full browser tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open PDF</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* PDF Viewer Body */}
                <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
                  {isExtractingPdf ? (
                    <div className="m-auto p-8 flex flex-col items-center justify-center text-center gap-3">
                      <div className="w-10 h-10 border-3 border-[#002D72] dark:border-sky-400 border-t-transparent rounded-full animate-spin" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">
                          Extracting text & calculating pages...
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                          Storing PDF on server and extracting clean text per page.
                        </p>
                      </div>
                    </div>
                  ) : uploadPdfPreviewUrl ? (
                    <div className="w-full h-full flex flex-col">
                      <object
                        data={uploadPdfPreviewUrl}
                        type="application/pdf"
                        className="w-full flex-1 min-h-0 bg-slate-100 dark:bg-slate-950"
                      >
                        <iframe
                          src={uploadPdfPreviewUrl}
                          title={uploadFileName || 'PDF Document Viewer'}
                          className="w-full h-full border-0 bg-slate-100 dark:bg-slate-950"
                        >
                          <div className="p-8 text-center flex flex-col items-center justify-center h-full space-y-3">
                            <FileText className="w-10 h-10 text-slate-400" />
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              Preview not supported in this frame view
                            </p>
                            <a
                              href={uploadPdfPreviewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#002D72] text-white rounded-lg text-xs font-semibold hover:bg-blue-900 transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open PDF in New Tab</span>
                            </a>
                          </div>
                        </iframe>
                      </object>
                    </div>
                  ) : (
                    <div className="p-6 flex-1 flex flex-col items-center justify-center overflow-y-auto">
                      {/* Drag & Drop Area */}
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full max-w-md p-8 rounded-2xl border-2 border-dashed transition text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                          dragActive
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-4 ring-blue-400/20'
                            : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 bg-white/70 dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#002D72] dark:text-sky-400 flex items-center justify-center">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            Drop PDF guide here, or{' '}
                            <span className="text-[#002D72] dark:text-sky-400 underline">browse</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Accepts institutional PDF guidelines, protocols, and manuals (.pdf)
                          </p>
                        </div>
                      </div>

                      {/* Quick library selection helper */}
                      <div className="w-full max-w-md mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 text-center">
                          Or select an institutional guideline from <code className="font-mono text-blue-600 dark:text-blue-400">/resources/</code>:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                          {INSTITUTIONAL_RESOURCE_FILES.map((resFile) => (
                            <button
                              key={resFile.fileName}
                              type="button"
                              onClick={() => handleLoadResourceFile(resFile.fileName)}
                              className="px-2.5 py-1.5 text-left rounded-lg bg-white dark:bg-slate-850 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-750 text-slate-800 dark:text-slate-200 hover:border-blue-300 dark:hover:border-blue-800 transition text-[11px] truncate flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title={resFile.label}
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate">{resFile.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT PANE: Clinical Classification & Verification */}
              <div className="flex flex-col min-h-0 bg-white dark:bg-slate-900">
                {/* Editor Header Bar */}
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-850/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Document Details & Verification
                  </span>
                  {uploadPages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowExtractedInspector((prev) => !prev)}
                      className="text-xs text-[#002D72] dark:text-sky-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showExtractedInspector ? 'Hide text' : 'Check text'}</span>
                      {showExtractedInspector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {/* Form Inputs & Simplified Page Verification */}
                <div className="flex-1 min-h-0 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
                  {/* CONDITION SELECTOR: Nothing preselected by default */}
                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 text-xs mb-1.5">
                      Condition <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'FTD', label: 'FTD', name: 'Frontotemporal Dementia' },
                          { id: 'AD', label: 'AD', name: "Alzheimer's Disease" },
                          { id: 'GENERAL', label: 'General', name: 'All Dementia Care' },
                        ] as const
                      ).map((item) => {
                        const isSelected = uploadCondition === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setUploadCondition(item.id)}
                            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                              isSelected
                                ? item.id === 'FTD'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500 ring-2 ring-blue-400/20'
                                  : item.id === 'AD'
                                  ? 'bg-violet-50 dark:bg-violet-950/60 border-violet-500 dark:border-violet-500 ring-2 ring-violet-400/20'
                                  : 'bg-slate-100 dark:bg-slate-800 border-slate-400 dark:border-slate-500 ring-2 ring-slate-400/20'
                                : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold ${
                                  isSelected
                                    ? item.id === 'FTD'
                                      ? 'text-ftd-700 dark:text-blue-300'
                                      : item.id === 'AD'
                                      ? 'text-ad-700 dark:text-violet-300'
                                      : 'text-slate-800 dark:text-slate-200'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {item.label}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-current shrink-0" />}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {item.name}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                      FTD users see FTD and General guides only.
                    </p>
                  </div>

                  {/* Document Title (Prefilled from filename or first page text) */}
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                      Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. Managing Aggressive Behavior in FTD"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* ONE SUMMARY LINE & EXTRACTION VERIFICATION */}
                  {uploadPages.length > 0 ? (
                    (() => {
                      const totalPages = uploadPages.length;
                      const totalWords = uploadPages.reduce((acc, p) => acc + p.wordCount, 0);
                      const emptyPages = uploadPages.filter((p) => !p.text || p.wordCount === 0);
                      const shortPages = uploadPages.filter((p) => p.wordCount > 0 && p.wordCount < 20);
                      const hasIssues = emptyPages.length > 0 || shortPages.length > 0;

                      return (
                        <div className="space-y-2 pt-1">
                          {/* Summary Row */}
                          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                              {hasIssues ? (
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              )}
                              <span>
                                {totalPages} {totalPages === 1 ? 'page' : 'pages'} · {totalWords.toLocaleString()} words ·{' '}
                                <strong className={hasIssues ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                                  {hasIssues ? 'Extraction warning' : 'No issues found'}
                                </strong>
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowExtractedInspector((prev) => !prev)}
                              className="text-xs text-[#002D72] dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                            >
                              {showExtractedInspector ? 'Hide text' : 'Check text'}
                            </button>
                          </div>

                          {/* Warning callout (shown only when something is wrong) */}
                          {emptyPages.length > 0 && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Page {emptyPages.map((p) => p.pageNumber).join(', ')} is empty. </span>
                                <span>Scanned or image-only pages cannot produce retrieval answers.</span>
                              </div>
                            </div>
                          )}

                          {shortPages.length > 0 && emptyPages.length === 0 && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Short text on page {shortPages.map((p) => p.pageNumber).join(', ')}. </span>
                                <span>Verify against the PDF on the left.</span>
                              </div>
                            </div>
                          )}

                          {/* Extracted Text Inspector (Collapsed by default, opens on demand) */}
                          {showExtractedInspector && (
                            <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Select page to inspect:
                                </span>
                                <div className="flex items-center gap-1 overflow-x-auto max-w-[280px] py-0.5">
                                  {uploadPages.map((p) => {
                                    const isSelected = selectedInspectPage === p.pageNumber;
                                    const isEmpty = p.wordCount === 0 || !p.text.trim();
                                    return (
                                      <button
                                        key={p.pageNumber}
                                        type="button"
                                        onClick={() => setSelectedInspectPage(p.pageNumber)}
                                        className={`px-2 py-0.5 text-xs rounded-md transition cursor-pointer font-medium ${
                                          isSelected
                                            ? 'bg-[#002D72] text-white'
                                            : isEmpty
                                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                        }`}
                                        title={`Page ${p.pageNumber} (${p.wordCount} words)`}
                                      >
                                        {p.pageNumber}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-text text-slate-800 dark:text-slate-200">
                                {uploadPages.find((p) => p.pageNumber === selectedInspectPage)?.text || (
                                  <span className="text-amber-600 dark:text-amber-400 italic">
                                    No text extracted on page {selectedInspectPage}.
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 text-slate-400 space-y-1">
                      <FileText className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        No PDF loaded yet
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Upload or pick a document from the left pane to extract text.
                      </p>
                    </div>
                  )}

                  {/* Topic Tag behind "More options" */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMoreOptions((prev) => !prev)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <span>{showMoreOptions ? '− Fewer options' : '+ More options'}</span>
                    </button>

                    {showMoreOptions && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-xs">
                          Topic Tag (Optional)
                        </label>
                        <input
                          type="text"
                          value={uploadTopicTag}
                          onChange={(e) => setUploadTopicTag(e.target.value)}
                          placeholder="e.g. Aggression, Sleep, Bathing"
                          className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Technical details (Closed by default) */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setShowTechDetails((prev) => !prev)}
                      className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{showTechDetails ? '▾ Technical details' : '▸ Technical details'}</span>
                    </button>

                    {showTechDetails && (
                      <div className="mt-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-1 animate-in fade-in">
                        <div>
                          Total RAG chunks: <strong>{uploadPages.reduce((acc, p) => acc + p.chunkCount, 0)}</strong> (~300–500 words per chunk, 60-word overlap)
                        </div>
                        {uploadPdfPreviewUrl && (
                          <div className="truncate" title={uploadPdfPreviewUrl}>
                            Server path: {uploadPdfPreviewUrl}
                          </div>
                        )}
                        <div>Target condition: {uploadCondition || 'Not yet selected'}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer with Draft-then-Approve Actions */}
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Drafts are saved safely and are <strong>not</strong> served by the assistant until approved.
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={resetUploadModal}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveGuide('DRAFT')}
                  disabled={isUploadingGuide || isExtractingPdf || !uploadCondition || !uploadTitle.trim() || uploadPages.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-40 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Save as Draft (will not be active in assistant)"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Save as Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveGuide('APPROVED')}
                  disabled={isUploadingGuide || isExtractingPdf || !uploadCondition || !uploadTitle.trim() || uploadPages.length === 0}
                  className="px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:opacity-40 text-white transition flex items-center gap-2 shadow-xs cursor-pointer"
                  title="Approve extraction for chatbot"
                >
                  {isUploadingGuide ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve for chatbot</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

