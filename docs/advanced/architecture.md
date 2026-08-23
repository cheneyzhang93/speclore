# SpecLore 产品技术规格

> AI 产研协同 CLI 工具 — 需求结构化 → 验收自动化 → AI 约束化

## 1. 产品定位

SpecLore 是一个面向 AI 编码时代的产研协同工具，解决三个核心问题：

1. **需求结构化**：将任意格式的需求输入转化为标准 BDD .feature 验收标准
2. **验收自动化**：运行测试并自动映射结果回 .feature 场景，生成验收报告
3. **AI 约束化**：为 AI 编码工具（Cursor / Claude Code / Qoder）自动生成编码约束

## 2. 技术架构

```
┌──────────────────────────────────────────────────┐
│                   CLI / MCP Server                │
├──────────────────────────────────────────────────┤
│  M1 需求摄入  │  M2 Feature生成  │  M3 约束编码   │
│  (requirement │  (feature-gen)   │  (constraint)  │
│   -reader)    │                  │                │
├───────────────┼──────────────────┼────────────────┤
│  M4 验收验证  │  M5 上下文引擎   │  M7 高级分析   │
│  (verifier)   │  (context-engine) │  (analyzer)    │
├───────────────┴──────────────────┴────────────────┤
│              AI 适配器层 (OpenAI/Claude/Ollama)     │
├──────────────────────────────────────────────────┤
│              插件系统 (Reader/Writer/Parser)        │
├──────────────────────────────────────────────────┤
│              基础设施 (配置/日志/文件锁/路径)        │
└──────────────────────────────────────────────────┘
```

## 3. 核心模块

### 3.1 M1 需求摄入 (requirement-reader)

支持多种输入源：
- 文件：Markdown, DOCX, XLSX, PDF, 图片（OCR）
- URL：公开链接、Basic Auth、需登录（手动粘贴）
- 直接文本：命令行参数传入

输出统一的 `StructuredRequirement` 结构。

### 3.2 M2 Feature 生成 (feature-generator)

- 接收 `StructuredRequirement` + `ProjectContext`
- 通过 AI Provider 生成 Gherkin 格式 .feature 文件
- 自动校验语法（@cucumber/gherkin）
- 置信度评分，低置信度标记 `needsReview`

### 3.3 M3 约束编码 (constraint-coder)

检测项目中的 AI 工具并生成对应约束文件：
- Cursor → `.cursor/rules/speclore.mdc`（YAML frontmatter + MD）
- Claude Code → `.claude/rules/speclore.md`
- Qoder → `.qoder/rules/speclore.md`

约束内容包括：模块边界、命名规范、禁止模式、测试映射要求。

支持 `--watch` 模式，监听 .feature 文件变化自动重新生成约束。

### 3.4 M4 验收验证 (verifier)

- 执行测试命令，捕获输出
- 解析测试结果（JUnit XML / JSON）
- 映射到 .feature 场景：映射文件 → @speclore-scenario 标记 → unmapped
- 生成 JSON + HTML 验收报告

### 3.5 M5 项目上下文引擎 (context-engine)

- 扫描项目结构，识别模块、依赖、实体、API
- 检测语言/框架、测试命令、AI 工具
- 生成 `.speclore/context.json`
- 缓存策略：mtime > 1 小时 OR git HEAD 变化时刷新

### 3.6 M7 高级分析 (analyzer)

- RDG（需求依赖图）：解析 .feature 文件依赖声明
- CDG（代码依赖图）：基于 context.json + import 分析
- 对齐分析：检测需求依赖与代码依赖的不一致
- 变更影响分析：git diff → 受影响模块 → 受影响 feature

## 4. MCP 集成

3 个 MCP 工具，通过 stdio JSON-RPC 2.0 协议暴露：

| 工具 | 功能 | 输入 | 输出 |
|------|------|------|------|
| `speclore.spec` | 需求 → .feature | source (string) | SpecResult |
| `speclore.code` | .feature → 约束 | features (string[]) | ConstraintResult |
| `speclore.verify` | 验收验证 | features + impact | VerifyMcpResult |

## 5. 配置系统

三级配置合并：内置默认 → 全局 `~/.speclore/config.yaml` → 项目 `.speclore/config.yaml`

### Profile 模式

| Profile | 适用场景 | 约束粒度 |
|---------|---------|---------|
| strict | 大型团队/关键项目 | 完整 ModuleRule + 所有检查 |
| normal | 常规开发 | 核心规则 |
| minimal | 快速原型 | 基础规范 |

## 6. 插件系统

三种插件类型：
- **ReaderPlugin**：自定义需求输入格式解析
- **WriterPlugin**：自定义约束文件输出目标
- **ParserPlugin**：自定义测试结果解析器

内置 11 个插件覆盖常见场景。

## 7. 安全设计

- 输入校验：URL 白名单、source 长度限制（50000）、module 名称正则校验
- 文件锁：PID + mtime 双重机制，30 分钟自动过期
- 命令执行：使用 `execFileSync` 避免 shell 注入
- YAML 解析：使用 `JSON_SCHEMA` 防止代码执行
- 路径安全：禁止路径穿越，所有路径归一化处理

## 8. 技术栈

- **语言**: TypeScript 5.x (strict mode, ESM)
- **运行时**: Node.js 18+
- **CLI**: Commander.js
- **MCP**: @modelcontextprotocol/sdk
- **Gherkin**: @cucumber/gherkin
- **构建**: tsup (ESM + DTS)
- **测试**: Vitest
- **文件监听**: chokidar
- **AI**: openai SDK (兼容 OpenAI/Claude/Ollama)
