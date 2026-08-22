/**
 * Plugin registry — discovers, loads, and manages plugins.
 *
 * Built-in plugins are auto-registered. Third-party plugins are loaded
 * from config.yaml `plugins` section.
 *
 * @module plugins/registry
 */

import type { ReaderPlugin, WriterPlugin, ParserPlugin } from '../types/index.js';
import type { PluginLifecycle } from './types.js';
import type { SpecLoreConfig } from '../types/config.js';
import { logger } from '../infra/logger.js';

/** Runtime type guard for ReaderPlugin */
function isReaderPlugin(mod: unknown): mod is ReaderPlugin {
  return typeof mod === 'object' && mod !== null
    && typeof (mod as ReaderPlugin).canRead === 'function'
    && typeof (mod as ReaderPlugin).read === 'function'
    && typeof (mod as ReaderPlugin).name === 'string';
}

/** Runtime type guard for WriterPlugin */
function isWriterPlugin(mod: unknown): mod is WriterPlugin {
  return typeof mod === 'object' && mod !== null
    && typeof (mod as WriterPlugin).detect === 'function'
    && typeof (mod as WriterPlugin).write === 'function'
    && typeof (mod as WriterPlugin).toolName === 'string';
}

/** Runtime type guard for ParserPlugin */
function isParserPlugin(mod: unknown): mod is ParserPlugin {
  return typeof mod === 'object' && mod !== null
    && typeof (mod as ParserPlugin).canParse === 'function'
    && typeof (mod as ParserPlugin).parse === 'function'
    && typeof (mod as ParserPlugin).framework === 'string';
}

// Built-in readers
import { MarkdownReader } from './builtin/md-reader.js';
import { DocxReader } from './builtin/docx-reader.js';
import { XlsxReader } from './builtin/xlsx-reader.js';
import { PdfReader } from './builtin/pdf-reader.js';
import { ImageReader } from './builtin/image-reader.js';

// Built-in writers
import { CursorWriter } from './builtin/cursor-writer.js';
import { ClaudeWriter } from './builtin/claude-writer.js';
import { QoderWriter } from './builtin/qoder-writer.js';

// Built-in parsers
import { JUnitParser } from './builtin/junit-parser.js';
import { JestParser } from './builtin/jest-parser.js';
import { VitestParser } from './builtin/vitest-parser.js';

/** Central plugin registry */
export class PluginRegistry {
  private readers: ReaderPlugin[] = [];
  private writers: WriterPlugin[] = [];
  private parsers: ParserPlugin[] = [];
  private lifecycleHooks: PluginLifecycle[] = [];

  /** Register all built-in plugins */
  registerBuiltins(): void {
    this.readers.push(
      new MarkdownReader(),
      new DocxReader(),
      new XlsxReader(),
      new PdfReader(),
      new ImageReader(),
    );

    this.writers.push(
      new CursorWriter(),
      new ClaudeWriter(),
      new QoderWriter(),
    );

    this.parsers.push(
      new JUnitParser(),
      new JestParser(),
      new VitestParser(),
    );
  }

  /** Load third-party plugins from config */
  async loadExternal(config: SpecLoreConfig): Promise<void> {
    if (!config.plugins) return;

    // Load external readers
    if (config.plugins.readers) {
      for (const ref of config.plugins.readers) {
        try {
          const mod = await import(ref.package) as Record<string, unknown>;
          const plugin = (mod.default ?? mod) as unknown;
          if (isReaderPlugin(plugin)) {
            this.readers.push(plugin);
            logger.debug(`Loaded external reader plugin: ${ref.name}`);
          } else {
            logger.warn(`Plugin ${ref.name} does not implement ReaderPlugin interface`);
          }
        } catch (err) {
          logger.warn(`Failed to load reader plugin ${ref.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Load external writers
    if (config.plugins.writers) {
      for (const ref of config.plugins.writers) {
        try {
          const mod = await import(ref.package) as Record<string, unknown>;
          const plugin = (mod.default ?? mod) as unknown;
          if (isWriterPlugin(plugin)) {
            this.writers.push(plugin);
            logger.debug(`Loaded external writer plugin: ${ref.name}`);
          } else {
            logger.warn(`Plugin ${ref.name} does not implement WriterPlugin interface`);
          }
        } catch (err) {
          logger.warn(`Failed to load writer plugin ${ref.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Load external parsers
    if (config.plugins.parsers) {
      for (const ref of config.plugins.parsers) {
        try {
          const mod = await import(ref.package) as Record<string, unknown>;
          const plugin = (mod.default ?? mod) as unknown;
          if (isParserPlugin(plugin)) {
            this.parsers.push(plugin);
            logger.debug(`Loaded external parser plugin: ${ref.name}`);
          } else {
            logger.warn(`Plugin ${ref.name} does not implement ParserPlugin interface`);
          }
        } catch (err) {
          logger.warn(`Failed to load parser plugin ${ref.name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  /** Find a reader that can handle the given source */
  findReader(source: string): ReaderPlugin | undefined {
    return this.readers.find(r => r.canRead(source));
  }

  /** Find a writer for the given AI tool */
  findWriter(toolName: string): WriterPlugin | undefined {
    return this.writers.find(w => w.toolName === toolName);
  }

  /** Find a parser for the given test output */
  findParser(testOutput: string): ParserPlugin | undefined {
    return this.parsers.find(p => p.canParse(testOutput));
  }

  /** Get all registered readers */
  getReaders(): ReaderPlugin[] {
    return [...this.readers];
  }

  /** Get all registered writers */
  getWriters(): WriterPlugin[] {
    return [...this.writers];
  }

  /** Get all registered parsers */
  getParsers(): ParserPlugin[] {
    return [...this.parsers];
  }

  /** Register a lifecycle hook */
  registerLifecycle(hook: PluginLifecycle): void {
    this.lifecycleHooks.push(hook);
    logger.debug('Registered plugin lifecycle hook');
  }

  /** Invoke a lifecycle event on all registered hooks */
  async invokeLifecycle<K extends keyof PluginLifecycle>(
    event: K,
    ...args: Parameters<NonNullable<PluginLifecycle[K]>>
  ): Promise<void> {
    for (const hook of this.lifecycleHooks) {
      const fn = hook[event];
      if (typeof fn === 'function') {
        try {
          await (fn as (...a: unknown[]) => Promise<void>)(...args as unknown[]);
        } catch (err) {
          logger.warn(`Lifecycle hook '${event}' failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }
}

/** Singleton registry instance */
let _registry: PluginRegistry | null = null;

/** Get or create the global plugin registry */
export function getRegistry(): PluginRegistry {
  if (!_registry) {
    _registry = new PluginRegistry();
    _registry.registerBuiltins();
  }
  return _registry;
}

/** Reset the global registry (for testing) */
export function resetRegistry(): void {
  _registry = null;
}
