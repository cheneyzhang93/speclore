---
title: 插件开发指南
description: "开发 SpecLore 插件：ReaderPlugin 自定义需求来源、WriterPlugin 自定义约束输出、ParserPlugin 自定义测试解析。"
---

# SpecLore 插件开发指南

## 概述

SpecLore 支持三种类型的插件：

- **ReaderPlugin（读取插件）** — 解析自定义需求来源（Confluence、Notion、Jira 等）
- **WriterPlugin（写入插件）** — 将约束输出到自定义 AI 工具
- **ParserPlugin（解析插件）** — 解析自定义测试框架的输出

## 创建读取插件

```typescript
import type { ReaderPlugin, StructuredRequirement } from 'speclore';

export default class MyReader implements ReaderPlugin {
  readonly name = 'my-reader';
  readonly supportedFormats = ['.myext'];

  canRead(source: string): boolean {
    return source.endsWith('.myext');
  }

  async read(source: string): Promise<StructuredRequirement[]> {
    // 读取并解析源文件
    return [{
      id: source,
      title: '我的需求',
      description: '...',
      rawContent: '...',
      confidence: 0.8,
    }];
  }
}
```

## 创建写入插件

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

## 创建解析插件

```typescript
import type { ParserPlugin, ScenarioResult, FeatureFile } from 'speclore';

export default class MyParser implements ParserPlugin {
  readonly framework = 'my-framework';

  canParse(testOutput: string): boolean { /* ... */ }
  parse(testOutput: string, features: FeatureFile[]): ScenarioResult[] { /* ... */ }
}
```

## 注册插件

在 `.speclore/config.yaml` 中配置：

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

## 发布插件

1. 创建一个 npm 包，包含你的插件代码
2. 将插件类作为默认导出（default export）
3. 发布到 npm：`npm publish`
4. 用户安装后在 config.yaml 中注册即可使用
