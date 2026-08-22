/**
 * PID + mtime dual-check file lock.
 *
 * Lock file: `.speclore/.lock`
 * - Acquire: write PID + timestamp
 * - Release: delete lock file
 * - Expired: PID process does not exist OR mtime > 30 minutes
 * - Crash recovery: stale lock auto-expires, never blocks next startup
 *
 * @module infra/file-lock
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';

const LOCK_FILENAME = '.lock';
const LOCK_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

export interface LockInfo {
  pid: number;
  timestamp: number;
}

/**
 * Acquire the file lock.
 * @returns true if lock was acquired, false if already locked (and not expired)
 */
export function acquireLock(specLoreDir: string): boolean {
  const lockPath = join(specLoreDir, LOCK_FILENAME);

  // Check if an existing lock is still valid
  if (existsSync(lockPath)) {
    const existing = readLockInfo(lockPath);
    if (existing && !isLockExpired(existing)) {
      logger.debug(`Lock already held by PID ${existing.pid}, not expired`);
      return false;
    }
    // Stale lock — remove it
    logger.debug('Removing stale lock file');
    safeUnlink(lockPath);
  }

  // Write new lock atomically with exclusive-create flag.
  // If another process wins the race, writeFileSync throws and we catch it.
  const lockInfo: LockInfo = {
    pid: process.pid,
    timestamp: Date.now(),
  };
  try {
    writeFileSync(lockPath, JSON.stringify(lockInfo), { flag: 'wx', encoding: 'utf-8' });
  } catch {
    // Another process acquired the lock between our check and write
    logger.debug('Lock write failed — another process may have acquired it');
    return false;
  }
  logger.debug(`Lock acquired by PID ${process.pid}`);
  return true;
}

/**
 * Release the file lock.
 * Only releases if the current process owns the lock.
 */
export function releaseLock(specLoreDir: string): void {
  const lockPath = join(specLoreDir, LOCK_FILENAME);

  if (!existsSync(lockPath)) {
    return;
  }

  const existing = readLockInfo(lockPath);
  if (existing && existing.pid === process.pid) {
    safeUnlink(lockPath);
    logger.debug('Lock released');
  }
}

/**
 * Check if a lock is currently held (and not expired).
 */
export function isLocked(specLoreDir: string): boolean {
  const lockPath = join(specLoreDir, LOCK_FILENAME);

  if (!existsSync(lockPath)) {
    return false;
  }

  const existing = readLockInfo(lockPath);
  if (!existing) {
    return false;
  }

  return !isLockExpired(existing);
}

/**
 * Read lock info from file. Returns null if file is corrupt.
 */
function readLockInfo(lockPath: string): LockInfo | null {
  try {
    const content = readFileSync(lockPath, 'utf-8');
    const parsed = JSON.parse(content) as LockInfo;
    if (typeof parsed.pid === 'number' && typeof parsed.timestamp === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a lock has expired.
 * Expired when: PID process does not exist OR mtime > 30 minutes.
 */
function isLockExpired(lockInfo: LockInfo): boolean {
  // Check mtime expiry
  if (Date.now() - lockInfo.timestamp > LOCK_EXPIRY_MS) {
    logger.debug(`Lock expired: age ${Date.now() - lockInfo.timestamp}ms > ${LOCK_EXPIRY_MS}ms`);
    return true;
  }

  // Check PID existence
  if (!isProcessRunning(lockInfo.pid)) {
    logger.debug(`Lock expired: PID ${lockInfo.pid} not running`);
    return true;
  }

  return false;
}

/**
 * Check if a process with the given PID is running.
 */
function isProcessRunning(pid: number): boolean {
  try {
    // Signal 0 does not kill the process, just checks if it exists
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely delete a file, ignoring errors.
 */
function safeUnlink(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch {
    // Ignore — file may have been removed by another process
  }
}

/**
 * Get lock file mtime for external expiry checks (e.g. context.json cache).
 */
export function getLockMtime(specLoreDir: string): number | null {
  const lockPath = join(specLoreDir, LOCK_FILENAME);
  try {
    if (!existsSync(lockPath)) return null;
    const stat = statSync(lockPath);
    return stat.mtimeMs;
  } catch {
    return null;
  }
}
