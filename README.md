# SpecLore

[English](README.en.md) | **中文**

[![npm](https://img.shields.io/npm/v/speclore.svg)](https://www.npmjs.com/package/speclore)
[![CI](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml/badge.svg)](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**需求驱动的 AI 编码工具 — 把需求变成可验收的 BDD 规格，让 AI 编码有约束、有验收、可追溯。**

SpecLore 解决 AI 编码时代的核心痛点：需求散落在文档、聊天和口头沟通中，AI 生成的代码缺乏业务约束，测试与需求脱节。它将任意格式的需求转化为结构化 BDD `.feature` 验收标准，为 Cursor / Claude Code / Qoder 等 AI 编码工具生成编码约束，最后自动运行测试并生成验收报告。全程通过 MCP 协议与 AI 客户端无缝协作。

```
需求（任意格式）→ BDD .feature → AI 编码约束 + 测试骨架 → 测试验收报告
```

---

## 安装

```bash
npm install -g speclore
```

> **前提条件**：Node.js 18+

---

## 快速开始

SpecLore 提供三种使用方式，根据你的工作习惯选择：

| 方式 | 适合谁 | 核心体验 |
|------|--------|---------|
| **方式一：CLI 命令行** | 习惯终端操作的开发者 | 手动执行命令，完全掌控流程 |
| **方式二：MCP + AI 客户端**（推荐） | 使用 Cursor / Qoder / Claude Code 的开发者 | 用自然语言对话，AI 自动完成全流程 |
| **方式三：混合使用** | 两者都想要的开发者 | CLI 做初始化，AI 客户端做后续操作 |

### 方式一：CLI 命令行

适合喜欢终端操作、需要精确控制每一步的开发者。

```bash
# 1. 初始化项目（检测 AI 工具 → 写入 MCP 配置 → 生成配置文件）
cd your-project && speclore setup

# 2. 从需求生成 .feature 验收标准
speclore spec "患者注册需要手机号验证，支持微信登录"

# 3. 生成 AI 编码约束 + 测试骨架
speclore code

# 4. 在 AI 客户端中编码后，运行验收
speclore verify
```

就这么简单。`setup` 只需执行一次，之后每个新需求只需 `spec` → `code` → `verify` 三步。

### 方式二：MCP + AI 客户端（推荐）

如果你使用 Cursor、Qoder 或 Claude Code，这是最自然的方式 — 用对话代替命令。

**第一步**：在项目目录运行一次 `speclore setup`，它会自动检测你的 AI 工具并配置 MCP。

**第二步**：打开 AI 客户端，直接对话：

> **你**：帮我实现患者注册功能，需要手机号验证

> **AI**（自动调用 `speclore.spec`）：已生成 `specs/patient/register.feature`，包含 3 个验收场景：
> - 手机号注册成功
> - 手机号格式错误时拒绝
> - 重复手机号时提示冲突

> **AI**（自动调用 `speclore.code`）：已生成编码约束和测试骨架：
> - `.qoder/rules/speclore.md` — 编码约束（含业务规则）
> - `tests/patient/register.test.ts` — 测试骨架（3 个 `it.skip`）

> **你**：好的，我来实现代码和测试

> *（AI 编码时自动读取约束规则，你填充测试骨架中的 `it.skip`）*

> **你**：运行验收

> **AI**（调用 `speclore.verify`）：✅ 3/3 场景通过 (100%)

全程无需手动执行任何 CLI 命令。AI 通过 MCP 协议直接调用 SpecLore 的工具，自动推进工作流状态。

### 方式三：混合使用

用 CLI 做初始化和需求生成，用 AI 客户端做编码和验收：

```bash
# CLI：初始化 + 生成 .feature
speclore setup
speclore spec requirements.md
speclore code
```

然后在 AI 客户端中编码，最后让 AI 调用 `speclore.verify` 运行验收。

---

## 工作流

SpecLore 的工作流是一个有状态流水线，每个步骤都有明确的状态转换：

```
speclore.status → speclore.spec → speclore.code → (AI 编码) → speclore.verify
   查看状态        生成 feature    生成约束+骨架      实现代码      验收测试
     ↓                ↓               ↓               ↓              ↓
   项目状态      → specified     → constrained     → coding     → verified
```

每个工具调用后返回当前状态和下一步指引，乱序调用会自动报错：

| 乱序场景 | 报错信息 |
|---------|---------|
| 没有 .feature 就调 `code` | `No .feature files found. Run speclore.spec first.` |
| 没有测试骨架就调 `verify` | `No test scaffolding. Run speclore.code first.` |
| 项目未初始化 | 自动创建 `.speclore/config.yaml` |

---

## 支持的输入格式

SpecLore 可以从任意格式的需求来源生成 `.feature` 文件：

| 格式 | 示例 |
|------|------|
| Markdown | `speclore spec requirements.md` |
| Word | `speclore spec design.docx` |
| Excel | `speclore spec specs.xlsx` |
| PDF | `speclore spec design.pdf` |
| 图片 (OCR) | `speclore spec mockup.png` |
| URL | `speclore spec https://jira.example/123` |
| 直接文本 | `speclore spec "用户需要能重置密码"` |

---

## 命令速查

| 命令 | 用途 |
|------|------|
| `speclore setup` | 初始化项目（检测 AI 工具 → 写入 MCP 配置 → 生成规则） |
| `speclore spec <source>` | 需求来源 → `.feature` 验收标准 |
| `speclore code` | `.feature` → AI 编码约束 + 测试骨架 |
| `speclore verify` | 运行测试 → 验收报告（映射到 .feature 场景） |
| `speclore verify --watch` | 监听模式，文件变化自动重跑验收 |
| `speclore status` | 查看项目状态、工作流进度、推荐操作 |
| `speclore init` | 扫描项目结构，生成上下文（可选，首次 spec/code 时自动执行） |
| `speclore migrate` | 升级后迁移已有 .feature 文件到工作流状态 |
| `speclore teardown` | 卸载清理 |

---

## MCP 集成

SpecLore 通过 MCP（Model Context Protocol）为 AI 客户端提供 4 个工具，AI 可以直接调用：

| MCP 工具 | 用途 | 状态变化 |
|----------|------|---------|
| `speclore.status` | 项目状态 + 推荐操作 | — |
| `speclore.spec` | 需求 → .feature | → `specified` |
| `speclore.code` | .feature → 约束 + 测试骨架 | → `constrained` |
| `speclore.verify` | 测试 → 验收报告 | → `verified` |

`speclore setup` 会自动检测你使用的 AI 客户端并写入对应的 MCP 配置：

| AI 客户端 | MCP 配置文件 | 约束规则文件 |
|-----------|-------------|-------------|
| Cursor | `.cursor/mcp.json` | `.cursor/rules/speclore.mdc` |
| Claude Code | `.mcp.json` | `.claude/rules/speclore.md` |
| Qoder | `.qoder/mcp.json` | `.qoder/rules/speclore.md` |

每个 MCP 工具响应包含 `workflow` 字段（`currentState` + `nextStep`），引导 AI 按正确顺序推进工作流。

---

## 配置

`speclore setup` 生成的 `.speclore/config.yaml` 核心配置：

```yaml
verify:
  command: "pnpm test"              # 你的测试命令
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
```

<details>
<summary>完整配置参考</summary>

```yaml
project:
  name: my-project
  profile: normal            # strict | normal | minimal
  modules:
    order:
      path: src/order
      responsibility: 订单管理
      dependsOn: [inventory, payment]

ai:
  provider: openai-compatible  # openai-compatible | claude | ollama
  baseUrl: https://api.openai.com/v1
  model: gpt-4
  apiKeyEnv: OPENAI_API_KEY

spec:
  outputDir: specs
  defaultLanguage: zh-CN
  confidenceThreshold: 0.6

verify:
  command: npm test
  timeout: 300
  reportFormat: [json, html]
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
```

</details>

---

## 技术架构

```
┌──────────────────────────────────────────────────────┐
│                  CLI / MCP Server                      │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ 需求摄入  │ Feature  │ 约束编码  │ 验收验证  │ 上下文引擎 │
│ (M1)     │ 生成(M2) │ (M3)     │ (M4)     │ (M5)     │
├──────────┴──────────┴──────────┴──────────┴──────────┤
│          状态管理器 · 测试骨架生成 · 变更影响分析          │
├──────────────────────────────────────────────────────┤
│          AI Provider (OpenAI / Claude / Ollama)        │
├──────────────────────────────────────────────────────┤
│          Plugin System (Reader / Writer / Parser)      │
└──────────────────────────────────────────────────────┘
```

---

## 完整文档

| 文档 | 说明 |
|------|------|
| [快速开始](docs/guide/getting-started.md) | 完整入门教程，三种使用方式详解 |
| [工作流](docs/guide/workflow.md) | 状态机驱动的完整工作流说明 |
| [配置参考](docs/reference/configuration.md) | `config.yaml` 完整配置、Profile 模式、所有 CLI 命令详细参考 |
| [MCP 工具参考](docs/reference/mcp-tools.md) | 4 个 MCP 工具完整 I/O、流程强约束、自动初始化与迁移 |
| [测试映射](docs/reference/test-mapping.md) | 测试结果与 .feature 场景的三种映射方式 |
| [插件开发](docs/advanced/plugin-guide.md) | Reader / Writer / Parser 插件开发与发布 |
| [产品技术规格](docs/advanced/architecture.md) | 完整产品技术规格书 |

---

## 开发

```bash
git clone https://github.com/cheneyzhang93/speclore.git
cd speclore && pnpm install && pnpm build
pnpm test       # 运行测试
pnpm dev        # watch 模式
```

## License

MIT
