import {
  ChatbotGuideFile,
  ChatbotGuideTestResult,
  ChatbotKnowledgeConfig,
  GuideCondition,
  GuidePageData,
} from '@/types';
import { apiFetch } from '@/shared/api/httpClient';

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
  description?: string;
  content: string;
  pages?: GuidePageData[];
  totalChunks?: number;
  status?: 'DRAFT' | 'APPROVED';
  pdfUrl?: string;
  uploadedBy: string;
  uploadedByName: string;
}

interface ExtractedPdf {
  text: string;
  pages: GuidePageData[];
  totalChunks: number;
  wordCount: number;
  pageCount: number;
  fileName: string;
  pdfUrl?: string;
  title: string;
  category?: string;
  publisher?: string;
  year?: string;
}

async function guideRequest<T>(
  path: string,
  options: RequestInit | undefined,
  failureMessage: (response: Response) => string,
): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || failureMessage(response));
  }
  return response.json() as Promise<T>;
}

export const guideApi = {
  async getChatbotGuides(): Promise<{
    guides: ChatbotGuideFile[];
    config: ChatbotKnowledgeConfig;
  }> {
    const response = await apiFetch('/api/v1/chatbot/guides');
    if (!response.ok) {
      throw new Error(
        `Failed to load guides: ${response.statusText || response.status}`,
      );
    }
    return response.json();
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

  extractPdfText(payload: {
    fileName: string;
    fileBase64: string;
  }): Promise<ExtractedPdf> {
    return guideRequest(
      '/api/v1/chatbot/extract-pdf',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      (response) =>
        `Failed to extract PDF: ${response.statusText || response.status}`,
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
