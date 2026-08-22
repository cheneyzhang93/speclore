import { defineConfig } from 'tsup';

export default defineConfig([
  // CLI and MCP server entries — include shebang for executable use
  {
    entry: {
      'cli/index': 'src/bin/cli.ts',
      'mcp/server': 'src/bin/mcp.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'node18',
    outDir: 'dist',
    splitting: false,
    shims: false,
    banner: {
      js: '#!/usr/bin/env node\n',
    },
  },
  // Library entry — no shebang (consumed as module)
  {
    entry: {
      index: 'src/index.ts',
    },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    target: 'node18',
    outDir: 'dist',
    splitting: false,
    shims: false,
  },
]);
