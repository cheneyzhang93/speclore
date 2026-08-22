/**
 * CLI binary entry point.
 * Thin wrapper that executes the CLI — separate from the library export
 * so that importing the module (e.g. in tests) does not trigger execution.
 */
import { run } from '../cli/index.js';

run().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Error: ${message}`);
  process.exit(1);
});
