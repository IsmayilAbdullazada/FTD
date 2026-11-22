import { afterEach, expect, test, vi } from 'vitest';
import { guideApi } from './guideApi';
afterEach(() => vi.unstubAllGlobals());
test('PDF upload sends a raw file part with browser-managed boundaries and session credentials', async () => {
  const fetchMock = vi.fn(async () =>
    Response.json({
      text: 'QA document',
      pages: [],
      wordCount: 2,
      pageCount: 1,
      totalChunks: 1,
      fileName: 'guide.pdf',
      title: '',
      pdfUrl: '/uploads/guides/guide_qa.pdf',
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const file = new File(['%PDF-test file bytes'], 'guide.pdf', {
    type: 'application/pdf',
  });
  await guideApi.extractPdfText(file);
  const [url, options] = fetchMock.mock.calls[0] as unknown as [
    string,
    RequestInit,
  ];
  expect(url).toBe('/api/v1/chatbot/extract-pdf');
  expect(options.method).toBe('POST');
  expect(options.credentials).toBe('include');
  expect(new Headers(options.headers).has('content-type')).toBe(false);
  expect(options.body).toBeInstanceOf(FormData);
  const part = (options.body as FormData).get('file') as File;
  expect(part.name).toBe('guide.pdf');
  expect(part.size).toBe(file.size);
  expect(part.type).toBe('application/pdf');
});
test('oversized PDFs are rejected before reading or sending the file', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const file = new File([new Uint8Array(12 * 1024 * 1024 + 1)], 'large.pdf', {
    type: 'application/pdf',
  });
  await expect(guideApi.extractPdfText(file)).rejects.toThrow(
    'PDF exceeds 12 MB limit',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});
