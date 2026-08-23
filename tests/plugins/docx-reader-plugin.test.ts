/**
 * DocxReader plugin integration tests.
 *
 * Generates real .docx files using the `docx` package,
 * writes them to temp directory, and tests the plugin's read method — zero mocks.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { DocxReader } from '../../src/plugins/builtin/docx-reader.js';

const TEST_DIR = join(process.cwd(), '.test-docx-plugin-tmp');

/** Generate a real .docx file at the given path. */
async function createDocxFile(filePath: string, lines: string[]): Promise<void> {
  const doc = new Document({
    sections: [{
      children: lines.map(text =>
        new Paragraph({ children: [new TextRun({ text })] }),
      ),
    }],
  });
  const arrayBuffer = await Packer.toBuffer(doc);
  writeFileSync(filePath, Buffer.from(arrayBuffer));
}

describe('DocxReader plugin', () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('canRead', () => {
    it('should return true for .docx files', () => {
      const reader = new DocxReader();
      expect(reader.canRead('document.docx')).toBe(true);
      expect(reader.canRead('path/to/file.DOCX')).toBe(true);
    });

    it('should return false for non-docx files', () => {
      const reader = new DocxReader();
      expect(reader.canRead('file.pdf')).toBe(false);
      expect(reader.canRead('file.txt')).toBe(false);
      expect(reader.canRead('file.md')).toBe(false);
    });
  });

  describe('metadata', () => {
    it('should report .docx format', () => {
      const reader = new DocxReader();
      expect(reader.supportedFormats).toEqual(['.docx']);
      expect(reader.name).toBe('docx-reader');
    });
  });

  describe('read — real docx file', () => {
    it('should extract text from a real .docx file', async () => {
      mkdirSync(TEST_DIR, { recursive: true });
      const filePath = join(TEST_DIR, 'requirements.docx');
      await createDocxFile(filePath, [
        'Patient Registration',
        'Name: John Doe',
        'Email: john@example.com',
      ]);

      const reader = new DocxReader();
      const results = await reader.read(filePath);

      expect(results).toHaveLength(1);
      expect(results[0].description).toContain('Patient Registration');
      expect(results[0].rawContent).toContain('John Doe');
      expect(results[0].confidence).toBe(0.8);
    });

    it('should derive ID from file path', async () => {
      mkdirSync(TEST_DIR, { recursive: true });
      const filePath = join(TEST_DIR, 'my-feature.docx');
      await createDocxFile(filePath, ['Some content']);

      const reader = new DocxReader();
      const results = await reader.read(filePath);

      expect(results[0].id).toContain('my-feature');
    });
  });

  describe('read — error handling', () => {
    it('should throw on non-existent file', async () => {
      const reader = new DocxReader();
      await expect(reader.read('/nonexistent/file.docx')).rejects.toThrow();
    });

    it('should throw on invalid docx content', async () => {
      mkdirSync(TEST_DIR, { recursive: true });
      const filePath = join(TEST_DIR, 'invalid.docx');
      writeFileSync(filePath, 'this is not a docx file');

      const reader = new DocxReader();
      await expect(reader.read(filePath)).rejects.toThrow();
    });
  });
});
