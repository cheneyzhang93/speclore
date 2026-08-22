/**
 * Report generator — produces JSON and HTML verification reports.
 *
 * @module core/verifier/report-generator
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VerifyReport, SpecLoreConfig } from '../../types/index.js';
import { logger } from '../../infra/logger.js';
import { toPosixPath } from '../../infra/path-utils.js';

/**
 * Generate verification reports (JSON + HTML) and print summary.
 */
export function generateReport(
  report: VerifyReport,
  projectRoot: string,
  config: SpecLoreConfig,
): string[] {
  const reportsDir = join(projectRoot, '.speclore', 'reports');
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const writtenFiles: string[] = [];

  // JSON report
  if (config.verify.reportFormat.includes('json')) {
    const jsonPath = join(reportsDir, `verify-${timestamp}.json`);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
    writtenFiles.push(toPosixPath(jsonPath));
    logger.info(`JSON report: ${toPosixPath(jsonPath)}`);
  }

  // HTML report
  if (config.verify.reportFormat.includes('html')) {
    const htmlPath = join(reportsDir, `verify-${timestamp}.html`);
    const html = renderHtmlReport(report);
    writeFileSync(htmlPath, html, 'utf-8');
    writtenFiles.push(toPosixPath(htmlPath));
    logger.info(`HTML report: ${toPosixPath(htmlPath)}`);
  }

  // Console summary
  printConsoleSummary(report);

  return writtenFiles;
}

/**
 * Print a colored summary to the console.
 */
function printConsoleSummary(report: VerifyReport): void {
  const { summary } = report;
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('  SpecLore Verification Report');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log(`  Features:  ${summary.totalFeatures}`);
  console.log(`  Scenarios: ${summary.totalScenarios}`);
  console.log(`  Passed:    ${summary.passed}`);
  if (summary.failed > 0) {
    console.log(`  Failed:    ${summary.failed}`);
  }
  if (summary.skipped > 0) {
    console.log(`  Skipped:   ${summary.skipped}`);
  }
  if (summary.unmapped > 0) {
    console.log(`  Unmapped:  ${summary.unmapped}`);
  }
  console.log(`  Pass Rate: ${summary.passRate}`);
  console.log('');

  // Failed details
  if (report.failedDetails.length > 0) {
    console.log('  Failed Scenarios:');
    for (const fd of report.failedDetails) {
      console.log(`    ✗ ${fd.feature} / ${fd.scenario}`);
      console.log(`      ${fd.error.split('\n')[0]}`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log('');
}

/**
 * Render a self-contained HTML report using the template.
 */
function renderHtmlReport(report: VerifyReport): string {
  const { summary } = report;

  // Load template
  const templatePath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'cli', 'templates', 'report.html');
  let template: string;
  try {
    template = readFileSync(templatePath, 'utf-8');
  } catch {
    // Fallback: inline template if file not found
    template = getInlineTemplate();
  }

  // Build feature rows
  const featureRows = report.features.map(fr => {
    const scenarioRows = fr.scenarios.map(sr => `
            <tr>
              <td>${escapeHtml(sr.name)}</td>
              <td>${statusIcon(sr.status)}</td>
              <td>${sr.testMethod ? escapeHtml(sr.testMethod) : '\u2014'}</td>
              <td>${sr.duration ?? '\u2014'}</td>
            </tr>`).join('');
    return `
    <section class="feature">
      <h3>${escapeHtml(fr.feature)}</h3>
      <p class="file">${escapeHtml(fr.file)}</p>
      <table>
        <thead><tr><th>Scenario</th><th>Status</th><th>Test</th><th>Duration</th></tr></thead>
        <tbody>${scenarioRows}
        </tbody>
      </table>
    </section>`;
  }).join('\n');

  // Build failed details section
  const failedSection = report.failedDetails.length > 0 ? `
    <section class="failures">
      <h2>Failed Details</h2>
      ${report.failedDetails.map(fd => `
        <details>
          <summary>${escapeHtml(fd.feature)} / ${escapeHtml(fd.scenario)}</summary>
          <pre>${escapeHtml(fd.error)}</pre>
        </details>`).join('\n')}
    </section>` : '';

  return template
    .replace('{{TIMESTAMP}}', report.timestamp)
    .replace('{{PROJECT}}', escapeHtml(report.project))
    .replace('{{TOTAL_SCENARIOS}}', String(summary.totalScenarios))
    .replace('{{PASSED}}', String(summary.passed))
    .replace('{{FAILED}}', String(summary.failed))
    .replace('{{UNMAPPED}}', String(summary.unmapped))
    .replace('{{PASS_RATE}}', String(summary.passRate))
    .replace('{{FEATURES}}', featureRows)
    .replace('{{FAILED_DETAILS}}', failedSection);
}

function statusIcon(status: string): string {
  switch (status) {
    case 'passed': return '<span class="status passed" role="img" aria-label="passed">\u2705 Passed</span>';
    case 'failed': return '<span class="status failed" role="img" aria-label="failed">\u274C Failed</span>';
    case 'skipped': return '<span class="status skipped" role="img" aria-label="skipped">\u23ED\uFE0F Skipped</span>';
    case 'unmapped': return '<span class="status unmapped" role="img" aria-label="unmapped">\u26A0\uFE0F Unmapped</span>';
    default: return escapeHtml(status);
  }
}

function getInlineTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>SpecLore Verification Report</title></head>
<body><h1>SpecLore Verification Report</h1>
<p>{{TIMESTAMP}} \u2014 {{PROJECT}}</p>
<p>Scenarios: {{TOTAL_SCENARIOS}} | Passed: {{PASSED}} | Failed: {{FAILED}} | Unmapped: {{UNMAPPED}} | Pass Rate: {{PASS_RATE}}</p>
{{FEATURES}}{{FAILED_DETAILS}}</body></html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
