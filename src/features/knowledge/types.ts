export type GuideCondition = 'FTD' | 'AD' | 'GENERAL';

export interface GuidePageData {
  pageNumber: number;
  text: string;
  wordCount: number;
  chunkCount: number;
}

export interface ChatbotGuideFile {
  id: string;
  title: string;
  condition: GuideCondition;
  topicTag?: string;
  publisher?: string;
  year?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category?: string;
  description?: string;
  content: string;
  pages?: GuidePageData[];
  totalChunks?: number;
  sectionCount?: number;
  wordCount?: number;
  status?: 'DRAFT' | 'APPROVED';
  approvedAt?: string;
  approvedBy?: string;
  pdfUrl?: string;
  isActive: boolean;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotKnowledgeConfig {
  totalActiveGuides: number;
  totalWords: number;
}

export interface ChatbotGuideTestResult {
  query?: string;
  answer: string;
  retrievedChunks?: Array<{
    guideTitle: string;
    fileName: string;
    page: number;
    content: string;
    score: number;
  }>;
  matchedGuide?: {
    id: string;
    title: string;
    fileName: string;
    page?: number;
    sectionTitle?: string;
    matchScore?: number;
    snippet?: string;
  } | null;
  citedResources?: Array<{
    id: string;
    title: string;
    fileName?: string;
    page?: number;
    url: string;
  }>;
  suggestedQuestions?: string[];
  isUploadedGuideSourced?: boolean;
  isMedicationRefusal?: boolean;
  isOffline?: boolean;
  isDisabled?: boolean;
}
