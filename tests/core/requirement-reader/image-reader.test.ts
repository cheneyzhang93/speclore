/**
 * Tests for core/requirement-reader/image-reader — multimodal image reading via AI Vision.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(process.cwd(), '.test-image-reader-tmp');

// Use vi.hoisted for mock functions accessible to hoisted vi.mock
const { mockGenerateWithImage, mockIsAvailable } = vi.hoisted(() => ({
  mockGenerateWithImage: vi.fn(),
  mockIsAvailable: vi.fn(() => true),
}));

vi.mock('../../../src/ai/provider.js', () => ({
  createProvider: vi.fn().mockImplementation(() =>
    Promise.resolve({
      name: 'test-vision',
      isAvailable: mockIsAvailable,
      generate: vi.fn(),
      generateWithImage: mockGenerateWithImage,
    }),
  ),
}));

describe('readImageFile', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    mockIsAvailable.mockReturnValue(true);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it('should read an image file and extract text via AI Vision', async () => {
    // Create a minimal PNG file (1x1 pixel)
    const pngBuffer = Buffer.from([
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
    const imagePath = join(TEST_DIR, 'requirement.png');
    writeFileSync(imagePath, pngBuffer);

    mockGenerateWithImage.mockResolvedValue({
      content: 'User Registration\n- Email verification required\n- Password must be 8+ characters',
    });

    const { readImageFile } = await import('../../../src/core/requirement-reader/image-reader.js');
    const result = await readImageFile(imagePath);

    expect(result).toBeDefined();
    expect(result.id).toContain('requirement');
    expect(result.description).toContain('User Registration');
    expect(result.description).toContain('Email verification');
    expect(result.confidence).toBe(0.7); // Lower confidence for OCR
    expect(result.rawContent).toContain('User Registration');

    // Verify generateWithImage was called with correct params
    expect(mockGenerateWithImage).toHaveBeenCalledTimes(1);
    const [prompt, imageArg] = mockGenerateWithImage.mock.calls[0]!;
    expect(prompt).toContain('extract all text');
    expect(imageArg.buffer).toBeInstanceOf(Buffer);
    expect(imageArg.mimeType).toBe('image/png');
  });

  it('should throw when provider does not support vision', async () => {
    const imagePath = join(TEST_DIR, 'test.png');
    writeFileSync(imagePath, Buffer.from([0x89, 0x50, 0x4E, 0x47])); // minimal PNG header

    // Override mock to return provider without generateWithImage
    vi.resetModules();
    vi.doMock('../../../src/ai/provider.js', () => ({
      createProvider: vi.fn().mockResolvedValue({
        name: 'text-only',
        isAvailable: () => true,
        generate: vi.fn(),
        // No generateWithImage
      }),
    }));

    const { readImageFile } = await import('../../../src/core/requirement-reader/image-reader.js');
    await expect(readImageFile(imagePath)).rejects.toThrow('does not support image/vision input');
  });

  it('should derive ID from filename', async () => {
    // Reset modules to clear the previous test's mock override
    vi.resetModules();
    vi.doMock('../../../src/ai/provider.js', () => ({
      createProvider: vi.fn().mockImplementation(() =>
        Promise.resolve({
          name: 'test-vision',
          isAvailable: () => true,
          generate: vi.fn(),
          generateWithImage: vi.fn().mockResolvedValue({ content: 'Some text' }),
        }),
      ),
    }));

    const imagePath = join(TEST_DIR, 'My Feature Spec.jpg');
    writeFileSync(imagePath, Buffer.from([0xFF, 0xD8, 0xFF])); // JPEG header

    const { readImageFile } = await import('../../../src/core/requirement-reader/image-reader.js');
    const result = await readImageFile(imagePath);

    // ID should be derived from filename, lowercased, sanitized
    expect(result.id).toMatch(/^my-feature-spec/);
  });
});
