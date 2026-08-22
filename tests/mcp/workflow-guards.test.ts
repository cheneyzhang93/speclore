/**
 * Tests for MCP workflow guards — auto-initialization, state enforcement.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { executeCodeTool, executeVerifyTool } from '../../src/mcp/tools.js';

const TEST_DIR = join(process.cwd(), '.test-workflow-guards-tmp');

describe('MCP workflow guards', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('auto-initialization', () => {
    it('should create .speclore/config.yaml when missing (code tool)', async () => {
      // No .speclore directory exists
      expect(existsSync(join(TEST_DIR, '.speclore'))).toBe(false);

      // Call executeCodeTool — should auto-init
      await executeCodeTool({}, TEST_DIR);

      // Now .speclore/config.yaml should exist
      expect(existsSync(join(TEST_DIR, '.speclore', 'config.yaml'))).toBe(true);
      expect(existsSync(join(TEST_DIR, '.speclore', 'state.yaml'))).toBe(true);
    });

    it('should create .speclore/config.yaml when missing (verify tool)', async () => {
      expect(existsSync(join(TEST_DIR, '.speclore'))).toBe(false);

      await executeVerifyTool({}, TEST_DIR);

      expect(existsSync(join(TEST_DIR, '.speclore', 'config.yaml'))).toBe(true);
    });
  });

  describe('executeCodeTool guard', () => {
    it('should return error when no .feature files exist', async () => {
      const result = await executeCodeTool({}, TEST_DIR);

      expect(result.writtenFiles).toEqual([]);
      expect(result.workflow.currentState).toBe('uninitialized');
      expect(result.workflow.nextStep).toContain('speclore.spec');
    });
  });

  describe('executeVerifyTool guard', () => {
    it('should return error when feature has no test scaffolding', async () => {
      // Create a feature file and state entry (specified only, no constraints)
      mkdirSync(join(TEST_DIR, 'specs', 'test'), { recursive: true });
      const featurePath = join(TEST_DIR, 'specs', 'test', 'demo.feature');
      writeFileSync(featurePath, 'Feature: Demo\n  Scenario: test\n', 'utf-8');

      // Initialize state with feature in 'specified' state
      const { StateManager } = await import('../../src/core/state-manager/index.js');
      const sm = new StateManager(TEST_DIR);
      sm.ensureInitialized();
      sm.transitionFeature(featurePath, 'specified');

      const result = await executeVerifyTool({}, TEST_DIR);

      expect(result.passed).toBe(0);
      expect(result.workflow.currentState).toBe('specified');
      expect(result.workflow.nextStep).toContain('speclore.code');
    });
  });
});
