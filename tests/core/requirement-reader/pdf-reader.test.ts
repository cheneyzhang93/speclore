/**
 * PDF reader unit tests.
 *
 * Tests PDF text extraction, ID derivation, and error handling.
 * Uses vi.mock to mock pdf-parse dynamic import and fs readFile.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock pdf-parse module
const mockPdfParse = vi.fn();
vi.mock('pdf-parse', () => ({
  default: mockPdfParse,
}));

// Mock node:fs/promises readFile
const mockReadFile = vi.fn();
vi.mock('node:fs/promises', () => ({
  readFile: mockReadFile,
}));

beforeEach(() => {
  mockPdfParse.mockReset();
  mockReadFile.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readPdfFile — text extraction', () => {
  it('should extract text from a PDF buffer', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('fake-pdf-content'));
    mockPdfParse.mockResolvedValue({
      text: 'Patient Registration\nName: John Doe\nEmail: john@example.com',
      numpages: 2,
    });

    const { readPdfFile } = await import('../../../src/core/requirement-reader/pdf-reader.js');
    const result = await readPdfFile('/docs/patient-form.pdf');

    expect(result.description).toContain('Patient Registration');
    expect(result.description).toContain('John Doe');
    expect(result.rawContent).toContain('Patient Registration');
    expect(result.confidence).toBe(0.8);
  });

  it('should use first line as title', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('fake'));
    mockPdfParse.mockResolvedValue({
      text: 'Registration Flow\nStep 1: Enter email\nStep 2: Verify',
      numpages: 1,
    });

    const { readPdfFile } = await import('../../../src/core/requirement-reader/pdf-reader.js');
    const result = await readPdfFile('/specs/flow.pdf');

    expect(result.title).toBe('Registration Flow');
  });
});

describe('readPdfFile — ID derivation', () => {
  it('should derive ID from filename, lowercased and sanitized', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('fake'));
    mockPdfParse.mockResolvedValue({ text: 'Content', numpages: 1 });

    const { readPdfFile } = await import('../../../src/core/requirement-reader/pdf-reader.js');
    const result = await readPdfFile('/docs/My Feature Spec.pdf');

    expect(result.id).toBe('my-feature-spec');
  });

  it('should handle CJK characters in filename', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('fake'));
    mockPdfParse.mockResolvedValue({ text: '内容', numpages: 1 });

    const { readPdfFile } = await import('../../../src/core/requirement-reader/pdf-reader.js');
    const result = await readPdfFile('/docs/患者注册.pdf');

    expect(result.id).toBe('患者注册');
  });
});

describe('readPdfFile — error handling', () => {
  it('should propagate errors from readFile', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file'));

    const { readPdfFile } = await import('../../../src/core/requirement-reader/pdf-reader.js');
    await expect(readPdfFile('/nonexistent.pdf')).rejects.toThrow('ENOENT');
  });

  it('should propagate errors from pdf-parse', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('corrupted'));
    mockPdfParse.mockRejectedValue(new Error('Invalid PDF structure'));

    const { readPdfFile } = await import('../../../src/core/requirement-reader/pdf-reader.js');
    await expect(readPdfFile('/bad.pdf')).rejects.toThrow('Invalid PDF structure');
  });
});
