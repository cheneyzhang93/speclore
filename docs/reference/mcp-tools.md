---
title: MCP 工具参考
description: "SpecLore 4 个 MCP 工具完整 I/O 参考：speclore.status、speclore.spec、speclore.code、speclore.verify 的输入输出与流程约束。"
---

# MCP 工具参考

SpecLore 提供 4 个 MCP 工具，按工作流顺序使用：

> `speclore.status` → `speclore.spec` → `speclore.code` → `speclore.verify`

每个工具返回的 `workflow` 字段包含当前状态和推荐下一步操作。

---

## `speclore.status`

查看项目工作流状态、feature 状态分布和推荐操作。

**输入**:

```json
{
  "feature": "specs/auth/register.feature"
}
```

> `feature` 可选，不填则返回全部 feature 状态。

**输出**:

```json
{
  "project": {
    "initialized": true,
    "configCreated": false,
    "testCommand": "pnpm test",
    "aiToolsDetected": ["qoder"]
  },
  "features": [
    {
      "file": "specs/auth/register.feature",
      "state": "constrained",
      "scenarios": 3,
      "constraintFiles": [".qoder/rules/speclore.md"],
      "testFiles": ["tests/auth/register.test.ts"]
    }
  ],
  "summary": {
    "total": 1,
    "specified": 0,
    "constrained": 1,
    "coding": 0,
    "verified": 0
  },
  "recommendedActions": [
    "Fill in test scaffolding implementations, then start coding."
  ]
}
```

---

## `speclore.spec`

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
  "constraints": "已生成 1 个 feature 文件，共 3 个场景。",
  "nextSteps": "运行 `speclore code` 生成 AI 编码约束。",
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "specified",
    "nextStep": "Call speclore.code to generate constraints and test scaffolding.",
    "projectSummary": {
      "total": 1,
      "specified": 1,
      "constrained": 0,
      "coding": 0,
      "verified": 0
    }
  }
}
```

---

## `speclore.code`

.feature → AI 编码约束 + 测试骨架。

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
  "constraintContent": "2 个模块的约束内容...",
  "moduleRules": [],
  "activeConstraints": [],
  "codingGuidance": "项目: my-app. 语言: TypeScript...",
  "scaffoldFiles": [
    {
      "testFile": "tests/auth/register.test.ts",
      "framework": "vitest",
      "scenarios": 3
    }
  ],
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "constrained",
    "nextStep": "Start coding. Constraints and test scaffolding are ready.",
    "projectSummary": {
      "total": 1,
      "specified": 0,
      "constrained": 1,
      "coding": 0,
      "verified": 0
    }
  }
}
```

---

## `speclore.verify`

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
  "details": [],
  "failedDetails": [],
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "verified",
    "nextStep": "All features verified. Add new requirements with speclore.spec.",
    "projectSummary": {
      "total": 1,
      "specified": 0,
      "constrained": 0,
      "coding": 0,
      "verified": 1
    }
  }
}
```

---

## 流程强约束

乱序调用会返回明确错误和正确指引：

| 场景 | 结果 |
|------|------|
| 调 `speclore.code` 但没有 .feature 文件 | 返回错误：`No .feature files found. Run speclore.spec first.` |
| 调 `speclore.verify` 但没有测试骨架 | 返回错误：`No test scaffolding. Run speclore.code first.` |
| 调任何工具但项目未初始化 | 自动创建 `.speclore/config.yaml` 并提示配置 |
| 非法状态转换（如 `specified` → `verified`） | 抛出 `Invalid state transition` 错误 |

## 自动初始化与迁移

每个 MCP 工具入口都会自动检查并初始化项目：

1. 确保 `.speclore/config.yaml` 存在（不存在则生成默认配置）
2. 确保 `.speclore/state.yaml` 存在（不存在则创建）
3. 扫描 `specs/` 目录，将已有但未跟踪的 `.feature` 文件注册为 `specified` 状态

升级 SpecLore 版本后无需手动操作，第一次调用任何工具时自动完成迁移。
