/**
 * Configuration loader — reads, validates, and merges SpecLore config.
 *
 * Three-level merge order:
 *   1. Built-in defaults (DEFAULT_CONFIG)
 *   2. Global config: ~/.speclore/config.yaml
 *   3. Project config: .speclore/config.yaml (highest priority)
 *
 * @module infra/config
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import yaml from 'js-yaml';
import type { ProfileLevel } from '../types/index.js';
import type { SpecLoreConfig } from '../types/config.js';
import { DEFAULT_CONFIG } from '../types/config.js';

const CONFIG_FILENAME = 'config.yaml';
const SPECLORE_DIR = '.speclore';

/**
 * Load the merged configuration for the given project root.
 */
export function loadConfig(projectRoot: string): SpecLoreConfig {
  const globalConfig = loadGlobalConfig();
  const projectConfig = loadProjectConfig(projectRoot);

  return mergeConfigs(DEFAULT_CONFIG, globalConfig, projectConfig);
}

/**
 * Load global config from ~/.speclore/config.yaml
 */
function loadGlobalConfig(): Partial<SpecLoreConfig> | null {
  const globalPath = join(homedir(), SPECLORE_DIR, CONFIG_FILENAME);
  return readYamlIfExists(globalPath);
}

/**
 * Load project config from {projectRoot}/.speclore/config.yaml
 */
function loadProjectConfig(projectRoot: string): Partial<SpecLoreConfig> | null {
  const projectPath = join(projectRoot, SPECLORE_DIR, CONFIG_FILENAME);
  return readYamlIfExists(projectPath);
}

/**
 * Read and parse a YAML file if it exists, otherwise return null.
 */
function readYamlIfExists(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA });
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deep-merge multiple partial configs. Later values override earlier ones.
 */
function mergeConfigs(...configs: Array<Partial<SpecLoreConfig> | null>): SpecLoreConfig {
  const result = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>;

  for (const config of configs) {
    if (!config) continue;
    deepMerge(result, config);
  }

  validateConfig(result as unknown as SpecLoreConfig);
  return result as unknown as SpecLoreConfig;
}

/**
 * Recursively merge `source` into `target`.
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const targetVal = target[key];
    const sourceVal = source[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal)
    ) {
      deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else if (sourceVal !== undefined) {
      target[key] = sourceVal;
    }
  }
}

/**
 * Validate the merged configuration.
 * Throws a descriptive error for invalid values.
 */
function validateConfig(config: SpecLoreConfig): void {
  // Profile must be one of the allowed values
  const validProfiles: ProfileLevel[] = ['strict', 'normal', 'minimal'];
  if (!validProfiles.includes(config.project.profile)) {
    throw new ConfigError(
      `Invalid profile "${config.project.profile}". Must be one of: ${validProfiles.join(', ')}`,
    );
  }

  // Spec output dir must not be empty
  if (!config.spec.outputDir || config.spec.outputDir.trim() === '') {
    throw new ConfigError('spec.outputDir must not be empty');
  }

  // Confidence threshold must be between 0 and 1
  if (config.spec.confidenceThreshold < 0 || config.spec.confidenceThreshold > 1) {
    throw new ConfigError('spec.confidenceThreshold must be between 0 and 1');
  }

  // Verify timeout must be positive
  if (config.verify.timeout <= 0) {
    throw new ConfigError('verify.timeout must be a positive number (seconds)');
  }

  // AI provider validation
  if (config.ai) {
    const validProviders = ['openai-compatible', 'claude', 'ollama'] as const;
    if (!validProviders.includes(config.ai.provider)) {
      throw new ConfigError(
        `Invalid ai.provider "${config.ai.provider}". Must be one of: ${validProviders.join(', ')}`,
      );
    }
  }

  // Module dependency validation
  const moduleNames = Object.keys(config.project.modules);
  for (const [name, mod] of Object.entries(config.project.modules)) {
    if (!mod.path) {
      throw new ConfigError(`Module "${name}" must have a "path" field`);
    }
    if (!mod.responsibility) {
      throw new ConfigError(`Module "${name}" must have a "responsibility" field`);
    }
    if (mod.dependsOn) {
      for (const dep of mod.dependsOn) {
        if (!moduleNames.includes(dep)) {
          throw new ConfigError(
            `Module "${name}" depends on "${dep}", which is not declared in modules`,
          );
        }
      }
    }
  }
}

/**
 * Get the path to the project's .speclore directory.
 */
export function getSpecLoreDir(projectRoot: string): string {
  return join(projectRoot, SPECLORE_DIR);
}

/**
 * Get the path to the global .speclore directory.
 */
export function getGlobalSpecLoreDir(): string {
  return join(homedir(), SPECLORE_DIR);
}

/** Configuration validation error */
export class ConfigError extends Error {
  constructor(message: string) {
    super(`[SpecLore Config] ${message}`);
    this.name = 'ConfigError';
  }
}

/** Generate default config.yaml content for a project */
export function generateDefaultConfigYaml(projectName: string): string {
  return `# SpecLore Configuration
# See: https://github.com/cheneyzhang93/speclore#configuration

project:
  name: ${projectName}
  language: typescript
  framework: ""
  profile: normal
  modules: {}
    # Example:
    # order:
    #   path: src/order
    #   responsibility: Order management and processing
    #   dependsOn: [inventory, payment]

ai:
  provider: openai-compatible
  # baseUrl: https://api.openai.com/v1
  # model: gpt-4

spec:
  outputDir: specs
  defaultLanguage: zh-CN
  confidenceThreshold: 0.6

verify:
  command: ""
  timeout: 300
  reportFormat:
    - json
    - html
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
`;
}
