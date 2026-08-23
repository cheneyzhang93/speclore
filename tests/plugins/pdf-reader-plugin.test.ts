/**
 * PdfReader plugin integration tests.
 *
 * Writes minimal valid PDF files to temp directory using pdfkit
 * and tests the plugin's read method with real pdfjs-dist — zero mocks.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import { PdfReader } from '../../src/plugins/builtin/pdf-reader.js';

const TEST_DIR = join(process.cwd(), '.test-pdf-plugin-tmp');

/** Generate a real PDF file at the given path using PDFKit. */
function createPdfFile(filePath: string, text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => {
      writeFileSync(filePath, Buffer.concat(chunks));
      resolve();
    });
    doc.on('error', reject);
    doc.text(text, 72, 700);
    doc.end();
  });
}

describe('PdfReader plugin', () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('canRead', () => {
    it('should return true for .pdf files', () => {
      const reader = new PdfReader();
      expect(reader.canRead('document.pdf')).toBe(true);
      expect(reader.canRead('path/to/file.PDF')).toBe(true);
    });

    it('should return false for non-pdf files', () => {
      const reader = new PdfReader();
      expect(reader.canRead('file.docx')).toBe(false);
      expect(reader.canRead('file.txt')).toBe(false);
      expect(reader.canRead('file.md')).toBe(false);
    });
  });

  describe('metadata', () => {
    it('should report .pdf format', () => {
      const reader = new PdfReader();
      expect(reader.supportedFormats).toEqual(['.pdf']);
      expect(reader.name).toBe('pdf-reader');
    });
  });

  describe('read — real PDF file', () => {
    it('should extract text from a real PDF file', async () => {
      mkdirSync(TEST_DIR, { recursive: true });
      const filePath = join(TEST_DIR, 'requirements.pdf');
      await createPdfFile(filePath, 'Patient Registration Form');

      const reader = new PdfReader();
      const results = await reader.read(filePath);

      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('Patient Registration Form');
      expect(results[0].rawContent).toContain('Patient Registration Form');
      expect(results[0].confidence).toBe(0.75);
    });

    it('should derive ID from file path', async () => {
      mkdirSync(TEST_DIR, { recursive: true });
      const filePath = join(TEST_DIR, 'my-feature.pdf');
      await createPdfFile(filePath, 'Content');

      const reader = new PdfReader();
      const results = await reader.read(filePath);

      expect(results[0].id).toContain('my-feature');
    });
  });

  describe('read — error handling', () => {
    it('should throw on non-existent file', async () => {
      const reader = new PdfReader();
      await expect(reader.read('/nonexistent/file.pdf')).rejects.toThrow();
    });

    it('should throw on invalid PDF content', async () => {
      mkdirSync(TEST_DIR, { recursive: true });
      const filePath = join(TEST_DIR, 'invalid.pdf');
      writeFileSync(filePath, 'this is not a PDF file');

      const reader = new PdfReader();
      await expect(reader.read(filePath)).rejects.toThrow();
    });
  });
});
