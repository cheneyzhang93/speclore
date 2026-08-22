#!/usr/bin/env node

/**
 * npm postuninstall hook — cleans up SpecLore global cache files.
 *
 * When the user runs `npm uninstall -g speclore`, this script:
 * 1. Detects if ~/.speclore/ exists
 * 2. Removes only cache/runtime files (context.json, .lock, reports/, mappings/)
 * 3. Preserves user customizations (config.yaml, etc.)
 * 4. Runs silently — never blocks uninstall
 *
 * NOTE: This file uses CJS because the package declares "type": "module".
 * The .cjs extension forces Node.js to interpret it as CommonJS.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

function cleanup() {
  try {
    const globalDir = path.join(os.homedir(), '.speclore');

    if (!fs.existsSync(globalDir)) {
      return; // Nothing to clean
    }

    // Only remove cache/runtime files, preserve user config (e.g. config.yaml)
    const targets = ['context.json', '.lock', 'reports', 'mappings'];

    for (const target of targets) {
      const targetPath = path.join(globalDir, target);
      try {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } catch {
        // Silently ignore individual failures — never block uninstall
      }
    }
  } catch {
    // Silently ignore — never block uninstall
  }
}

cleanup();
