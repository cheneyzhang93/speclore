/**
 * DOCX reader unit tests.
 *
 * Tests DOCX text extraction, ID derivation, and error handling.
 * Uses vi.mock to mock mammoth.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mammoth module
const mockExtractRawText = vi.fn();

vi.mock('mammoth', () => ({
  default: { extractRawText: mockExtractRawText },
  extractRawText: mockExtractRawText,
}));

beforeEach(() => {
  mockExtractRawText.mockReset();
});

describe('readDocxFile — text extraction', () => {
  it('should extract text from a DOCX file', async () => {
    mockExtractRawText.mockResolvedValue({
      value: 'Patient Care Requirements\n1. Initial assessment\n2. Treatment plan',
    });

    const { readDocxFile } = await import('../../../src/core/requirement-reader/docx-reader.js');
    const result = await readDocxFile('/docs/care-plan.docx');

    expect(result.description).toContain('Patient Care Requirements');
    expect(result.description).toContain('Initial assessment');
    expect(result.rawContent).toContain('Patient Care Requirements');
    expect(result.confidence).toBe(0.9);
  });

  it('should use first non-empty line as title', async () => {
    mockExtractRawText.mockResolvedValue({
      value: '\n\nRegistration Flow\nStep 1: Enter details',
    });

    const { readDocxFile } = await import('../../../src/core/requirement-reader/docx-reader.js');
    const result = await readDocxFile('/specs/flow.docx');

    expect(result.title).toBe('Registration Flow');
  });

  it('should fallback to ID when content is empty', async () => {
    mockExtractRawText.mockResolvedValue({ value: '' });

    const { readDocxFile } = await import('../../../src/core/requirement-reader/docx-reader.js');
    const result = await readDocxFile('/docs/my-feature.docx');

    expect(result.title).toBe('my-feature');
  });
});

describe('readDocxFile — ID derivation', () => {
  it('should derive ID from filename, lowercased and sanitized', async () => {
    mockExtractRawText.mockResolvedValue({ value: 'Content' });

    const { readDocxFile } = await import('../../../src/core/requirement-reader/docx-reader.js');
    const result = await readDocxFile('/docs/Patient Intake Form.docx');

    expect(result.id).toBe('patient-intake-form');
  });

  it('should handle CJK characters in filename', async () => {
    mockExtractRawText.mockResolvedValue({ value: '内容' });

    const { readDocxFile } = await import('../../../src/core/requirement-reader/docx-reader.js');
    const result = await readDocxFile('/docs/患者信息.docx');

    expect(result.id).toBe('患者信息');
  });
});

describe('readDocxFile — error handling', () => {
  it('should propagate errors from mammoth', async () => {
    mockExtractRawText.mockRejectedValue(new Error('File not found'));

    const { readDocxFile } = await import('../../../src/core/requirement-reader/docx-reader.js');
    await expect(readDocxFile('/nonexistent.docx')).rejects.toThrow('File not found');
  });
});
