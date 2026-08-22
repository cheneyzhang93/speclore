/**
 * Tests for ai/base-adapter — retry logic, smart error classification, and timeout.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseAdapter } from '../../src/ai/base-adapter.js';
import type { GenerateOptions, GenerateResult } from '../../src/ai/provider.js';

/** Concrete test adapter exposing protected BaseAdapter methods */
class TestAdapter extends BaseAdapter {
  readonly name = 'test';
  protected readonly model = 'test-model';
  protected readonly maxRetries = 3;
  protected readonly retryBaseDelayMs = 10; // fast for tests

  isAvailable(): boolean { return true; }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    return this.withRetry(async () => {
      const { controller, cleanup } = this.createTimeoutController(options);
      try {
        return { content: 'ok', usage: undefined };
      } finally {
        cleanup();
      }
    }, 'Test');
  }

  // Expose protected methods for testing
  public testWithRetry<T>(operation: (attempt: number) => Promise<T>, label: string): Promise<T> {
    return this.withRetry(operation, label);
  }

  public testIsRetryableError(error: unknown): boolean {
    return this.isRetryableError(error);
  }

  public testCreateTimeoutController(options?: GenerateOptions) {
    return this.createTimeoutController(options);
  }
}

describe('BaseAdapter — isRetryableError (default)', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  it('should retry on network errors', () => {
    expect(adapter.testIsRetryableError(new Error('ECONNRESET'))).toBe(true);
    expect(adapter.testIsRetryableError(new Error('getaddrinfo ENOTFOUND api.example.com'))).toBe(true);
    expect(adapter.testIsRetryableError(new Error('ETIMEDOUT'))).toBe(true);
  });

  it('should NOT retry unknown errors by default', () => {
    expect(adapter.testIsRetryableError(new Error('Something unexpected'))).toBe(false);
    expect(adapter.testIsRetryableError(new Error('400 Bad Request'))).toBe(false);
    expect(adapter.testIsRetryableError(new Error('429 rate limit'))).toBe(false);
    expect(adapter.testIsRetryableError(new Error('500 server error'))).toBe(false);
  });

  it('should handle non-Error values', () => {
    expect(adapter.testIsRetryableError('some string')).toBe(false);
    expect(adapter.testIsRetryableError(null)).toBe(false);
    expect(adapter.testIsRetryableError(undefined)).toBe(false);
  });
});

describe('BaseAdapter — isRetryableError (subclass override with SDK classes)', () => {
  it('should use instanceof for precise error classification', () => {
    // Simulate SDK error classes
    class RateLimitError extends Error { constructor() { super('429'); this.name = 'RateLimitError'; } }
    class BadRequestError extends Error { constructor() { super('400'); this.name = 'BadRequestError'; } }
    class InternalServerError extends Error { constructor() { super('500'); this.name = 'InternalServerError'; } }

    class SDKAdapter extends TestAdapter {
      protected override isRetryableError(error: unknown): boolean {
        if (error instanceof RateLimitError) return true;
        if (error instanceof InternalServerError) return true;
        return false;
      }
    }

    const adapter = new SDKAdapter();
    expect(adapter.testIsRetryableError(new RateLimitError())).toBe(true);
    expect(adapter.testIsRetryableError(new InternalServerError())).toBe(true);
    expect(adapter.testIsRetryableError(new BadRequestError())).toBe(false);
    expect(adapter.testIsRetryableError(new Error('unknown'))).toBe(false);
  });
});

describe('BaseAdapter — withRetry', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  it('should return on first success', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await adapter.testWithRetry(operation, 'Test');
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('success');

    const result = await adapter.testWithRetry(operation, 'Test');
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw after all retries exhausted', async () => {
    const operation = vi.fn()
      .mockRejectedValue(new Error('ECONNRESET'));

    await expect(adapter.testWithRetry(operation, 'Test')).rejects.toThrow('ECONNRESET');
    expect(operation).toHaveBeenCalledTimes(3); // maxRetries = 3
  });

  it('should throw immediately on non-retryable errors', async () => {
    // Default BaseAdapter only retries network errors
    const operation = vi.fn().mockRejectedValue(new Error('400 Bad Request'));

    await expect(adapter.testWithRetry(operation, 'Test')).rejects.toThrow('400 Bad Request');
    expect(operation).toHaveBeenCalledTimes(1); // No retries
  });
});

describe('BaseAdapter — createTimeoutController', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
    vi.useRealTimers();
  });

  it('should create a controller without timeout', () => {
    const { controller, cleanup } = adapter.testCreateTimeoutController();
    expect(controller).toBeInstanceOf(AbortController);
    expect(controller.signal.aborted).toBe(false);
    cleanup();
  });

  it('should abort controller when timeout expires', async () => {
    vi.useFakeTimers();
    const { controller, cleanup } = adapter.testCreateTimeoutController({ timeoutMs: 100 });
    expect(controller.signal.aborted).toBe(false);

    vi.advanceTimersByTime(100);
    expect(controller.signal.aborted).toBe(true);

    cleanup();
    vi.useRealTimers();
  });

  it('should not abort before timeout', async () => {
    vi.useFakeTimers();
    const { controller, cleanup } = adapter.testCreateTimeoutController({ timeoutMs: 500 });

    vi.advanceTimersByTime(499);
    expect(controller.signal.aborted).toBe(false);

    cleanup();
    vi.useRealTimers();
  });

  it('should link to user-provided AbortSignal', () => {
    const userController = new AbortController();
    const { controller, cleanup } = adapter.testCreateTimeoutController({ signal: userController.signal });

    expect(controller.signal.aborted).toBe(false);
    userController.abort();
    expect(controller.signal.aborted).toBe(true);

    cleanup();
  });

  it('should handle already-aborted user signal', () => {
    const userController = new AbortController();
    userController.abort();

    const { controller, cleanup } = adapter.testCreateTimeoutController({ signal: userController.signal });
    expect(controller.signal.aborted).toBe(true);

    cleanup();
  });

  it('should clean up timer on cleanup()', async () => {
    vi.useFakeTimers();
    const { controller, cleanup } = adapter.testCreateTimeoutController({ timeoutMs: 100 });
    cleanup();

    // Advancing time after cleanup should not cause issues
    vi.advanceTimersByTime(200);
    expect(controller.signal.aborted).toBe(false); // Timer was cleared

    vi.useRealTimers();
  });

  it('should remove abort listener on cleanup()', () => {
    const userController = new AbortController();
    const removeSpy = vi.spyOn(userController.signal, 'removeEventListener');

    const { controller, cleanup } = adapter.testCreateTimeoutController({ signal: userController.signal });
    expect(controller.signal.aborted).toBe(false);

    cleanup();
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));

    removeSpy.mockRestore();
  });
});
