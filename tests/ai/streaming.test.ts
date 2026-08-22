/**
 * Tests for AI adapter streaming — generateStream support.
 */

import { describe, it, expect, vi } from 'vitest';
import { OpenAIAdapter } from '../../src/ai/openai-adapter.js';
import { ClaudeAdapter } from '../../src/ai/claude-adapter.js';
import { OllamaAdapter } from '../../src/ai/ollama-adapter.js';

/**
 * Type-safe helper to access the private `client` field on adapter instances.
 * Avoids `as any` casts while still allowing test-level mocking.
 */
function getPrivateClient<T>(adapter: object, field: string): T {
  return (adapter as Record<string, unknown>)[field] as T;
}

function setPrivateField(adapter: object, field: string, value: unknown): void {
  Object.defineProperty(adapter, field, { value, writable: true, configurable: true });
}

describe('OpenAIAdapter — generateStream', () => {
  it('should be defined', () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    const adapter = new OpenAIAdapter();
    expect(adapter.generateStream).toBeDefined();
    vi.unstubAllEnvs();
  });

  it('should yield text chunks from streaming response', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');

    const adapter = new OpenAIAdapter();
    const mockStream = (async function* () {
      yield { choices: [{ delta: { content: 'Hello ' } }] };
      yield { choices: [{ delta: { content: 'world' } }] };
      yield { choices: [{ delta: { content: '' } }] }; // empty delta, should be skipped
      yield { choices: [{ delta: { content: '!' } }] };
    })();

    // Access private client via type-safe helper and mock create
    interface MockOpenAIClient { chat: { completions: { create: ReturnType<typeof vi.fn> } } }
    const client = getPrivateClient<MockOpenAIClient>(adapter, 'client');
    client.chat.completions.create = vi.fn().mockResolvedValue(mockStream);

    const chunks: string[] = [];
    for await (const chunk of adapter.generateStream!('test prompt')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello ', 'world', '!']);
    vi.unstubAllEnvs();
  });

  it('should throw when client not initialized', async () => {
    const adapter = new OpenAIAdapter(undefined, undefined, 'NONEXISTENT_KEY');
    // Force client to null via type-safe helper
    setPrivateField(adapter, 'client', null);

    await expect(async () => {
      for await (const _ of adapter.generateStream!('test')) { /* drain */ }
    }).rejects.toThrow('client not initialized');
  });
});

describe('ClaudeAdapter — generateStream', () => {
  it('should be defined', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    const adapter = new ClaudeAdapter();
    expect(adapter.generateStream).toBeDefined();
    vi.unstubAllEnvs();
  });

  it('should yield text chunks from streaming events', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');

    const adapter = new ClaudeAdapter();
    const mockEvents = [
      { type: 'message_start' },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hello ' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'world' } },
      { type: 'message_stop' },
    ];

    const mockStreamObj = {
      [Symbol.asyncIterator]() {
        let i = 0;
        return {
          async next() {
            if (i < mockEvents.length) return { value: mockEvents[i++], done: false };
            return { value: undefined, done: true };
          },
        };
      },
    };

    interface MockAnthropicClient { messages: { stream: ReturnType<typeof vi.fn> } }
    const client = getPrivateClient<MockAnthropicClient>(adapter, 'client');
    client.messages.stream = vi.fn().mockReturnValue(mockStreamObj);

    const chunks: string[] = [];
    for await (const chunk of adapter.generateStream!('test prompt')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello ', 'world']);
    vi.unstubAllEnvs();
  });
});

describe('OllamaAdapter — generateStream', () => {
  it('should be defined', () => {
    const adapter = new OllamaAdapter();
    expect(adapter.generateStream).toBeDefined();
  });

  it('should yield text chunks from NDJSON stream', async () => {
    const adapter = new OllamaAdapter();

    // Mock fetch with a ReadableStream
    const ndjsonLines = [
      JSON.stringify({ response: 'Hello ' }),
      JSON.stringify({ response: 'world' }),
      JSON.stringify({ response: '' }),
      JSON.stringify({ response: '!' }),
    ].join('\n');

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ndjsonLines));
        controller.close();
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(readableStream, { status: 200 }));

    const chunks: string[] = [];
    for await (const chunk of adapter.generateStream!('test prompt')) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello ', 'world', '!']);
    vi.restoreAllMocks();
  });

  it('should skip malformed NDJSON lines without crashing', async () => {
    const adapter = new OllamaAdapter();

    const ndjsonLines = [
      JSON.stringify({ response: 'Hello ' }),
      '{malformed json',
      JSON.stringify({ response: 'world' }),
    ].join('\n');

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(ndjsonLines));
        controller.close();
      },
    });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(readableStream, { status: 200 }));

    const chunks: string[] = [];
    for await (const chunk of adapter.generateStream!('test prompt')) {
      chunks.push(chunk);
    }

    // Malformed line skipped, valid lines still yielded
    expect(chunks).toEqual(['Hello ', 'world']);
    vi.restoreAllMocks();
  });

  it('should throw when response body is null', async () => {
    const adapter = new OllamaAdapter();

    // Override fetch to return a response with null body
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      body: null,
    } as unknown as globalThis.Response);

    await expect(async () => {
      for await (const _ of adapter.generateStream!('test')) { /* drain */ }
    }).rejects.toThrow('no body');

    vi.restoreAllMocks();
  });
});
