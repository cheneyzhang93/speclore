/**
 * XLSX reader integration tests.
 *
 * Generates real .xlsx Buffers via SheetJS, then calls parseXlsxBuffer
 * with real xlsx.read — zero mocks, zero file I/O.
 */

import { describe, it, expect } from 'vitest';
import { utils, write } from 'xlsx';
import { parseXlsxBuffer } from '../../../src/core/requirement-reader/xlsx-reader.js';

/** Generate a real xlsx Buffer from an array-of-arrays. */
function createXlsxBuffer(aoa: unknown[][], sheetName = 'Sheet1'): Buffer {
  const wb = utils.book_new();
  const ws = utils.aoa_to_sheet(aoa);
  utils.book_append_sheet(wb, ws, sheetName);
  return write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('parseXlsxBuffer — real xlsx parsing', () => {
  it('should extract all rows from a standard requirements table', async () => {
    const buffer = createXlsxBuffer([
      ['ID', 'Description', 'Priority'],
      ['REQ-1', 'User login', 'High'],
      ['REQ-2', 'User registration', 'Medium'],
      ['REQ-3', 'Password reset', 'Low'],
    ], 'Requirements');

    const result = await parseXlsxBuffer(buffer, 'requirements');

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
    const buffer = createXlsxBuffer([
      ['ID', 'Description', 'Priority'],
      ['REQ-1', 'User login', 'High'],
      ['REQ-2', 'User registration', 'Medium'],
      ['REQ-3', 'Password reset', 'Low'],
    ], 'Requirements');

    const result = await parseXlsxBuffer(buffer, 'requirements');

    const lines = result.description.split('\n');
    expect(lines.length).toBe(3);
    for (const line of lines) {
      expect(line).toContain(' | ');
    }
  });

  it('should handle mixed cell types (numbers, booleans, empty)', async () => {
    const buffer = createXlsxBuffer([
      ['Name', 'Count', 'Active', 'Notes'],
      ['Feature A', 42, true, 'Stable'],
      ['Feature B', 0, false, ''],
      ['Feature C', null, null, 'No data'],
    ], 'Data');

    const result = await parseXlsxBuffer(buffer, 'data');

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
    const buffer = createXlsxBuffer([], 'Empty');

    const result = await parseXlsxBuffer(buffer, 'empty');

    expect(result.title).toBe('Empty');
    expect(result.description).toBe('');
    expect(result.rawContent).toBe('');
  });

  it('should handle Chinese content correctly', async () => {
    const buffer = createXlsxBuffer([
      ['编号', '需求描述', '优先级'],
      ['REQ-001', '用户登录功能', '高'],
      ['REQ-002', '数据导出功能', '中'],
    ], '需求列表');

    const result = await parseXlsxBuffer(buffer, '中文需求');

    expect(result.title).toBe('需求列表');
    expect(result.id).toBe('中文需求');
    expect(result.description).toContain('编号: REQ-001');
    expect(result.description).toContain('需求描述: 用户登录功能');
    expect(result.description).toContain('优先级: 高');
  });

  it('should derive ID from idHint, lowercased and sanitized', async () => {
    const buffer = createXlsxBuffer([['Content']]);

    const result = await parseXlsxBuffer(buffer, 'Patient Intake Form');

    expect(result.id).toBe('patient-intake-form');
  });

  it('should handle CJK characters in idHint', async () => {
    const buffer = createXlsxBuffer([['内容']]);

    const result = await parseXlsxBuffer(buffer, '患者信息');

    expect(result.id).toBe('患者信息');
  });

  it('should use default idHint "document" when not provided', async () => {
    const buffer = createXlsxBuffer([['Some text']]);

    const result = await parseXlsxBuffer(buffer);

    expect(result.id).toBe('document');
  });

  it('should handle headers-only sheet (no data rows)', async () => {
    const buffer = createXlsxBuffer([
      ['Title', 'Description'],
    ], 'HeadersOnly');

    const result = await parseXlsxBuffer(buffer, 'headers-only');

    expect(result.title).toBe('HeadersOnly');
    expect(result.description).toBe('');
  });

  it('should handle sparse rows with different column counts', async () => {
    const buffer = createXlsxBuffer([
      ['A', 'B', 'C', 'D'],
      ['val1', 'val2'],
      ['x'],
      ['p', 'q', 'r', 's'],
    ], 'Sparse');

    const result = await parseXlsxBuffer(buffer, 'sparse');

    expect(result.title).toBe('Sparse');
    expect(result.description).toContain('A: val1');
    expect(result.description).toContain('B: val2');
    expect(result.description).toContain('A: p');
    expect(result.description).toContain('D: s');
  });
});

describe('parseXlsxBuffer — edge cases', () => {
  it('should return empty content for garbage buffer (SheetJS is lenient)', async () => {
    const fakeBuffer = Buffer.from('this is not an xlsx file');

    // SheetJS xlsx.read() is lenient — it returns an empty workbook, not an error
    const result = await parseXlsxBuffer(fakeBuffer, 'bad');
    expect(result.id).toBe('bad');
    expect(result.description).toBe('');
  });
});
