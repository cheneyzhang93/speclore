/**
 * Logger unit tests.
 *
 * Tests logger API surface: level management, initLogger, and output methods.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Restore env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe('setLogLevel / getLogLevel', () => {
    it('should default to info level', async () => {
      const { getLogLevel } = await import('../../src/infra/logger.js');
      expect(getLogLevel()).toBe('info');
    });

    it('should set and get log level', async () => {
      const { setLogLevel, getLogLevel } = await import('../../src/infra/logger.js');
      setLogLevel('debug');
      expect(getLogLevel()).toBe('debug');

      setLogLevel('error');
      expect(getLogLevel()).toBe('error');
    });
  });

  describe('initLogger', () => {
    it('should set debug level when verbose is true', async () => {
      const { initLogger, getLogLevel } = await import('../../src/infra/logger.js');
      initLogger({ verbose: true });
      expect(getLogLevel()).toBe('debug');
    });

    it('should read level from SPECLORE_LOG_LEVEL env', async () => {
      process.env['SPECLORE_LOG_LEVEL'] = 'warn';
      const { initLogger, getLogLevel } = await import('../../src/infra/logger.js');
      initLogger();
      expect(getLogLevel()).toBe('warn');
    });

    it('should ignore invalid env level', async () => {
      process.env['SPECLORE_LOG_LEVEL'] = 'invalid';
      const { initLogger, getLogLevel } = await import('../../src/infra/logger.js');
      initLogger();
      expect(getLogLevel()).toBe('info'); // stays default
    });

    it('verbose flag should take precedence over env', async () => {
      process.env['SPECLORE_LOG_LEVEL'] = 'error';
      const { initLogger, getLogLevel } = await import('../../src/infra/logger.js');
      initLogger({ verbose: true });
      expect(getLogLevel()).toBe('debug');
    });
  });

  describe('logger methods', () => {
    it('should expose debug/info/warn/error methods', async () => {
      const { logger } = await import('../../src/infra/logger.js');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should expose setLevel shortcut', async () => {
      const { logger, getLogLevel } = await import('../../src/infra/logger.js');
      logger.setLevel('warn');
      expect(getLogLevel()).toBe('warn');
    });

    it('should call pino methods without throwing', async () => {
      const { logger } = await import('../../src/infra/logger.js');
      // These should not throw
      expect(() => logger.debug('test debug')).not.toThrow();
      expect(() => logger.info('test info')).not.toThrow();
      expect(() => logger.warn('test warn')).not.toThrow();
      expect(() => logger.error('test error')).not.toThrow();
    });

    it('should pass extra args to pino', async () => {
      const { logger } = await import('../../src/infra/logger.js');
      expect(() => logger.info('with data', { key: 'value' })).not.toThrow();
    });
  });
});
