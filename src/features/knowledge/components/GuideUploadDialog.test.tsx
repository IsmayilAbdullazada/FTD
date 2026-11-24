import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  fileName: 'test.pdf',
  pages: [
    { pageNumber: 1, text: 'Clinical document', wordCount: 2, chunkCount: 1 },
  ],
  showExtractedInspector: false,
  onShowExtractedInspectorChange: fn,
  selectedInspectPage: 1,
  onSelectedInspectPageChange: fn,
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
  cleanup();
  render(
    <GuideUploadDialog {...props} isAdmin pages={[]} pdfPreviewUrl={null} />,
  );
  expect(screen.queryByText(/Or select an institutional guideline/)).toBeNull();
  expect(
    screen.queryByRole('button', { name: /Managing Aggressive Behavior/ }),
  ).toBeNull();
  expect(document.querySelector('input[type="file"]')).toBeTruthy();
});

test('direct text entry accepts pasted content and enables publication without a PDF', () => {
  const onTextChange = vi.fn();
  render(
    <GuideUploadDialog
      {...props}
      textMode
      textContent="Offer choices and allow extra time."
      onTextChange={onTextChange}
      pdfPreviewUrl={null}
      pages={[]}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Write a guide' })).toBeTruthy();
  expect(screen.queryByText('PDF or text document')).toBeNull();
  fireEvent.change(screen.getByLabelText('Guide text'), {
    target: { value: 'A revised text guide.' },
  });
  expect(onTextChange).toHaveBeenCalledWith('A revised text guide.');
  expect(
    (screen.getByRole('button', { name: 'Approve' }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});

test('guide editing uses the same optional Topic dropdown for moderators and admins', () => {
  for (const isAdmin of [false, true]) {
    const change = vi.fn();
    render(
      <GuideUploadDialog
        {...props}
        isAdmin={isAdmin}
        metadata={{
          category: 'INCONTINENCE',
          description: '',
          publisher: '',
          year: '',
        }}
        onMetadataChange={change}
      />,
    );
    const select = screen.getByRole('combobox', {
      name: 'Topic',
    }) as HTMLSelectElement;
    expect(select.value).toBe('DAILY_CARE');
    expect(
      screen.queryByRole('textbox', { name: /category|topic tag/i }),
    ).toBeNull();
    fireEvent.change(select, { target: { value: 'GRIEF_LOSS' } });
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'GRIEF_LOSS' }),
    );
    cleanup();
  }
});
