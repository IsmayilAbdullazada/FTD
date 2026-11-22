import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { query } from '../../config/db.js';
import { asyncHandler, HttpError } from '../../lib/http.js';
import { logger } from '../../lib/logger.js';
import { uploadsDirectory } from '../../services/uploads.js';

export const MAX_PDF_BYTES = 12 * 1024 * 1024;
const receiveFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PDF_BYTES,
    files: 1,
    fields: 0,
    parts: 2,
    fieldNameSize: 32,
    headerPairs: 64,
  },
  fileFilter(_req, file, callback) {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf')
      return callback(new HttpError(400, 'Only PDF files are accepted'));
    callback(null, true);
  },
}).single('file');

// Authentication, CSRF and staff authorization run before this parser.
export const parsePdfUpload: RequestHandler = (req, res, next) => {
  if (!req.is('multipart/form-data'))
    return next(
      new HttpError(
        415,
        'PDF uploads require multipart/form-data. Refresh the page and try again.',
      ),
    );
  receiveFile(req, res, (error) => {
    if (
      error instanceof Error &&
      !(error instanceof multer.MulterError) &&
      /boundary not found|unexpected end of (?:form|file)|malformed part header/i.test(
        error.message,
      )
    )
      return next(new HttpError(400, 'Malformed multipart PDF upload'));
    next(error);
  });
};

export const extractPdf = asyncHandler(async (req, res) => {
  if (!req.file)
    throw new HttpError(400, 'Select one PDF file in the file field');
  const { buffer } = req.file;
  const safe = path
    .basename(req.file.originalname)
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-')
    throw new HttpError(400, 'Uploaded file is not a valid PDF');
  const pages = await extractPdfPages(buffer);
  await fs.mkdir(uploadsDirectory, { recursive: true });
  const stored = `guide_${randomUUID()}.pdf`;
  const destination = path.join(uploadsDirectory, stored);
  await fs.writeFile(destination, buffer, { flag: 'wx', mode: 0o600 });
  try {
    await query(
      'INSERT INTO guide_uploads(storage_name,uploaded_by) VALUES($1,$2)',
      [stored, req.user!.id],
    );
  } catch (error) {
    await fs
      .unlink(destination)
      .catch((cleanupError) =>
        logger.error('Failed to remove unregistered PDF upload', cleanupError),
      );
    throw error;
  }
  res.json({
    text: pages.map((page) => page.text).join('\n\n'),
    pages,
    totalChunks: pages.reduce((total, page) => total + page.chunkCount, 0),
    wordCount: pages.reduce((total, page) => total + page.wordCount, 0),
    pageCount: pages.length,
    fileName: safe,
    pdfUrl: `/uploads/guides/${stored}`,
    title: '',
  });
});

export async function extractPdfPages(buffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  let parsed: Awaited<ReturnType<PDFParse['getText']>>;
  try {
    parsed = await parser.getText();
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException')
      throw new HttpError(
        400,
        'Password-protected PDFs are not supported. Upload an unlocked copy.',
      );
    if (
      error instanceof Error &&
      ['InvalidPDFException', 'FormatError'].includes(error.name)
    )
      throw new HttpError(
        400,
        'The PDF could not be read. Upload a valid PDF.',
      );
    throw error;
  } finally {
    await parser.destroy();
  }
  return (parsed.pages ?? []).map((page, index) => {
    const text = (page.text ?? '').replace(/\s+/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    return {
      pageNumber: index + 1,
      text,
      wordCount: words,
      chunkCount: words ? Math.ceil(words / 340) : 0,
    };
  });
}

export async function readUploadedPdf(pdfUrl: string, userId: string) {
  const match = /^\/uploads\/guides\/(guide_[a-zA-Z0-9_.-]+\.pdf)$/.exec(
    pdfUrl,
  );
  if (!match)
    throw new HttpError(400, 'Select a PDF uploaded through this application');
  const registered = await query(
    'SELECT 1 FROM guide_uploads WHERE storage_name=$1 AND uploaded_by=$2',
    [match[1], userId],
  );
  if (!registered.rowCount)
    throw new HttpError(403, 'This PDF is not one of your uploads');
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(path.join(uploadsDirectory, match[1]));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new HttpError(
        400,
        'This PDF upload has expired. Please upload it again.',
      );
    throw error;
  }
  const pages = await extractPdfPages(buffer);
  return { content: pages.map((page) => page.text).join('\n\n'), pages };
}
