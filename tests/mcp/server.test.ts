/**
 * Tests for MCP server — lifecycle and tool handling.
 */

import { describe, it, expect } from 'vitest';

describe('MCP Server', () => {
  it('should export startMcpServer function', async () => {
    const { startMcpServer } = await import('../../src/mcp/server.js');
    expect(typeof startMcpServer).toBe('function');
  });

  it('should export tool schemas', async () => {
    const { specToolSchema, codeToolSchema, verifyToolSchema } = await import('../../src/mcp/tools.js');
    expect(specToolSchema.name).toBe('speclore.spec');
    expect(codeToolSchema.name).toBe('speclore.code');
    expect(verifyToolSchema.name).toBe('speclore.verify');
  });

  it('should have valid JSON Schema for spec tool', async () => {
    const { specToolSchema } = await import('../../src/mcp/tools.js');
    expect(specToolSchema.inputSchema).toBeDefined();
    expect(specToolSchema.inputSchema.type).toBe('object');
    expect(specToolSchema.inputSchema.properties.source).toBeDefined();
    expect(specToolSchema.inputSchema.required).toContain('source');
  });

  it('should have valid JSON Schema for code tool', async () => {
    const { codeToolSchema } = await import('../../src/mcp/tools.js');
    expect(codeToolSchema.inputSchema).toBeDefined();
    expect(codeToolSchema.inputSchema.properties.features).toBeDefined();
  });

  it('should have valid JSON Schema for verify tool', async () => {
    const { verifyToolSchema } = await import('../../src/mcp/tools.js');
    expect(verifyToolSchema.inputSchema).toBeDefined();
    expect(verifyToolSchema.inputSchema.properties.impact).toBeDefined();
  });
});
