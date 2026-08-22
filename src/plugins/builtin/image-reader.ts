/**
 * Built-in Image reader plugin (OCR via AI Vision API).
 * @module plugins/builtin/image-reader
 */

import type { ReaderPlugin, StructuredRequirement } from '../../types/index.js';

export class ImageReader implements ReaderPlugin {
  readonly name = 'image-reader';
  readonly supportedFormats = ['.png', '.jpg', '.jpeg', '.webp'];

  canRead(source: string): boolean {
    return /\.(png|jpe?g|webp)$/i.test(source);
  }

  async read(source: string): Promise<StructuredRequirement[]> {
    // Image reading uses AI Vision API — requires vision-capable provider
    const { existsSync, readFileSync } = await import('node:fs');
    if (!existsSync(source)) {
      throw new Error(`Image file not found: ${source}`);
    }

    const ext = source.split('.').pop()?.toLowerCase() ?? 'png';
    const mimeType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const buffer = readFileSync(source);

    // Attempt OCR via AI Vision
    let text: string;
    try {
      const { createProvider } = await import('../../ai/provider.js');
      const provider = await createProvider();

      if (!provider.generateWithImage) {
        throw new Error(`Provider '${provider.name}' does not support vision input`);
      }

      const result = await provider.generateWithImage(
        'Extract all text content from this image. Return only the extracted text.',
        { buffer, mimeType },
      );
      text = result.content;
    } catch {
      // Fallback: return file metadata
      text = `[Image file: ${source} — OCR not available. Please provide text description manually.]`;
    }

    return [{
      id: source.replace(/\\/g, '/').replace(/\.(png|jpe?g|webp)$/i, ''),
      title: source.split('/').pop()?.replace(/\.(png|jpe?g|webp)$/i, '') ?? 'Untitled',
      description: text,
      rawContent: text,
      confidence: 0.5,
    }];
  }
}
