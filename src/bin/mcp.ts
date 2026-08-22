/**
 * MCP server binary entry point.
 * Thin wrapper that starts the MCP server — separate from the library export
 * so that importing the module (e.g. in tests) does not trigger execution.
 */
import { startMcpServer } from '../mcp/server.js';

startMcpServer().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`MCP server error: ${message}`);
  process.exit(1);
});
