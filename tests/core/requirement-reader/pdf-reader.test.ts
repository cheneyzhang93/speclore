/**
 * PDF reader integration tests.
 *
 * Constructs real PDF buffers using pdfkit and tests parsePdfBuffer
 * with real pdfjs-dist — zero mocks.
 */

import { describe, it, expect } from 'vitest';
import PDFDocument from 'pdfkit';
import { parsePdfBuffer } from '../../../src/core/requirement-reader/pdf-reader.js';

/** Generate a real PDF buffer with the given text using PDFKit. */
function createPdfBuffer(text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.text(text, 72, 700);
    doc.end();
  });
}

/** Generate a real PDF with multiple text blocks at different positions. */
function createComplexPdf(
  blocks: Array<{ text: string; x: number; y: number }>,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    for (const { text, x, y } of blocks) {
      doc.text(text, x, y);
    }
    doc.end();
  });
}

/** Generate a multi-page PDF with different text on each page. */
function createMultiPagePdf(pages: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage();
      doc.text(pages[i], 72, 700);
    }
    doc.end();
  });
}

describe('parsePdfBuffer — real pdfjs-dist extraction', () => {
  it('should extract text from a real PDF buffer', async () => {
    const buffer = await createPdfBuffer('Patient Registration Form');

    const result = await parsePdfBuffer(buffer, 'patient-form');

    expect(result.description).toContain('Patient Registration Form');
    expect(result.rawContent).toContain('Patient Registration Form');
    expect(result.confidence).toBe(0.8);
  });

  it('should use extracted text first line as title', async () => {
    const buffer = await createPdfBuffer('Registration Flow');

    const result = await parsePdfBuffer(buffer, 'flow');

    expect(result.title).toContain('Registration Flow');
  });

  it('should fall back to idHint when content yields no lines', async () => {
    const buffer = await createPdfBuffer('');

    const result = await parsePdfBuffer(buffer, 'empty-doc');

    expect(result.id).toBe('empty-doc');
  });
});

describe('parsePdfBuffer — ID derivation from idHint', () => {
  it('should derive ID from idHint, lowercased and sanitized', async () => {
    const buffer = await createPdfBuffer('Content');

    const result = await parsePdfBuffer(buffer, 'My Feature Spec');

    expect(result.id).toBe('my-feature-spec');
  });

  it('should handle CJK characters in idHint', async () => {
    // PDF text uses ASCII, but the ID is derived from idHint (not PDF content)
    const buffer = await createPdfBuffer('content');

    const result = await parsePdfBuffer(buffer, '患者注册');

    expect(result.id).toBe('患者注册');
  });
});

describe('parsePdfBuffer — complex documents', () => {
  it('should extract text from multiple positions on a page', async () => {
    const buffer = await createComplexPdf([
      { text: 'System Requirements', x: 72, y: 50 },
      { text: '1. Authentication module', x: 72, y: 100 },
      { text: '2. Data export feature', x: 72, y: 150 },
      { text: '3. Audit logging', x: 72, y: 200 },
    ]);

    const result = await parsePdfBuffer(buffer, 'system-req');

    expect(result.description).toContain('System Requirements');
    expect(result.description).toContain('Authentication module');
    expect(result.description).toContain('Data export feature');
    expect(result.description).toContain('Audit logging');
  });

  it('should extract text from a multi-page PDF', async () => {
    const buffer = await createMultiPagePdf([
      'Page 1: User Registration',
      'Page 2: Password Policy',
      'Page 3: Session Management',
    ]);

    const result = await parsePdfBuffer(buffer, 'auth-spec');

    expect(result.description).toContain('User Registration');
    expect(result.description).toContain('Password Policy');
    expect(result.description).toContain('Session Management');
  });

  it('should handle a long document with many lines', async () => {
    const lines = Array.from({ length: 30 }, (_, i) =>
      `Requirement ${i + 1}: The system shall handle ${100 + i} concurrent users`,
    );
    const buffer = await createComplexPdf(
      lines.map((text, i) => ({ text, x: 72, y: 50 + i * 20 })),
    );

    const result = await parsePdfBuffer(buffer, 'load-test');

    expect(result.description).toContain('Requirement 1');
    expect(result.description).toContain('Requirement 15');
    expect(result.description).toContain('Requirement 30');
    expect(result.description).toContain('concurrent users');
  });
});

describe('parsePdfBuffer — error handling', () => {
  it('should throw on invalid buffer (not a PDF)', async () => {
    const fakeBuffer = Buffer.from('this is not a PDF file at all');

    await expect(parsePdfBuffer(fakeBuffer, 'bad')).rejects.toThrow();
  });
});
