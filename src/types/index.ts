/**
 * SpecLore core type definitions.
 *
 * This is the single source of truth for all data models.
 * M1-M5 modules reference types defined here.
 *
 * @module types
 */

// ============================================================================
// Requirement Domain (M1 → M2)
// ============================================================================

/** Structured requirement — M1 output */
export interface StructuredRequirement {
  /** File-path-derived ID, e.g. "order/create" */
  id: string;
  title: string;
  description: string;
  /** Original acceptance criteria (if present in source) */
  acceptanceCriteria?: string[];
  /** IDs of other features this one depends on */
  dependencies?: string[];
  /** Raw source content */
  rawContent: string;
  /** Parsing confidence score (0-1) */
  confidence: number;
}

/** Feature file — M2 output */
export interface FeatureFile {
  path: string;
  featureName: string;
  scenarios: Scenario[];
  tags: string[];
  confidence: number;
  /** Scenarios that need human review (low confidence) */
  needsReview: string[];
}

/** BDD Scenario */
export interface Scenario {
  name: string;
  givens: Step[];
  whens: Step[];
  thens: Step[];
  tags: string[];
}

/** BDD Step */
export interface Step {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
}

// ============================================================================
// Project Domain (M5)
// ============================================================================

/** Project context — M5 output */
export interface ProjectContext {
  language: string;
  framework: string;
  modules: ModuleGroup[];
  dependencies: GraphEdge[];
  existingEntities: EntityInfo[];
  existingApis: ApiInfo[];
  testFramework: string;
  buildTool: string;
}

/** Module group */
export interface ModuleGroup {
  name: string;
  path: string;
  responsibility: string;
  entities: string[];
  apis: string[];
  dependsOn: string[];
}

/** Dependency graph edge */
export interface GraphEdge {
  from: string;
  to: string;
  type: 'api-call' | 'event' | 'shared-entity' | 'import';
}

/** Module boundary — tells AI not to cross-module reference */
export interface ModuleBoundary {
  name: string;
  responsibility: string;
  /** APIs that other modules may call */
  publicApis: string[];
  /** Internal objects that other modules must NOT reference directly */
  internalObjects: string[];
  dependsOn: string[];
}

/** Entity info extracted from source code */
export interface EntityInfo {
  name: string;
  module: string;
  file: string;
}

/** API info extracted from source code */
export interface ApiInfo {
  method: string;
  path: string;
  module: string;
  file: string;
}

// ============================================================================
// Verification Domain (M4)
// ============================================================================

/**
 * Verification report — M4 output, persisted to `.speclore/reports/`.
 * This is the single authoritative definition.
 * VerifyMcpResult (MCP response) is a slim view of this.
 */
export interface VerifyReport {
  timestamp: string;
  project: string;
  summary: ReportSummary;
  features: FeatureResult[];
  failedDetails: FailedDetail[];
}

export interface ReportSummary {
  totalFeatures: number;
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  /** Number of scenarios with no corresponding test */
  unmapped: number;
  /** e.g. "95.3%" */
  passRate: string;
}

export interface FeatureResult {
  /** Feature name */
  feature: string;
  /** Feature file path */
  file: string;
  scenarios: ScenarioResult[];
}

export interface ScenarioResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'unmapped';
  duration?: string;
  /** Mapped test file */
  testFile?: string;
  /** Mapped test method name */
  testMethod?: string;
  /** How the mapping was resolved */
  mappingSource?: 'mapping-file' | 'tag' | 'none';
  /** Error message when status is 'failed' */
  error?: string;
}

export interface FailedDetail {
  feature: string;
  scenario: string;
  /** Test error message */
  error: string;
  /** AI-generated fix suggestion */
  suggestion?: string;
}

// ============================================================================
// Constraint Domain (M3)
// ============================================================================

/** Module-level rule — element type of ConstraintResult.moduleRules */
export interface ModuleRule {
  /** Module name, e.g. "order" */
  module: string;
  boundaries: ModuleBoundary;
  /** e.g. ["Entity suffix denotes domain entity", "Service suffix denotes application service"] */
  namingConventions: string[];
  /** e.g. ["Controllers must not contain business logic"] */
  forbiddenPatterns: string[];
}

