/**
 * Built-in DOCX reader plugin.
 * @module plugins/builtin/docx-reader
 */

import type { ReaderPlugin, StructuredRequirement } from '../../types/index.js';
import type mammoth from 'mammoth';

export class DocxReader implements ReaderPlugin {
  readonly name = 'docx-reader';
  readonly supportedFormats = ['.docx'];

  canRead(source: string): boolean {
    return /\.docx$/i.test(source);
  }

  async read(source: string): Promise<StructuredRequirement[]> {
    // Dynamic import — mammoth is optional
    let mammothModule: typeof mammoth;
    try {
      mammothModule = await import('mammoth');
    } catch {
      throw new Error('mammoth package is required for DOCX support. Install: npm i mammoth');
    }

    const result = await mammothModule.extractRawText({ path: source });
    const content = result.value;

    return [{
      id: source.replace(/\\/g, '/').replace(/\.docx$/i, ''),
      title: source.split('/').pop()?.replace(/\.docx$/i, '') ?? 'Untitled',
      description: content,
      rawContent: content,
      confidence: 0.8,
    }];
  }
}
