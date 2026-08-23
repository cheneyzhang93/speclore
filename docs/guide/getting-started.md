---
title: 快速开始
description: 从零开始使用 SpecLore。三种使用方式详解：CLI 命令行、MCP + AI 客户端、混合模式。5 分钟内跑通完整流程。
---

# 快速开始

从零到验收，SpecLore 提供三种使用方式。根据你的工作习惯选择最适合的一种。

---

## 安装

```bash
npm install -g speclore
```

::: tip 前提条件
- Node.js 18+
- 任意包管理器（npm / pnpm / yarn）
:::

---

## 选择你的使用方式

| 方式 | 适合谁 | 核心体验 |
|------|--------|---------|
| **方式一：CLI 命令行** | 习惯终端操作的开发者 | 手动执行命令，完全掌控流程 |
| **方式二：MCP + AI 客户端**（推荐） | 使用 Cursor / Qoder / Claude Code 的开发者 | 用自然语言对话，AI 自动完成全流程 |
| **方式三：混合使用** | 两者都想要的开发者 | CLI 做初始化，AI 客户端做后续操作 |

::: tip 怎么选？
- 如果你**主要用终端**工作 → 方式一
- 如果你**主要用 AI 编码工具**（Cursor / Qoder / Claude Code）→ 方式二（推荐）
- 如果你**两者都用** → 方式三

无论选哪种，第一步都是 `speclore setup`。
:::

---

## 方式一：CLI 命令行

适合喜欢终端操作、需要精确控制每一步的开发者。

### 第一步：初始化项目

```bash
cd your-project && speclore setup
```

`speclore setup` 会完成以下工作：

1. **检测 AI 工具**：自动扫描项目中的 Cursor / Claude Code / Qoder
2. **写入 MCP 配置**：为检测到的 AI 工具生成 MCP 配置文件
3. **生成配置文件**：创建 `.speclore/config.yaml`

```
SpecLore Setup
───────────────
Detected AI tools: cursor, qoder
Created config: D:\code\my-project\.speclore\config.yaml
MCP configuration written for all detected AI clients.

Setup complete! Next steps:

  Option A — CLI workflow (terminal users):
    speclore spec "your requirement"   → generate .feature
    speclore code                      → generate constraints + tests
    speclore verify                    → run acceptance

  Option B — AI client workflow (recommended):
    Open Cursor / Qoder / Claude Code and start chatting.
    MCP is already configured — AI handles the full pipeline.

  Optional — Pre-scan project context:
    speclore init   → scan modules/entities/APIs for better AI context
    (Not required — context is auto-built on first spec/code call)
```

::: info 关于 `speclore init`
`speclore init` 会扫描项目结构，检测模块、实体和 API，生成 `context.json` 帮助 AI 更好地理解你的代码库。**这是可选的** — 当你第一次运行 `speclore spec` 或 `speclore code` 时，上下文会自动构建。手动运行 `init` 的好处是可以提前查看检测结果，或在项目结构发生重大变化后刷新上下文。
:::

### 第二步：从需求生成验收标准

从任意格式的需求来源生成标准 BDD `.feature` 文件：

```bash
# 从直接文本
speclore spec "患者注册需要手机号验证，支持微信登录"

# 从 Markdown 文件
speclore spec requirements.md

# 从 Word 文档
speclore spec design.docx

# 从 URL
speclore spec https://jira.example.com/issue/PROJ-123
```

输出示例：

```
✔ 已生成 specs/patient/register.feature
  场景 1: 手机号注册成功
  场景 2: 手机号格式错误时拒绝
  场景 3: 重复手机号时提示冲突
```

### 第三步：生成 AI 编码约束 + 测试骨架

```bash
speclore code
```

自动为检测到的 AI 工具生成对应格式的约束文件：

| AI 工具 | 约束文件 |
|---------|---------|
| Cursor | `.cursor/rules/speclore.mdc` |
| Claude Code | `.claude/rules/speclore.md` |
| Qoder | `.qoder/rules/speclore.md` |

同时生成测试骨架文件（如 `tests/patient/register.test.ts`），包含与 `.feature` 场景对应的 `it.skip` 测试用例。

### 第四步：编码与验收

在 AI 客户端中正常编码。AI 会自动读取约束规则，你填充测试骨架中的 `it.skip`。

完成后运行验收：

```bash
speclore verify
```

输出示例：

```
✔ 3/3 场景通过 (100%)

specs/patient/register.feature
  ✓ 手机号注册成功         → passed
  ✓ 手机号格式错误时拒绝    → passed
  ✓ 重复手机号时提示冲突    → passed

✅ 验收通过
```

---

## 方式二：MCP + AI 客户端（推荐）

如果你使用 Cursor、Qoder 或 Claude Code，这是最自然的方式 — 用对话代替命令。

### 第一步：运行 setup

```bash
cd your-project && speclore setup
```

这一步自动检测你的 AI 工具并配置 MCP。**只需运行一次。**

### 第二步：在 AI 客户端中对话

打开你的 AI 客户端（Cursor / Qoder / Claude Code），直接对话：

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

### 为什么推荐这种方式？

- **零命令**：不需要记忆任何 CLI 命令
- **自然语言**：用日常语言描述需求，AI 自动转化为结构化规格
- **智能引导**：每个工具响应包含下一步指引，AI 不会乱序操作
- **编码约束**：AI 编码时自动读取业务规则，减少幻觉和偏离

---

## 方式三：混合使用

用 CLI 做初始化和需求生成，用 AI 客户端做编码和验收：

```bash
# CLI：初始化 + 生成 .feature + 生成约束
speclore setup
speclore spec requirements.md
speclore code
```

然后在 AI 客户端中编码，最后让 AI 调用 `speclore.verify` 运行验收。

这种方式适合：
- 需求文档已经存在（Markdown / Word / Excel），想先用 CLI 批量生成 `.feature`
- 习惯用终端做初始化，但喜欢用 AI 客户端编码

---

## 工作流状态

SpecLore 的工作流是一个有状态流水线：

```
speclore.status → speclore.spec → speclore.code → (AI 编码) → speclore.verify
   查看状态        生成 feature    生成约束+骨架      实现代码      验收测试
     ↓                ↓               ↓               ↓              ↓
   项目状态      → specified     → constrained     → coding     → verified
```

乱序调用会自动报错：

| 乱序场景 | 报错信息 |
|---------|---------|
| 没有 .feature 就调 `code` | `No .feature files found. Run speclore.spec first.` |
| 没有测试骨架就调 `verify` | `No test scaffolding. Run speclore.code first.` |
| 项目未初始化 | 自动创建 `.speclore/config.yaml` |

---

## 支持的输入格式

| 格式 | 命令示例 |
|------|---------|
| Markdown | `speclore spec requirements.md` |
| Word | `speclore spec design.docx` |
| Excel | `speclore spec specs.xlsx` |
| PDF | `speclore spec design.pdf` |
| 图片 (OCR) | `speclore spec mockup.png` |
| URL | `speclore spec https://jira.example/123` |
| 直接文本 | `speclore spec "用户需要能重置密码"` |

---

## 下一步

- 了解完整的 [工作流](/guide/workflow) 状态机
- 查看 [配置参考](/reference/configuration) 了解所有配置选项
- 了解 [MCP 工具](/reference/mcp-tools) 的详细用法
- 查看 [测试映射](/reference/test-mapping) 了解测试结果如何关联到验收场景
