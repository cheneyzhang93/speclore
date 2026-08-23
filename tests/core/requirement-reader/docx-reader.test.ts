/**
 * DOCX reader integration tests.
 *
 * Uses the `docx` package to generate real .docx buffers in memory,
 * then tests parseDocxBuffer with real mammoth parsing — zero mocks.
 */

import { describe, it, expect } from 'vitest';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
} from 'docx';
import { parseDocxBuffer } from '../../../src/core/requirement-reader/docx-reader.js';

/** Generate a real .docx Buffer from an array of text lines. */
async function createDocxBuffer(lines: string[]): Promise<Buffer> {
  const doc = new Document({
    sections: [{
      children: lines.map(text =>
        new Paragraph({ children: [new TextRun({ text })] }),
      ),
    }],
  });
  const arrayBuffer = await Packer.toBuffer(doc);
  return Buffer.from(arrayBuffer);
}

describe('parseDocxBuffer — real mammoth extraction', () => {
  it('should extract text from a real docx buffer', async () => {
    const buffer = await createDocxBuffer([
      'Patient Care Requirements',
      '1. Initial assessment',
      '2. Treatment plan',
    ]);

    const result = await parseDocxBuffer(buffer, 'care-plan');

    expect(result.description).toContain('Patient Care Requirements');
    expect(result.description).toContain('Initial assessment');
    expect(result.rawContent).toContain('Patient Care Requirements');
    expect(result.confidence).toBe(0.9);
  });

  it('should use first non-empty line as title', async () => {
    const buffer = await createDocxBuffer([
      '',
      '',
      'Registration Flow',
      'Step 1: Enter details',
    ]);

    const result = await parseDocxBuffer(buffer, 'flow');

    expect(result.title).toBe('Registration Flow');
  });

  it('should fall back to idHint when content is empty', async () => {
    const buffer = await createDocxBuffer(['']);

    const result = await parseDocxBuffer(buffer, 'my-feature');

    expect(result.title).toBe('my-feature');
  });
});

describe('parseDocxBuffer — ID derivation from idHint', () => {
  it('should derive ID from idHint, lowercased and sanitized', async () => {
    const buffer = await createDocxBuffer(['Content']);

    const result = await parseDocxBuffer(buffer, 'Patient Intake Form');

    expect(result.id).toBe('patient-intake-form');
  });

  it('should handle CJK characters in idHint', async () => {
    const buffer = await createDocxBuffer(['内容']);

    const result = await parseDocxBuffer(buffer, '患者信息');

    expect(result.id).toBe('患者信息');
  });

  it('should use default idHint "document" when not provided', async () => {
    const buffer = await createDocxBuffer(['Some text']);

    const result = await parseDocxBuffer(buffer);

    expect(result.id).toBe('document');
  });
});

describe('parseDocxBuffer — complex documents', () => {
  it('should extract text with bold and italic formatting', async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: 'System Requirements', bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'The system must ' }),
              new TextRun({ text: 'support', italics: true }),
              new TextRun({ text: ' multiple users' }),
            ],
          }),
        ],
      }],
    });
    const buffer = Buffer.from(await Packer.toBuffer(doc));

    const result = await parseDocxBuffer(buffer, 'system-req');

    expect(result.description).toContain('System Requirements');
    expect(result.description).toContain('support');
    expect(result.description).toContain('multiple users');
  });

  it('should extract text from a real table in docx', async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Feature Matrix' })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Feature')] }),
                  new TableCell({ children: [new Paragraph('Priority')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Login')] }),
                  new TableCell({ children: [new Paragraph('High')] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph('Export')] }),
                  new TableCell({ children: [new Paragraph('Medium')] }),
                ],
              }),
            ],
          }),
        ],
      }],
    });
    const buffer = Buffer.from(await Packer.toBuffer(doc));

    const result = await parseDocxBuffer(buffer, 'matrix');

    expect(result.title).toBe('Feature Matrix');
    expect(result.description).toContain('Feature');
    expect(result.description).toContain('Priority');
    expect(result.description).toContain('Login');
    expect(result.description).toContain('High');
    expect(result.description).toContain('Export');
    expect(result.description).toContain('Medium');
  });

  it('should handle a long multi-paragraph document', async () => {
    const paragraphs = [
      'User Authentication Module',
      '',
      'Overview: This module handles all user authentication.',
      '1. Users must register with a valid email address.',
      '2. Passwords must be at least 8 characters.',
      '3. Failed login attempts are limited to 5 per hour.',
      '',
      'Error Handling: All errors must be logged and reported to the user.',
    ];
    const buffer = await createDocxBuffer(paragraphs);

    const result = await parseDocxBuffer(buffer, 'auth-module');

    expect(result.title).toBe('User Authentication Module');
    expect(result.description).toContain('Overview');
    expect(result.description).toContain('register with a valid email');
    expect(result.description).toContain('8 characters');
    expect(result.description).toContain('Error Handling');
    expect(result.rawContent).toContain('Failed login attempts');
  });

  it('should handle Chinese content in docx', async () => {
    const buffer = await createDocxBuffer([
      '患者管理系统',
      '1. 患者注册功能',
      '2. 预约管理',
      '3. 病历查询',
    ]);

    const result = await parseDocxBuffer(buffer, '患者管理');

    expect(result.title).toBe('患者管理系统');
    expect(result.description).toContain('患者注册功能');
    expect(result.description).toContain('预约管理');
    expect(result.description).toContain('病历查询');
    expect(result.id).toBe('患者管理');
  });
});

describe('parseDocxBuffer — error handling', () => {
  it('should throw on invalid buffer (not a docx)', async () => {
    const fakeBuffer = Buffer.from('this is not a docx file');

    await expect(parseDocxBuffer(fakeBuffer, 'bad')).rejects.toThrow();
  });
});
