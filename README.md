# SpecLore

[English](README.en.md) | **中文**

[![npm](https://img.shields.io/npm/v/speclore.svg)](https://www.npmjs.com/package/speclore)
[![CI](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml/badge.svg)](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**AI 编码时代的产研协同工具 — 把需求变成可验收的 BDD 规格，把验收变成自动化流水线。**

SpecLore 将散落在文档、聊天、口头中的需求，转化为结构化的 BDD `.feature` 验收标准，再为 Cursor / Claude Code / Qoder 等 AI 编码工具生成编码约束，最后自动运行测试并生成验收报告。全程通过 MCP 协议与 AI 客户端无缝协作。

```
需求（任意格式）→ BDD .feature → AI 编码约束 + 测试骨架 → 测试验收报告
```

---

## 安装

```bash
npm install -g speclore
```

## 快速开始

三步从零到验收：

```bash
# 1. 初始化项目（自动检测 AI 工具，生成配置）
cd your-project && speclore setup

# 2. 从需求生成 .feature 验收标准
speclore spec "患者注册需要手机号验证，支持微信登录"

# 3. 生成 AI 编码约束 + 测试骨架
speclore code
```

然后在 AI 客户端中编码，完成后运行验收：

```bash
speclore verify
```

就这么简单。也可以在 AI 客户端（Cursor / Qoder / Claude Code）中用自然语言完成整个流程 — `setup` 已自动配置好 MCP。

---

## 工作流

```
speclore.status → speclore.spec → speclore.code → (AI 编码) → speclore.verify
   查看状态        生成 feature    生成约束+骨架      实现代码      验收测试
     ↓                ↓               ↓               ↓              ↓
   项目状态      → specified     → constrained     → coding     → verified
```

每个工具调用后返回当前状态和下一步指引，乱序调用自动报错：

| 乱序场景 | 报错信息 |
|---------|---------|
| 没有 .feature 就调 `code` | `No .feature files found. Run speclore.spec first.` |
| 没有测试骨架就调 `verify` | `No test scaffolding. Run speclore.code first.` |
| 项目未初始化 | 自动创建 `.speclore/config.yaml` |

---

## 示例

以「患者注册」为例，在 AI 客户端中的完整对话：

**你**：帮我实现患者注册功能，需要手机号验证

**AI**（自动调用 `speclore.spec`）：已生成 `specs/patient/register.feature`，包含 3 个验收场景：
- 手机号注册成功
- 手机号格式错误时拒绝
- 重复手机号时提示冲突

**AI**（自动调用 `speclore.code`）：已生成编码约束和测试骨架：
- `.qoder/rules/speclore.md` — 编码约束（含业务规则）
- `tests/patient/register.test.ts` — 测试骨架（3 个 `it.skip`）

**你**：好的，我来实现代码和测试

*（AI 编码时自动读取约束规则，你填充测试骨架中的 `it.skip`）*

**你**：运行验收

**AI**（调用 `speclore.verify`）：✅ 3/3 场景通过 (100%)

---

## 支持的输入格式

Markdown · Word · Excel · PDF · 图片 (OCR) · URL · 直接文本

```bash
speclore spec requirements.md          # Markdown
speclore spec design.docx              # Word
speclore spec specs.xlsx               # Excel
speclore spec mockup.png               # 图片
speclore spec https://jira.example/123 # URL
speclore spec "用户需要能重置密码"       # 直接文本
```

## 命令速查

| 命令 | 用途 |
|------|------|
| `speclore` | 显示项目状态 |
| `speclore setup` | 初始化项目（检测 AI 工具 → 写入 MCP 配置 → 生成规则） |
| `speclore spec <source>` | 需求来源 → `.feature` 验收标准 |
| `speclore code` | `.feature` → AI 编码约束 + 测试骨架 |
| `speclore verify` | 运行测试 → 验收报告（映射到 .feature 场景） |
| `speclore verify --watch` | 监听模式，文件变化自动重跑验收 |
| `speclore status` | 查看项目状态、工作流进度、推荐操作 |
| `speclore migrate` | 升级后迁移已有 .feature 文件到工作流状态 |
| `speclore init` | 扫描项目结构，生成上下文文件 |
| `speclore teardown` | 卸载清理 |

## MCP 工具

SpecLore 提供 4 个 MCP 工具，AI 客户端通过 MCP 协议直接调用：

| 工具 | 用途 | 状态变化 |
|------|------|---------|
| `speclore.status` | 项目状态 + 推荐操作 | — |
| `speclore.spec` | 需求 → .feature | → `specified` |
| `speclore.code` | .feature → 约束 + 测试骨架 | → `constrained` |
| `speclore.verify` | 测试 → 验收报告 | → `verified` |

每个工具响应包含 `workflow` 字段（`currentState` + `nextStep`），引导 AI 按正确顺序推进。

## 支持的 AI 客户端

| 客户端 | 配置文件 | 约束规则文件 |
|--------|---------|-------------|
| Cursor | `.cursor/mcp.json` | `.cursor/rules/speclore.mdc` |
| Claude Code | `.mcp.json` | `.claude/rules/speclore.md` |
| Qoder | `.qoder/mcp.json` | `.qoder/rules/speclore.md` |

`speclore setup` 自动检测并配置。

---

## 配置

`setup` 生成的 `.speclore/config.yaml` 核心配置：

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
| [配置参考](docs/configuration.md) | `config.yaml` 完整配置、Profile 模式、所有 CLI 命令详细参考 |
| [MCP 工具参考](docs/mcp-reference.md) | 4 个 MCP 工具完整 I/O、流程强约束、自动初始化与迁移 |
| [测试映射](docs/test-mapping.md) | 测试结果与 .feature 场景的三种映射方式 |
| [插件开发](docs/plugin-guide.md) | Reader / Writer / Parser 插件开发与发布 |
| [产品技术规格](docs/product-spec.md) | 完整产品技术规格书 |

---

## 开发

```bash
git clone https://github.com/cheneyzhang93/speclore.git
cd speclore && pnpm install && pnpm build
pnpm test       # 333 tests
pnpm dev        # watch 模式
```

## License

MIT
