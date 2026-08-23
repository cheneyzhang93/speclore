/**
 * Tests for setup/config-writer — MCP configuration writing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeMcpConfig, writeMcpForClient } from '../../src/setup/config-writer.js';
import type { AIToolInfo } from '../../src/types/index.js';

const TEST_DIR = join(process.cwd(), '.test-config-writer-tmp');

/** Helper: build an AIToolInfo array from a list of tool names */
function toolsFor(...names: string[]): AIToolInfo[] {
  return names.map(tool => ({
    tool: tool as AIToolInfo['tool'],
    detected: true,
    configFiles: [],
  }));
}

describe('writeMcpConfig', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    // Create .cursor directory so Cursor writer activates
    mkdirSync(join(TEST_DIR, '.cursor'), { recursive: true });
    // Create .qoder directory so Qoder writer activates
    mkdirSync(join(TEST_DIR, '.qoder'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should write MCP config without crashing', () => {
    const tools = toolsFor('cursor', 'qoder');
    expect(() => writeMcpConfig(TEST_DIR, tools, false)).not.toThrow();
  });

  it('should NOT write .mcp.json when Claude is not in the tools list', () => {
    // Only cursor and qoder detected — Claude should NOT get a config
    const tools = toolsFor('cursor', 'qoder');
    writeMcpConfig(TEST_DIR, tools, false);

    const mcpPath = join(TEST_DIR, '.mcp.json');
    expect(existsSync(mcpPath)).toBe(false);
  });

  it('should write Claude MCP config to .mcp.json when Claude is detected and .claude/ exists', () => {
    // Create .claude/ so the Claude writer guard passes
    mkdirSync(join(TEST_DIR, '.claude'), { recursive: true });

    const tools = toolsFor('cursor', 'claude', 'qoder');
    writeMcpConfig(TEST_DIR, tools, false);

    const mcpPath = join(TEST_DIR, '.mcp.json');
    expect(existsSync(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers).toBeDefined();
    expect(content.mcpServers.speclore).toBeDefined();

    const speclore = content.mcpServers.speclore;
    expect(typeof speclore.command).toBe('string');
    expect(Array.isArray(speclore.args)).toBe(true);
    expect(speclore.args).not.toContain(speclore.command);
  });

  it('should write Cursor MCP config to .cursor/mcp.json', () => {
    const tools = toolsFor('cursor');
    writeMcpConfig(TEST_DIR, tools, false);

    const mcpPath = join(TEST_DIR, '.cursor', 'mcp.json');
    expect(existsSync(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers.speclore).toBeDefined();
    expect(typeof content.mcpServers.speclore.command).toBe('string');
    expect(Array.isArray(content.mcpServers.speclore.args)).toBe(true);
  });

  it('should write Qoder MCP config to .qoder/mcp.json', () => {
    const tools = toolsFor('qoder');
    writeMcpConfig(TEST_DIR, tools, false);

    const mcpPath = join(TEST_DIR, '.qoder', 'mcp.json');
    expect(existsSync(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers.speclore).toBeDefined();
  });

  it('should handle paths with spaces correctly', () => {
    const spaceDir = join(TEST_DIR, 'my project');
    mkdirSync(join(spaceDir, '.cursor'), { recursive: true });

    const tools = toolsFor('cursor');
    writeMcpConfig(spaceDir, tools, false);

    const mcpPath = join(spaceDir, '.cursor', 'mcp.json');
    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    const speclore = content.mcpServers.speclore;

    if (speclore.command === 'node') {
      const pathArg = speclore.args.find((a: string) => a.includes('server.js'));
      expect(pathArg).toBeDefined();
      expect(pathArg).toContain('my project');
    }
  });

  it('should preserve existing mcpServers when writing', () => {
    // Create .claude/ so Claude writer activates
    mkdirSync(join(TEST_DIR, '.claude'), { recursive: true });

    // Pre-existing config
    const mcpPath = join(TEST_DIR, '.mcp.json');
    writeFileSync(mcpPath, JSON.stringify({
      mcpServers: {
        'existing-tool': { command: 'some-tool', args: [] },
      },
    }), 'utf-8');

    const tools = toolsFor('claude');
    writeMcpConfig(TEST_DIR, tools, false);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers['existing-tool']).toBeDefined();
    expect(content.mcpServers.speclore).toBeDefined();
  });

  it('should not write anything when tools list is empty', () => {
    writeMcpConfig(TEST_DIR, [], false);

    expect(existsSync(join(TEST_DIR, '.cursor', 'mcp.json'))).toBe(false);
    expect(existsSync(join(TEST_DIR, '.qoder', 'mcp.json'))).toBe(false);
    expect(existsSync(join(TEST_DIR, '.mcp.json'))).toBe(false);
  });
});

describe('writeMcpForClient (manual mcp add)', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should create .cursor/ and write MCP config for cursor', () => {
    writeMcpForClient(TEST_DIR, 'cursor');

    const mcpPath = join(TEST_DIR, '.cursor', 'mcp.json');
    expect(existsSync(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers.speclore).toBeDefined();
  });

  it('should create .claude/ and write MCP config for claude', () => {
    writeMcpForClient(TEST_DIR, 'claude');

    const mcpPath = join(TEST_DIR, '.mcp.json');
    expect(existsSync(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers.speclore).toBeDefined();
  });

  it('should create .qoder/ and write MCP config for qoder', () => {
    writeMcpForClient(TEST_DIR, 'qoder');

    const mcpPath = join(TEST_DIR, '.qoder', 'mcp.json');
    expect(existsSync(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers.speclore).toBeDefined();
  });
});
