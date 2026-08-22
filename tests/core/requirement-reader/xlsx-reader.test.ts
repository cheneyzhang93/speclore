/**
 * XLSX reader integration tests.
 *
 * Uses real xlsx files generated via SheetJS to test end-to-end reading.
 * Mocks only the file I/O layer (xlsx.readFile) to work in sandboxed environments,
 * while keeping the full xlsx parsing logic intact.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { utils, write, read } from 'xlsx';
import { readXlsxFile } from '../../../src/core/requirement-reader/xlsx-reader.js';

const FIXTURES_DIR = join(process.cwd(), '.test-xlsx-fixtures');

/** Write a workbook to disk using Node.js fs. */
function saveWorkbook(wb: ReturnType<typeof utils.book_new>, filePath: string): void {
  const buf = write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  writeFileSync(filePath, buf);
}

// Mock xlsx.readFile to use Node.js readFileSync + xlsx.read (sandbox-compatible)
vi.mock('xlsx', async (importOriginal) => {
  const actual = await importOriginal<typeof import('xlsx')>();
  return {
    ...actual,
    readFile: vi.fn((filePath: string) => {
      const buf = readFileSync(filePath);
      return actual.read(buf);
    }),
  };
});

beforeAll(() => {
  mkdirSync(FIXTURES_DIR, { recursive: true });

  // Fixture 1: Standard requirements table
  const wb1 = utils.book_new();
  const ws1 = utils.aoa_to_sheet([
    ['ID', 'Description', 'Priority'],
    ['REQ-1', 'User login', 'High'],
    ['REQ-2', 'User registration', 'Medium'],
    ['REQ-3', 'Password reset', 'Low'],
  ]);
  utils.book_append_sheet(wb1, ws1, 'Requirements');
  saveWorkbook(wb1, join(FIXTURES_DIR, 'requirements.xlsx'));

  // Fixture 2: Multi-type cells (numbers, booleans, empty)
  const wb2 = utils.book_new();
  const ws2 = utils.aoa_to_sheet([
    ['Name', 'Count', 'Active', 'Notes'],
    ['Feature A', 42, true, 'Stable'],
    ['Feature B', 0, false, ''],
    ['Feature C', null, null, 'No data'],
  ]);
  utils.book_append_sheet(wb2, ws2, 'Data');
  saveWorkbook(wb2, join(FIXTURES_DIR, 'mixed-types.xlsx'));

  // Fixture 3: Empty sheet
  const wb3 = utils.book_new();
  const ws3 = utils.aoa_to_sheet([]);
  utils.book_append_sheet(wb3, ws3, 'Empty');
  saveWorkbook(wb3, join(FIXTURES_DIR, 'empty-sheet.xlsx'));

  // Fixture 4: Chinese content
  const wb4 = utils.book_new();
  const ws4 = utils.aoa_to_sheet([
    ['编号', '需求描述', '优先级'],
    ['REQ-001', '用户登录功能', '高'],
    ['REQ-002', '数据导出功能', '中'],
  ]);
  utils.book_append_sheet(wb4, ws4, '需求列表');
  saveWorkbook(wb4, join(FIXTURES_DIR, '中文需求.xlsx'));

  // Fixture 5: Headers only, no data rows
  const wb5 = utils.book_new();
  const ws5 = utils.aoa_to_sheet([
    ['Title', 'Description'],
  ]);
  utils.book_append_sheet(wb5, ws5, 'HeadersOnly');
  saveWorkbook(wb5, join(FIXTURES_DIR, 'headers-only.xlsx'));

  // Fixture 6: Sparse rows (different column counts)
  const wb6 = utils.book_new();
  const ws6 = utils.aoa_to_sheet([
    ['A', 'B', 'C', 'D'],
    ['val1', 'val2'],
    ['x'],
    ['p', 'q', 'r', 's'],
  ]);
  utils.book_append_sheet(wb6, ws6, 'Sparse');
  saveWorkbook(wb6, join(FIXTURES_DIR, 'sparse.xlsx'));
});

afterAll(() => {
  if (existsSync(FIXTURES_DIR)) {
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
  }
});

describe('readXlsxFile — real xlsx reading', () => {
  it('should extract all rows from a standard requirements table', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, 'requirements.xlsx'));

    expect(result.title).toBe('Requirements');
    expect(result.id).toBe('requirements');
    expect(result.confidence).toBe(0.85);
    expect(result.description).toContain('ID: REQ-1');
    expect(result.description).toContain('Description: User login');
    expect(result.description).toContain('Priority: High');
    expect(result.description).toContain('REQ-2');
    expect(result.description).toContain('User registration');
    expect(result.description).toContain('REQ-3');
    expect(result.description).toContain('Password reset');
  });

  it('should format key-value pairs with pipe separator', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, 'requirements.xlsx'));

    const lines = result.description.split('\n');
    expect(lines.length).toBe(3);
    for (const line of lines) {
      expect(line).toContain(' | ');
    }
  });

  it('should handle mixed cell types (numbers, booleans, empty)', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, 'mixed-types.xlsx'));

    expect(result.title).toBe('Data');
    expect(result.description).toContain('Name: Feature A');
    expect(result.description).toContain('Count: 42');
    expect(result.description).toContain('Active: true');
    expect(result.description).toContain('Notes: Stable');
    expect(result.description).toContain('Name: Feature B');
    expect(result.description).toContain('Count: 0');
    expect(result.description).toContain('Active: false');
  });

  it('should return empty content for empty sheet', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, 'empty-sheet.xlsx'));

    expect(result.title).toBe('Empty');
    expect(result.description).toBe('');
    expect(result.rawContent).toBe('');
  });

  it('should handle Chinese content correctly', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, '中文需求.xlsx'));

    expect(result.title).toBe('需求列表');
    expect(result.id).toBe('中文需求');
    expect(result.description).toContain('编号: REQ-001');
    expect(result.description).toContain('需求描述: 用户登录功能');
    expect(result.description).toContain('优先级: 高');
  });

  it('should derive ID from filename with Chinese characters', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, '中文需求.xlsx'));
    expect(result.id).toBe('中文需求');
  });

  it('should derive ID from filename with standard name', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, 'requirements.xlsx'));
    expect(result.id).toBe('requirements');
  });

  it('should handle headers-only sheet (no data rows)', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, 'headers-only.xlsx'));

    expect(result.title).toBe('HeadersOnly');
    expect(result.description).toBe('');
  });

  it('should handle sparse rows with different column counts', async () => {
    const result = await readXlsxFile(join(FIXTURES_DIR, 'sparse.xlsx'));

    expect(result.title).toBe('Sparse');
    expect(result.description).toContain('A: val1');
    expect(result.description).toContain('B: val2');
    expect(result.description).toContain('A: p');
    expect(result.description).toContain('D: s');
  });
});

describe('readXlsxFile — error handling', () => {
  it('should throw when file does not exist', async () => {
    const { readXlsxFile: readXlsx } = await import('../../../src/core/requirement-reader/xlsx-reader.js');
    expect(() => readXlsx('/nonexistent/path/fake.xlsx')).toThrow();
  });
});
