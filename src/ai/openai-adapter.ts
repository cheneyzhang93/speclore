/**
 * OpenAI-compatible adapter.
 *
 * Supports OpenAI API, Azure OpenAI, and any OpenAI-compatible endpoint.
 * Environment: OPENAI_API_KEY, OPENAI_BASE_URL
 *
 * @module ai/openai-adapter
 */

import OpenAI, { RateLimitError, InternalServerError, APIConnectionError } from 'openai';
import { BaseAdapter } from './base-adapter.js';
import type { GenerateOptions, GenerateResult } from './provider.js';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export class OpenAIAdapter extends BaseAdapter {
  readonly name = 'openai-compatible';
  protected readonly model: string;
  private client: OpenAI | null = null;

  constructor(baseUrl?: string, model?: string, apiKeyEnv?: string) {
    super();
    this.model = model ?? 'gpt-4';
    const apiKey = process.env[apiKeyEnv ?? 'OPENAI_API_KEY'] ?? process.env['OPENAI_API_KEY'] ?? '';
    const baseURL = baseUrl ?? process.env['OPENAI_BASE_URL'];

    if (apiKey) {
      // SDK retries disabled — BaseAdapter.withRetry handles all retry logic
      this.client = new OpenAI({ apiKey, baseURL: baseURL ?? undefined, maxRetries: 0 });
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
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    const result = await this.withRetry(async () => {
      const { controller, cleanup } = this.createTimeoutController(options);
      try {
        const response = await this.client!.chat.completions.create(
          {
            model: this.model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: options?.maxTokens,
            temperature: options?.temperature ?? 0.3,
          },
          { signal: controller.signal },
        );

        const content = response.choices[0]?.message?.content ?? '';
        const usage = response.usage;

        return {
          content,
          usage: usage
            ? {
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
              }
            : undefined,
        };
      } finally {
        cleanup();
      }
    }, 'OpenAI');

    this.recordCost(result.usage);
    return result;
  }

  async generateWithImage(prompt: string, image: { buffer: Buffer; mimeType: string }, options?: GenerateOptions): Promise<GenerateResult> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    const base64Image = image.buffer.toString('base64');
    const dataUrl = `data:${image.mimeType};base64,${base64Image}`;

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ];

    const result = await this.withRetry(async () => {
      const { controller, cleanup } = this.createTimeoutController(options);
      try {
        const response = await this.client!.chat.completions.create(
          {
            model: this.model,
            messages,
            max_tokens: options?.maxTokens,
            temperature: options?.temperature ?? 0.3,
          },
          { signal: controller.signal },
        );

        const content = response.choices[0]?.message?.content ?? '';
        const usage = response.usage;

        return {
          content,
          usage: usage
            ? {
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
              }
            : undefined,
        };
      } finally {
        cleanup();
      }
    }, 'OpenAI Vision');

    this.recordCost(result.usage);
    return result;
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Set OPENAI_API_KEY environment variable.');
    }

    const { controller, cleanup } = this.createTimeoutController(options);
    try {
      const stream = await this.client.chat.completions.create(
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens,
          temperature: options?.temperature ?? 0.3,
          stream: true,
        },
        { signal: controller.signal },
      );

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) yield delta;
      }
    } finally {
      cleanup();
    }
  }
}
