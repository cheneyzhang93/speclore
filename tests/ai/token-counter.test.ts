/**
 * Token counter unit tests.
 */

import { describe, it, expect } from 'vitest';
import { estimateTokenCount, getModelContextWindow, estimateTokens } from '../../src/ai/token-counter.js';

describe('estimateTokenCount', () => {
  it('should return 0 for empty string', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('should estimate English text at ~4 chars/token', () => {
    // "Hello world" = 11 chars → ~3 tokens (11/4 = 2.75, ceil = 3)
    const result = estimateTokenCount('Hello world');
    expect(result).toBeGreaterThanOrEqual(2);
    expect(result).toBeLessThanOrEqual(5);
  });

  it('should estimate CJK text at ~1.5 chars/token', () => {
    // 6 CJK chars → 6/1.5 = 4 tokens
    // 10 CJK chars → 10/1.5 = 6.67, ceil = 7
    const result = estimateTokenCount('用户注册需要邮箱验证');
    expect(result).toBeGreaterThanOrEqual(5);
    expect(result).toBeLessThanOrEqual(8);
  });

  it('should handle mixed CJK and English text', () => {
    const result = estimateTokenCount('Hello 世界, this is a test 测试');
    expect(result).toBeGreaterThan(0);
    // Mixed text should be between pure-CJK and pure-English estimates
  });

  it('should handle whitespace and punctuation', () => {
    const result = estimateTokenCount('  \n\n  ...  ');
    expect(result).toBeGreaterThan(0);
  });
});

describe('getModelContextWindow', () => {
  it('should return exact match for known models', () => {
    expect(getModelContextWindow('gpt-4')).toBe(8_192);
    expect(getModelContextWindow('gpt-4o')).toBe(128_000);
    expect(getModelContextWindow('claude-3-5-sonnet-20241022')).toBe(200_000);
  });

  it('should return prefix match for dated model variants', () => {
    expect(getModelContextWindow('gpt-4o-2024-05-13')).toBe(128_000);
  });

  it('should return default for unknown models', () => {
    expect(getModelContextWindow('unknown-model-v99')).toBe(8_192);
  });

  it('should handle Ollama model names', () => {
    expect(getModelContextWindow('llama3')).toBe(8_192);
    expect(getModelContextWindow('llama3.1')).toBe(128_000);
    expect(getModelContextWindow('mistral')).toBe(8_192);
  });
});

describe('estimateTokens', () => {
  it('should return token count and context window', () => {
    const result = estimateTokens('Hello world', 'gpt-4o');
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(result.modelContextWindow).toBe(128_000);
    expect(result.exceedsLimit).toBe(false);
  });

  it('should detect when tokens exceed context window', () => {
    // Generate a very long string that would exceed a small context window
    const longText = 'a'.repeat(50_000); // ~12500 tokens at 4 chars/token
    const result = estimateTokens(longText, 'gpt-4'); // 8192 window
    expect(result.exceedsLimit).toBe(true);
  });

  it('should not exceed for short prompts', () => {
    const result = estimateTokens('Write a feature file for user login', 'gpt-4o');
    expect(result.exceedsLimit).toBe(false);
  });
});
