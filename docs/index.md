---
layout: home
title: 需求驱动的 AI 编码工具
description: 需求可验证，编码有约束，验收可追溯。支持 Cursor、Claude Code、Qoder 等 AI 编码工具。
hero:
  name: SpecLore
  text: 需求驱动的 AI 编码工具
  tagline: 需求可验证，编码有约束，验收可追溯
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/cheneyzhang93/speclore
  image:
    src: /hero-terminal.svg
    alt: SpecLore 终端截图
---

<InstallTabs />

<PipelineFlow />

<FeaturePanel />

<ClientGrid />

<WorkflowDemo />

<div class="home-cta">

## 三种使用方式，任选其一

| 方式 | 适合谁 | 核心体验 |
|------|--------|---------|
| **CLI 命令行** | 习惯终端的开发者 | 手动执行命令，完全掌控 |
| **MCP + AI 客户端**（推荐） | Cursor / Qoder / Claude Code 用户 | 自然语言对话，AI 完成全流程 |
| **混合使用** | 两者都想要 | CLI 初始化 + AI 编码 |

### 快速体验

```bash
# 1. 初始化项目（只需一次）
cd your-project && speclore setup

# 2. 从需求生成验收标准
speclore spec "患者注册需要手机号验证"

# 3. 生成编码约束 + 测试骨架
speclore code

# 4. 编码后运行验收
speclore verify
```

或者，在 AI 客户端中用自然语言完成全部流程 — `setup` 已自动配置好 MCP。

::: tip 下一步
查看 [快速开始](/guide/getting-started) 了解三种方式的完整教程。
:::

---

**SpecLore** 是基于 MIT 许可的开源项目。由 [Cheney](https://github.com/cheneyzhang93) 创建。

</div>
