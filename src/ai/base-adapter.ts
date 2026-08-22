/**
 * Base adapter — shared retry, backoff, and cost-tracking logic for all AI providers.
 *
 * Each concrete adapter (OpenAI, Claude, Ollama) extends this class
 * and implements the provider-specific API call inside `withRetry`.
 *
 * @module ai/base-adapter
 */

import type { AIProvider, GenerateOptions, GenerateResult } from './provider.js';
import { getCostTracker } from './cost-tracker.js';
import { logger } from '../infra/logger.js';

/**
 * Abstract base for AI provider adapters.
 * Provides retry-with-exponential-backoff and cost tracking.
 */
export abstract class BaseAdapter implements AIProvider {
  abstract readonly name: string;

  /** Maximum retry attempts (override in subclass) */
  protected readonly maxRetries: number = 3;

  /** Base delay in ms for exponential backoff (override in subclass) */
  protected readonly retryBaseDelayMs: number = 1000;

  /** Model identifier — used for cost tracking */
  protected abstract readonly model: string;

  abstract isAvailable(): boolean;
  abstract generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  abstract generateWithImage?(
    prompt: string,
    image: { buffer: Buffer; mimeType: string },
    options?: GenerateOptions,
  ): Promise<GenerateResult>;

  /**
   * Execute an async operation with retry + exponential backoff.
   * Only retries on retryable errors (429, 5xx); client errors (4xx) are thrown immediately.
   * Returns the result on success; throws the last error after all retries exhausted.
   */
  protected async withRetry<T>(operation: (attempt: number) => Promise<T>, label: string): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation(attempt);
      } catch (error) {
        if (!this.isRetryableError(error)) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.warn(`${label} non-retryable error: ${err.message}`);
          throw err;
        }

        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`${label} attempt ${attempt + 1}/${this.maxRetries} failed: ${lastError.message}`);

        if (attempt < this.maxRetries - 1) {
          const delay = this.retryBaseDelayMs * Math.pow(2, attempt);
          await BaseAdapter.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error(`${label} failed after ${this.maxRetries} retries`);
  }

  /**
   * Determine whether an error is retryable.
   * Default: only retry on network-level errors (ECONNRESET, ENOTFOUND, ETIMEDOUT).
   * Subclasses should override to use SDK-specific error classes for precise classification.
   */
  protected isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      // Network errors are retryable
      if (msg.includes('econnreset') || msg.includes('enotfound') || msg.includes('etimedout')) return true;
    }
    // Default: don't retry unknown errors (subclasses override with SDK-specific classes)
    return false;
  }

  /**
   * Create an AbortController linked to an optional user signal and timeout.
   * Returns the controller and a cleanup function to clear timers.
   */
  protected createTimeoutController(options?: GenerateOptions): { controller: AbortController; cleanup: () => void } {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortHandler: (() => void) | undefined;

    if (options?.timeoutMs) {
      timer = setTimeout(() => controller.abort(), options.timeoutMs);
    }

    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        abortHandler = () => controller.abort();
        options.signal.addEventListener('abort', abortHandler, { once: true });
      }
    }

    return {
      controller,
      cleanup: () => {
        if (timer) clearTimeout(timer);
        if (abortHandler && options?.signal) {
          options.signal.removeEventListener('abort', abortHandler);
        }
      },
    };
  }

  /**
   * Record token usage to the global cost tracker.
   * Silently skips if usage is undefined (some providers don't report it).
   */
  protected recordCost(usage?: { promptTokens: number; completionTokens: number }): void {
    if (usage) {
      getCostTracker().recordUsage(this.model, usage.promptTokens, usage.completionTokens);
    }
  }

  /** Shared sleep utility */
  protected static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
