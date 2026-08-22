/**
 * Anthropic Claude adapter.
 *
 * Environment: ANTHROPIC_API_KEY
 *
 * @module ai/claude-adapter
 */

import Anthropic, { RateLimitError, InternalServerError, APIConnectionError } from '@anthropic-ai/sdk';
import { BaseAdapter } from './base-adapter.js';
import type { GenerateOptions, GenerateResult } from './provider.js';

export class ClaudeAdapter extends BaseAdapter {
  readonly name = 'claude';
  protected readonly model: string;
  private client: Anthropic | null = null;

  constructor(model?: string, apiKeyEnv?: string) {
    super();
    this.model = model ?? 'claude-sonnet-4-20250514';
    const apiKey = process.env[apiKeyEnv ?? 'ANTHROPIC_API_KEY'] ?? process.env['ANTHROPIC_API_KEY'] ?? '';

    if (apiKey) {
      // SDK retries disabled — BaseAdapter.withRetry handles all retry logic
      this.client = new Anthropic({ apiKey, maxRetries: 0 });
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  protected override isRetryableError(error: unknown): boolean {
    if (error instanceof RateLimitError) return true;
    if (error instanceof InternalServerError) return true;
    if (error instanceof APIConnectionError) return true;
    return false;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Set ANTHROPIC_API_KEY environment variable.');
    }

    const result = await this.withRetry(async () => {
      const { controller, cleanup } = this.createTimeoutController(options);
      try {
        const response = await this.client!.messages.create(
          {
            model: this.model,
            max_tokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.3,
            messages: [{ role: 'user', content: prompt }],
          },
          { signal: controller.signal },
        );

        const content = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        return {
          content,
          usage: {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          },
        };
      } finally {
        cleanup();
      }
    }, 'Claude');

    this.recordCost(result.usage);
    return result;
  }

  async generateWithImage(prompt: string, image: { buffer: Buffer; mimeType: string }, options?: GenerateOptions): Promise<GenerateResult> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Set ANTHROPIC_API_KEY environment variable.');
    }

    const base64Image = image.buffer.toString('base64');

    const messages = [
      {
        role: 'user' as const,
        content: [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: image.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64Image,
            },
          },
          { type: 'text' as const, text: prompt },
        ],
      },
    ];

    const result = await this.withRetry(async () => {
      const { controller, cleanup } = this.createTimeoutController(options);
      try {
        const response = await this.client!.messages.create(
          {
            model: this.model,
            max_tokens: options?.maxTokens ?? 4096,
            temperature: options?.temperature ?? 0.3,
            messages,
          },
          { signal: controller.signal },
        );

        const content = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map(block => block.text)
          .join('\n');

        return {
          content,
          usage: {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          },
        };
      } finally {
        cleanup();
      }
    }, 'Claude Vision');

    this.recordCost(result.usage);
    return result;
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized. Set ANTHROPIC_API_KEY environment variable.');
    }

    const { controller, cleanup } = this.createTimeoutController(options);
    try {
      const stream = this.client.messages.stream(
        {
          model: this.model,
          max_tokens: options?.maxTokens ?? 4096,
          temperature: options?.temperature ?? 0.3,
          messages: [{ role: 'user', content: prompt }],
        },
        { signal: controller.signal },
      );

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } finally {
      cleanup();
    }
  }
}
