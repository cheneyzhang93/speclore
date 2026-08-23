/**
 * Tests for core/constraint-coder — constraint writing for 3 AI clients.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectAITools } from '../../src/core/constraint-coder/ai-tool-detector.js';

const TEST_DIR = join(process.cwd(), '.test-constraint-tmp');

describe('ai-tool-detector', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should detect Cursor when .cursor directory exists', () => {
    mkdirSync(join(TEST_DIR, '.cursor'), { recursive: true });
    const tools = detectAITools(TEST_DIR);
    expect(tools).toContain('cursor');
  });

  it('should detect Claude Code when .claude/ directory exists', () => {
    mkdirSync(join(TEST_DIR, '.claude'), { recursive: true });
    const tools = detectAITools(TEST_DIR);
    expect(tools).toContain('claude');
  });

  it('should detect Claude Code when CLAUDE.md exists', () => {
    writeFileSync(join(TEST_DIR, 'CLAUDE.md'), '# Claude', 'utf-8');
    const tools = detectAITools(TEST_DIR);
    expect(tools).toContain('claude');
  });

  it('should NOT detect Claude Code when only .mcp.json exists', () => {
    // .mcp.json is written by SpecLore itself, not a genuine Claude Code marker
    writeFileSync(join(TEST_DIR, '.mcp.json'), '{}', 'utf-8');
    const tools = detectAITools(TEST_DIR);
    expect(tools).not.toContain('claude');
  });

  it('should detect Qoder when .qoder directory exists', () => {
    mkdirSync(join(TEST_DIR, '.qoder'), { recursive: true });
    const tools = detectAITools(TEST_DIR);
    expect(tools).toContain('qoder');
  });

  it('should return empty array when no tools detected', () => {
    const tools = detectAITools(TEST_DIR);
    expect(tools).toEqual([]);
  });
});
