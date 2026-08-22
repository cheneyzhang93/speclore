/**
 * Built-in PDF reader plugin.
 * @module plugins/builtin/pdf-reader
 */

import type { ReaderPlugin, StructuredRequirement } from '../../types/index.js';

export class PdfReader implements ReaderPlugin {
  readonly name = 'pdf-reader';
  readonly supportedFormats = ['.pdf'];

  canRead(source: string): boolean {
    return /\.pdf$/i.test(source);
  }

  async read(source: string): Promise<StructuredRequirement[]> {
    let pdfParse: (buf: Buffer) => Promise<{ text: string }>;
    try {
      const mod = await import('pdf-parse');
      pdfParse = mod.default ?? mod;
    } catch {
      throw new Error('pdf-parse package is required for PDF support. Install: npm i pdf-parse');
    }

    const { readFileSync } = await import('node:fs');
    const buffer = readFileSync(source);
    const data = await pdfParse(buffer);

    return [{
      id: source.replace(/\\/g, '/').replace(/\.pdf$/i, ''),
      title: source.split('/').pop()?.replace(/\.pdf$/i, '') ?? 'Untitled',
      description: data.text,
      rawContent: data.text,
      confidence: 0.75,
    }];
  }
}
