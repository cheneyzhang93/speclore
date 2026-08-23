# SpecLore Plugin Development Guide

## Overview

SpecLore supports three types of plugins:

- **ReaderPlugin** — Parse custom requirement sources (Confluence, Notion, Jira, etc.)
- **WriterPlugin** — Output constraints to custom AI tools
- **ParserPlugin** — Parse custom test framework output

## Creating a Reader Plugin

```typescript
import type { ReaderPlugin, StructuredRequirement } from 'speclore';

export default class MyReader implements ReaderPlugin {
  readonly name = 'my-reader';
  readonly supportedFormats = ['.myext'];

  canRead(source: string): boolean {
    return source.endsWith('.myext');
  }

  async read(source: string): Promise<StructuredRequirement[]> {
    // Read and parse the source file
    return [{
      id: source,
      title: 'My Requirement',
      description: '...',
      rawContent: '...',
      confidence: 0.8,
    }];
  }
}
```

## Creating a Writer Plugin

```typescript
import type { WriterPlugin, ConstraintContent } from 'speclore';

export default class MyWriter implements WriterPlugin {
  readonly toolName = 'my-tool';
  readonly configFile = '.mytool/rules.md';

  detect(projectRoot: string): boolean { /* ... */ }
  async write(constraints: ConstraintContent): Promise<void> { /* ... */ }
  async remove(): Promise<void> { /* ... */ }
}
```

## Creating a Parser Plugin

```typescript
import type { ParserPlugin, ScenarioResult, FeatureFile } from 'speclore';

export default class MyParser implements ParserPlugin {
  readonly framework = 'my-framework';

  canParse(testOutput: string): boolean { /* ... */ }
  parse(testOutput: string, features: FeatureFile[]): ScenarioResult[] { /* ... */ }
}
```

## Registration

In `.speclore/config.yaml`:

```yaml
plugins:
  readers:
    - name: my-reader
      package: speclore-my-reader
  writers:
    - name: my-writer
      package: speclore-my-writer
  parsers:
    - name: my-parser
      package: speclore-my-parser
```

## Publishing

1. Create an npm package with your plugin
2. Export the plugin class as default export
3. Publish to npm: `npm publish`
4. Users install and register in config.yaml
