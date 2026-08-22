/**
 * XLSX reader unit tests.
 *
 * Tests XLSX table extraction, ID derivation, and error handling.
 * Uses vi.mock to mock the exceljs module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock exceljs module
const mockEachRow = vi.fn();
const mockWorksheet = {
  name: 'Requirements',
  eachRow: mockEachRow,
};

const mockReadFile = vi.fn().mockResolvedValue(undefined);
const mockWorkbook = {
  xlsx: { readFile: mockReadFile },
  worksheets: [mockWorksheet],
};

vi.mock('exceljs', () => ({
  default: {
    Workbook: vi.fn(() => mockWorkbook),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockReadFile.mockResolvedValue(undefined);
  mockWorksheet.name = 'Requirements';
  mockWorksheet.eachRow = mockEachRow;
  mockWorkbook.worksheets = [mockWorksheet];
});

describe('readXlsxFile — table extraction', () => {
  it('should extract rows from the first sheet', async () => {
    mockEachRow.mockImplementation((callback: Function) => {
      callback({ eachCell: (cb: Function) => { cb({ value: 'ID' }, 1); cb({ value: 'Description' }, 2); cb({ value: 'Priority' }, 3); } }, 1);
      callback({ eachCell: (cb: Function) => { cb({ value: 'REQ-1' }, 1); cb({ value: 'User login' }, 2); cb({ value: 'High' }, 3); } }, 2);
      callback({ eachCell: (cb: Function) => { cb({ value: 'REQ-2' }, 1); cb({ value: 'User registration' }, 2); cb({ value: 'Medium' }, 3); } }, 3);
    });

    const { readXlsxFile } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    const result = await readXlsxFile('/specs/requirements.xlsx');

    expect(result.title).toBe('Requirements');
    expect(result.description).toContain('REQ-1');
    expect(result.description).toContain('User login');
    expect(result.description).toContain('REQ-2');
    expect(result.confidence).toBe(0.85);
  });

  it('should format each row as key-value pairs', async () => {
    mockEachRow.mockImplementation((callback: Function) => {
      callback({ eachCell: (cb: Function) => { cb({ value: 'Name' }, 1); cb({ value: 'Role' }, 2); } }, 1);
      callback({ eachCell: (cb: Function) => { cb({ value: 'Login' }, 1); cb({ value: 'Admin' }, 2); } }, 2);
    });

    const { readXlsxFile } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    const result = await readXlsxFile('/test.xlsx');

    expect(result.description).toContain('Name: Login');
    expect(result.description).toContain('Role: Admin');
    expect(result.description).toContain(' | ');
  });
});

describe('readXlsxFile — ID derivation', () => {
  it('should derive ID from filename', async () => {
    mockEachRow.mockImplementation(() => {});

    const { readXlsxFile } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    const result = await readXlsxFile('/docs/Patient Records.xlsx');

    expect(result.id).toBe('patient-records');
  });
});

describe('readXlsxFile — error handling', () => {
  it('should throw when workbook has no sheets', async () => {
    mockWorkbook.worksheets = [];

    const { readXlsxFile } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    await expect(readXlsxFile('/empty.xlsx')).rejects.toThrow('No sheets found');
  });
});
