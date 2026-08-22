/**
 * Structured logger powered by pino.
 *
 * - Development: pretty-printed colored output (via pino-pretty)
 * - Production: structured JSON (set SPECLORE_LOG_FORMAT=json or NODE_ENV=production)
 * - Enable debug via `--verbose` CLI flag or SPECLORE_LOG_LEVEL=debug env.
 *
 * Levels: debug < info < warn < error
 *
 * @module infra/logger
 */

import pino from 'pino';
import type { LogLevel } from '../types/index.js';

let currentLevel: LogLevel = 'info';

/**
 * Determine if JSON output should be used.
 * JSON mode is enabled when:
 * - SPECLORE_LOG_FORMAT=json, or
 * - NODE_ENV=production (and no explicit format override)
 */
function isJsonMode(): boolean {
  const format = process.env['SPECLORE_LOG_FORMAT'];
  if (format === 'json') return true;
  if (format === 'pretty') return false;
  return process.env['NODE_ENV'] === 'production';
}

function createPinoInstance(level: LogLevel): pino.Logger {
  const pinoLevel = toPinoLevel(level);

  if (isJsonMode()) {
    // Production: structured JSON to stdout
    return pino({
      level: pinoLevel,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
    });
  }

  // Development: pretty output via pino-pretty transport
  return pino({
    level: pinoLevel,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: true,
      },
    },
  });
}

function toPinoLevel(level: LogLevel): string {
  // pino levels: trace < debug < info < warn < error < fatal
  return level;
}

let pinoInstance: pino.Logger = createPinoInstance(currentLevel);

/**
 * Initialize the logger level.
 * Called once at CLI startup based on --verbose flag or env variable.
 */
export function initLogger(options?: { verbose?: boolean }): void {
  if (options?.verbose) {
    setLogLevel('debug');
    return;
  }

  const envLevel = process.env['SPECLORE_LOG_LEVEL'] as LogLevel | undefined;
  if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
    setLogLevel(envLevel);
  }
}

/**
 * Set the log level programmatically.
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
  pinoInstance = createPinoInstance(level);
}

/**
 * Get the current log level.
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    pinoInstance.debug({ args: args.length > 0 ? args : undefined }, message);
  },

  info(message: string, ...args: unknown[]): void {
    pinoInstance.info({ args: args.length > 0 ? args : undefined }, message);
  },

  warn(message: string, ...args: unknown[]): void {
    pinoInstance.warn({ args: args.length > 0 ? args : undefined }, message);
  },

  error(message: string, ...args: unknown[]): void {
    pinoInstance.error({ args: args.length > 0 ? args : undefined }, message);
  },

  /** Shortcut to set log level */
  setLevel(level: LogLevel): void {
    setLogLevel(level);
  },
};
