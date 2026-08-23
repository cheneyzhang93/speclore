# 工作流

<script setup>
import StateMachine from '/.vitepress/components/StateMachine.vue'
</script>

SpecLore 的工作流是一条从需求到验收的单向流水线，每个阶段有明确的状态和准入条件。

---

## 状态机

<StateMachine />

| 状态 | 含义 | 触发方式 |
|------|------|---------|
| `specified` | 已生成 .feature 验收标准 | `speclore spec` |
| `constrained` | 已生成 AI 编码约束 + 测试骨架 | `speclore code` |
| `coding` | AI 正在编码（填充测试骨架） | 手动编码 |
| `verified` | 验收测试全部通过 | `speclore verify` |

## MCP 工具流程

4 个 MCP 工具按工作流顺序使用，每个工具返回当前状态和推荐下一步：

```
speclore.status → speclore.spec → speclore.code → (AI 编码) → speclore.verify
   查看状态        生成 feature    生成约束+骨架      实现代码      验收测试
```

### 状态查看

```bash
speclore status
```

显示项目诊断信息：配置状态、feature 文件分布、工作流进度、推荐操作。

### 需求 → 规格

```bash
speclore spec "需求描述"          # 直接文本
speclore spec requirements.md    # Markdown 文件
speclore spec design.docx        # Word 文档
speclore spec mockup.png         # 图片 (OCR)
```

### 规格 → 约束

```bash
speclore code                    # 处理所有 feature
speclore code specs/auth/        # 处理指定目录
```

### 验收测试

```bash
speclore verify                  # 运行所有验证
speclore verify --impact         # 含变更影响分析
speclore verify --watch          # 监听模式
speclore verify --watch --timeout 60  # 监听 60 分钟
```

## 流程强约束

乱序调用会返回明确错误和正确指引：

| 乱序场景 | 报错信息 |
|---------|---------|
| 没有 .feature 就调 `code` | `No .feature files found. Run speclore.spec first.` |
| 没有测试骨架就调 `verify` | `No test scaffolding. Run speclore.code first.` |
| 项目未初始化 | 自动创建 `.speclore/config.yaml` |
| 非法状态转换（如 `specified` → `verified`） | `Invalid state transition` 错误 |

## 自动初始化与迁移

每个 MCP 工具入口都会自动检查并初始化项目：

1. 确保 `.speclore/config.yaml` 存在（不存在则生成默认配置）
2. 确保 `.speclore/state.yaml` 存在（不存在则创建）
3. 扫描 `specs/` 目录，将已有但未跟踪的 `.feature` 文件注册为 `specified` 状态

升级 SpecLore 版本后无需手动操作，第一次调用任何工具时自动完成迁移。

如需手动迁移：

```bash
speclore migrate
```

::: tip 下一步
- 查看 [完整示例](/guide/examples)
- 了解 [测试映射](/reference/test-mapping) 如何将测试结果映射回 .feature 场景
:::
