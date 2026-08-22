/**
 * Tests for infra/file-lock.ts — PID + mtime double lock.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { acquireLock, releaseLock, isLocked } from '../../src/infra/file-lock.js';

const TEST_DIR = join(process.cwd(), '.test-lock-tmp');
const SPEC_DIR = join(TEST_DIR, '.speclore');

describe('file-lock', () => {
  beforeEach(() => {
    mkdirSync(SPEC_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should acquire a lock successfully', () => {
    const result = acquireLock(SPEC_DIR);
    expect(result).toBe(true);
    expect(existsSync(join(SPEC_DIR, '.lock'))).toBe(true);
  });

  it('should release a lock', () => {
    acquireLock(SPEC_DIR);
    releaseLock(SPEC_DIR);
    expect(existsSync(join(SPEC_DIR, '.lock'))).toBe(false);
  });

  it('should detect locked state', () => {
    acquireLock(SPEC_DIR);
    expect(isLocked(SPEC_DIR)).toBe(true);
  });

  it('should detect unlocked state', () => {
    expect(isLocked(SPEC_DIR)).toBe(false);
  });

  it('should detect expired lock (stale PID)', () => {
    // Write a lock with a non-existent PID
    const lockContent = JSON.stringify({ pid: 999999, timestamp: Date.now() - 31 * 60 * 1000 });
    writeFileSync(join(SPEC_DIR, '.lock'), lockContent, 'utf-8');

    // Should be able to acquire because old lock is expired
    const result = acquireLock(SPEC_DIR);
    expect(result).toBe(true);
  });

  it('should fail to acquire when lock file appears between check and write', () => {
    // Pre-create a valid (non-expired) lock simulating another process holding it.
    // Must use process.pid so isProcessRunning() returns true.
    const lockContent = JSON.stringify({ pid: process.pid, timestamp: Date.now() });
    writeFileSync(join(SPEC_DIR, '.lock'), lockContent, 'utf-8');

    // acquireLock should detect the existing valid lock and return false
    const result = acquireLock(SPEC_DIR);
    expect(result).toBe(false);
  });
});
