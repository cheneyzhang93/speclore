/**
 * Built-in PDF reader plugin.
 *
 * Uses pdfjs-dist (Mozilla PDF.js) for text extraction.
 *
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pdfjsLib: any;
    try {
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    } catch {
      throw new Error('pdfjs-dist package is required for PDF support. Install: npm i pdfjs-dist');
    }

    const { readFileSync } = await import('node:fs');
    const buffer = readFileSync(source);
    const uint8 = new Uint8Array(buffer);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const doc = await pdfjsLib.getDocument({
      data: uint8,
      useWorkerFetch: false,
      isEvalSupported: false,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    }).promise as { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }>; destroy: () => void };

    const textParts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join('');
      if (pageText) textParts.push(pageText);
    }
    doc.destroy();
    const text = textParts.join('\n');

    return [{
      id: source.replace(/\\/g, '/').replace(/\.pdf$/i, ''),
      title: source.split('/').pop()?.replace(/\.pdf$/i, '') ?? 'Untitled',
      description: text,
      rawContent: text,
      confidence: 0.75,
    }];
  }
}
