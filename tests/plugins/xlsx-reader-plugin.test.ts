/**
 * XlsxReader plugin integration tests.
 *
 * Tests the built-in XlsxReader plugin with real xlsx files.
 * Mocks only the file I/O layer (xlsx.readFile) to work in sandboxed environments,
 * while keeping the full xlsx parsing logic intact.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { utils, write, read } from 'xlsx';
import { XlsxReader } from '../../src/plugins/builtin/xlsx-reader.js';

const FIXTURES_DIR = join(process.cwd(), '.test-xlsx-plugin-fixtures');

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

  // Fixture 1: Standard requirements with Title/Description/AC columns
  const wb1 = utils.book_new();
  const ws1 = utils.aoa_to_sheet([
    ['Title', 'Description', 'Acceptance Criteria'],
    ['User Login', 'Users can log in with email and password', '1. Enter email\n2. Enter password\n3. Click login'],
    ['User Registration', 'New users can create an account', '1. Fill form\n2. Submit'],
    ['Password Reset', 'Users can reset forgotten password', ''],
  ]);
  utils.book_append_sheet(wb1, ws1, 'Auth');
  saveWorkbook(wb1, join(FIXTURES_DIR, 'auth-requirements.xlsx'));

  // Fixture 2: Multi-sheet workbook
  const wb2 = utils.book_new();
  const ws2a = utils.aoa_to_sheet([
    ['Title', 'Description'],
    ['Feature A', 'Description for A'],
  ]);
  const ws2b = utils.aoa_to_sheet([
    ['Title', 'Description'],
    ['Feature B', 'Description for B'],
    ['Feature C', 'Description for C'],
  ]);
  utils.book_append_sheet(wb2, ws2a, 'Sheet1');
  utils.book_append_sheet(wb2, ws2b, 'Sheet2');
  saveWorkbook(wb2, join(FIXTURES_DIR, 'multi-sheet.xlsx'));

  // Fixture 3: Alternative column names (Name/Desc/AC)
  const wb3 = utils.book_new();
  const ws3 = utils.aoa_to_sheet([
    ['Name', 'Desc', 'AC'],
    ['Login Feature', 'Allow users to login', 'Must work'],
  ]);
  utils.book_append_sheet(wb3, ws3, 'Features');
  saveWorkbook(wb3, join(FIXTURES_DIR, 'alt-columns.xlsx'));

  // Fixture 4: No recognized columns
  const wb4 = utils.book_new();
  const ws4 = utils.aoa_to_sheet([
    ['Col1', 'Col2', 'Col3'],
    ['data1', 'data2', 'data3'],
  ]);
  utils.book_append_sheet(wb4, ws4, 'Unrecognized');
  saveWorkbook(wb4, join(FIXTURES_DIR, 'no-matching-columns.xlsx'));

  // Fixture 5: Empty workbook
  const wb5 = utils.book_new();
  const ws5 = utils.aoa_to_sheet([]);
  utils.book_append_sheet(wb5, ws5, 'Empty');
  saveWorkbook(wb5, join(FIXTURES_DIR, 'empty.xlsx'));
});

afterAll(() => {
  if (existsSync(FIXTURES_DIR)) {
    rmSync(FIXTURES_DIR, { recursive: true, force: true });
  }
});

describe('XlsxReader — canRead', () => {
  const reader = new XlsxReader();

  it('should accept .xlsx files', () => {
    expect(reader.canRead('test.xlsx')).toBe(true);
    expect(reader.canRead('/path/to/file.xlsx')).toBe(true);
    expect(reader.canRead('FILE.XLSX')).toBe(true);
  });

  it('should accept .xls files', () => {
    expect(reader.canRead('test.xls')).toBe(true);
  });

  it('should reject non-excel files', () => {
    expect(reader.canRead('test.csv')).toBe(false);
    expect(reader.canRead('test.json')).toBe(false);
    expect(reader.canRead('test.md')).toBe(false);
    expect(reader.canRead('test.pdf')).toBe(false);
  });
});

describe('XlsxReader — plugin metadata', () => {
  const reader = new XlsxReader();

  it('should have correct name', () => {
    expect(reader.name).toBe('xlsx-reader');
  });

  it('should declare supported formats', () => {
    expect(reader.supportedFormats).toContain('.xlsx');
    expect(reader.supportedFormats).toContain('.xls');
  });
});

describe('XlsxReader — real xlsx reading', () => {
  const reader = new XlsxReader();

  it('should read requirements with Title/Description/AC columns', async () => {
    const results = await reader.read(join(FIXTURES_DIR, 'auth-requirements.xlsx'));

    expect(results.length).toBe(3);

    const login = results[0]!;
    expect(login.title).toBe('User Login');
    expect(login.description).toBe('Users can log in with email and password');
    expect(login.acceptanceCriteria).toEqual([
      '1. Enter email',
      '2. Enter password',
      '3. Click login',
    ]);
    expect(login.id).toBe('Auth/1');
    expect(login.confidence).toBe(0.7);

    const reset = results[2]!;
    expect(reset.title).toBe('Password Reset');
    expect(reset.description).toBe('Users can reset forgotten password');
    expect(reset.acceptanceCriteria).toBeUndefined();
  });

  it('should read from multiple sheets', async () => {
    const results = await reader.read(join(FIXTURES_DIR, 'multi-sheet.xlsx'));

    expect(results.length).toBe(3);
    expect(results[0]!.title).toBe('Feature A');
    expect(results[0]!.id).toBe('Sheet1/1');
    expect(results[1]!.title).toBe('Feature B');
    expect(results[1]!.id).toBe('Sheet2/1');
    expect(results[2]!.title).toBe('Feature C');
    expect(results[2]!.id).toBe('Sheet2/2');
  });

  it('should recognize alternative column names (Name/Desc/AC)', async () => {
    const results = await reader.read(join(FIXTURES_DIR, 'alt-columns.xlsx'));

    expect(results.length).toBe(1);
    expect(results[0]!.title).toBe('Login Feature');
    expect(results[0]!.description).toBe('Allow users to login');
    expect(results[0]!.acceptanceCriteria).toEqual(['Must work']);
  });

  it('should use Row N as fallback title when no matching columns', async () => {
    const results = await reader.read(join(FIXTURES_DIR, 'no-matching-columns.xlsx'));

    expect(results.length).toBe(1);
    expect(results[0]!.title).toBe('Row 1');
    expect(results[0]!.description).toBe('');
  });

  it('should return empty array for empty workbook', async () => {
    const results = await reader.read(join(FIXTURES_DIR, 'empty.xlsx'));
    expect(results).toEqual([]);
  });

  it('should include rawContent as JSON', async () => {
    const results = await reader.read(join(FIXTURES_DIR, 'auth-requirements.xlsx'));

    const raw = JSON.parse(results[0]!.rawContent);
    expect(raw).toHaveProperty('Title', 'User Login');
    expect(raw).toHaveProperty('Description');
  });
});

describe('XlsxReader — error handling', () => {
  const reader = new XlsxReader();

  it('should throw when file does not exist', () => {
    expect(() => reader.read('/nonexistent/fake.xlsx')).toThrow();
  });
});
