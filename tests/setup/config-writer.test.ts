/**
 * Tests for setup/config-writer — MCP configuration writing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeMcpConfig } from '../../src/setup/config-writer.js';

const TEST_DIR = join(process.cwd(), '.test-config-writer-tmp');

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
    // writeMcpConfig calls detectInstallMethod which may try to resolve 'speclore'
    // In test env it will fallback to clone mode
    expect(() => writeMcpConfig(TEST_DIR, false)).not.toThrow();
  });

  it('should write Claude MCP config to .mcp.json', () => {
    writeMcpConfig(TEST_DIR, false);

    const mcpPath = join(TEST_DIR, '.mcp.json');
    expect(existsSync(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers).toBeDefined();
    expect(content.mcpServers.speclore).toBeDefined();

    const speclore = content.mcpServers.speclore;
    // command should be 'node' or 'npx', not a full path string with spaces
    expect(typeof speclore.command).toBe('string');
    expect(Array.isArray(speclore.args)).toBe(true);
    // Verify no space-splitting issue: args should not contain the command
    expect(speclore.args).not.toContain(speclore.command);
  });

  it('should write Cursor MCP config to .cursor/mcp.json', () => {
    writeMcpConfig(TEST_DIR, false);

    const mcpPath = join(TEST_DIR, '.cursor', 'mcp.json');
    expect(existsSync(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers.speclore).toBeDefined();
    expect(typeof content.mcpServers.speclore.command).toBe('string');
    expect(Array.isArray(content.mcpServers.speclore.args)).toBe(true);
  });

  it('should write Qoder MCP config to .qoder/mcp.json', () => {
    writeMcpConfig(TEST_DIR, false);

    const mcpPath = join(TEST_DIR, '.qoder', 'mcp.json');
    expect(existsPath(mcpPath)).toBe(true);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers.speclore).toBeDefined();
  });

  it('should handle paths with spaces correctly', () => {
    // Create a project dir with spaces in the name
    const spaceDir = join(TEST_DIR, 'my project');
    mkdirSync(join(spaceDir, '.cursor'), { recursive: true });

    writeMcpConfig(spaceDir, false);

    const mcpPath = join(spaceDir, '.cursor', 'mcp.json');
    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    const speclore = content.mcpServers.speclore;

    // The args should contain the full path as a single element, not split by spaces
    const fullPath = speclore.args.join(' ');
    // If path has spaces, it should be in a single arg element
    if (speclore.command === 'node') {
      const pathArg = speclore.args.find((a: string) => a.includes('server.js'));
      expect(pathArg).toBeDefined();
      // The path arg should contain the full path including "my project"
      expect(pathArg).toContain('my project');
    }
  });

  it('should preserve existing mcpServers when writing', () => {
    // Pre-existing config
    const mcpPath = join(TEST_DIR, '.mcp.json');
    writeFileSync(mcpPath, JSON.stringify({
      mcpServers: {
        'existing-tool': { command: 'some-tool', args: [] },
      },
    }), 'utf-8');

    writeMcpConfig(TEST_DIR, false);

    const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
    expect(content.mcpServers['existing-tool']).toBeDefined();
    expect(content.mcpServers.speclore).toBeDefined();
  });
});

function existsPath(p: string): boolean {
  return existsSync(p);
}
