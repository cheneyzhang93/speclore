# Plugin Development

> Full content coming soon. Meanwhile, see the [Chinese version](/advanced/plugin-guide).

SpecLore supports three types of plugins:

- **ReaderPlugin** — Parse custom requirement sources (Confluence, Notion, Jira, etc.)
- **WriterPlugin** — Output constraints to custom AI tools
- **ParserPlugin** — Parse custom test framework output

---

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

## Registration

In `.speclore/config.yaml`:

```yaml
plugins:
  readers:
    - name: my-reader
      package: speclore-my-reader
```
