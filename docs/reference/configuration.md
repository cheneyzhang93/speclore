# 配置参考

SpecLore 的配置文件位于 `.speclore/config.yaml`，由 `speclore setup` 自动生成。

---

## 完整配置

```yaml
project:
  name: my-project              # 项目名称
  language: typescript           # 项目语言（typescript | javascript | python | go 等）
  framework: nestjs              # 框架（nestjs | express | react | vue 等）
  profile: normal                # 约束粒度：strict | normal | minimal
  modules:                       # 模块定义
    order:
      path: src/order            # 模块源码路径
      responsibility: 订单管理与处理  # 模块职责描述
      dependsOn: [inventory, payment]  # 依赖的其他模块
      entities: [Order, OrderItem]     # 核心实体
      apis: [createOrder, getOrder]    # 对外 API

ai:
  provider: openai-compatible      # AI 提供者：openai-compatible | claude | ollama
  baseUrl: https://api.openai.com/v1  # API 地址
  model: gpt-4                     # 模型名称
  apiKeyEnv: OPENAI_API_KEY        # API Key 环境变量名

spec:
  outputDir: specs                 # .feature 文件输出目录
  defaultLanguage: zh-CN           # 默认语言（zh-CN | en）
  confidenceThreshold: 0.6         # 低于此值的场景标记为 needsReview

verify:
  command: npm test                # 测试命令
  timeout: 300                     # 超时时间（秒）
  reportFormat: [json, html]       # 报告格式
  mapping:
    patterns:                      # feature ↔ test 映射规则
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"

plugins:
  readers: []                      # 自定义 Reader 插件
  writers: []                      # 自定义 Writer 插件
  parsers: []                      # 自定义 Parser 插件
```

---

## Profile 模式

| Profile | 适用场景 | 约束粒度 |
|---------|---------|---------|
| **strict** | 生产环境、多人协作 | 完整 ModuleRule + 命名规范 + 禁止模式 + 完整 feature 业务规则 |
| **normal** | 日常开发（默认） | 核心模块边界 + 基本规范 + feature 业务规则 |
| **minimal** | 原型开发、个人项目 | 基础模块边界 |

---

## 三层交互模型

| 层级 | 用户类型 | 交互方式 | 示例 |
|------|---------|---------|------|
| **Layer 1** | 小白 | 跟 AI 说话 | "把这个需求变成 feature 文件" |
| **Layer 2** | 普通用户 | CLI 命令 | `speclore spec requirements.md` |
| **Layer 3** | 进阶用户 | CLI + 配置 | `speclore verify --impact --watch` |

---

## 命令详细参考

### `speclore`（智能模式）

无参数运行时自动显示项目状态；带文本参数时直接生成 feature。

```bash
speclore                           # 显示项目状态
speclore "用户注册需要邮箱验证"      # 一句话生成 feature
```

### `speclore setup [--global]`

一次性项目配置。检测 AI 工具 → 写入 MCP 配置 → 生成规则文件。

```bash
speclore setup            # 项目级配置
speclore setup --global   # 全局配置（~/.speclore/）
```

### `speclore init`

初始化项目上下文。扫描项目结构 → 检测模块 → 生成 `.speclore/context.json`。

```bash
speclore init
```

### `speclore status`

显示项目诊断状态：配置、上下文、feature 文件、AI 工具检测、工作流状态和推荐操作。

```bash
speclore status
```

### `speclore spec <source>`

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

### `speclore code [features...]`

将 .feature 文件转化为 AI 编码约束 + 测试骨架。

```bash
speclore code                          # 处理所有 feature
speclore code specs/order/create.feature  # 处理指定 feature
```

### `speclore verify [features...] [--impact] [--watch] [--timeout <min>]`

运行测试并映射结果到 .feature 场景。

```bash
speclore verify                       # 运行所有验证
speclore verify --impact              # 含变更影响分析
speclore verify --watch               # 监听模式（文件变化自动重跑）
speclore verify --watch --timeout 60  # 监听 60 分钟
```

### `speclore migrate`

升级后迁移已有 .feature 文件到工作流状态。扫描 specs 目录，将未跟踪的 feature 注册为 `specified`。

```bash
speclore migrate
```

### `speclore teardown [--global]`

卸载清理，移除 SpecLore 配置和生成文件。

```bash
speclore teardown            # 清理项目级配置
speclore teardown --global   # 清理全局配置
```
