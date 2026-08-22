/**
 * State Manager — tracks project workflow state via .speclore/state.yaml.
 *
 * Provides state machine enforcement for MCP tools:
 *   (none) → specified → constrained → coding → verified
 *
 * @module core/state-manager
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { globSync } from 'glob';
import type { FeatureState, FeatureStateEntry, ProjectState } from '../../types/index.js';

const STATE_FILENAME = 'state.yaml';

/** Allowed state transitions */
const ALLOWED_TRANSITIONS: Record<FeatureState, FeatureState[]> = {
  specified: ['constrained'],
  constrained: ['coding'],
  coding: ['verified'],
  verified: ['constrained', 'specified'],
};

function createDefaultState(): ProjectState {
  return {
    schemaVersion: 1,
    initialized: true,
    initializedAt: new Date().toISOString(),
    features: {},
  };
}

export class StateManager {
  private projectRoot: string;
  private statePath: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.statePath = join(projectRoot, '.speclore', STATE_FILENAME);
  }

  /** Load state from disk, or return default if not exists */
  load(): ProjectState {
    if (!existsSync(this.statePath)) {
      return createDefaultState();
    }
    try {
      const content = readFileSync(this.statePath, 'utf-8');
      const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA });
      if (parsed && typeof parsed === 'object') {
        return parsed as ProjectState;
      }
    } catch {
      // Fall through to default
    }
    return createDefaultState();
  }

  /** Persist state to disk */
  save(state: ProjectState): void {
    const dir = join(this.projectRoot, '.speclore');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.statePath, yaml.dump(state, { lineWidth: 120 }), 'utf-8');
  }

  /** Ensure state file exists with default values */
  ensureInitialized(): ProjectState {
    if (!existsSync(this.statePath)) {
      // No state file — create and persist default
      const state = createDefaultState();
      this.save(state);
      return state;
    }
    const state = this.load();
    if (!state.initialized) {
      state.initialized = true;
      state.initializedAt = new Date().toISOString();
      this.save(state);
    }
    return state;
  }

  /** Get state entry for a specific feature */
  getFeatureState(featurePath: string): FeatureStateEntry | null {
    const state = this.load();
    return state.features[featurePath] ?? null;
  }

  /** Get project-level summary */
  getProjectSummary(): {
    initialized: boolean;
    featureCount: number;
    states: Record<FeatureState, number>;
  } {
    const state = this.load();
    const counts: Record<FeatureState, number> = {
      specified: 0,
      constrained: 0,
      coding: 0,
      verified: 0,
    };
    for (const entry of Object.values(state.features)) {
      counts[entry.state] = (counts[entry.state] ?? 0) + 1;
    }
    return {
      initialized: state.initialized,
      featureCount: Object.keys(state.features).length,
      states: counts,
    };
  }

  /**
   * Transition a feature to a new state.
   * @throws Error if transition is not allowed
   */
  transitionFeature(featurePath: string, to: FeatureState, guards?: FeatureState[]): void {
    const state = this.load();
    const entry = state.features[featurePath];

    if (!entry) {
      // New feature — only allow 'specified' as initial state
      if (to !== 'specified') {
        throw new Error(
          `Cannot transition feature "${featurePath}" to "${to}" — feature does not exist. Initial state must be "specified".`,
        );
      }
      state.features[featurePath] = {
        featureFile: featurePath,
        state: 'specified',
        constraintFiles: [],
        testFiles: [],
        lastStateChange: new Date().toISOString(),
      };
    } else {
      // Existing feature — check allowed transitions
      const allowed = ALLOWED_TRANSITIONS[entry.state];
      if (!allowed.includes(to)) {
        throw new Error(
          `Invalid state transition for "${featurePath}": "${entry.state}" → "${to}". Allowed: ${allowed.join(', ')}`,
        );
      }

      // Check guards if provided
      if (guards && !guards.includes(entry.state)) {
        throw new Error(
          `Guard failed for "${featurePath}": current state "${entry.state}" not in allowed guards [${guards.join(', ')}]`,
        );
      }

      entry.state = to;
      entry.lastStateChange = new Date().toISOString();
    }

    this.save(state);
  }

  /** Update feature entry with constraint/test file info */
  updateFeatureEntry(
    featurePath: string,
    updates: Partial<Pick<FeatureStateEntry, 'constraintFiles' | 'testFiles'>>,
  ): void {
    const state = this.load();
    const entry = state.features[featurePath];
    if (!entry) return;

    if (updates.constraintFiles !== undefined) {
      entry.constraintFiles = updates.constraintFiles;
    }
    if (updates.testFiles !== undefined) {
      entry.testFiles = updates.testFiles;
    }
    this.save(state);
  }

  /** Record verification result for a feature */
  recordVerify(
    featurePath: string,
    result: { passed: number; failed: number; unmapped: number },
  ): void {
    const state = this.load();
    const entry = state.features[featurePath];
    if (!entry) return;

    entry.lastVerify = {
      timestamp: new Date().toISOString(),
      ...result,
    };
    this.save(state);
  }

  /** List all tracked features with their states */
  listFeatures(): Array<{ path: string; state: FeatureStateEntry }> {
    const state = this.load();
    return Object.entries(state.features).map(([path, entry]) => ({ path, state: entry }));
  }

  /** Remove a feature from state tracking */
  removeFeature(featurePath: string): void {
    const state = this.load();
    delete state.features[featurePath];
    this.save(state);
  }

  /**
   * Migrate existing .feature files into state tracking.
   *
   * For projects upgrading from pre-workflow versions: scans the specs
   * directory for .feature files that are not yet tracked in state.yaml
   * and registers them as 'specified'. Returns the count of newly
   * registered features.
   */
  migrateFeatures(specsDir: string): number {
    const state = this.load();
    const trackedPaths = new Set(Object.keys(state.features));

    const featureFiles = globSync('**/*.feature', {
      cwd: specsDir,
      absolute: true,
    });

    let migrated = 0;
    for (const filePath of featureFiles) {
      if (trackedPaths.has(filePath)) continue;

      state.features[filePath] = {
        featureFile: filePath,
        state: 'specified',
        constraintFiles: [],
        testFiles: [],
        lastStateChange: new Date().toISOString(),
      };
      migrated++;
    }

    if (migrated > 0) {
      this.save(state);
    }

    return migrated;
  }
}
