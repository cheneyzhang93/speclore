/**
 * Markdown reader — reads .md files and extracts structured requirements.
 *
 * @module core/requirement-reader/markdown-reader
 */

import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import type { StructuredRequirement } from '../../types/index.js';

export function readMarkdownFile(filePath: string): Promise<StructuredRequirement> {
  const content = readFileSync(filePath, 'utf-8');
  const id = deriveId(filePath);

  // Extract title from first heading
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() ?? basename(filePath, extname(filePath));

  // Extract acceptance criteria section if present
  const acceptanceCriteria = extractAcceptanceCriteria(content);

  // Extract dependency references (e.g. "Depends on: order/payment")
  const dependencies = extractDependencies(content);

  return Promise.resolve({
    id,
    title,
    description: content,
    acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
    dependencies: dependencies.length > 0 ? dependencies : undefined,
    rawContent: content,
    confidence: 1.0,
  });
}

function deriveId(filePath: string): string {
  // Strip common prefixes and extension
  const name = basename(filePath, extname(filePath));
  return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff-]/g, '-').replace(/-+/g, '-');
}

function extractAcceptanceCriteria(content: string): string[] {
  const criteria: string[] = [];

  // Look for "Acceptance Criteria" or "验收标准" section
  const sectionRegex = /#{1,4}\s*(?:Acceptance Criteria|验收标准|验收条件)\s*\n([\s\S]*?)(?=\n#{1,4}\s|\n---|$)/gi;
  const match = sectionRegex.exec(content);

  if (match) {
    const section = match[1]!;
    // Extract bullet points
    const bulletRegex = /^\s*[-*]\s+(.+)$/gm;
    let bullet;
    while ((bullet = bulletRegex.exec(section)) !== null) {
      criteria.push(bullet[1]!.trim());
    }
  }

  return criteria;
}

function extractDependencies(content: string): string[] {
  const deps: string[] = [];

  // Look for "Depends on:" or "依赖:" pattern
  const depRegex = /(?:Depends on|依赖)[:\s]+(.+)/gi;
  const match = depRegex.exec(content);

  if (match) {
    const depList = match[1]!;
    // Split by comma or semicolon
    const items = depList.split(/[,;，；]/);
    for (const item of items) {
      const trimmed = item.trim().replace(/^[\s`]+|[\s`]+$/g, '');
      if (trimmed) deps.push(trimmed);
    }
  }

  return deps;
}
