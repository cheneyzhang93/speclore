/**
 * Token counter — approximate token estimation without external dependencies.
 *
 * Uses character-based heuristics tuned per language family:
 * - CJK characters ≈ 1.5 chars/token (dense information per token)
 * - Latin script ≈ 4 chars/token (standard BPE average)
 * - Mixed text uses weighted average
 *
 * Also provides model context window lookup for overflow detection.
 *
 * @module ai/token-counter
 */

/** Result of token estimation */
export interface TokenCountResult {
  /** Estimated token count */
  tokenCount: number;
  /** Whether the estimate exceeds the model's context window */
  exceedsLimit: boolean;
  /** The model's maximum context window in tokens */
  modelContextWindow: number;
}

/**
 * Known model context windows (in tokens).
 * Covers major OpenAI, Anthropic, Meta, and Ollama models.
 */
const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  // OpenAI
  'gpt-4': 8_192,
  'gpt-4-turbo': 128_000,
  'gpt-4o': 128_000,
  'gpt-4o-mini': 128_000,
  'gpt-4o-2024-08-06': 128_000,
  'gpt-3.5-turbo': 16_385,
  'o1-preview': 128_000,
  'o1-mini': 128_000,
  // Anthropic
  'claude-3-5-sonnet-20241022': 200_000,
  'claude-3-5-haiku-20241022': 200_000,
  'claude-3-opus-20240229': 200_000,
  'claude-sonnet-4-20250514': 200_000,
  // Meta / Ollama common models
  'llama3': 8_192,
  'llama3:8b': 8_192,
  'llama3:70b': 8_192,
  'llama3.1': 128_000,
  'llama3.1:8b': 128_000,
  'llama3.1:70b': 128_000,
  'mistral': 8_192,
  'mixtral': 32_768,
  'codellama': 16_384,
  'phi3': 128_000,
  'gemma2': 8_192,
};

/** Default context window for unknown models */
const DEFAULT_CONTEXT_WINDOW = 8_192;

/** CJK Unicode range check */
function isCJK(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||   // CJK Unified Ideographs
    (code >= 0x3400 && code <= 0x4DBF) ||   // CJK Extension A
    (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
    (code >= 0x3000 && code <= 0x303F) ||   // CJK Symbols and Punctuation
    (code >= 0x3040 && code <= 0x309F) ||   // Hiragana
    (code >= 0x30A0 && code <= 0x30FF) ||   // Katakana
    (code >= 0xAC00 && code <= 0xD7AF)      // Hangul Syllables
  );
}

/**
 * Estimate the number of tokens in a text string.
 *
 * Uses character-level heuristics:
 * - CJK characters count as ~1.5 chars/token (each CJK char ≈ 0.67 tokens)
 * - Latin/ASCII characters count as ~4 chars/token
 * - Whitespace and punctuation are counted as part of the stream
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count (rounded up to nearest integer)
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.length === 0) return 0;

  let cjkChars = 0;
  let otherChars = 0;

  for (const char of text) {
    if (isCJK(char)) {
      cjkChars++;
    } else {
      otherChars++;
    }
  }

  // CJK: ~1.5 chars per token → tokens = cjkChars / 1.5
  // Latin: ~4 chars per token → tokens = otherChars / 4
  const cjkTokens = cjkChars / 1.5;
  const latinTokens = otherChars / 4;

  return Math.ceil(cjkTokens + latinTokens);
}

/**
 * Look up the context window size for a given model.
 *
 * @param model - Model identifier (e.g. 'gpt-4o', 'claude-3-5-sonnet-20241022')
 * @returns Context window size in tokens
 */
export function getModelContextWindow(model: string): number {
  // Exact match
  if (MODEL_CONTEXT_WINDOWS[model]) {
    return MODEL_CONTEXT_WINDOWS[model];
  }

  // Prefix match (e.g. 'gpt-4o-2024-05-13' → 'gpt-4o')
  // Sort by key length descending so longer prefixes match first
  const sortedEntries = Object.entries(MODEL_CONTEXT_WINDOWS)
    .sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, window] of sortedEntries) {
    if (model.startsWith(prefix)) {
      return window;
    }
  }

  return DEFAULT_CONTEXT_WINDOW;
}

/**
 * Estimate tokens and check against a model's context window.
 *
 * @param prompt - The prompt text to estimate tokens for
 * @param model - The target model identifier
 * @returns Token count result with overflow detection
 */
export function estimateTokens(prompt: string, model: string): TokenCountResult {
  const tokenCount = estimateTokenCount(prompt);
  const modelContextWindow = getModelContextWindow(model);

  return {
    tokenCount,
    exceedsLimit: tokenCount > modelContextWindow,
    modelContextWindow,
  };
}
