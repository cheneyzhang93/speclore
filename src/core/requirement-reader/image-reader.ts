/**
 * Image reader — extracts text from images via AI Vision API.
 *
 * Supports png/jpg/webp. Uses configured AI provider's vision capability.
 *
 * @module core/requirement-reader/image-reader
 */

import { basename, extname } from 'node:path';
import { readFileSync } from 'node:fs';
import type { StructuredRequirement } from '../../types/index.js';
import { createProvider } from '../../ai/provider.js';
import type { AIProvider } from '../../ai/provider.js';
import { logger } from '../../infra/logger.js';

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

export async function readImageFile(filePath: string, providerOverride?: AIProvider): Promise<StructuredRequirement> {
  const id = basename(filePath, extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-')
    .replace(/-+/g, '-');

  logger.info(`Reading image via AI Vision: ${filePath}`);

  const ext = extname(filePath).toLowerCase();
  const mimeType = MIME_MAP[ext] ?? 'image/png';
  const buffer = readFileSync(filePath);

  const provider = providerOverride ?? await createProvider();
  const prompt = `Please extract all text content from this image. Return the text as-is, preserving structure and formatting. If the image contains a table, convert it to a structured text format.`;

  if (!provider.generateWithImage) {
    throw new Error(`AI provider '${provider.name}' does not support image/vision input. Use a vision-capable model.`);
  }

  const result = await provider.generateWithImage(prompt, { buffer, mimeType });

  return {
    id,
    title: result.content.split('\n')[0]?.slice(0, 100) ?? id,
    description: result.content,
    rawContent: result.content,
    confidence: 0.7, // Lower confidence for OCR
  };
}