// ============================================================================
// context.json Schema (M5 output, persisted to .speclore/context.json)
// ============================================================================

/** Serialized ProjectContext with metadata */
export interface ContextFile {
  /** Context schema version, e.g. "1.0" */
  version: string;
  /** ISO 8601 timestamp */
  generatedAt: string;
  /** e.g. "speclore v0.1.0" */
  generatedBy: string;

  /** Project structure summary (for AI to understand code organization) */
  projectSummary: {
    language: string;
    framework: string;
    buildTool: string;
    testFramework: string;
    /** Human-readable directory structure summary (≤ 50 lines) */
    directoryStructure: string;
  };

  /** Module boundary declarations (for AI to avoid cross-module references) */
  moduleBoundaries: ModuleBoundary[];

  /** Existing entities and APIs (for AI to avoid duplication) */
  existingCode: {
    entities: Array<{ name: string; module: string; file: string }>;
    apis: Array<{ method: string; path: string; module: string; file: string }>;
  };

  /** Dependency graph (for AI to understand inter-module call direction) */
  dependencyGraph: GraphEdge[];

  /**
   * Change impact analysis (optional, filled by M7 advanced analysis engine).
   * Generated when `speclore verify --impact` is run.
   */
  impactAnalysis?: {
    changedFiles: string[];
    affectedModules: string[];
    affectedFeatures: string[];
  };

  // Size limit: entire file ≤ 50KB; when exceeded, truncate directoryStructure and existingCode by module.
}

// ============================================================================
// Mapping Domain (test ↔ scenario mapping)
// ============================================================================

/** Mapping file — AI generates alongside test code */
export interface MappingFile {
  /** Path to the feature file, e.g. "specs/order/create.feature" */
  feature: string;
  /** ISO 8601 timestamp */
  generatedAt: string;
  /** Scenario name → test mapping */
  scenarios: Record<string, MappingEntry>;
}

/** Single scenario → test mapping */
export interface MappingEntry {
  testFile: string;
  testMethod: string;
}

// ============================================================================
// MCP Response Domain
// ============================================================================

/** speclore.spec MCP response */
export interface SpecResult {
  createdFiles: string[];
  scenarios: ScenarioSummary[];
  constraints: string;
  nextSteps: string;
  workflow: WorkflowInfo;
}

export interface ScenarioSummary {
  feature: string;
  name: string;
  given: string[];
  when: string[];
  then: string[];
}

/** speclore.code MCP response */
export interface ConstraintResult {
  writtenFiles: string[];
  constraintContent: string;
  moduleRules: ModuleRule[];

  // Handoff context
  activeConstraints: ActiveConstraint[];
  /** Comprehensive coding guidance for AI (≤ 2000 chars) */
  codingGuidance: string;

  // Test scaffolding
  scaffoldFiles: ScaffoldResult[];
  workflow: WorkflowInfo;
}

export interface ActiveConstraint {
  file: string;
  scope: 'project' | 'feature';
  /** Glob pattern, e.g. "** /order/**" */
  appliesTo: string;
  /** One-line summary (AI quickly judges relevance) */
  summary: string;
}

/** speclore.verify MCP response — slim view of VerifyReport */
export interface VerifyMcpResult {
  /** e.g. "12/12 scenarios passed" */
  summary: string;
  passed: number;
  failed: number;
  unmapped: number;
  details: FeatureResult[];
  failedDetails: FailedDetail[];
  workflow: WorkflowInfo;
}

// ============================================================================
// Plugin Domain
// ============================================================================

/** Requirement reader plugin interface */
export interface ReaderPlugin {
  readonly name: string;
  readonly supportedFormats: string[];
  canRead(source: string): boolean;
  read(source: string): Promise<StructuredRequirement[]>;
}

