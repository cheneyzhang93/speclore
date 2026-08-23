---
title: 快速开始
description: 三步完成 SpecLore 安装、项目初始化和验收测试。从需求生成 BDD .feature 文件，到 AI 编码约束，再到自动化验收。
---

# 快速开始

从零到验收，只需三步。

---

## 安装

```bash
npm install -g speclore
```

::: tip 前提条件
SpecLore 需要 Node.js 18+ 和 pnpm / npm / yarn 任一包管理器。
:::

## 初始化项目

```bash
cd your-project && speclore setup
```

`speclore setup` 会：

1. **检测 AI 工具**：自动扫描项目中的 Cursor / Claude Code / Qoder
2. **写入 MCP 配置**：为检测到的 AI 工具生成 MCP 配置文件
3. **生成规则文件**：创建 `.speclore/config.yaml` 核心配置

```
✔ 检测到 AI 工具: Cursor, Qoder
✔ 已写入 .cursor/mcp.json
✔ 已写入 .qoder-cn/mcp.json
✔ 已生成 .speclore/config.yaml
```

## 生成验收标准

从任意格式的需求来源生成标准 BDD `.feature` 文件：

```bash
# 从 Markdown 文件
speclore spec requirements.md

# 从直接文本
speclore spec "患者注册需要手机号验证，支持微信登录"

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

## 生成 AI 编码约束

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

## 编码与验收

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

## 在 AI 客户端中使用

`speclore setup` 已自动配置好 MCP，你可以在 AI 客户端中用自然语言完成整个流程：

**你**：帮我实现患者注册功能，需要手机号验证

**AI**：已生成 `specs/patient/register.feature`，包含 3 个验收场景...

**AI**：已生成编码约束和测试骨架...

**你**：好的，我来实现代码和测试

**你**：运行验收

**AI**：✅ 3/3 场景通过 (100%)

::: tip 下一步
- 了解完整 [工作流](/guide/workflow)
- 查看 [配置参考](/reference/configuration)
- 了解 [MCP 工具](/reference/mcp-tools) 详细用法
:::
