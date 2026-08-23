---
title: Getting Started
description: "Get started with SpecLore from scratch. Three usage approaches explained: CLI, MCP + AI Client, and Hybrid. Run the full pipeline in 5 minutes."
---

# Getting Started

From zero to acceptance, SpecLore offers three ways to work. Pick the one that fits your workflow.

---

## Installation

```bash
npm install -g speclore
```

::: tip Prerequisites
- Node.js 18+
- Any package manager (npm / pnpm / yarn)
:::

---

## Choose Your Approach

| Approach | Best for | Core experience |
|----------|----------|----------------|
| **CLI** | Terminal-oriented developers | Manual commands, full control |
| **MCP + AI Client** (Recommended) | Cursor / Qoder / Claude Code users | Natural language conversation, AI handles the full pipeline |
| **Hybrid** | Best of both worlds | CLI for setup, AI client for the rest |

::: tip Which one to choose?
- If you **primarily work in the terminal** → Approach 1
- If you **primarily use AI coding tools** (Cursor / Qoder / Claude Code) → Approach 2 (Recommended)
- If you **use both** → Approach 3

No matter which you pick, the first step is always `speclore setup`.
:::

---

## Approach 1: CLI

For developers who prefer terminal operations and precise control over each step.

### Step 1: Initialize Your Project

```bash
cd your-project && speclore setup
```

`speclore setup` does the following:

1. **Detect AI tools**: Automatically scans for Cursor / Claude Code / Qoder in your project
2. **Write MCP config**: Generates MCP configuration files for detected AI tools
3. **Generate config files**: Creates `.speclore/config.yaml`

```
SpecLore Setup
───────────────
Detected AI tools: cursor, qoder
Created config: D:\code\my-project\.speclore\config.yaml
MCP configuration written for all detected AI clients.

Setup complete! Next steps:

  Option A — CLI workflow (terminal users):
    speclore spec "your requirement"   → generate .feature
    speclore code                      → generate constraints + tests
    speclore verify                    → run acceptance

  Option B — AI client workflow (recommended):
    Open Cursor / Qoder / Claude Code and start chatting.
    MCP is already configured — AI handles the full pipeline.

  Optional — Pre-scan project context:
    speclore init   → scan modules/entities/APIs for better AI context
    (Not required — context is auto-built on first spec/code call)
```

::: info About `speclore init`
`speclore init` scans your project structure, detects modules, entities, and APIs, and generates `context.json` to help AI better understand your codebase. **This is optional** — context is automatically built when you first run `speclore spec` or `speclore code`. Running `init` manually lets you preview the detection results or refresh context after major project changes.
:::

### Step 2: Generate Acceptance Criteria

Generate standard BDD `.feature` files from any requirement source:

```bash
# From plain text
speclore spec "Patient registration requires phone verification and WeChat login"

# From a Markdown file
speclore spec requirements.md

# From a Word document
speclore spec design.docx

# From a URL
speclore spec https://jira.example.com/issue/PROJ-123
```

Example output:

```
✔ Generated specs/patient/register.feature
  Scenario 1: Register with valid phone number
  Scenario 2: Reject invalid phone format
  Scenario 3: Warn on duplicate phone number
```

### Step 3: Generate AI Coding Constraints + Test Scaffolding

```bash
speclore code
```

Automatically generates constraint files in the correct format for detected AI tools:

| AI Tool | Constraint File |
|---------|----------------|
| Cursor | `.cursor/rules/speclore.mdc` |
| Claude Code | `.claude/rules/speclore.md` |
| Qoder | `.qoder/rules/speclore.md` |

Also generates test scaffolding files (e.g., `tests/patient/register.test.ts`) with `it.skip` test cases mapped to `.feature` scenarios.

### Step 4: Code & Acceptance

Code normally in your AI client. The AI will automatically read the constraint rules while you fill in the `it.skip` test scaffolding.

When ready, run acceptance:

```bash
speclore verify
```

Example output:

```
✔ 3/3 scenarios passed (100%)

specs/patient/register.feature
  ✓ Register with valid phone number    → passed
  ✓ Reject invalid phone format         → passed
  ✓ Warn on duplicate phone number      → passed

✅ Acceptance passed
```

---

## Approach 2: MCP + AI Client (Recommended)

If you use Cursor, Qoder, or Claude Code, this is the most natural way — conversation replaces commands.

### Step 1: Run Setup

```bash
cd your-project && speclore setup
```

This auto-detects your AI tool and configures MCP. **Run only once.**

### Step 2: Chat in Your AI Client

Open your AI client (Cursor / Qoder / Claude Code) and start chatting:

> **You**: Help me implement patient registration with phone verification

> **AI** (calls `speclore.spec`): Generated `specs/patient/register.feature` with 3 acceptance scenarios:
> - Successful phone registration
> - Reject invalid phone format
> - Conflict on duplicate phone number

> **AI** (calls `speclore.code`): Generated coding constraints and test scaffolding:
> - `.qoder/rules/speclore.md` — coding constraints (with business rules)
> - `tests/patient/register.test.ts` — test scaffolding (3 `it.skip` placeholders)

> **You**: OK, I'll implement the code and tests

> *(AI reads constraint rules while coding; you fill in the `it.skip` test scaffolding)*

> **You**: Run acceptance

> **AI** (calls `speclore.verify`): ✅ 3/3 scenarios passed (100%)

No manual CLI commands needed. The AI calls SpecLore tools directly via MCP, automatically advancing the workflow state.

### Why is this recommended?

- **Zero commands**: No need to memorize any CLI commands
- **Natural language**: Describe requirements in everyday language, AI converts them to structured specs
- **Smart guidance**: Each tool response includes next-step guidance, AI never operates out of order
- **Coding constraints**: AI automatically reads business rules while coding, reducing hallucinations and drift

---

## Approach 3: Hybrid

Use CLI for initialization and requirement generation, AI client for coding and acceptance:

```bash
# CLI: initialize + generate .feature + generate constraints
speclore setup
speclore spec requirements.md
speclore code
```

Then code in your AI client, and let AI call `speclore.verify` for acceptance.

This approach works well when:
- Requirement docs already exist (Markdown / Word / Excel) and you want to batch-generate `.feature` files via CLI first
- You prefer terminal for setup but like AI clients for coding

---

## Workflow States

SpecLore's workflow is a stateful pipeline:

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

## Supported Input Formats

| Format | Command example |
|--------|----------------|
| Markdown | `speclore spec requirements.md` |
| Word | `speclore spec design.docx` |
| Excel | `speclore spec specs.xlsx` |
| PDF | `speclore spec design.pdf` |
| Image (OCR) | `speclore spec mockup.png` |
| URL | `speclore spec https://jira.example/123` |
| Plain text | `speclore spec "Users need password reset"` |

---

## Next Steps

- Learn the full [Workflow](/en/guide/workflow) state machine
- Check the [Configuration Reference](/en/reference/configuration) for all config options
- Explore [MCP Tools](/en/reference/mcp-tools) in detail
- See [Test Mapping](/en/reference/test-mapping) for how test results map to acceptance scenarios
