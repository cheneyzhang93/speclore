/**
 * XLSX reader unit tests.
 *
 * Tests XLSX table extraction, ID derivation, and error handling.
 * Uses vi.mock to mock the xlsx module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock xlsx module
const mockSheetToRowData = vi.fn();

vi.mock('xlsx', () => ({
  readFile: vi.fn(() => ({
    SheetNames: ['Requirements'],
    Sheets: { Requirements: {} },
  })),
  utils: {
    sheet_to_json: mockSheetToRowData,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('readXlsxFile — table extraction', () => {
  it('should extract rows from the first sheet', async () => {
    mockSheetToRowData.mockReturnValue([
      ['ID', 'Description', 'Priority'],
      ['REQ-1', 'User login', 'High'],
      ['REQ-2', 'User registration', 'Medium'],
    ]);

    const { readXlsxFile } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    const result = await readXlsxFile('/specs/requirements.xlsx');

    expect(result.title).toBe('Requirements');
    expect(result.description).toContain('REQ-1');
    expect(result.description).toContain('User login');
    expect(result.description).toContain('REQ-2');
    expect(result.confidence).toBe(0.85);
  });

  it('should format each row as key-value pairs', async () => {
    mockSheetToRowData.mockReturnValue([
      ['Name', 'Role'],
      ['Login', 'Admin'],
    ]);

    const { readXlsxFile } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    const result = await readXlsxFile('/test.xlsx');

    expect(result.description).toContain('Name: Login');
    expect(result.description).toContain('Role: Admin');
    expect(result.description).toContain(' | ');
  });
});

describe('readXlsxFile — ID derivation', () => {
  it('should derive ID from filename', async () => {
    mockSheetToRowData.mockReturnValue([]);

    const { readXlsxFile } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    const result = await readXlsxFile('/docs/Patient Records.xlsx');

    expect(result.id).toBe('patient-records');
  });
});

describe('readXlsxFile — error handling', () => {
  it('should throw when workbook has no sheets', async () => {
    const { readFile } = await import('xlsx');
    vi.mocked(readFile).mockReturnValueOnce({ SheetNames: [], Sheets: {} } as ReturnType<typeof readFile>);
    mockSheetToRowData.mockReturnValue([]);

    const { readXlsxFile } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    await expect(readXlsxFile('/empty.xlsx')).rejects.toThrow('No sheets found');
  });
});
