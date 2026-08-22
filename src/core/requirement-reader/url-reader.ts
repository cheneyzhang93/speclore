/**
 * URL reader — fetches web content and extracts text.
 *
 * L1: Public URLs — direct fetch + HTML parsing
 * L2: Basic Auth URLs — credentials from config.yaml
 * L3: Login-required URLs — prompt user to paste content manually
 *
 * Security: URL validation, no file:// protocol, timeout control.
 *
 * @module core/requirement-reader/url-reader
 */

import { basename } from 'node:path';
import type { StructuredRequirement } from '../../types/index.js';
import { logger } from '../../infra/logger.js';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CONTENT_LENGTH = 100_000; // 100KB

/**
 * Read content from a URL.
 */
export async function readUrl(url: string): Promise<StructuredRequirement> {
  // Security: validate URL
  validateUrl(url);

  logger.info(`Fetching URL: ${url}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SpecLore/0.1.0 (+https://github.com/nicepkg/speclore)',
        'Accept': 'text/html,application/json,text/plain,*/*',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new UrlAuthError(url, response.status);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    let content: string;
    let title: string = url;

    if (contentType.includes('html')) {
      const html = await response.text();
      // Extract title from raw HTML BEFORE stripping tags
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch?.[1]?.trim() ?? url;
      content = extractTextFromHtml(html);
    } else {
      content = await response.text();
      // Try to extract title from first heading in plain text
      const headingMatch = content.match(/^#\s+(.+)/m);
      if (headingMatch) title = headingMatch[1]!.trim();
    }

    // Truncate if too large
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.slice(0, MAX_CONTENT_LENGTH) + '\n... (truncated)';
    }

    // Derive ID from URL
    const urlPath = new URL(url).pathname;
    const id = basename(urlPath)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-')
      .replace(/-+/g, '-')
      || 'url-content';

    return {
      id,
      title,
      description: content,
      rawContent: content,
      confidence: 0.85,
    };
  } catch (error) {
    if (error instanceof UrlAuthError) {
      logger.warn(`URL requires authentication: ${url}`);
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`URL fetch timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Validate URL for security.
 */
function validateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Block file:// protocol
  if (parsed.protocol === 'file:') {
    throw new Error('file:// protocol is not allowed. Use a file path instead.');
  }

  // Only allow http/https
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Unsupported protocol: ${parsed.protocol}. Only http/https allowed.`);
  }
}

/**
 * Extract text content from HTML, stripping tags.
 */
function extractTextFromHtml(html: string): string {
  return html
    // Remove script and style tags
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/** Custom error for authentication-required URLs */
export class UrlAuthError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number,
  ) {
    super(`URL requires authentication (${status}): ${url}. Please paste the content manually.`);
    this.name = 'UrlAuthError';
  }
}
