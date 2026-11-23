import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { createRef } from 'react';
import { GuideUploadDialog } from './GuideUploadDialog';
import type { GuideUploadDialogProps } from './guideDialog.types';
afterEach(cleanup);
const fn = vi.fn();
const props: GuideUploadDialogProps = {
  open: true,
  onClose: fn,
  title: 'Test PDF',
  onTitleChange: fn,
  condition: 'FTD',
  onConditionChange: fn,
  topicTag: '',
  onTopicTagChange: fn,
  fileName: 'test.pdf',
  pages: [
    { pageNumber: 1, text: 'Clinical document', wordCount: 2, chunkCount: 1 },
  ],
  showExtractedInspector: false,
  onShowExtractedInspectorChange: fn,
  selectedInspectPage: 1,
  onSelectedInspectPageChange: fn,
  showMoreOptions: false,
  onShowMoreOptionsChange: fn,
  showTechDetails: false,
  onShowTechDetailsChange: fn,
  pdfPreviewUrl: '/uploads/guides/test.pdf',
  editingGuideId: null,
  uploading: false,
  extractingPdf: false,
  extractedPdfStats: { pages: 1, words: 2 },
  dragActive: false,
  fileInputRef: createRef<HTMLInputElement>(),
  onDrag: fn,
  onDrop: fn,
  onLoadResourceFile: fn,
  onProcessFile: fn,
  onSave: fn,
};
test('moderators get plain guide status and no extraction statistics or text inspector', () => {
  render(<GuideUploadDialog {...props} />);
  expect(screen.getByText('PDF ready')).toBeTruthy();
  expect(screen.queryByText(/Check text|2 words|1 page/)).toBeNull();
  expect(screen.getByRole('button', { name: 'Approve' })).toBeTruthy();
});
test('admin upload retains extraction tools', () => {
  render(<GuideUploadDialog {...props} isAdmin />);
  expect(screen.getByText(/1 pages.*2 words/)).toBeTruthy();
  expect(
    screen.getAllByRole('button', { name: /Check text/i })[0],
  ).toBeTruthy();
});
