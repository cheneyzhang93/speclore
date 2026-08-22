/**
 * Tests for core/state-manager — state read/write, transitions, guards.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { StateManager } from '../../src/core/state-manager/index.js';
import type { ProjectState } from '../../src/types/index.js';

const TEST_DIR = join(process.cwd(), '.test-state-mgr-tmp');

describe('StateManager', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.speclore'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('ensureInitialized', () => {
    it('should create default state if not exists', () => {
      const sm = new StateManager(TEST_DIR);
      const state = sm.ensureInitialized();
      expect(state.initialized).toBe(true);
      expect(state.schemaVersion).toBe(1);
      expect(state.features).toEqual({});
    });

    it('should persist state.yaml on initialization', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      const statePath = join(TEST_DIR, '.speclore', 'state.yaml');
      expect(existsSync(statePath)).toBe(true);
    });

    it('should not overwrite existing initialized state', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');

      const sm2 = new StateManager(TEST_DIR);
      const state = sm2.ensureInitialized();
      expect(Object.keys(state.features)).toHaveLength(1);
    });
  });

  describe('load / save', () => {
    it('should return default state if file does not exist', () => {
      const sm = new StateManager(TEST_DIR);
      const state = sm.load();
      expect(state.initialized).toBe(true);
      expect(state.features).toEqual({});
    });

    it('should load persisted state', () => {
      const sm = new StateManager(TEST_DIR);
      sm.transitionFeature('specs/a.feature', 'specified');

      const sm2 = new StateManager(TEST_DIR);
      const state = sm2.load();
      expect(state.features['specs/a.feature']).toBeDefined();
      expect(state.features['specs/a.feature'].state).toBe('specified');
    });

    it('should handle corrupted YAML gracefully', () => {
      const statePath = join(TEST_DIR, '.speclore', 'state.yaml');
      writeFileSync(statePath, '{{invalid yaml', 'utf-8');
      const sm = new StateManager(TEST_DIR);
      const state = sm.load();
      expect(state.initialized).toBe(true); // Falls back to default
    });
  });

  describe('transitionFeature', () => {
    it('should create new feature with specified state', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');

      const entry = sm.getFeatureState('specs/test.feature');
      expect(entry).not.toBeNull();
      expect(entry!.state).toBe('specified');
    });

    it('should allow specified → constrained', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');
      sm.transitionFeature('specs/test.feature', 'constrained');

      expect(sm.getFeatureState('specs/test.feature')!.state).toBe('constrained');
    });

    it('should allow constrained → coding', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');
      sm.transitionFeature('specs/test.feature', 'constrained');
      sm.transitionFeature('specs/test.feature', 'coding');

      expect(sm.getFeatureState('specs/test.feature')!.state).toBe('coding');
    });

    it('should allow coding → verified', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');
      sm.transitionFeature('specs/test.feature', 'constrained');
      sm.transitionFeature('specs/test.feature', 'coding');
      sm.transitionFeature('specs/test.feature', 'verified');

      expect(sm.getFeatureState('specs/test.feature')!.state).toBe('verified');
    });

    it('should allow verified → constrained (re-constrain)', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');
      sm.transitionFeature('specs/test.feature', 'constrained');
      sm.transitionFeature('specs/test.feature', 'coding');
      sm.transitionFeature('specs/test.feature', 'verified');
      sm.transitionFeature('specs/test.feature', 'constrained');

      expect(sm.getFeatureState('specs/test.feature')!.state).toBe('constrained');
    });

    it('should throw on invalid transition (specified → verified)', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');

      expect(() => {
        sm.transitionFeature('specs/test.feature', 'verified');
      }).toThrow(/Invalid state transition/);
    });

    it('should throw on invalid initial state (not specified)', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();

      expect(() => {
        sm.transitionFeature('specs/test.feature', 'constrained');
      }).toThrow(/Initial state must be "specified"/);
    });

    it('should respect guards', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');
      sm.transitionFeature('specs/test.feature', 'constrained');

      // Guard: must be in 'specified' state to transition to 'coding'
      // Current state is 'constrained', so guard should fail
      expect(() => {
        sm.transitionFeature('specs/test.feature', 'coding', ['specified']);
      }).toThrow(/Guard failed/);
    });
  });

  describe('getProjectSummary', () => {
    it('should count features by state', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/a.feature', 'specified');
      sm.transitionFeature('specs/b.feature', 'specified');
      sm.transitionFeature('specs/b.feature', 'constrained');

      const summary = sm.getProjectSummary();
      expect(summary.featureCount).toBe(2);
      expect(summary.states.specified).toBe(1);
      expect(summary.states.constrained).toBe(1);
      expect(summary.states.coding).toBe(0);
      expect(summary.states.verified).toBe(0);
    });
  });

  describe('updateFeatureEntry', () => {
    it('should update constraint files', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');
      sm.updateFeatureEntry('specs/test.feature', { constraintFiles: ['.qoder/rules/speclore.md'] });

      const entry = sm.getFeatureState('specs/test.feature');
      expect(entry!.constraintFiles).toEqual(['.qoder/rules/speclore.md']);
    });

    it('should update test files', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');
      sm.updateFeatureEntry('specs/test.feature', { testFiles: ['tests/test.test.ts'] });

      const entry = sm.getFeatureState('specs/test.feature');
      expect(entry!.testFiles).toEqual(['tests/test.test.ts']);
    });

    it('should be no-op for non-existent feature', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.updateFeatureEntry('specs/nonexistent.feature', { constraintFiles: ['x'] });
      expect(sm.getFeatureState('specs/nonexistent.feature')).toBeNull();
    });
  });

  describe('recordVerify', () => {
    it('should record verification result', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/test.feature', 'specified');
      sm.recordVerify('specs/test.feature', { passed: 3, failed: 0, unmapped: 0 });

      const entry = sm.getFeatureState('specs/test.feature');
      expect(entry!.lastVerify).toBeDefined();
      expect(entry!.lastVerify!.passed).toBe(3);
      expect(entry!.lastVerify!.failed).toBe(0);
    });
  });

  describe('listFeatures / removeFeature', () => {
    it('should list all tracked features', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/a.feature', 'specified');
      sm.transitionFeature('specs/b.feature', 'specified');

      const list = sm.listFeatures();
      expect(list).toHaveLength(2);
    });

    it('should remove a feature from tracking', () => {
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature('specs/a.feature', 'specified');
      sm.removeFeature('specs/a.feature');

      expect(sm.getFeatureState('specs/a.feature')).toBeNull();
      expect(sm.listFeatures()).toHaveLength(0);
    });
  });

  describe('migrateFeatures', () => {
    const specsDir = join(TEST_DIR, 'specs');

    beforeEach(() => {
      mkdirSync(specsDir, { recursive: true });
    });

    it('should register existing .feature files as specified', () => {
      // Create some .feature files on disk
      writeFileSync(join(specsDir, 'register.feature'), 'Feature: Register\n  Scenario: OK', 'utf-8');
      writeFileSync(join(specsDir, 'login.feature'), 'Feature: Login\n  Scenario: OK', 'utf-8');

      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      const migrated = sm.migrateFeatures(specsDir);

      expect(migrated).toBe(2);
      expect(sm.listFeatures()).toHaveLength(2);
      for (const f of sm.listFeatures()) {
        expect(f.state.state).toBe('specified');
      }
    });

    it('should not re-register already tracked features', () => {
      writeFileSync(join(specsDir, 'test.feature'), 'Feature: Test', 'utf-8');

      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      const first = sm.migrateFeatures(specsDir);
      const second = sm.migrateFeatures(specsDir);

      expect(first).toBe(1);
      expect(second).toBe(0); // Already tracked
      expect(sm.listFeatures()).toHaveLength(1);
    });

    it('should preserve existing state for tracked features', () => {
      writeFileSync(join(specsDir, 'a.feature'), 'Feature: A', 'utf-8');
      writeFileSync(join(specsDir, 'b.feature'), 'Feature: B', 'utf-8');

      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();

      // Manually track one feature and advance it
      const absPathA = join(specsDir, 'a.feature');
      sm.transitionFeature(absPathA, 'specified');
      sm.transitionFeature(absPathA, 'constrained');

      // Migrate — should only add 'b.feature', not reset 'a.feature'
      const migrated = sm.migrateFeatures(specsDir);
      expect(migrated).toBe(1);

      const entryA = sm.getFeatureState(absPathA);
      expect(entryA!.state).toBe('constrained'); // Preserved!
    });

    it('should return 0 when no .feature files exist', () => {
      const emptySpecs = join(TEST_DIR, 'empty-specs');
      mkdirSync(emptySpecs, { recursive: true });

      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      const migrated = sm.migrateFeatures(emptySpecs);

      expect(migrated).toBe(0);
    });

    it('should handle nested .feature files', () => {
      const subDir = join(specsDir, 'patient');
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, 'register.feature'), 'Feature: Register', 'utf-8');

      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      const migrated = sm.migrateFeatures(specsDir);

      expect(migrated).toBe(1);
    });
  });
});
