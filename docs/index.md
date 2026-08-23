---
layout: home
hero:
  layout: center
  name: SpecLore
  text: AI 编码时代的产研协同工具
  tagline: 把需求变成可验收的 BDD 规格，把验收变成自动化流水线
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/cheneyzhang93/speclore
---

<InstallTabs />

<PipelineFlow />

<FeaturePanel />

<ClientGrid />

<WorkflowDemo />

<div class="home-cta">

## 三步从零到验收

```bash
# 1. 初始化项目
cd your-project && speclore setup

# 2. 从需求生成 .feature 验收标准
speclore spec "患者注册需要手机号验证"

# 3. 生成 AI 编码约束 + 测试骨架
speclore code
```

在 AI 客户端中编码，完成后运行验收：

```bash
speclore verify
```

---

**SpecLore** 是基于 MIT 许可的开源项目。由 [Cheney](https://github.com/cheneyzhang93) 创建。

</div>
