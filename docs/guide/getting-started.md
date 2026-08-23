---
title: 快速开始
description: 5 分钟跑通 SpecLore 完整流程：安装、生成验收标准、编码约束、自动化验收。
---

# 快速开始

5 分钟从零到验收。

---

## 安装

```bash
npm install -g speclore
```

::: tip 前提条件
Node.js 18+
:::

---

## 5 分钟教程

### 1. 初始化项目

```bash
cd your-project && speclore setup
```

`setup` 只需运行一次。它会检测你的 AI 工具、写入 MCP 配置、生成 `.speclore/config.yaml`。

### 2. 从需求生成验收标准

```bash
speclore spec "患者注册需要手机号验证，支持微信登录"
```

输出 `specs/patient/register.feature`，包含 3 个 BDD 验收场景。

支持任意格式的需求来源：

```bash
speclore spec requirements.md          # Markdown
speclore spec design.docx              # Word
speclore spec specs.xlsx               # Excel
speclore spec https://jira.example/123 # URL
```

### 3. 生成编码约束 + 测试骨架

```bash
speclore code
```

为 AI 编码工具生成约束规则文件，同时生成测试骨架（`it.skip` 占位）。

### 4. 编码后运行验收

在 AI 客户端中编码，填充测试骨架，然后：

```bash
speclore verify
```

```
✔ 3/3 场景通过 (100%)

specs/patient/register.feature
  ✓ 手机号注册成功         → passed
  ✓ 手机号格式错误时拒绝    → passed
  ✓ 重复手机号时提示冲突    → passed

✅ 验收通过
```

---

## 其他使用方式

上面的教程是 CLI 命令行方式。SpecLore 还支持另外两种：

### MCP + AI 客户端（推荐）

如果你使用 Cursor、Qoder 或 Claude Code，运行一次 `speclore setup` 后，直接用自然语言对话完成全流程：

> **你**：帮我实现患者注册功能，需要手机号验证
>
> **AI**（自动调用 `speclore.spec`）：已生成 `specs/patient/register.feature`，包含 3 个验收场景
>
> **AI**（自动调用 `speclore.code`）：已生成编码约束和测试骨架
>
> **你**：运行验收
>
> **AI**（调用 `speclore.verify`）：✅ 3/3 场景通过 (100%)

全程无需手动执行 CLI 命令。AI 通过 MCP 协议直接调用 SpecLore 工具，自动推进工作流。

### 混合使用

CLI 做初始化和需求生成，AI 客户端做编码和验收：

```bash
speclore setup
speclore spec requirements.md
speclore code
```

然后在 AI 客户端中编码，最后让 AI 调用 `speclore.verify`。

---

## 工作流状态

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

## 下一步

- 了解完整的 [工作流](/guide/workflow) 状态机
- 查看 [配置参考](/reference/configuration) 了解所有配置选项
- 了解 [MCP 工具](/reference/mcp-tools) 的详细用法
- 查看 [测试映射](/reference/test-mapping) 了解测试结果如何关联到验收场景
