/**
 * SpecLore configuration type definitions.
 *
 * Maps to `.speclore/config.yaml` structure.
 * @module types/config
 */

import type { ProfileLevel } from './index.js';

/** Root configuration — maps to config.yaml */
export interface SpecLoreConfig {
  project: ProjectConfig;
  ai?: AIConfig;
  spec: SpecConfig;
  verify: VerifyConfig;
  plugins?: PluginsConfig;
}

/** Project section */
export interface ProjectConfig {
  name: string;
  language: string;
  framework: string;
  /** Profile level: strict | normal | minimal (default: normal) */
  profile: ProfileLevel;
  /** Module declarations */
  modules: Record<string, ModuleConfig>;
}

/** Module declaration in config.yaml */
export interface ModuleConfig {
  path: string;
  responsibility: string;
  dependsOn?: string[];
  entities?: string[];
  apis?: string[];
}

/** AI provider section (optional — auto-detected when in AI client) */
export interface AIConfig {
  provider: 'openai-compatible' | 'claude' | 'ollama';
  baseUrl?: string;
  model?: string;
  /** API key from environment variable name, default: SPECLORE_API_KEY */
  apiKeyEnv?: string;
  /** Maximum budget in USD — calls are rejected when exceeded */
  maxBudgetUsd?: number;
  /** Fallback providers tried in order when the primary is unavailable */
  fallbackProviders?: AIConfig[];
}

/** Spec generation section */
export interface SpecConfig {
  /** Output directory for .feature files (default: "specs") */
  outputDir: string;
  /** Default language for generated features (default: "zh-CN") */
  defaultLanguage: string;
  /** Below this confidence, scenarios are flagged for review (default: 0.6) */
  confidenceThreshold: number;
}

/** Verification section */
export interface VerifyConfig {
  /** Test command to execute */
  command: string;
  /** Test timeout in seconds (default: 300) */
  timeout: number;
  /** Report formats to generate (default: ["json", "html"]) */
  reportFormat: ('json' | 'html')[];
  /** Test-to-feature mapping rules */
  mapping: MappingConfig;
}

/** Mapping configuration */
export interface MappingConfig {
  patterns: MappingPattern[];
}

/** Single mapping pattern */
export interface MappingPattern {
  /** Feature file pattern, e.g. "specs/{module}/{name}.feature" */
  feature: string;
  /** Test file pattern, e.g. "tests/{module}/{Name}Test.*" */
  test: string;
}

/** Plugin registration section */
export interface PluginsConfig {
  readers?: PluginRef[];
  writers?: PluginRef[];
  parsers?: PluginRef[];
}

/** Plugin reference in config.yaml */
export interface PluginRef {
  name: string;
  package: string;
}

/** Default configuration values */
export const DEFAULT_CONFIG: SpecLoreConfig = {
  project: {
    name: '',
    language: '',
    framework: '',
    profile: 'normal',
    modules: {},
  },
  spec: {
    outputDir: 'specs',
    defaultLanguage: 'zh-CN',
    confidenceThreshold: 0.6,
  },
  verify: {
    command: '',
    timeout: 300,
    reportFormat: ['json', 'html'],
    mapping: {
      patterns: [
        {
          feature: 'specs/{module}/{name}.feature',
          test: 'tests/{module}/{Name}Test.*',
        },
        {
          feature: 'specs/{module}/{name}.feature',
          test: 'tests/{module}/{name}.test.*',
        },
        {
          feature: 'specs/{module}/{name}.feature',
          test: 'tests/{module}/test_{name}.py',
        },
      ],
    },
  },
};
