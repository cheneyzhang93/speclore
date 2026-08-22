/**
 * Built-in JUnit XML test result parser.
 * @module plugins/builtin/junit-parser
 */

import type { ParserPlugin, ScenarioResult, FeatureFile } from '../../types/index.js';

export class JUnitParser implements ParserPlugin {
  readonly framework = 'junit';

  canParse(testOutput: string): boolean {
    return testOutput.trimStart().startsWith('<?xml') || testOutput.includes('<testsuite');
  }

  parse(testOutput: string, _features: FeatureFile[]): ScenarioResult[] {
    const results: ScenarioResult[] = [];

    // Simple XML parsing for <testcase> elements
    const testcaseRegex = /<testcase\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
    let match;

    while ((match = testcaseRegex.exec(testOutput)) !== null) {
      const attrs = match[1]!;
      const body = match[2] ?? '';

      const name = extractAttr(attrs, 'name') ?? 'unknown';
      const classname = extractAttr(attrs, 'classname') ?? '';
      const time = extractAttr(attrs, 'time');

      // Check for failure or skip
      const failureMatch = body.match(/<failure[^>]*>([\s\S]*?)<\/failure>/);
      const skippedMatch = body.match(/<skipped/);

      let status: ScenarioResult['status'] = 'passed';
      let error: string | undefined;

      if (failureMatch) {
        status = 'failed';
        error = failureMatch[1]!.trim();
      } else if (skippedMatch) {
        status = 'skipped';
      }

      results.push({
        name,
        status,
        duration: time ? `${time}s` : undefined,
        testMethod: classname ? `${classname}.${name}` : name,
        error,
      });
    }

    return results;
  }
}

function extractAttr(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`));
  return match?.[1];
}
