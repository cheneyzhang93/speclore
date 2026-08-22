/**
 * Ollama adapter — local model inference.
 *
 * Default endpoint: http://localhost:11434
 *
 * @module ai/ollama-adapter
 */

import { BaseAdapter } from './base-adapter.js';
import type { GenerateOptions, GenerateResult } from './provider.js';

const DEFAULT_BASE_URL = 'http://localhost:11434';

export class OllamaAdapter extends BaseAdapter {
  readonly name = 'ollama';
  protected readonly model: string;
  protected readonly retryBaseDelayMs = 2000;
  private baseUrl: string;

  constructor(baseUrl?: string, model?: string) {
    super();
    this.baseUrl = baseUrl ?? DEFAULT_BASE_URL;
    this.model = model ?? 'llama3';
  }

  isAvailable(): boolean {
    // Ollama is always "available" locally — connection is checked at generate time
    return true;
  }

  protected override isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const msg = error.message.toLowerCase();
    if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) return true;
    if (msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('enotfound')) return true;
    return false;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    const result = await this.withRetry(async () => {
      const { controller, cleanup } = this.createTimeoutController(options);
      try {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            prompt,
            stream: false,
            options: {
              temperature: options?.temperature ?? 0.3,
              num_predict: options?.maxTokens,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as {
          response: string;
          prompt_eval_count?: number;
          eval_count?: number;
        };

        return {
          content: data.response,
          usage: data.prompt_eval_count
            ? {
                promptTokens: data.prompt_eval_count,
                completionTokens: data.eval_count ?? 0,
                totalTokens: data.prompt_eval_count + (data.eval_count ?? 0),
              }
            : undefined,
        };
      } finally {
        cleanup();
      }
    }, 'Ollama');

    this.recordCost(result.usage);
    return result;
  }

  async generateWithImage(prompt: string, image: { buffer: Buffer; mimeType: string }, options?: GenerateOptions): Promise<GenerateResult> {
    const base64Image = image.buffer.toString('base64');

    const result = await this.withRetry(async () => {
      const { controller, cleanup } = this.createTimeoutController(options);
      try {
        const response = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            prompt,
            images: [base64Image],
            stream: false,
            options: {
              temperature: options?.temperature ?? 0.3,
              num_predict: options?.maxTokens,
            },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as {
          response: string;
          prompt_eval_count?: number;
          eval_count?: number;
        };

        return {
          content: data.response,
          usage: data.prompt_eval_count
            ? {
                promptTokens: data.prompt_eval_count,
                completionTokens: data.eval_count ?? 0,
                totalTokens: data.prompt_eval_count + (data.eval_count ?? 0),
              }
            : undefined,
        };
      } finally {
        cleanup();
      }
    }, 'Ollama Vision');

    this.recordCost(result.usage);
    return result;
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const { controller, cleanup } = this.createTimeoutController(options);
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: true,
          options: {
            temperature: options?.temperature ?? 0.3,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Ollama streaming response has no body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read() as { done: boolean; value: Uint8Array | undefined };
        if (done) break;
        const lines = decoder.decode(value ?? new Uint8Array()).trim().split('\n');
        for (const line of lines) {
          if (!line) continue;
          try {
            const data = JSON.parse(line) as { response?: string };
            if (data.response) yield data.response;
          } catch {
            // Skip malformed NDJSON lines
          }
        }
      }
    } finally {
      cleanup();
    }
  }
}
