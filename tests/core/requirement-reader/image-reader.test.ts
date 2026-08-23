/**
 * Image reader integration tests.
 *
 * Uses FakeVisionProvider implementing AIProvider interface,
 * injected via providerOverride — zero mocks.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { readImageFile } from '../../../src/core/requirement-reader/image-reader.js';
import type { AIProvider, GenerateOptions, GenerateResult } from '../../../src/ai/provider.js';

const TEST_DIR = join(process.cwd(), '.test-image-reader-tmp');

/** Minimal PNG file (1x1 pixel) */
const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
  0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, // IEND chunk
  0x44, 0xAE, 0x42, 0x60, 0x82,
]);

class FakeVisionProvider implements AIProvider {
  readonly name = 'fake-vision';
  constructor(private response: string) {}
  isAvailable() { return true; }
  async generate(_prompt: string, _options?: GenerateOptions): Promise<GenerateResult> {
    return { content: '' };
  }
  async generateWithImage(_prompt: string, _image: { buffer: Buffer; mimeType: string }): Promise<GenerateResult> {
    return { content: this.response };
  }
}

class FakeTextOnlyProvider implements AIProvider {
  readonly name = 'text-only';
  isAvailable() { return true; }
  async generate(_prompt: string, _options?: GenerateOptions): Promise<GenerateResult> {
    return { content: '' };
  }
  // No generateWithImage — simulates a text-only provider
}

describe('readImageFile — with FakeVisionProvider', () => {
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should extract text via AI Vision from a real PNG file', async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    const imagePath = join(TEST_DIR, 'requirement.png');
    writeFileSync(imagePath, MINIMAL_PNG);

    const fakeProvider = new FakeVisionProvider(
      'User Registration\n- Email verification required\n- Password must be 8+ characters',
    );

    const result = await readImageFile(imagePath, fakeProvider);

    expect(result).toBeDefined();
    expect(result.id).toContain('requirement');
    expect(result.description).toContain('User Registration');
    expect(result.description).toContain('Email verification');
    expect(result.confidence).toBe(0.7);
    expect(result.rawContent).toContain('User Registration');
  });

  it('should throw when provider does not support vision', async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    const imagePath = join(TEST_DIR, 'test.png');
    writeFileSync(imagePath, MINIMAL_PNG);

    const textOnlyProvider = new FakeTextOnlyProvider();

    await expect(readImageFile(imagePath, textOnlyProvider))
      .rejects.toThrow('does not support image/vision input');
  });

  it('should derive ID from filename', async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    const imagePath = join(TEST_DIR, 'My Feature Spec.jpg');
    writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF])); // JPEG header

    const fakeProvider = new FakeVisionProvider('Some text');

    const result = await readImageFile(imagePath, fakeProvider);

    expect(result.id).toMatch(/^my-feature-spec/);
  });

  it('should use first line of response as title (max 100 chars)', async () => {
    mkdirSync(TEST_DIR, { recursive: true });
    const imagePath = join(TEST_DIR, 'test.png');
    writeFileSync(imagePath, MINIMAL_PNG);

    const longTitle = 'A'.repeat(150);
    const fakeProvider = new FakeVisionProvider(`${longTitle}\nSecond line`);

    const result = await readImageFile(imagePath, fakeProvider);

    expect(result.title.length).toBe(100);
  });
});
