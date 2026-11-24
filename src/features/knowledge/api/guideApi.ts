import {
  ChatbotGuideFile,
  ChatbotGuideTestResult,
  ChatbotKnowledgeConfig,
  GuideCondition,
  GuidePageData,
} from '@/features/knowledge/types';
import { requestJson } from '@/shared/api/httpClient';

interface UploadGuidePayload {
  title: string;
  condition: GuideCondition;
  topicTag?: string;
  publisher?: string;
  year?: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  category?: string;
  description: string;
  content?: string;
  pages?: GuidePageData[];
  totalChunks?: number;
  status?: 'DRAFT' | 'APPROVED';
  pdfUrl?: string;
}

interface ExtractedPdf {
  hasReadableText?: boolean;
  text?: string;
  pages?: GuidePageData[];
  totalChunks?: number;
  wordCount?: number;
  pageCount?: number;
  fileName: string;
  pdfUrl?: string;
  title: string;
  category?: string;
  publisher?: string;
  year?: string;
}

const guideRequest = requestJson;

export const guideApi = {
  async getChatbotGuides(): Promise<{
    guides: ChatbotGuideFile[];
    config: ChatbotKnowledgeConfig;
  }> {
    return requestJson(
      '/api/v1/chatbot/guides',
      undefined,
      (response) =>
        `Failed to load guides: ${response.statusText || response.status}`,
    );
  },

  uploadChatbotGuide(payload: UploadGuidePayload): Promise<ChatbotGuideFile> {
    return guideRequest(
      '/api/v1/chatbot/guides',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (response) =>
        `Failed to save guide: ${response.statusText || response.status}`,
    );
  },

  updateChatbotGuide(
    id: string,
    payload: Partial<ChatbotGuideFile>,
  ): Promise<{ success: boolean; guide: ChatbotGuideFile }> {
    return guideRequest(
      `/api/v1/chatbot/guides/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (response) =>
        `Failed to update guide: ${response.statusText || response.status}`,
    );
  },

  approveChatbotGuide(
    id: string,
  ): Promise<{ success: boolean; guide: ChatbotGuideFile }> {
    return guideRequest(
      `/api/v1/chatbot/guides/${encodeURIComponent(id)}/approve`,
      { method: 'PATCH' },
      (response) =>
        `Failed to approve guide: ${response.statusText || response.status}`,
    );
  },

  extractPdfText(file: File): Promise<ExtractedPdf> {
    if (file.size > 12 * 1024 * 1024)
      return Promise.reject(new Error('PDF exceeds 12 MB limit'));
    const body = new FormData();
    body.append('file', file, file.name);
    // The browser supplies Content-Type including the multipart boundary.
    return guideRequest(
      '/api/v1/chatbot/extract-pdf',
      { method: 'POST', body },
      (response) =>
        `Failed to upload PDF (${response.status}). Please try again.`,
    );
  },

  deleteChatbotGuide(
    id: string,
  ): Promise<{ success: boolean; remainingGuides?: number }> {
    return guideRequest(
      `/api/v1/chatbot/guides/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      (response) =>
        `Failed to delete guide: ${response.statusText || response.status}`,
    );
  },

  toggleChatbotGuide(
    id: string,
  ): Promise<{ guide: ChatbotGuideFile; success: boolean }> {
    return guideRequest(
      `/api/v1/chatbot/guides/${encodeURIComponent(id)}/toggle`,
      { method: 'PATCH' },
      (response) =>
        `Failed to toggle guide: ${response.statusText || response.status}`,
    );
  },

  testChatbotGuideRetrieval(query: string): Promise<ChatbotGuideTestResult> {
    return guideRequest(
      '/api/v1/knowledge/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      },
      (response) =>
        `Assistant test query failed: ${response.statusText || response.status}`,
    );
  },
};
