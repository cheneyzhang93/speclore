/**
 * XlsxReader plugin integration tests.
 *
 * Tests the built-in XlsxReader plugin with real xlsx Buffers.
 * Uses parseXlsxBuffer directly — zero mocks, zero file I/O.
 */

import { describe, it, expect } from 'vitest';
import { utils, write } from 'xlsx';
import { XlsxReader, parseXlsxBuffer } from '../../src/plugins/builtin/xlsx-reader.js';

/** Generate a real xlsx Buffer from an array-of-arrays with named sheets. */
function createXlsxBuffer(sheets: Array<{ name: string; aoa: unknown[] }>): Buffer {
  const wb = utils.book_new();
  for (const { name, aoa } of sheets) {
    const ws = utils.aoa_to_sheet(aoa);
    utils.book_append_sheet(wb, ws, name);
  }
  return write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

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

describe('parseXlsxBuffer — real xlsx parsing', () => {
  it('should read requirements with Title/Description/AC columns', () => {
    const buffer = createXlsxBuffer([{
      name: 'Auth',
      aoa: [
        ['Title', 'Description', 'Acceptance Criteria'],
        ['User Login', 'Users can log in with email and password', '1. Enter email\n2. Enter password\n3. Click login'],
        ['User Registration', 'New users can create an account', '1. Fill form\n2. Submit'],
        ['Password Reset', 'Users can reset forgotten password', ''],
      ],
    }]);

    const results = parseXlsxBuffer(buffer);

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

  it('should read from multiple sheets', () => {
    const buffer = createXlsxBuffer([
      {
        name: 'Sheet1',
        aoa: [
          ['Title', 'Description'],
          ['Feature A', 'Description for A'],
        ],
      },
      {
        name: 'Sheet2',
        aoa: [
          ['Title', 'Description'],
          ['Feature B', 'Description for B'],
          ['Feature C', 'Description for C'],
        ],
      },
    ]);

    const results = parseXlsxBuffer(buffer);

    expect(results.length).toBe(3);
    expect(results[0]!.title).toBe('Feature A');
    expect(results[0]!.id).toBe('Sheet1/1');
    expect(results[1]!.title).toBe('Feature B');
    expect(results[1]!.id).toBe('Sheet2/1');
    expect(results[2]!.title).toBe('Feature C');
    expect(results[2]!.id).toBe('Sheet2/2');
  });

  it('should recognize alternative column names (Name/Desc/AC)', () => {
    const buffer = createXlsxBuffer([{
      name: 'Features',
      aoa: [
        ['Name', 'Desc', 'AC'],
        ['Login Feature', 'Allow users to login', 'Must work'],
      ],
    }]);

    const results = parseXlsxBuffer(buffer);

    expect(results.length).toBe(1);
    expect(results[0]!.title).toBe('Login Feature');
    expect(results[0]!.description).toBe('Allow users to login');
    expect(results[0]!.acceptanceCriteria).toEqual(['Must work']);
  });

  it('should use Row N as fallback title when no matching columns', () => {
    const buffer = createXlsxBuffer([{
      name: 'Unrecognized',
      aoa: [
        ['Col1', 'Col2', 'Col3'],
        ['data1', 'data2', 'data3'],
      ],
    }]);

    const results = parseXlsxBuffer(buffer);

    expect(results.length).toBe(1);
    expect(results[0]!.title).toBe('Row 1');
    expect(results[0]!.description).toBe('');
  });

  it('should return empty array for empty workbook', () => {
    const buffer = createXlsxBuffer([{ name: 'Empty', aoa: [] }]);

    const results = parseXlsxBuffer(buffer);
    expect(results).toEqual([]);
  });

  it('should include rawContent as JSON', () => {
    const buffer = createXlsxBuffer([{
      name: 'Auth',
      aoa: [
        ['Title', 'Description', 'Acceptance Criteria'],
        ['User Login', 'Users can log in with email and password', '1. Enter email\n2. Enter password\n3. Click login'],
      ],
    }]);

    const results = parseXlsxBuffer(buffer);

    const raw = JSON.parse(results[0]!.rawContent);
    expect(raw).toHaveProperty('Title', 'User Login');
    expect(raw).toHaveProperty('Description');
  });

  it('should handle Chinese content values with English column headers', () => {
    const buffer = createXlsxBuffer([{
      name: '需求列表',
      aoa: [
        ['Title', 'Description', 'Acceptance Criteria'],
        ['用户登录', '用户可以通过邮箱和密码登录', '输入邮箱\n输入密码\n点击登录'],
        ['数据导出', '用户可以导出数据为Excel文件', ''],
      ],
    }]);

    const results = parseXlsxBuffer(buffer);

    expect(results.length).toBe(2);
    expect(results[0]!.title).toBe('用户登录');
    expect(results[0]!.description).toBe('用户可以通过邮箱和密码登录');
    expect(results[0]!.acceptanceCriteria).toEqual(['输入邮箱', '输入密码', '点击登录']);
    expect(results[0]!.id).toBe('需求列表/1');
  });
});

describe('parseXlsxBuffer — edge cases', () => {
  it('should return empty array for garbage buffer (SheetJS is lenient)', () => {
    const fakeBuffer = Buffer.from('this is not an xlsx file');

    // SheetJS xlsx.read() is lenient — it returns an empty workbook, not an error
    const results = parseXlsxBuffer(fakeBuffer);
    expect(results).toEqual([]);
  });
});
