---
title: 完整示例
description: 以患者注册功能为例，演示 SpecLore 完整工作流：初始化、生成 .feature、AI 编码约束、测试骨架与验收。
---

# 完整示例

以「患者注册」功能为例，演示 SpecLore 的完整工作流。

---

## 场景描述

> 患者注册功能需要支持手机号验证，密码至少 8 位，支持微信快捷登录。

---

## 第一步：初始化项目

```bash
cd my-healthcare-app && speclore setup
```

输出：

```
✔ 检测到 AI 工具: Cursor, Qoder
✔ 已写入 .cursor/mcp.json
✔ 已写入 .qoder-cn/mcp.json
✔ 已生成 .speclore/config.yaml
```

生成的 `.speclore/config.yaml`：

```yaml
project:
  name: my-healthcare-app
  language: typescript
  framework: nestjs
  profile: normal
  modules:
    patient:
      path: src/patient
      responsibility: 患者管理与认证
      entities: [Patient, PatientAuth]
      apis: [register, login, verifyPhone]

ai:
  provider: openai-compatible
  baseUrl: https://api.openai.com/v1
  model: gpt-4
  apiKeyEnv: OPENAI_API_KEY

spec:
  outputDir: specs
  defaultLanguage: zh-CN

verify:
  command: "pnpm test"
  timeout: 300
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
```

## 第二步：生成验收标准

```bash
speclore spec "患者注册需要手机号验证，密码至少8位，支持微信快捷登录"
```

输出：

```
✔ 已生成 specs/patient/register.feature

  场景 1: 手机号注册成功
    给定 系统已启动
    当 用户提供有效手机号和密码提交注册
    那么 系统创建患者账户并发送手机验证码

  场景 2: 手机号格式错误时拒绝
    给定 系统已启动
    当 用户提供无效手机号格式（如 abc123）
    那么 系统拒绝注册并提示手机号格式错误

  场景 3: 重复手机号时提示冲突
    给定 系统中已存在手机号 13800138000 的账户
    当 用户使用相同手机号注册
    那么 系统拒绝注册并提示该手机号已注册
```

## 第三步：生成 AI 编码约束

```bash
speclore code
```

输出：

```
✔ 已写入 .cursor/rules/speclore.mdc
✔ 已写入 .qoder/rules/speclore.md
✔ 已生成测试骨架 tests/patient/register.test.ts
```

生成的测试骨架：

```typescript
import { describe, it, expect } from 'vitest'

describe('患者注册', () => {
  it.skip('手机号注册成功', async () => {
    // 给定 系统已启动
    // 当 用户提供有效手机号和密码提交注册
    // 那么 系统创建患者账户并发送手机验证码
  })

  it.skip('手机号格式错误时拒绝', async () => {
    // 给定 系统已启动
    // 当 用户提供无效手机号格式（如 abc123）
    // 那么 系统拒绝注册并提示手机号格式错误
  })

  it.skip('重复手机号时提示冲突', async () => {
    // 给定 系统中已存在手机号 13800138000 的账户
    // 当 用户使用相同手机号注册
    // 那么 系统拒绝注册并提示该手机号已注册
  })
})
```

## 第四步：AI 编码

在 Cursor / Qoder / Claude Code 中正常编码。AI 会自动读取约束规则：

- 模块边界：`src/patient/` 只处理患者相关逻辑
- 业务规则：手机号验证、密码强度、微信登录
- 命名规范：遵循项目约定的命名风格

你填充测试骨架中的 `it.skip`：

```typescript
it('手机号注册成功', async () => {
  const result = await patientService.register({
    phone: '13800138000',
    password: 'Secure123!',
  })
  expect(result.status).toBe('created')
  expect(result.verificationSent).toBe(true)
})
```

## 第五步：验收

```bash
speclore verify
```

输出：

```
  运行测试: pnpm test

  ✔ 3/3 场景通过 (100%)

  specs/patient/register.feature
    ✓ 手机号注册成功         → passed
    ✓ 手机号格式错误时拒绝    → passed
    ✓ 重复手机号时提示冲突    → passed

  ✅ 验收通过
```

## 查看项目状态

```bash
speclore status
```

输出：

```
项目: my-healthcare-app
配置: .speclore/config.yaml ✓

Feature 状态:
  specs/patient/register.feature    verified (3/3 通过)

工作流摘要:
  总计: 1  |  已验收: 1  |  通过率: 100%
```

---

::: tip 下一步
- 了解 [配置参考](/reference/configuration) 中的 Profile 模式
- 查看 [MCP 工具](/reference/mcp-tools) 在 AI 客户端中的用法
- 了解 [测试映射](/reference/test-mapping) 的三种映射策略
:::
