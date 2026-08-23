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

## Three Ways to Use SpecLore

| Approach | Best for | Core experience |
|----------|----------|----------------|
| **CLI** | Terminal-oriented developers | Manual commands, full control |
| **MCP + AI Client** (Recommended) | Cursor / Qoder / Claude Code users | Natural language conversation, AI handles the full pipeline |
| **Hybrid** | Best of both worlds | CLI for setup, AI client for the rest |

### Quick Try

```bash
# 1. Initialize your project (once)
cd your-project && speclore setup

# 2. Generate acceptance criteria from requirements
speclore spec "Patient registration requires phone verification"

# 3. Generate coding constraints + test scaffolding
speclore code

# 4. Run acceptance after coding
speclore verify
```

Or, complete the entire workflow using natural language in your AI client — `setup` already configured MCP automatically.

::: tip Next step
Check the [Getting Started](/en/guide/getting-started) guide for the full tutorial on all three approaches.
:::

---

**SpecLore** is open source software released under the MIT License. Created by [Cheney](https://github.com/cheneyzhang93).

</div>
