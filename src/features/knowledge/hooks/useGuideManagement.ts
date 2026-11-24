import {
  isGuideDescriptionValid,
  suggestGuideDescription,
  editableGuideDescription,
} from '../lib/guideDescription';
import { normalizeGuideTopic } from '../lib/guideTopics';
import { guideApi } from '@/features/knowledge/api/guideApi';
import {
  suggestGuideTitle,
  INSTITUTIONAL_RESOURCE_FILES,
} from '@/features/knowledge/lib/guideTitle';
import {
  filterGuides,
  replaceGuide,
} from '@/features/knowledge/lib/guideWorkflow';
import {
  ChatbotGuideFile,
  ChatbotGuideTestResult,
  GuideCondition,
  GuidePageData,
} from '@/features/knowledge/types';
import { cleanPdfText } from '@/shared/lib/cleanPdfText';
import { reportError } from '@/shared/lib/logger';
import type { CurrentUser } from '@/types';
import React, { Dispatch, SetStateAction, useRef, useState } from 'react';

interface UseGuideManagementOptions {
  currentUser: CurrentUser;
  onQueueUpdated: () => void;
  setActionSuccessNotice: Dispatch<SetStateAction<string | null>>;
}

export function useGuideManagement({
  currentUser,
  onQueueUpdated,
  setActionSuccessNotice,
}: UseGuideManagementOptions) {
  // Chatbot Knowledge Management State
  const [chatbotGuides, setChatbotGuides] = useState<ChatbotGuideFile[]>([]);
  const [loadingGuides, setLoadingGuides] = useState(false);
  const [guideSearchFilter, setGuideSearchFilter] = useState('');
  const [showUploadGuideModal, setShowUploadGuideModal] = useState(false);
  const [inspectGuideModal, setInspectGuideModal] =
    useState<ChatbotGuideFile | null>(null);
  const [guideToDelete, setGuideToDelete] = useState<ChatbotGuideFile | null>(
    null,
  );
  const [isDeletingGuide, setIsDeletingGuide] = useState(false);
  const [guideStatusFilter, setGuideStatusFilter] = useState<
    'ALL' | 'DRAFT' | 'APPROVED'
  >('ALL');

  // Upload Guide Form State (Condition, Title, Topic, Page-by-Page Extraction)
  const [uploadMetadata, setUploadMetadata] = useState({
    category: '',
    description: '',
    publisher: '',
    year: '',
  });
  const automaticDescription = useRef('');
  function fillDescriptionSuggestion(content: string, title: string) {
    const previousSuggestion = automaticDescription.current;
    const nextSuggestion = suggestGuideDescription(content, title);
    automaticDescription.current = nextSuggestion;
    setUploadMetadata((previous) =>
      !previous.description.trim() ||
      previous.description === previousSuggestion
        ? { ...previous, description: nextSuggestion }
        : previous,
    );
  }
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCondition, setUploadCondition] = useState<GuideCondition | null>(
    null,
  );
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadPages, setUploadPages] = useState<GuidePageData[]>([]);
  const [showExtractedInspector, setShowExtractedInspector] = useState(false);
  const [selectedInspectPage, setSelectedInspectPage] = useState<number>(1);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [uploadPdfPreviewUrl, setUploadPdfPreviewUrl] = useState<string | null>(
    null,
  );
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);
  const [isUploadingGuide, setIsUploadingGuide] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractedPdfStats, setExtractedPdfStats] = useState<{
    pages: number;
    words: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Chatbot Test Simulator State
  const [testQuery, setTestQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ChatbotGuideTestResult | null>(
    null,
  );
  const [copiedInspect, setCopiedInspect] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const loadChatbotGuides = async () => {
    setLoadingGuides(true);
    try {
      const res = await guideApi.getChatbotGuides();
      const rawGuides = res.guides || [];
      const seen = new Set<string>();
      const deduped: ChatbotGuideFile[] = [];
      for (const g of rawGuides) {
        if (!seen.has(g.id)) {
          seen.add(g.id);
          deduped.push(g);
        }
      }
      setChatbotGuides(deduped);
    } catch (err) {
      reportError('Failed to load chatbot guides:', err);
    } finally {
      setLoadingGuides(false);
    }
  };

  const handleToggleGuide = async (guide: ChatbotGuideFile) => {
    try {
      const res = await guideApi.toggleChatbotGuide(guide.id);
      setChatbotGuides((previous) => replaceGuide(previous, res.guide));
      setActionSuccessNotice(
        res.guide.isActive
          ? `Guide "${guide.title}" activated. Assistant will now use this document.`
          : `Guide "${guide.title}" paused. Assistant will not use this document.`,
      );
      setTimeout(() => setActionSuccessNotice(null), 3500);
      loadChatbotGuides();
    } catch (err) {
      reportError('Failed to toggle guide:', err);
      setActionSuccessNotice('Could not update guide status.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
    }
  };

  const handleRequestDeleteGuide = (guide: ChatbotGuideFile) => {
    setGuideToDelete(guide);
  };

  const handleConfirmDeleteGuide = async () => {
    if (!guideToDelete || isDeletingGuide) return;
    setIsDeletingGuide(true);
    try {
      await guideApi.deleteChatbotGuide(guideToDelete.id);
      setChatbotGuides((prev) => prev.filter((g) => g.id !== guideToDelete.id));
      setActionSuccessNotice(
        `Guide "${guideToDelete.title}" successfully removed.`,
      );
      setTimeout(() => setActionSuccessNotice(null), 3500);
      setGuideToDelete(null);
      await loadChatbotGuides();
      onQueueUpdated();
    } catch (err) {
      reportError('Failed to delete guide:', err);
      setActionSuccessNotice('Could not delete guide. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
    } finally {
      setIsDeletingGuide(false);
    }
  };

  const resetUploadModal = () => {
    setShowUploadGuideModal(false);
    automaticDescription.current = '';
    setUploadMetadata({
      category: '',
      description: '',
      publisher: '',
      year: '',
    });
    setUploadTitle('');
    setUploadCondition(null);
    setUploadFileName('');
    setUploadContent('');
    setUploadPages([]);
    setShowExtractedInspector(false);
    setSelectedInspectPage(1);
    setShowTechDetails(false);
    setUploadPdfPreviewUrl(null);
    setEditingGuideId(null);
    setExtractedPdfStats(null);
  };

  const handleOpenReviewModal = (guide: ChatbotGuideFile) => {
    const existingTopic =
      guide.category === 'GUIDE'
        ? guide.topicTag
        : guide.category || guide.topicTag;
    automaticDescription.current = '';
    setUploadMetadata({
      category: normalizeGuideTopic(existingTopic) || existingTopic || '',
      description: editableGuideDescription(
        guide.description,
        guide.content,
        guide.title,
      ),
      publisher: guide.publisher || '',
      year: guide.year || '',
    });
    setEditingGuideId(guide.id);
    setUploadTitle(guide.title);
    setUploadCondition(guide.condition || null);
    setUploadContent(guide.content);
    setUploadFileName(guide.fileName);
    setShowExtractedInspector(false);
    setSelectedInspectPage(1);
    setShowTechDetails(false);

    if (guide.pages && guide.pages.length > 0) {
      setUploadPages(guide.pages);
      setExtractedPdfStats({
        pages: guide.pages.length,
        words: guide.wordCount || 0,
      });
    } else {
      // Reconstruct pages if older guide record didn't save page array
      const rawPages = guide.content.split(/(?=^##\s+)/m).filter(Boolean);
      const builtPages: GuidePageData[] = rawPages.map((sec, idx) => {
        const words = sec.trim().split(/\s+/).filter(Boolean).length;
        return {
          pageNumber: idx + 1,
          text: sec,
          wordCount: words,
          chunkCount: Math.max(1, Math.ceil(words / 340)),
        };
      });
      setUploadPages(
        builtPages.length > 0
          ? builtPages
          : [
              {
                pageNumber: 1,
                text: guide.content,
                wordCount: guide.wordCount || 0,
                chunkCount: 1,
              },
            ],
      );
      setExtractedPdfStats({
        pages: builtPages.length || 1,
        words: guide.wordCount || 0,
      });
    }

    setUploadPdfPreviewUrl(
      guide.pdfUrl ||
        (guide.fileName.toLowerCase().endsWith('.pdf')
          ? `/resources/${encodeURIComponent(guide.fileName)}`
          : null),
    );
    setShowUploadGuideModal(true);
  };

  const handleQuickApprove = async (guide: ChatbotGuideFile) => {
    try {
      const response = await guideApi.approveChatbotGuide(guide.id);
      setChatbotGuides((previous) => replaceGuide(previous, response.guide));
      setActionSuccessNotice(`Approved "${guide.title}"!`);
      setTimeout(() => setActionSuccessNotice(null), 3500);
      loadChatbotGuides();
    } catch (err) {
      reportError('Failed to approve guide:', err);
      setActionSuccessNotice('Could not approve guide.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
    }
  };

  const handleProcessFile = (file: File) => {
    const isPdf =
      file.name.toLowerCase().endsWith('.pdf') ||
      file.type === 'application/pdf';
    setUploadFileName(file.name);
    // Suggest title immediately from filename or known library entry
    setUploadTitle((prev) =>
      prev && prev.trim() ? prev : suggestGuideTitle(file.name),
    );
    setUploadCondition(null); // Start with NOTHING selected so reviewer must make a deliberate choice
    setUploadPages([]);
    setShowExtractedInspector(false);
    setSelectedInspectPage(1);

    const known = INSTITUTIONAL_RESOURCE_FILES.find(
      (source) => source.fileName.toLowerCase() === file.name.toLowerCase(),
    );
    if (known) {
      setUploadCondition((previous) => previous ?? known.condition);
      setUploadMetadata((previous) => ({
        ...previous,
        category: previous.category || known.topic,
        publisher:
          previous.publisher ||
          'The Association for Frontotemporal Degeneration (AFTD)',
        year: previous.year || known.year,
      }));
    }

    if (isPdf) {
      // Do NOT set temporary blob URL (causes broken viewer in iframes); show extraction spinner until server returns stable path
      setUploadPdfPreviewUrl(null);
      setIsExtractingPdf(true);
      setExtractedPdfStats(null);
      setUploadContent('');
      void (async () => {
        try {
          const result = await guideApi.extractPdfText(file);
          // Text and pages returned cleanly from server
          setUploadContent(result.text || '');
          fillDescriptionSuggestion(
            result.text || '',
            uploadTitle || suggestGuideTitle(file.name),
          );
          setUploadPages(result.pages || []);
          if (result.pdfUrl) {
            setUploadPdfPreviewUrl(result.pdfUrl);
          } else {
            setUploadPdfPreviewUrl(`/resources/${file.name}`);
          }
          setExtractedPdfStats({
            pages: result.pageCount || 0,
            words: result.wordCount || 0,
          });
          // If title was empty, refine from page 1 text
          setUploadTitle((prev) =>
            prev && prev.trim()
              ? prev
              : suggestGuideTitle(file.name, result.pages?.[0]?.text),
          );
          setActionSuccessNotice(
            currentUser.role === 'SYSTEM_ADMIN'
              ? `Extracted ${result.pageCount} pages (${result.wordCount?.toLocaleString() || 0} words) from "${file.name}".`
              : 'PDF ready',
          );
          setTimeout(() => setActionSuccessNotice(null), 3500);
        } catch (err) {
          reportError('PDF extraction failed:', err);
          setActionSuccessNotice(
            err instanceof Error
              ? err.message
              : 'Could not upload the PDF. Please try again.',
          );
          setTimeout(() => setActionSuccessNotice(null), 3500);
        } finally {
          setIsExtractingPdf(false);
        }
      })();
    } else {
      setIsExtractingPdf(false);
      setExtractedPdfStats(null);
      setUploadPdfPreviewUrl(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        const cleaned = cleanPdfText(text);
        setUploadContent(cleaned);
        fillDescriptionSuggestion(
          cleaned,
          uploadTitle || suggestGuideTitle(file.name),
        );
        const words = cleaned.trim().split(/\s+/).filter(Boolean).length;
        setUploadPages([
          {
            pageNumber: 1,
            text: cleaned,
            wordCount: words,
            chunkCount: Math.max(1, Math.ceil(words / 340)),
          },
        ]);
        setUploadTitle((prev) =>
          prev && prev.trim() ? prev : suggestGuideTitle(file.name, cleaned),
        );
      };
      reader.readAsText(file);
    }
  };

  const handleTextChange = (text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    setUploadContent(text);
    fillDescriptionSuggestion(text, uploadTitle);
    setUploadFileName('guide.txt');
    setUploadPdfPreviewUrl(null);
    setUploadPages(
      text.trim()
        ? [
            {
              pageNumber: 1,
              text,
              wordCount: words,
              chunkCount: Math.max(1, Math.ceil(words / 340)),
            },
          ]
        : [],
    );
  };

  const handleSaveGuide = async (statusToSet: 'DRAFT' | 'APPROVED') => {
    if (!isGuideDescriptionValid(uploadMetadata.description)) {
      setActionSuccessNotice(
        'Add a short description of 20–240 characters before saving.',
      );
      return false;
    }
    if (!uploadCondition) {
      setActionSuccessNotice(
        'Please select a Target Condition (FTD, AD, or General) before saving.',
      );
      setTimeout(() => setActionSuccessNotice(null), 3500);
      return;
    }
    if (!uploadTitle.trim() || isUploadingGuide) return;
    const finalContent =
      uploadContent.trim() || uploadPages.map((p) => p.text).join('\n\n');
    if (!finalContent && uploadPages.length === 0 && !uploadPdfPreviewUrl)
      return;

    setIsUploadingGuide(true);
    try {
      const isApproved = statusToSet === 'APPROVED';
      // PDF text is read-only here; save its protected server reference instead.
      const useStoredPdf = uploadPdfPreviewUrl?.startsWith('/uploads/guides/');
      const totalChunksCalc = uploadPages.reduce(
        (acc, p) => acc + p.chunkCount,
        0,
      );

      if (editingGuideId) {
        await guideApi.updateChatbotGuide(editingGuideId, {
          ...uploadMetadata,
          title: uploadTitle.trim(),
          condition: uploadCondition,
          topicTag: uploadMetadata.category,
          content: useStoredPdf ? undefined : finalContent,
          pages: useStoredPdf ? undefined : uploadPages,
          totalChunks: totalChunksCalc,
          status: statusToSet,
          pdfUrl: uploadPdfPreviewUrl || undefined,
        });
        setActionSuccessNotice(
          isApproved
            ? `Guide "${uploadTitle}" approved!`
            : `Guide "${uploadTitle}" draft updated.`,
        );
      } else {
        const res = await guideApi.uploadChatbotGuide({
          ...uploadMetadata,
          title: uploadTitle.trim(),
          condition: uploadCondition,
          topicTag: uploadMetadata.category,
          fileName:
            uploadFileName.trim() ||
            `${uploadTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
          content: useStoredPdf ? undefined : finalContent,
          pages: useStoredPdf ? undefined : uploadPages,
          totalChunks: totalChunksCalc,
          status: statusToSet,
          pdfUrl: uploadPdfPreviewUrl || undefined,
          mimeType: uploadFileName.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'text/plain',
        });
        setActionSuccessNotice(
          isApproved
            ? `Guide "${res.title}" approved!`
            : `Guide "${res.title}" saved as draft.`,
        );
      }
      resetUploadModal();
      setTimeout(() => setActionSuccessNotice(null), 4500);
      loadChatbotGuides();
      return true;
    } catch (err) {
      reportError('Failed to save guide:', err);
      setActionSuccessNotice(
        'Could not save guide document. Please try again.',
      );
      setTimeout(() => setActionSuccessNotice(null), 4000);
    } finally {
      setIsUploadingGuide(false);
    }
  };

  const handleRunTestQuery = async (queryToRun?: string) => {
    const q = (queryToRun ?? testQuery).trim();
    if (!q || isTesting) return;
    setTestQuery(q);
    setIsTesting(true);
    try {
      const res = await guideApi.testChatbotGuideRetrieval(q);
      setTestResult(res);
    } catch (err) {
      reportError('Test query failed:', err);
      setActionSuccessNotice('Test query failed.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
    } finally {
      setIsTesting(false);
    }
  };

  const filteredGuides = filterGuides(
    chatbotGuides,
    guideStatusFilter,
    guideSearchFilter,
  );

  return {
    uploadMetadata,
    setUploadMetadata,
    chatbotGuides,
    loadingGuides,
    guideSearchFilter,
    setGuideSearchFilter,
    showUploadGuideModal,
    setShowUploadGuideModal,
    inspectGuideModal,
    setInspectGuideModal,
    guideToDelete,
    setGuideToDelete,
    isDeletingGuide,
    guideStatusFilter,
    setGuideStatusFilter,
    uploadTitle,
    setUploadTitle,
    uploadCondition,
    setUploadCondition,
    uploadFileName,
    uploadContent,
    handleTextChange,
    uploadPages,
    showExtractedInspector,
    setShowExtractedInspector,
    selectedInspectPage,
    setSelectedInspectPage,
    showTechDetails,
    setShowTechDetails,
    uploadPdfPreviewUrl,
    editingGuideId,
    isUploadingGuide,
    isExtractingPdf,
    extractedPdfStats,
    dragActive,
    fileInputRef,
    testQuery,
    setTestQuery,
    isTesting,
    testResult,
    copiedInspect,
    setCopiedInspect,
    filteredGuides,
    handleDrag,
    handleDrop,
    loadChatbotGuides,
    handleToggleGuide,
    handleRequestDeleteGuide,
    handleConfirmDeleteGuide,
    resetUploadModal,
    handleOpenReviewModal,
    handleQuickApprove,
    handleProcessFile,
    handleSaveGuide,
    handleRunTestQuery,
  };
}
