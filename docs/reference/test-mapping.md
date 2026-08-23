---
title: 测试映射
description: SpecLore 验收验证的三种测试映射方式：映射文件（自动）、显式标记 @speclore-scenario（手动）、Pattern 匹配。
---

# 测试映射

SpecLore 的验收验证（`speclore verify`）需要将测试结果映射回 `.feature` 场景。支持三种映射方式，按优先级排列。

---

## 映射优先级

```
映射文件（自动） → 显式标记（手动） → unmapped
```

---

## 方式一：映射文件（推荐）

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

映射文件由 `speclore code` 自动生成，`speclore verify` 运行时自动读取。

---

## 方式二：显式标记（降级）

在测试文件中添加 `@speclore-scenario` 注释标记：

```typescript
// @speclore-scenario: 创建有效订单
it('should create order with valid items', () => { ... });

// @speclore-scenario: 库存不足时拒绝
it('should reject when inventory is insufficient', () => { ... });
```

---

## 方式三：Pattern 匹配

通过 `config.yaml` 中的 `verify.mapping.patterns` 配置，自动按路径模式匹配：

```yaml
verify:
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
```

例如：
- `specs/order/create.feature` → `tests/order/create.test.ts`
- `specs/patient/register.feature` → `tests/patient/register.test.ts`

---

## 未映射场景

无法映射的场景会被标记为 `unmapped`，在验收报告中单独列出：

```json
{
  "summary": "3/5 scenarios passed (60%)",
  "passed": 3,
  "failed": 0,
  "unmapped": 2,
  "details": [
    {
      "feature": "specs/order/create.feature",
      "scenarios": [
        { "name": "创建有效订单", "status": "passed", "testMethod": "should create order..." },
        { "name": "库存不足时拒绝", "status": "unmapped", "reason": "No matching test found" }
      ]
    }
  ]
}
```

未映射的场景不会阻止验收通过，但会在报告中标记提醒。