/** AI tool constraint writer plugin interface */
export interface WriterPlugin {
  readonly toolName: string;
  readonly configFile: string;
  detect(projectRoot: string): boolean;
  write(constraints: ConstraintContent): Promise<void>;
  remove(): Promise<void>;
}

/** Constraint content to be written by WriterPlugin */
export interface ConstraintContent {
  projectName: string;
  /** Absolute path to the project root directory */
  projectRoot: string;
  modules: ModuleRule[];
  features: FeatureFile[];
  profile: ProfileLevel;
  /** Mapping rule instructions for AI */
  mappingInstructions: string;
  /** Feature business rules extracted from scenarios */
  featureRules: FeatureRule[];
  /** Test scaffolding info (optional) */
  scaffoldInfo?: ScaffoldResult[];
}

/** Test result parser plugin interface */
export interface ParserPlugin {
  readonly framework: string;
  canParse(testOutput: string): boolean;
  parse(testOutput: string, features: FeatureFile[]): ScenarioResult[];
}

// ============================================================================
// AI Tool Detection
// ============================================================================

/** Supported AI tool identifiers */
export type AITool = 'cursor' | 'claude' | 'qoder';

/** AI tool detection result */
export interface AIToolInfo {
  tool: AITool;
  detected: boolean;
  /** Config file paths that were found */
  configFiles: string[];
}

// ============================================================================
// Installation
// ============================================================================

/** Installation mode detection result */
export interface InstallInfo {
  mode: 'npm' | 'clone';
  version: string;
  /** Local path for clone mode */
  localPath?: string;
}

// ============================================================================
// State Manager Domain (Workflow Engine)
// ============================================================================

/** Feature lifecycle state */
export type FeatureState = 'specified' | 'constrained' | 'coding' | 'verified';

/** Project-wide state persisted to .speclore/state.yaml */
export interface ProjectState {
  schemaVersion: 1;
  initialized: boolean;
  initializedAt?: string;
  features: Record<string, FeatureStateEntry>;
}

/** Per-feature state tracking */
export interface FeatureStateEntry {
  featureFile: string;
  state: FeatureState;
  constraintFiles: string[];
  testFiles: string[];
  lastStateChange: string;
  lastVerify?: {
    timestamp: string;
    passed: number;
    failed: number;
    unmapped: number;
  };
}

// ============================================================================
// Workflow Domain (MCP response enrichment)
// ============================================================================

/** Workflow info appended to every MCP tool response */
export interface WorkflowInfo {
  feature?: string;
  currentState: FeatureState | 'uninitialized';
  nextStep: string;
  projectSummary: {
    total: number;
    specified: number;
    constrained: number;
    coding: number;
    verified: number;
  };
}

/** speclore.status MCP response */
export interface StatusResult {
  project: {
    initialized: boolean;
    configCreated: boolean;
    testCommand: string;
    aiToolsDetected: string[];
  };
  features: Array<{
    file: string;
    state: FeatureState;
    scenarios: number;
    constraintFiles: string[];
    testFiles: string[];
    lastVerify?: { passed: number; failed: number; timestamp: string };
  }>;
  summary: {
    total: number;
    specified: number;
    constrained: number;
    coding: number;
    verified: number;
  };
  recommendedActions: string[];
}

/** Test scaffolding generation result */
export interface ScaffoldResult {
  testFile: string;
  framework: string;
  scenarios: number;
}

/** Feature business rule extracted from scenarios */
export interface FeatureRule {
  featureName: string;
  sourceFile: string;
  scenarios: Array<{
    name: string;
    summary: string;
  }>;
}

// ============================================================================
// Shared Types
// ============================================================================

/** Profile level — controls constraint/detail granularity */
export type ProfileLevel = 'strict' | 'normal' | 'minimal';

/** Log level */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Re-export config types for convenience
export type {
  SpecLoreConfig,
  ProjectConfig,
  ModuleConfig,
  AIConfig,
  SpecConfig,
  VerifyConfig,
  MappingConfig,
  MappingPattern,
  PluginsConfig,
  PluginRef,
} from './config.js';
