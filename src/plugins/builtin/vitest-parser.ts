/**
 * Built-in Vitest JSON test result parser.
 * @module plugins/builtin/vitest-parser
 */

import type { ParserPlugin, ScenarioResult, FeatureFile } from '../../types/index.js';

export class VitestParser implements ParserPlugin {
  readonly framework = 'vitest';

  canParse(testOutput: string): boolean {
    const trimmed = testOutput.trim();
    return trimmed.startsWith('{') && (trimmed.includes('"testResults"') || trimmed.includes('"numTotalTests"'));
  }

  parse(testOutput: string, _features: FeatureFile[]): ScenarioResult[] {
    let json: {
      testResults?: Array<{
        name: string;
        assertionResults?: Array<{
          title: string;
          fullName: string;
          status: string;
          duration: number | null;
          failureMessages: string[];
        }>;
      }>;
      numTotalTests?: number;
      numPassedTests?: number;
      numFailedTests?: number;
    };

    try {
      json = JSON.parse(testOutput) as typeof json;
    } catch {
      return [];
    }

    const results: ScenarioResult[] = [];
    for (const file of json.testResults ?? []) {
      for (const assertion of file.assertionResults ?? []) {
        let status: ScenarioResult['status'] = 'passed';
        switch (assertion.status) {
          case 'failed': status = 'failed'; break;
          case 'skipped':
          case 'pending':
          case 'todo': status = 'skipped'; break;
          default: status = 'passed';
        }

        results.push({
          name: assertion.title ?? assertion.fullName ?? 'unknown',
          status,
          duration: assertion.duration != null ? `${Math.round(assertion.duration)}ms` : undefined,
          testFile: file.name,
          testMethod: assertion.fullName,
          error: assertion.failureMessages?.join('\n'),
        });
      }
    }

    return results;
  }
}
