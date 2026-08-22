/**
 * Tests for ai/provider — provider creation and factory.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createProvider, createProviderChain } from '../../src/ai/provider.js';

describe('createProvider', () => {
  afterEach(() => {
    // Clean up env vars
    delete process.env['TEST_OPENAI_KEY'];
  });

  it('should create openai-compatible provider by default', async () => {
    const provider = await createProvider();
    expect(provider.name).toBe('openai-compatible');
  });

  it('should create openai-compatible provider with explicit config', async () => {
    const provider = await createProvider({ provider: 'openai-compatible' });
    expect(provider.name).toBe('openai-compatible');
  });

  it('should create claude provider', async () => {
    const provider = await createProvider({ provider: 'claude' });
    expect(provider.name).toBe('claude');
  });

  it('should create ollama provider', async () => {
    const provider = await createProvider({ provider: 'ollama' });
    expect(provider.name).toBe('ollama');
  });

  it('should throw for unknown provider', async () => {
    await expect(createProvider({ provider: 'unknown-provider' as any }))
      .rejects.toThrow('Unknown AI provider: unknown-provider');
  });

  it('should report availability based on API key', async () => {
    // Without API key, provider should not be available
    const provider = await createProvider({ provider: 'openai-compatible', apiKeyEnv: 'TEST_OPENAI_KEY' });
    expect(provider.isAvailable()).toBe(false);

    // With API key, provider should be available
    process.env['TEST_OPENAI_KEY'] = 'sk-test-key';
    const provider2 = await createProvider({ provider: 'openai-compatible', apiKeyEnv: 'TEST_OPENAI_KEY' });
    expect(provider2.isAvailable()).toBe(true);
  });

  it('should use custom model from config', async () => {
    process.env['TEST_OPENAI_KEY'] = 'sk-test-key';
    const provider = await createProvider({
      provider: 'openai-compatible',
      model: 'gpt-3.5-turbo',
      apiKeyEnv: 'TEST_OPENAI_KEY',
    });
    expect(provider.name).toBe('openai-compatible');
    // Model is internal to the adapter, we can only verify it was created
    expect(provider.isAvailable()).toBe(true);
  });
});

describe('createProviderChain', () => {
  afterEach(() => {
    delete process.env['TEST_CHAIN_KEY'];
  });

  it('should select the first available provider in the chain', async () => {
    process.env['TEST_CHAIN_KEY'] = 'sk-test';
    const provider = await createProviderChain([
      { provider: 'openai-compatible', apiKeyEnv: 'TEST_CHAIN_KEY' },
      { provider: 'ollama' },
    ]);
    expect(provider.name).toBe('openai-compatible');
  });

  it('should fall back to next provider when first is unavailable', async () => {
    // First provider has no API key, second (ollama) should be tried
    const provider = await createProviderChain([
      { provider: 'openai-compatible', apiKeyEnv: 'NONEXISTENT_KEY_12345' },
      { provider: 'ollama' },
    ]);
    expect(provider.name).toBe('ollama');
  });

  it('should throw when all providers are unavailable', async () => {
    await expect(createProviderChain([
      { provider: 'openai-compatible', apiKeyEnv: 'NONEXISTENT_KEY_A' },
      { provider: 'openai-compatible', apiKeyEnv: 'NONEXISTENT_KEY_B' },
    ])).rejects.toThrow(/All providers.*unavailable/);
  });
});
