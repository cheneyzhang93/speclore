/**
 * Vitest global setup — runs before all test files.
 *
 * Increases process max listeners to suppress MaxListenersExceededWarning
 * caused by multiple test files registering process event handlers
 * (e.g. SIGINT/SIGTERM in MCP server, exit hooks in ora/pino).
 */
import process from 'node:process';

process.setMaxListeners(20);
