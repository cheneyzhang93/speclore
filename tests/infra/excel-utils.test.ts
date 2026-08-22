/**
 * formatCellValue unit tests.
 *
 * Tests all cell value types: primitives, Date, SheetJS cell objects, edge cases.
 */

import { describe, it, expect } from 'vitest';
import { formatCellValue } from '../../src/infra/excel-utils.js';

describe('formatCellValue', () => {
  describe('primitive types', () => {
    it('should return empty string for null', () => {
      expect(formatCellValue(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatCellValue(undefined)).toBe('');
    });

    it('should return string as-is', () => {
      expect(formatCellValue('hello')).toBe('hello');
    });

    it('should return empty string for empty string', () => {
      expect(formatCellValue('')).toBe('');
    });

    it('should convert number to string', () => {
      expect(formatCellValue(42)).toBe('42');
      expect(formatCellValue(3.14)).toBe('3.14');
      expect(formatCellValue(0)).toBe('0');
    });

    it('should convert boolean to string', () => {
      expect(formatCellValue(true)).toBe('true');
      expect(formatCellValue(false)).toBe('false');
    });
  });

  describe('Date objects', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatCellValue(date)).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('SheetJS cell objects', () => {
    it('should use formatted value (w) when available', () => {
      const cell = { v: 42, t: 'n', w: '42.00' };
      expect(formatCellValue(cell)).toBe('42.00');
    });

    it('should fall back to raw value (v) when w is null', () => {
      const cell = { v: 'hello', t: 's' };
      expect(formatCellValue(cell)).toBe('hello');
    });

    it('should convert numeric v to string', () => {
      const cell = { v: 123, t: 'n' };
      expect(formatCellValue(cell)).toBe('123');
    });

    it('should convert boolean v to string', () => {
      const cell = { v: true, t: 'b' };
      expect(formatCellValue(cell)).toBe('true');
    });

    it('should return empty string when both v and w are null', () => {
      const cell = { v: null, t: 'n' };
      expect(formatCellValue(cell)).toBe('');
    });

    it('should JSON.stringify complex v values', () => {
      const cell = { v: { nested: 'object' }, t: 'e' };
      expect(formatCellValue(cell)).toBe('{"nested":"object"}');
    });
  });

  describe('unknown types', () => {
    it('should return empty string for plain objects without v property', () => {
      expect(formatCellValue({ foo: 'bar' })).toBe('');
    });

    it('should return empty string for arrays', () => {
      expect(formatCellValue([1, 2, 3])).toBe('');
    });

    it('should return empty string for symbols', () => {
      expect(formatCellValue(Symbol('test'))).toBe('');
    });
  });
});
