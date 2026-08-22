/**
 * Markdown reader unit tests.
 *
 * Tests markdown text extraction, title derivation,
 * acceptance criteria extraction, and dependency extraction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(process.cwd(), '.test-markdown-reader-tmp');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
});

function writeMd(name: string, content: string): string {
  const filePath = join(TEST_DIR, name);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('readMarkdownFile — title extraction', () => {
  it('should extract title from first H1 heading', async () => {
    const filePath = writeMd('feature.md', '# Patient Registration\nSome description here.');
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.title).toBe('Patient Registration');
  });

  it('should fallback to filename when no heading found', async () => {
    const filePath = writeMd('my-feature.md', 'No heading here, just text.');
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.title).toBe('my-feature');
  });
});

describe('readMarkdownFile — acceptance criteria', () => {
  it('should extract acceptance criteria bullets', async () => {
    const content = [
      '# Feature',
      '',
      '## Acceptance Criteria',
      '- User can login with email',
      '- User can reset password',
      '* Admin can manage roles',
      '',
      '## Other Section',
    ].join('\n');

    const filePath = writeMd('feature.md', content);
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.acceptanceCriteria).toBeDefined();
    expect(result.acceptanceCriteria).toHaveLength(3);
    expect(result.acceptanceCriteria).toContain('User can login with email');
    expect(result.acceptanceCriteria).toContain('User can reset password');
    expect(result.acceptanceCriteria).toContain('Admin can manage roles');
  });

  it('should extract Chinese acceptance criteria (验收标准)', async () => {
    const content = [
      '# 功能',
      '',
      '## 验收标准',
      '- 用户可以注册',
      '- 用户可以登录',
    ].join('\n');

    const filePath = writeMd('feature.md', content);
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.acceptanceCriteria).toBeDefined();
    expect(result.acceptanceCriteria).toHaveLength(2);
    expect(result.acceptanceCriteria).toContain('用户可以注册');
  });

  it('should leave acceptanceCriteria undefined when absent', async () => {
    const filePath = writeMd('feature.md', '# Feature\nJust a description.');
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.acceptanceCriteria).toBeUndefined();
  });
});

describe('readMarkdownFile — dependencies', () => {
  it('should extract "Depends on:" references', async () => {
    const content = '# Feature\nDepends on: order/payment, user/auth\n';
    const filePath = writeMd('feature.md', content);
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.dependencies).toBeDefined();
    expect(result.dependencies).toHaveLength(2);
    expect(result.dependencies).toContain('order/payment');
    expect(result.dependencies).toContain('user/auth');
  });

  it('should extract Chinese "依赖:" references', async () => {
    const content = '# 功能\n依赖: order/payment, user/auth\n';
    const filePath = writeMd('feature.md', content);
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.dependencies).toBeDefined();
    expect(result.dependencies).toHaveLength(2);
  });

  it('should leave dependencies undefined when absent', async () => {
    const filePath = writeMd('feature.md', '# Feature\nNo deps here.');
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.dependencies).toBeUndefined();
  });
});

describe('readMarkdownFile — ID and confidence', () => {
  it('should derive ID from filename, lowercased and sanitized', async () => {
    const filePath = writeMd('Patient Care Plan.md', '# Title');
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.id).toBe('patient-care-plan');
  });

  it('should set confidence to 1.0 for markdown (native format)', async () => {
    const filePath = writeMd('feature.md', '# Feature');
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.confidence).toBe(1.0);
  });

  it('should include rawContent', async () => {
    const filePath = writeMd('feature.md', '# Feature\nDescription here.');
    const { readMarkdownFile } = await import('../../../src/core/requirement-reader/markdown-reader.js');
    const result = await readMarkdownFile(filePath);

    expect(result.rawContent).toContain('# Feature');
    expect(result.rawContent).toContain('Description here.');
  });
});
