# SpecLore

> AI 产研协同 CLI 工具 — 在 AI 编码时代实现「需求结构化 → 验收自动化 → AI 约束化」

[![npm version](https://img.shields.io/npm/v/speclore.svg)](https://www.npmjs.com/package/speclore)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-blue)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 为什么需要 SpecLore

AI 编码工具解决了「怎么写代码」的问题，但产研协同中三个关键问题仍未解决：

1. **需求结构化** — 产品需求散落在文档、聊天记录、口头描述中，AI 无法直接生成可验收的代码
2. **验收自动化** — AI 写了代码，但没有人知道它是否真正满足了需求
3. **AI 约束化** — AI 编码时不了解模块边界、命名规范、禁止模式，容易写出「能跑但不对」的代码

SpecLore 用一条自动化流水线解决这三个问题：

```
需求（任意格式）→ BDD .feature 验收标准 → AI 编码约束 → 测试运行 → 验收报告
```

---

## 核心特性

- **需求结构化** — 任意格式输入（Markdown / Word / Excel / PDF / 图片 / URL / 直接文本）→ BDD .feature 验收标准
- **验收自动化** — 运行测试 → 结果自动映射回 .feature 场景 → 生成验收报告（JSON + HTML）
- **AI 约束化** — 自动为 Cursor / Claude Code / Qoder 生成编码约束（模块边界、命名规范、禁止模式）
- **MCP 原生集成** — AI 客户端直接调用 3 个 MCP 工具，用户全程自然语言交互
- **插件系统** — 自定义 Reader / Writer / Parser 扩展
- **变更影响分析** — 基于 git diff 自动推断受影响的 feature 和模块

---

## 快速开始

### 安装方式一：npm 全局安装

```bash
# 1. 全局安装
npm install -g speclore

# 2. 进入你的项目目录
cd your-project

# 3. 运行 setup（自动检测 AI 工具、配置 MCP、生成规则文件）
speclore setup

# 4. 初始化项目上下文
speclore init
```

### 安装方式二：git clone

```bash
git clone https://github.com/cheneyzhang93/speclore.git
cd speclore
pnpm install
pnpm build
```

在你的项目中配置 MCP（手动指向本地路径），在 `.cursor/mcp.json` 或 `.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "speclore": {
      "command": "node",
      "args": ["/path/to/speclore/dist/mcp/server.js"]
    }
  }
}
```

### 30 秒上手

**Step 1 — Setup（一次性）**

```bash
speclore setup
```

**Step 2 — 跟 AI 说话**（在 Cursor / Claude Code / Qoder 中）

> "帮我把这个需求生成 feature 文件：用户注册需要邮箱验证"
> → AI 自动调用 `speclore.spec` 工具

**Step 3 — 生成约束**

> "生成编码约束"
> → AI 自动调用 `speclore.code` 工具

**Step 4 — 验收**

> "运行验收测试"
> → AI 自动调用 `speclore.verify` 工具

---

## 使用手册

### 三层交互模型

| 层级 | 用户类型 | 交互方式 | 示例 |
|------|---------|---------|------|
| **Layer 1** | 小白 | 跟 AI 说话 | "把这个需求变成 feature 文件" |
| **Layer 2** | 普通用户 | CLI 命令 | `speclore spec requirements.md` |
| **Layer 3** | 进阶用户 | CLI + 配置 | `speclore verify --impact --watch` |

### 命令参考

#### `speclore`（智能模式）

无参数运行时自动显示项目状态；带文本参数时直接生成 feature。

```bash
speclore                           # 显示项目状态
speclore "用户注册需要邮箱验证"      # 一句话生成 feature
```

#### `speclore setup [--global]`

一次性项目配置。检测 AI 工具 → 写入 MCP 配置 → 生成规则文件。

```bash
speclore setup            # 项目级配置
speclore setup --global   # 全局配置（~/.speclore/）
```

#### `speclore init`

初始化项目上下文。扫描项目结构 → 检测模块 → 生成 `.speclore/context.json`。

```bash
speclore init
```

#### `speclore status`

显示项目诊断状态：配置、上下文、feature 文件、AI 工具检测结果。

```bash
speclore status
```

#### `speclore spec <source>`

需求来源 → .feature 文件。支持文件路径、URL、直接文本。

```bash
speclore spec requirements.md           # Markdown 文件
speclore spec https://jira.example.com/issue/PROJ-123  # URL
speclore spec "用户需要能够重置密码"      # 直接文本
speclore spec design.docx               # Word 文档
speclore spec specs.xlsx                # Excel 表格
speclore spec mockup.png                # 图片（OCR）
speclore spec req.pdf                   # PDF 文档
speclore spec requirements.md -m order  # 指定目标模块
```

#### `speclore code [features...]`

将 .feature 文件转化为 AI 编码约束。

```bash
speclore code                          # 处理所有 feature
speclore code specs/order/create.feature  # 处理指定 feature
```

#### `speclore verify [features...] [--impact] [--watch] [--timeout <min>]`

运行测试并映射结果到 .feature 场景。

```bash
speclore verify                       # 运行所有验证
speclore verify --impact              # 含变更影响分析
speclore verify --watch               # 监听模式（文件变化自动重跑）
speclore verify --watch --timeout 60  # 监听 60 分钟
```

#### `speclore teardown [--global]`

卸载清理，移除 SpecLore 配置和生成文件。

```bash
speclore teardown            # 清理项目级配置
speclore teardown --global   # 清理全局配置
```

---

## 配置说明

### config.yaml 完整参考

配置文件位于 `.speclore/config.yaml`：

```yaml
project:
  name: my-project          # 项目名称
  language: typescript       # 项目语言
  framework: nestjs          # 框架
  profile: normal            # strict | normal | minimal
  modules:
    order:
      path: src/order
      responsibility: Order management and processing
      dependsOn: [inventory, payment]
      entities: [Order, OrderItem]
      apis: [createOrder, getOrder]

ai:
  provider: openai-compatible  # openai-compatible | claude | ollama
  baseUrl: https://api.openai.com/v1
  model: gpt-4
  apiKeyEnv: OPENAI_API_KEY   # 环境变量名

spec:
  outputDir: specs            # .feature 输出目录
  defaultLanguage: zh-CN      # 默认语言
  confidenceThreshold: 0.6    # 低于此值标记 needsReview

verify:
  command: npm test           # 测试命令
  timeout: 300                # 超时（秒）
  reportFormat: [json, html]  # 报告格式
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"

plugins:
  readers: []
  writers: []
  parsers: []
```

### Profile 模式

| Profile | 适用场景 | 约束粒度 |
|---------|---------|---------|
| **strict** | 生产环境、多人协作 | 完整 ModuleRule + 命名规范 + 禁止模式 |
| **normal** | 日常开发（默认） | 核心模块边界 + 基本规范 |
| **minimal** | 原型开发、个人项目 | 基础模块边界 |

---

## 测试映射

### 映射文件（推荐）

AI 生成测试代码时同时生成映射文件 `.speclore/mappings/{module}/{feature}.json`：

```json
{
  "feature": "specs/order/create.feature",
  "generatedAt": "2024-01-15T10:30:00Z",
  "scenarios": {
    "创建有效订单": {
      "testFile": "tests/order/create.test.ts",
      "testMethod": "should create order with valid items"
    },
    "库存不足时拒绝": {
      "testFile": "tests/order/create.test.ts",
      "testMethod": "should reject when inventory is insufficient"
    }
  }
}
```

### 显式标记（降级）

在测试文件中添加 `@speclore-scenario` 注释标记：

```typescript
// @speclore-scenario: 创建有效订单
it('should create order with valid items', () => { ... });
```

### 映射优先级

```
映射文件 → 显式标记 → unmapped
```

---

## 插件开发

### 插件类型

| 类型 | 接口 | 用途 |
|------|------|------|
| **ReaderPlugin** | `{ name, supportedFormats[], canRead(), read() }` | 自定义需求来源解析 |
| **WriterPlugin** | `{ toolName, configFile, detect(), write(), remove() }` | 自定义 AI 工具约束输出 |
| **ParserPlugin** | `{ framework, canParse(), parse() }` | 自定义测试结果解析 |

### 开发指南

```typescript
// 1. 创建插件
import type { ReaderPlugin, StructuredRequirement } from 'speclore';

export class ConfluenceReader implements ReaderPlugin {
  readonly name = 'confluence-reader';
  readonly supportedFormats = ['confluence-url'];

  canRead(source: string): boolean {
    return source.includes('atlassian.net/wiki');
  }

  async read(source: string): Promise<StructuredRequirement[]> {
    // Fetch from Confluence API and parse
    // ...
  }
}

// 2. 发布为 npm 包
// 3. 在 config.yaml 中注册
// plugins:
//   readers:
//     - name: confluence-reader
//       package: speclore-confluence-reader
```

---

## MCP 工具参考

### `speclore.spec`

需求 → .feature 文件。

**输入**:
```json
{
  "source": "用户注册需要邮箱验证，密码至少 8 位",
  "module": "auth"
}
```

**输出**:
```json
{
  "createdFiles": ["specs/auth/register.feature"],
  "scenarios": [
    {
      "feature": "用户注册",
      "name": "有效邮箱注册成功",
      "given": ["系统已启动"],
      "when": ["用户提供有效邮箱和密码提交注册"],
      "then": ["系统创建账户并发送验证邮件"]
    }
  ],
  "constraints": "Generated 1 feature file(s) with 3 scenario(s).",
  "nextSteps": "Run `speclore code` to generate AI coding constraints."
}
```

### `speclore.code`

.feature → AI 编码约束。

**输入**:
```json
{
  "features": ["specs/auth/register.feature"],
  "tools": ["cursor", "claude"]
}
```

**输出**:
```json
{
  "writtenFiles": [".cursor/rules/speclore.mdc", ".claude/rules/speclore.md"],
  "constraintContent": "Constraints for 2 module(s)...",
  "moduleRules": [...],
  "activeConstraints": [...],
  "codingGuidance": "Project: my-app. Language: TypeScript..."
}
```

### `speclore.verify`

测试运行 → 验收报告。

**输入**:
```json
{
  "features": ["specs/auth/register.feature"],
  "impact": false
}
```

**输出**:
```json
{
  "summary": "5/5 scenarios passed (100%)",
  "passed": 5,
  "failed": 0,
  "unmapped": 0,
  "details": [...],
  "failedDetails": []
}
```

---

## 支持的 AI 客户端

| 客户端 | 状态 | 配置文件 |
|--------|------|----------|
| Cursor | v1 内置 | `.cursor/mcp.json` + `.cursor/rules/speclore.mdc` |
| Claude Code | v1 内置 | `.mcp.json` + `.claude/rules/speclore.md` |
| Qoder | v1 内置 | `.qoder/mcp.json` + `.qoder/rules/speclore.md` |
| Copilot / Windsurf / Cline / Gemini CLI / Trae / AGENTS.md | 社区贡献 | — |

---

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                     CLI / MCP Server                     │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│  M1      │  M2      │  M3      │  M4      │  M5         │
│ 需求摄入  │ Feature  │ 约束编码  │ 验收验证  │ 上下文引擎   │
│          │ 生成     │          │          │             │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                    M7 高级分析（RDG/CDG/Impact）           │
├─────────────────────────────────────────────────────────┤
│              AI Provider (OpenAI / Claude / Ollama)       │
├─────────────────────────────────────────────────────────┤
│              Plugin System (Reader / Writer / Parser)     │
├─────────────────────────────────────────────────────────┤
│              Infrastructure (Config / Logger / FileLock)  │
└─────────────────────────────────────────────────────────┘
```

---

## 开发

### 本地开发

```bash
git clone https://github.com/cheneyzhang93/speclore.git
cd speclore
pnpm install
pnpm dev        # watch 模式开发
pnpm test       # 运行测试
pnpm build      # 构建
```

### 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -am 'Add my feature'`
4. 推送：`git push origin feature/my-feature`
5. 提交 Pull Request

---

## License

MIT
