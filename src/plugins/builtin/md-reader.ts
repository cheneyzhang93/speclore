/**
 * Built-in Markdown reader plugin.
 * @module plugins/builtin/md-reader
 */

import { readFileSync, existsSync } from 'node:fs';
import type { ReaderPlugin, StructuredRequirement } from '../../types/index.js';

export class MarkdownReader implements ReaderPlugin {
  readonly name = 'markdown-reader';
  readonly supportedFormats = ['.md', '.markdown'];

  canRead(source: string): boolean {
    return /\.md$/i.test(source) || /\.markdown$/i.test(source);
  }

  read(source: string): Promise<StructuredRequirement[]> {
    if (!existsSync(source)) {
      throw new Error(`File not found: ${source}`);
    }
    const content = readFileSync(source, 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)/m);
    const title = titleMatch?.[1]?.trim() ?? 'Untitled';

    // Extract acceptance criteria (lines starting with - [ ] or - [x] under ## Acceptance)
    const acceptanceCriteria: string[] = [];
    const acSection = content.match(/##\s*Acceptance\s*(?:Criteria)?[\s\S]*?(?=##|$)/i);
    if (acSection) {
      const items = acSection[0].match(/^[-*]\s+\[.\]\s+(.+)/gm);
      if (items) {
        acceptanceCriteria.push(...items.map(i => i.replace(/^[-*]\s+\[.\]\s+/, '')));
      }
    }

    return Promise.resolve([{
      id: source.replace(/\\/g, '/').replace(/\.md$/i, ''),
      title,
      description: content,
      acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : undefined,
      rawContent: content,
      confidence: 0.9,
    }]);
  }
}
