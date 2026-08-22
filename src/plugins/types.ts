/**
 * Plugin type definitions — runtime interfaces for Reader/Writer/Parser plugins.
 *
 * @module plugins/types
 */

import type { ContextFile, StructuredRequirement, FeatureFile, VerifyReport } from '../types/index.js';

export type { ReaderPlugin, WriterPlugin, ParserPlugin, ConstraintContent } from '../types/index.js';

/**
 * Plugin lifecycle hooks — called at key points in the SpecLore pipeline.
 *
 * Plugins implement only the hooks they need; all are optional.
 * The pipeline invokes hooks in registration order for each lifecycle stage.
 *
 * Lifecycle order:
 *   1. `onInit`       — after context is built (speclore init / status)
 *   2. `beforeSpec`   — before feature generation starts
 *   3. `afterSpec`    — after a feature file is generated
 *   4. `beforeVerify` — before verification runs
 *   5. `afterVerify`  — after verification completes with a report
 *
 * @example
 * ```ts
 * const myPlugin: PluginLifecycle = {
 *   async onInit(ctx) { console.log('Context ready:', ctx.projectSummary.language); },
 *   async afterSpec(feature) { console.log('Feature generated:', feature.featureName); },
 * };
 * ```
 */
export interface PluginLifecycle {
  /**
   * Called after context is built (speclore init / status).
   * Use this to inspect project context or register additional resources.
   */
  onInit?(context: ContextFile): Promise<void>;

  /**
   * Called before feature generation starts.
   * Receives the structured requirement that will be converted to a feature.
   */
  beforeSpec?(requirement: StructuredRequirement): Promise<void>;

  /**
   * Called after a feature file is generated.
   * Receives the complete FeatureFile including scenarios and metadata.
   */
  afterSpec?(feature: FeatureFile): Promise<void>;

  /**
   * Called before verification runs.
   * Receives all feature files that will be verified.
   */
  beforeVerify?(features: FeatureFile[]): Promise<void>;

  /**
   * Called after verification completes.
   * Receives the full verification report with pass/fail/unmapped status.
   */
  afterVerify?(report: VerifyReport): Promise<void>;
}
