---
layout: home
title: Requirements-Driven AI Coding Tool
description: Verifiable requirements, constrained coding, traceable acceptance. Works with Cursor, Claude Code, and Qoder.
hero:
  name: SpecLore
  text: Requirements-Driven AI Coding Tool
  tagline: Verifiable requirements, constrained coding, traceable acceptance
  actions:
    - theme: brand
      text: Get Started
      link: /en/guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/cheneyzhang93/speclore
  image:
    src: /hero-terminal.svg
    alt: SpecLore terminal demo
---

<InstallTabs />

<PipelineFlow />

<FeaturePanel />

<ClientGrid />

<WorkflowDemo />

<div class="home-cta">

## Zero to Acceptance in Three Steps

```bash
# 1. Initialize your project
cd your-project && speclore setup

# 2. Generate .feature acceptance criteria from requirements
speclore spec "Patient registration requires phone verification"

# 3. Generate AI coding constraints + test scaffolding
speclore code
```

Code in your AI client, then run acceptance:

```bash
speclore verify
```

---

**SpecLore** is open source software released under the MIT License. Created by [Cheney](https://github.com/cheneyzhang93).

</div>
