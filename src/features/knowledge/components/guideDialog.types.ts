import type { GuideCondition, GuidePageData } from '../types';
import type {
  Dispatch,
  DragEventHandler,
  RefObject,
  SetStateAction,
} from 'react';
export interface GuideUploadDialogProps {
  isAdmin?: boolean;
  textMode?: boolean;
  textContent?: string;
  onTextChange?: (text: string) => void;
  metadata?: {
    category: string;
    description: string;
    publisher: string;
    year: string;
  };
  onMetadataChange?: (value: {
    category: string;
    description: string;
    publisher: string;
    year: string;
  }) => void;
  open: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: Dispatch<SetStateAction<string>>;
  condition: GuideCondition | null;
  onConditionChange: Dispatch<SetStateAction<GuideCondition | null>>;
  fileName: string;
  pages: GuidePageData[];
  showExtractedInspector: boolean;
  onShowExtractedInspectorChange: Dispatch<SetStateAction<boolean>>;
  selectedInspectPage: number;
  onSelectedInspectPageChange: Dispatch<SetStateAction<number>>;
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
  onProcessFile: (file: File) => void;
  onSave: (status: 'DRAFT' | 'APPROVED') => void;
}
