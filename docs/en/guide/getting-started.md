---
title: Getting Started
description: "Run the full SpecLore pipeline in 5 minutes: install, generate acceptance criteria, coding constraints, and automated verification."
---

# Getting Started

From zero to acceptance in 5 minutes.

---

## Install

```bash
npm install -g speclore
```

::: tip Prerequisites
Node.js 18+
:::

---

## 5-Minute Tutorial

### 1. Initialize Your Project

```bash
cd your-project && speclore setup
```

`setup` runs only once. It detects your AI tools, writes MCP config, and generates `.speclore/config.yaml`.

### 2. Generate Acceptance Criteria from Requirements

```bash
speclore spec "Patient registration requires phone verification and WeChat login"
```

Outputs `specs/patient/register.feature` with 3 BDD acceptance scenarios.

Supports any requirement source format:

```bash
speclore spec requirements.md          # Markdown
speclore spec design.docx              # Word
speclore spec specs.xlsx               # Excel
speclore spec https://jira.example/123 # URL
```

### 3. Generate Coding Constraints + Test Scaffolding

```bash
speclore code
```

Generates constraint rule files for your AI coding tools, plus test scaffolding (`it.skip` placeholders).

### 4. Code, Then Run Acceptance

Code in your AI client, fill in the test scaffolding, then:

```bash
speclore verify
```

```
✔ 3/3 scenarios passed (100%)

specs/patient/register.feature
  ✓ Register with valid phone number    → passed
  ✓ Reject invalid phone format         → passed
  ✓ Warn on duplicate phone number      → passed

✅ Acceptance passed
```

---

## Other Ways to Use

The tutorial above uses the CLI. SpecLore also supports two other approaches:

### MCP + AI Client (Recommended)

If you use Cursor, Qoder, or Claude Code, run `speclore setup` once, then complete the entire workflow with natural language:

> **You**: Help me implement patient registration with phone verification
>
> **AI** (calls `speclore.spec`): Generated `specs/patient/register.feature` with 3 acceptance scenarios
>
> **AI** (calls `speclore.code`): Generated coding constraints and test scaffolding
>
> **You**: Run acceptance
>
> **AI** (calls `speclore.verify`): ✅ 3/3 scenarios passed (100%)

No manual CLI commands needed. The AI calls SpecLore tools directly via MCP, automatically advancing the workflow.

### Hybrid

CLI for initialization and requirement generation, AI client for coding and acceptance:

```bash
speclore setup
speclore spec requirements.md
speclore code
```

Then code in your AI client, and let AI call `speclore.verify` for acceptance.

---

## Workflow States

```
speclore.status → speclore.spec → speclore.code → (AI codes) → speclore.verify
   check status    generate feature  constraints+scaffold   implement     verify tests
       ↓                ↓               ↓               ↓              ↓
   project state   → specified     → constrained     → coding     → verified
```

Out-of-order calls produce clear errors:

| Out-of-order scenario | Error message |
|----------------------|---------------|
| Call `code` without .feature files | `No .feature files found. Run speclore.spec first.` |
| Call `verify` without test scaffolding | `No test scaffolding. Run speclore.code first.` |
| Project not initialized | Auto-creates `.speclore/config.yaml` |

---

## Next Steps

- Learn the full [Workflow](/en/guide/workflow) state machine
- Check the [Configuration Reference](/en/reference/configuration) for all config options
- Explore [MCP Tools](/en/reference/mcp-tools) in detail
- See [Test Mapping](/en/reference/test-mapping) for how test results map to acceptance scenarios
