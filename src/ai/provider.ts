/**
 * AI Provider abstraction — unified interface for all AI backends.
 *
 * @module ai/provider
 */

/** Options for a single generation call */
export interface GenerateOptions {
  /** Max tokens to generate */
  maxTokens?: number;
  /** Temperature (0-2) */
  temperature?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

/** Result from an AI generation call */
export interface GenerateResult {
  content: string;
  /** Token usage if reported by the provider */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** AI Provider interface — all adapters must implement this */
export interface AIProvider {
  /** Provider identifier */
  readonly name: string;

  /** Check if the provider is available (API key set, endpoint reachable) */
  isAvailable(): boolean;

  /** Generate text from a prompt */
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;

  /**
   * Generate text from a prompt + image (multimodal vision API).
   * Providers that don't support vision should throw an error.
   */
  generateWithImage?(prompt: string, image: { buffer: Buffer; mimeType: string }, options?: GenerateOptions): Promise<GenerateResult>;

  /**
   * Stream text generation. Returns an async iterable of text chunks.
   * Providers that don't support streaming should not implement this.
   */
  generateStream?(prompt: string, options?: GenerateOptions): AsyncIterable<string>;
}

/** Create an AI provider based on config */
export async function createProvider(
  config?: { provider?: string; baseUrl?: string; model?: string; apiKeyEnv?: string },
): Promise<AIProvider> {
  const provider = config?.provider ?? 'openai-compatible';

  switch (provider) {
    case 'openai-compatible': {
      const { OpenAIAdapter } = await import('./openai-adapter.js');
      return new OpenAIAdapter(config?.baseUrl, config?.model, config?.apiKeyEnv);
    }
    case 'claude': {
      const { ClaudeAdapter } = await import('./claude-adapter.js');
      return new ClaudeAdapter(config?.model, config?.apiKeyEnv);
    }
    case 'ollama': {
      const { OllamaAdapter } = await import('./ollama-adapter.js');
      return new OllamaAdapter(config?.baseUrl, config?.model);
    }
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

/**
 * Create a fallback chain of providers.
 * Tries each provider in order; if one is unavailable, falls back to the next.
 * The returned provider wraps the first available one.
 */
export async function createProviderChain(
  configs: Array<{ provider?: string; baseUrl?: string; model?: string; apiKeyEnv?: string }>,
): Promise<AIProvider> {
  const { logger } = await import('../infra/logger.js');
  const errors: string[] = [];

  for (const config of configs) {
    try {
      const provider = await createProvider(config);
      if (provider.isAvailable()) {
        logger.debug(`Provider chain: using '${provider.name}'`);
        return provider;
      }
      errors.push(`${config.provider ?? 'openai-compatible'}: not available (API key not set)`);
    } catch (err) {
      errors.push(`${config.provider ?? 'openai-compatible'}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`All providers in chain unavailable:\n  ${errors.join('\n  ')}`);
}
