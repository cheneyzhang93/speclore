/**
 * Installation method detector.
 *
 * Detects whether SpecLore was installed via npm global install or git clone.
 * - npm global: `require.resolve('speclore')` succeeds
 * - git clone: `.speclore/.install-path` file exists (created by `pnpm build`)
 *
 * @module infra/install-detector
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { InstallInfo } from '../types/index.js';
import { logger } from './logger.js';
import { VERSION } from '../version.js';

const INSTALL_PATH_FILE = '.install-path';

/**
 * Detect how SpecLore was installed.
 */
export function detectInstallMethod(projectRoot: string): InstallInfo {
  // Try npm global install first
  const npmResult = detectNpmInstall();
  if (npmResult) {
    logger.debug(`Detected npm install, version: ${npmResult.version}`);
    return npmResult;
  }

  // Try git clone
  const cloneResult = detectCloneInstall(projectRoot);
  if (cloneResult) {
    logger.debug(`Detected clone install at: ${cloneResult.localPath}`);
    return cloneResult;
  }

  // Fallback: assume npm install (most common case)
  logger.debug('Could not detect install method, assuming npm');
  return { mode: 'npm', version: VERSION };
}

/**
 * Detect npm global install via require.resolve.
 */
function detectNpmInstall(): InstallInfo | null {
  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve('speclore/package.json');
    // Read version from the resolved package.json
    const pkg = JSON.parse(readFileSync(resolved, 'utf-8')) as { version: string };
    return { mode: 'npm', version: pkg.version ?? VERSION };
  } catch {
    return null;
  }
}

/**
 * Detect git clone install via .install-path file.
 */
function detectCloneInstall(projectRoot: string): InstallInfo | null {
  const installPathFile = join(projectRoot, '.speclore', INSTALL_PATH_FILE);

  if (!existsSync(installPathFile)) {
    return null;
  }

  try {
    const localPath = readFileSync(installPathFile, 'utf-8').trim();
    if (existsSync(localPath)) {
      return { mode: 'clone', version: VERSION, localPath };
    }
  } catch {
    // Corrupt file
  }

  return null;
}

/**
 * Write the .install-path file for clone installs.
 * Called during `pnpm build` or `speclore init` for clone mode.
 */
export function writeInstallPathFile(projectRoot: string, distPath: string): void {
  const specLoreDir = join(projectRoot, '.speclore');
  const installPathFile = join(specLoreDir, INSTALL_PATH_FILE);

  if (!existsSync(specLoreDir)) {
    mkdirSync(specLoreDir, { recursive: true });
  }

  writeFileSync(installPathFile, distPath, 'utf-8');
  logger.debug(`Wrote install path: ${distPath}`);
}

/**
 * Get the MCP server entry path based on install method.
 */
export function getMcpServerPath(installInfo: InstallInfo): string {
  if (installInfo.mode === 'clone' && installInfo.localPath) {
    return join(installInfo.localPath, 'dist', 'mcp', 'server.js');
  }
  // For npm install, the command is just "speclore --mcp"
  // The actual path is resolved by npx
  return 'speclore';
}
