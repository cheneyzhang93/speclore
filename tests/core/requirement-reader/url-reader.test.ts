/**
 * URL reader unit tests.
 *
 * Tests URL validation, HTML text extraction, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readUrl, UrlAuthError } from '../../../src/core/requirement-reader/url-reader.js';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('readUrl — URL validation', () => {
  it('should reject invalid URLs', async () => {
    await expect(readUrl('not-a-url')).rejects.toThrow('Invalid URL');
  });

  it('should reject file:// protocol', async () => {
    await expect(readUrl('file:///etc/passwd')).rejects.toThrow('file:// protocol is not allowed');
  });

  it('should reject unsupported protocols', async () => {
    await expect(readUrl('ftp://example.com/file')).rejects.toThrow('Unsupported protocol');
  });
});

describe('readUrl — HTML content extraction', () => {
  it('should extract text from HTML and strip tags', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve('<html><head><title>My Page</title></head><body><p>Hello world</p></body></html>'),
    });

    const result = await readUrl('https://example.com/page');
    expect(result.title).toBe('My Page');
    expect(result.description).toContain('Hello world');
    expect(result.description).not.toContain('<p>');
    expect(result.confidence).toBe(0.85);
  });

  it('should strip script and style tags', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve('<html><head><title>T</title><script>evil()</script><style>.x{}</style></head><body>Content</body></html>'),
    });

    const result = await readUrl('https://example.com/page');
    expect(result.description).not.toContain('evil');
    expect(result.description).not.toContain('.x{}');
    expect(result.description).toContain('Content');
  });

  it('should decode HTML entities', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: () => Promise.resolve('<html><body>Foo &amp; Bar &lt;test&gt; &quot;quoted&quot;</body></html>'),
    });

    const result = await readUrl('https://example.com/page');
    expect(result.description).toContain('Foo & Bar <test> "quoted"');
  });
});

describe('readUrl — plain text content', () => {
  it('should handle plain text responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('# My Requirement\nThis is a requirement.'),
    });

    const result = await readUrl('https://example.com/req.txt');
    expect(result.title).toBe('My Requirement');
    expect(result.description).toContain('This is a requirement.');
  });
});

describe('readUrl — error handling', () => {
  it('should throw UrlAuthError on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    await expect(readUrl('https://example.com/private')).rejects.toThrow(UrlAuthError);
  });

  it('should throw UrlAuthError on 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    await expect(readUrl('https://example.com/forbidden')).rejects.toThrow(UrlAuthError);
  });

  it('should throw on HTTP errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    await expect(readUrl('https://example.com/error')).rejects.toThrow('HTTP 500');
  });
});

describe('readUrl — ID derivation', () => {
  it('should derive ID from URL path', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('Content'),
    });

    const result = await readUrl('https://example.com/docs/requirement-doc');
    expect(result.id).toBe('requirement-doc');
  });

  it('should fallback to "url-content" for root paths', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('Content'),
    });

    const result = await readUrl('https://example.com/');
    expect(result.id).toBe('url-content');
  });
});
