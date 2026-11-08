import React, { Dispatch, SetStateAction, useRef, useState } from 'react';
import { guideApi } from '@/features/knowledge/api/guideApi';
import { cleanPdfText } from '@/shared/lib/cleanPdfText';
import {
  ChatbotGuideFile,
  ChatbotGuideTestResult,
  CurrentUser,
  GuideCondition,
  GuidePageData,
} from '@/types';
import {
  suggestGuideTitle,
} from '@/features/moderation/lib/guideTitle';

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
  const [inspectGuideModal, setInspectGuideModal] = useState<ChatbotGuideFile | null>(null);
  const [guideToDelete, setGuideToDelete] = useState<ChatbotGuideFile | null>(null);
  const [isDeletingGuide, setIsDeletingGuide] = useState(false);
  const [guideStatusFilter, setGuideStatusFilter] = useState<'ALL' | 'DRAFT' | 'APPROVED'>('ALL');

  // Upload Guide Form State (Condition, Title, Topic Tag, Page-by-Page Extraction)
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCondition, setUploadCondition] = useState<GuideCondition | null>(null);
  const [uploadTopicTag, setUploadTopicTag] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadPages, setUploadPages] = useState<GuidePageData[]>([]);
  const [showExtractedInspector, setShowExtractedInspector] = useState(false);
  const [selectedInspectPage, setSelectedInspectPage] = useState<number>(1);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [uploadPdfPreviewUrl, setUploadPdfPreviewUrl] = useState<string | null>(null);
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);
  const [isUploadingGuide, setIsUploadingGuide] = useState(false);
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [extractedPdfStats, setExtractedPdfStats] = useState<{ pages: number; words: number } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Chatbot Test Simulator State
  const [testQuery, setTestQuery] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ChatbotGuideTestResult | null>(null);
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
      console.error('Failed to load chatbot guides:', err);
    } finally {
      setLoadingGuides(false);
    }
  };

  const handleToggleGuide = async (guide: ChatbotGuideFile) => {
    try {
      const res = await guideApi.toggleChatbotGuide(guide.id);
      setChatbotGuides((prev) =>
        prev.map((g) => (g.id === guide.id ? { ...g, isActive: res.guide.isActive } : g))
      );
      setActionSuccessNotice(
        res.guide.isActive
          ? `Guide "${guide.title}" activated. Assistant will now use this document.`
          : `Guide "${guide.title}" paused. Assistant will not use this document.`
      );
      setTimeout(() => setActionSuccessNotice(null), 3500);
      loadChatbotGuides();
    } catch (err) {
      console.error('Failed to toggle guide:', err);
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
      setActionSuccessNotice(`Guide "${guideToDelete.title}" successfully removed.`);
      setTimeout(() => setActionSuccessNotice(null), 3500);
      setGuideToDelete(null);
      await loadChatbotGuides();
      onQueueUpdated();
    } catch (err) {
      console.error('Failed to delete guide:', err);
      setActionSuccessNotice('Could not delete guide. Please try again.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
    } finally {
      setIsDeletingGuide(false);
    }
  };

  const resetUploadModal = () => {
    setShowUploadGuideModal(false);
    setUploadTitle('');
    setUploadCondition(null);
    setUploadTopicTag('');
    setUploadFileName('');
    setUploadContent('');
    setUploadPages([]);
    setShowExtractedInspector(false);
    setSelectedInspectPage(1);
    setShowMoreOptions(false);
    setShowTechDetails(false);
    setUploadPdfPreviewUrl(null);
    setEditingGuideId(null);
    setExtractedPdfStats(null);
  };

  const handleOpenReviewModal = (guide: ChatbotGuideFile) => {
    setEditingGuideId(guide.id);
    setUploadTitle(guide.title);
    setUploadCondition(guide.condition || null);
    setUploadTopicTag(guide.topicTag || guide.category || '');
    setUploadContent(guide.content);
    setUploadFileName(guide.fileName);
    setShowExtractedInspector(false);
    setSelectedInspectPage(1);
    setShowMoreOptions(false);
    setShowTechDetails(false);

    if (guide.pages && guide.pages.length > 0) {
      setUploadPages(guide.pages);
      setExtractedPdfStats({ pages: guide.pages.length, words: guide.wordCount || 0 });
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
      setUploadPages(builtPages.length > 0 ? builtPages : [{ pageNumber: 1, text: guide.content, wordCount: guide.wordCount || 0, chunkCount: 1 }]);
      setExtractedPdfStats({ pages: builtPages.length || 1, words: guide.wordCount || 0 });
    }

    setUploadPdfPreviewUrl(guide.pdfUrl || `/resources/${guide.fileName}`);
    setShowUploadGuideModal(true);
  };

  const handleQuickApprove = async (guide: ChatbotGuideFile) => {
    try {
      await guideApi.approveChatbotGuide(guide.id);
      setActionSuccessNotice(`Approved "${guide.title}" for chatbot!`);
      setTimeout(() => setActionSuccessNotice(null), 3500);
      loadChatbotGuides();
    } catch (err) {
      console.error('Failed to approve guide:', err);
      setActionSuccessNotice('Could not approve guide.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
    }
  };

  const handleLoadResourceFile = async (resourceFileName: string) => {
    try {
      setIsExtractingPdf(true);
      setUploadFileName(resourceFileName);
      setUploadTitle(suggestGuideTitle(resourceFileName));
      setUploadCondition(null); // Never preselect FTD!
      setUploadTopicTag('');
      setUploadPages([]);
      setShowExtractedInspector(false);
      setSelectedInspectPage(1);
      setUploadPdfPreviewUrl(`/resources/${resourceFileName}`);

      const res = await fetch(`/resources/${resourceFileName}`);
      const blob = await res.blob();
      const file = new File([blob], resourceFileName, { type: 'application/pdf' });
      handleProcessFile(file);
    } catch (err) {
      console.error('Failed to load resource file:', err);
      setIsExtractingPdf(false);
      setActionSuccessNotice('Could not load library PDF file.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
    }
  };

  const handleProcessFile = (file: File) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    setUploadFileName(file.name);
    // Suggest title immediately from filename or known library entry
    setUploadTitle((prev) => (prev && prev.trim() ? prev : suggestGuideTitle(file.name)));
    setUploadCondition(null); // Start with NOTHING selected so reviewer must make a deliberate choice
    setUploadTopicTag('');
    setUploadPages([]);
    setShowExtractedInspector(false);
    setSelectedInspectPage(1);

    if (isPdf) {
      // Do NOT set temporary blob URL (causes broken viewer in iframes); show extraction spinner until server returns stable path
      setUploadPdfPreviewUrl(null);
      setIsExtractingPdf(true);
      setExtractedPdfStats(null);
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const len = bytes.byteLength;
          const chunkSize = 8192;
          for (let i = 0; i < len; i += chunkSize) {
            const sub = bytes.subarray(i, Math.min(i + chunkSize, len));
            binary += String.fromCharCode.apply(null, sub as unknown as number[]);
          }
          const base64 = btoa(binary);

          const result = await guideApi.extractPdfText({
            fileName: file.name,
            fileBase64: base64,
          });

          // Text and pages returned cleanly from server
          setUploadContent(result.text);
          setUploadPages(result.pages || []);
          if (result.pdfUrl) {
            setUploadPdfPreviewUrl(result.pdfUrl);
          } else {
            setUploadPdfPreviewUrl(`/resources/${file.name}`);
          }
          setExtractedPdfStats({ pages: result.pageCount, words: result.wordCount });
          // If title was empty, refine from page 1 text
          setUploadTitle((prev) => (prev && prev.trim() ? prev : suggestGuideTitle(file.name, result.pages?.[0]?.text)));
          setActionSuccessNotice(`Extracted ${result.pageCount} pages (${result.wordCount.toLocaleString()} words) from "${file.name}".`);
          setTimeout(() => setActionSuccessNotice(null), 3500);
        } catch (err) {
          console.error('PDF extraction failed:', err);
          setActionSuccessNotice('Failed to extract PDF text. Please check the file.');
          setTimeout(() => setActionSuccessNotice(null), 3500);
        } finally {
          setIsExtractingPdf(false);
        }
      };
      reader.onerror = () => {
        setIsExtractingPdf(false);
        setActionSuccessNotice('Could not read PDF file.');
        setTimeout(() => setActionSuccessNotice(null), 3500);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setIsExtractingPdf(false);
      setExtractedPdfStats(null);
      setUploadPdfPreviewUrl(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        const cleaned = cleanPdfText(text);
        setUploadContent(cleaned);
        const words = cleaned.trim().split(/\s+/).filter(Boolean).length;
        setUploadPages([{ pageNumber: 1, text: cleaned, wordCount: words, chunkCount: Math.max(1, Math.ceil(words / 340)) }]);
        setUploadTitle((prev) => (prev && prev.trim() ? prev : suggestGuideTitle(file.name, cleaned)));
      };
      reader.readAsText(file);
    }
  };

  const handleSaveGuide = async (statusToSet: 'DRAFT' | 'APPROVED') => {
    if (!uploadCondition) {
      setActionSuccessNotice('Please select a Target Condition (FTD, AD, or General) before saving.');
      setTimeout(() => setActionSuccessNotice(null), 3500);
      return;
    }
    if (!uploadTitle.trim() || isUploadingGuide) return;
    const finalContent = uploadContent.trim() || uploadPages.map((p) => p.text).join('\n\n');
    if (!finalContent && uploadPages.length === 0) return;

    setIsUploadingGuide(true);
    try {
      const isApproved = statusToSet === 'APPROVED';
      const totalChunksCalc = uploadPages.reduce((acc, p) => acc + p.chunkCount, 0);

      if (editingGuideId) {
        await guideApi.updateChatbotGuide(editingGuideId, {
          title: uploadTitle.trim(),
          condition: uploadCondition,
          topicTag: uploadTopicTag.trim() || undefined,
          content: finalContent,
          pages: uploadPages,
          totalChunks: totalChunksCalc,
          status: statusToSet,
          pdfUrl: uploadPdfPreviewUrl || undefined,
        });
        setActionSuccessNotice(
          isApproved
            ? `Guide "${uploadTitle}" approved for chatbot!`
            : `Guide "${uploadTitle}" draft updated.`
        );
      } else {
        const res = await guideApi.uploadChatbotGuide({
          title: uploadTitle.trim(),
          condition: uploadCondition,
          topicTag: uploadTopicTag.trim() || undefined,
          fileName: uploadFileName.trim() || `${uploadTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.pdf`,
          content: finalContent,
          pages: uploadPages,
          totalChunks: totalChunksCalc,
          status: statusToSet,
          pdfUrl: uploadPdfPreviewUrl || undefined,
          mimeType: uploadFileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'text/plain',
          uploadedBy: currentUser.id,
          uploadedByName: `${currentUser.firstName} ${currentUser.lastName}`,
        });
        setActionSuccessNotice(
          isApproved
            ? `Guide "${res.title}" approved for chatbot!`
            : `Guide "${res.title}" saved as draft.`
        );
      }
      resetUploadModal();
      setTimeout(() => setActionSuccessNotice(null), 4500);
      loadChatbotGuides();
    } catch (err) {
      console.error('Failed to save guide:', err);
      setActionSuccessNotice('Could not save guide document. Please try again.');
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
      console.error('Test query failed:', err);
      setActionSuccessNotice('Test query failed.');
      setTimeout(() => setActionSuccessNotice(null), 3000);
    } finally {
      setIsTesting(false);
    }
  };

  const filteredGuides = chatbotGuides
    .filter((g) => {
      if (guideStatusFilter === 'DRAFT') return g.status === 'DRAFT';
      if (guideStatusFilter === 'APPROVED') return g.status === 'APPROVED' || !g.status;
      return true;
    })
    .filter((g) => {
      const q = guideSearchFilter.toLowerCase();
      return (
        !q ||
        g.title.toLowerCase().includes(q) ||
        g.fileName.toLowerCase().includes(q) ||
        (g.publisher && g.publisher.toLowerCase().includes(q)) ||
        (g.year && g.year.toLowerCase().includes(q)) ||
        g.content.toLowerCase().includes(q)
      );
    });

  return {
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
    uploadTopicTag,
    setUploadTopicTag,
    uploadFileName,
    uploadContent,
    uploadPages,
    showExtractedInspector,
    setShowExtractedInspector,
    selectedInspectPage,
    setSelectedInspectPage,
    showMoreOptions,
    setShowMoreOptions,
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
    handleLoadResourceFile,
    handleProcessFile,
    handleSaveGuide,
    handleRunTestQuery,
  };
}
