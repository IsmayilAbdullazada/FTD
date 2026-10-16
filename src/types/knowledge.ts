export interface KnowledgeTopic {
  id: string;
  name: string;
  enabled: boolean;
  automatic?: boolean;
}
export interface KnowledgeSheet {
  name: string;
  rows: string[][];
  questionColumn: number;
  answerColumn: number;
  headerRow: number;
}
export interface KnowledgeText {
  title: string;
  answer: string;
  question: string;
  keyPoints: string[];
  topicId: string;
  topicSuggested?: boolean;
  visibility: "chatbot" | "guides";
  alternatives: string[];
  searchWords: string[];
  samples: string[];
  unclearAccepted: boolean;
  externalUrl?: string;
}
export interface KnowledgeItem {
  id: string;
  type: "question" | "document";
  status: "Live" | "Draft" | "Removed";
  live: KnowledgeText | null;
  draft: KnowledgeText | null;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  checkedAt?: string;
  fileId?: string;
  replacesId?: string;
}
export type KnowledgeAction =
  | "ADD"
  | "EDIT"
  | "PUBLISH"
  | "REMOVE"
  | "RESTORE"
  | "REPLACE"
  | "UPDATE_COMPLETED"
  | "UPDATE_FAILED"
  | "CHECK_RUN"
  | "CHECKED"
  | "ADVANCED";
export interface KnowledgeHistory {
  id: string;
  moderatorId: string;
  moderatorName: string;
  entityType: "KNOWLEDGE";
  entityId: string;
  actionTaken: KnowledgeAction;
  notes: string;
  createdAt: string;
}
export interface KnowledgeCheck {
  question: string;
  passed: boolean;
  itemId?: string;
}
export interface KnowledgeState {
  items: KnowledgeItem[];
  topics: KnowledgeTopic[];
  history: KnowledgeHistory[];
  files: {
    id: string;
    name: string;
    hash: string;
    mime: string;
    unclear: boolean;
    sheets?: KnowledgeSheet[];
  }[];
  settings: {
    synonyms: Record<string, string[]>;
    resultCount: number;
    minimum: number;
  };
  checks: KnowledgeCheck[];
  snapshots: {
    id: string;
    at: string;
    items: KnowledgeItem[];
    topics: KnowledgeTopic[];
    settings: KnowledgeState["settings"];
  }[];
}
export interface KnowledgeOverview {
  items: KnowledgeItem[];
  topics: KnowledgeTopic[];
  history: KnowledgeHistory[];
  status: string;
  checks: KnowledgeCheck[];
  liveCount: number;
  pendingSheets?: (KnowledgeSheet & { fileId: string })[];
}
export interface KnowledgeAnswer {
  answer: string;
  isMedicationRefusal?: boolean;
  citedResources: { id: string; title: string; url?: string }[];
  suggestedQuestions: string[];
  noContent?: boolean;
  wording: "local" | "assisted";
  writingUnavailable?: boolean;
  debug?: unknown;
}
