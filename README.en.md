# SpecLore

> AI-powered CLI for BDD specification, AI coding constraints & automated acceptance testing.
> MCP-native integration with Cursor, Claude Code & Qoder.

**English** | [中文](README.md)

[![npm version](https://img.shields.io/npm/v/speclore.svg)](https://www.npmjs.com/package/speclore)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-blue)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml/badge.svg)](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml)

---

## Table of Contents

- [Why SpecLore](#why-speclore)
- [Features](#features)
- [Quick Start](#quick-start)
- [Workflow](#workflow)
- [Usage Guide](#usage-guide)
- [Configuration](#configuration)
- [Test Mapping](#test-mapping)
- [Plugin Development](#plugin-development)
- [MCP Tool Reference](#mcp-tool-reference)
- [Supported AI Clients](#supported-ai-clients)
- [Architecture](#architecture)
- [Development](#development)

---

## Why SpecLore

AI coding tools solve "how to write code", but three critical problems in product-engineering collaboration remain:

1. **Requirement Structuring** — Product requirements are scattered across documents, chat logs, and verbal descriptions. AI cannot directly generate verifiable code.
2. **Acceptance Automation** — AI writes code, but no one knows if it truly meets the requirements.
3. **AI Constraint** — AI coding tools don't understand module boundaries, naming conventions, or forbidden patterns, producing code that "runs but is wrong".

SpecLore solves all three with one automated pipeline:

```
Requirements (any format) → BDD .feature specs → AI coding constraints → Test execution → Acceptance report
```

---

## Features

- **Requirement Structuring** — Any input format (Markdown / Word / Excel / PDF / Image / URL / plain text) → BDD .feature acceptance criteria
- **Acceptance Automation** — Run tests → auto-map results back to .feature scenarios → generate acceptance reports (JSON + HTML)
- **AI Constraint Generation** — Auto-generate coding constraints for Cursor / Claude Code / Qoder (module boundaries, naming conventions, forbidden patterns)
- **Workflow Engine** — Stateful pipeline: Requirements → Constraints → Coding → Verification, with enforced ordering
- **Test Scaffolding** — Auto-generate `it.skip` test files from feature scenarios, supporting vitest / jest / mocha
- **MCP-Native Integration** — AI clients directly call 4 MCP tools (status / spec / code / verify); users interact entirely in natural language
- **Plugin System** — Extend with custom Reader / Writer / Parser plugins
- **Change Impact Analysis** — Automatically infer affected features and modules based on git diff

---

## Quick Start

### Step 1 — Install

**npm global install (recommended)**

```bash
npm install -g speclore
```

**git clone (local development)**

```bash
git clone https://github.com/cheneyzhang93/speclore.git
cd speclore && pnpm install && pnpm build
```

### Step 2 — Project Initialization

```bash
cd your-project
speclore setup
```

`setup` auto-detects AI tools (Cursor / Qoder / Claude Code), creates `.speclore/config.yaml`, writes MCP config, and generates rule files.

### Step 3 — Configure MCP

**npm global install**: `setup` already wrote MCP config — no manual action needed.

**git clone (local development)**: Manually add to your AI client's MCP config:

```json
// .cursor/mcp.json or .qoder/mcp.json
{
  "mcpServers": {
    "speclore": {
      "command": "node",
      "args": ["/path/to/speclore/dist/mcp/server.js"]
    }
  }
}
```

### Step 4 — Configure Test Command

Before verification, edit `.speclore/config.yaml` to set the test command and mapping rules:

```yaml
verify:
  command: "pnpm test"           # Your test command
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
```

### Step 5 — Start the Workflow

You're ready to go. See the [Workflow section](#workflow) below for the full pipeline.

---

## Workflow

SpecLore's workflow is a stateful pipeline: **Requirements → Constraints → Coding → Verification**.
Each step is driven by an MCP tool, connected via the project state file (`.speclore/state.yaml`).

### Workflow Overview

| Step | MCP Tool | Input | Output | State Change |
|------|---------|-------|--------|-------------|
| 1. Check status | `speclore.status` | — | Project status + recommended action | — |
| 2. Generate requirements | `speclore.spec` | Requirement text | .feature files | → specified |
| 3. Generate constraints | `speclore.code` | .feature files | Constraint rules + test scaffolding | → constrained |
| 4. Implement code | AI client | Constraint rules (auto-loaded) | Business code + test code | coding |
| 5. Run verification | `speclore.verify` | .feature files | Acceptance report | → verified |

### Full Example

Using "Patient Registration" as an example:

**Step 1 — Check project status**: AI calls `speclore.status` → returns `recommendedActions`.

**Step 2 — Generate requirements**: AI calls `speclore.spec` → creates `specs/patient/register.feature`, state → `specified`, `nextStep: "Call speclore.code"`.

**Step 3 — Generate constraints + test scaffolding**: AI calls `speclore.code` → writes `.qoder/rules/speclore.md` (with feature business rules) + `tests/patient/register.test.ts` (`it.skip` stubs), state → `constrained`.

**Step 4 — Implement**: AI reads constraints automatically. User fills in test scaffolding.

**Step 5 — Verify**: AI calls `speclore.verify` → runs tests → maps results to scenarios, state → `verified`.

### Enforced Ordering

| Scenario | Result |
|----------|--------|
| Call `speclore.code` without .feature files | Error: "No .feature files found. Run speclore.spec first." |
| Call `speclore.verify` without test scaffolding | Error: "No test scaffolding. Run speclore.code first." |
| Call any tool on uninitialized project | Auto-creates `.speclore/config.yaml` and prompts configuration |

---

## Usage Guide

### Three-Layer Interaction Model

| Layer | User Type | Interaction | Example |
|-------|-----------|-------------|---------|
| **Layer 1** | Beginner | Talk to AI | "Turn this requirement into a feature file" |
| **Layer 2** | Regular user | CLI commands | `speclore spec requirements.md` |
| **Layer 3** | Power user | CLI + config | `speclore verify --impact --watch` |

### Command Reference

#### `speclore` (smart mode)

Run without arguments to show project status; pass text to generate features directly.

```bash
speclore                                    # Show project status
speclore "User registration needs email verification"  # Generate feature from text
```

#### `speclore setup [--global]`

One-time project configuration. Detects AI tools → writes MCP config → generates rule files.

```bash
speclore setup            # Project-level config
speclore setup --global   # Global config (~/.speclore/)
```

#### `speclore init`

Initialize project context. Scans project structure → detects modules → generates `.speclore/context.json`.

```bash
speclore init
```

#### `speclore status`

Show project diagnostic status: config, context, feature files, AI tool detection results.

```bash
speclore status
```

#### `speclore spec <source>`

Requirement source → .feature files. Supports file paths, URLs, and direct text.

```bash
speclore spec requirements.md                        # Markdown file
speclore spec https://jira.example.com/issue/PROJ-123 # URL
speclore spec "User needs password reset"             # Direct text
speclore spec design.docx                             # Word document
speclore spec specs.xlsx                              # Excel spreadsheet
speclore spec mockup.png                              # Image (OCR)
speclore spec req.pdf                                 # PDF document
speclore spec requirements.md -m order                # Target specific module
```

#### `speclore code [features...]`

Convert .feature files into AI coding constraints.

```bash
speclore code                              # Process all features
speclore code specs/order/create.feature   # Process specific feature
```

#### `speclore verify [features...] [--impact] [--watch] [--timeout <min>]`

Run tests and map results to .feature scenarios.

```bash
speclore verify                        # Run all verification
speclore verify --impact               # With change impact analysis
speclore verify --watch                # Watch mode (auto-rerun on file changes)
speclore verify --watch --timeout 60   # Watch for 60 minutes
```

#### `speclore teardown [--global]`

Uninstall and clean up, removing SpecLore config and generated files.

```bash
speclore teardown            # Clean project-level config
speclore teardown --global   # Clean global config
```

---

## Configuration

### config.yaml Full Reference

Configuration file located at `.speclore/config.yaml`:

```yaml
project:
  name: my-project          # Project name
  language: typescript       # Project language
  framework: nestjs          # Framework
  profile: normal            # strict | normal | minimal
  modules:
    order:
      path: src/order
      responsibility: Order management and processing
      dependsOn: [inventory, payment]
      entities: [Order, OrderItem]
      apis: [createOrder, getOrder]

ai:
  provider: openai-compatible  # openai-compatible | claude | ollama
  baseUrl: https://api.openai.com/v1
  model: gpt-4
  apiKeyEnv: OPENAI_API_KEY   # Environment variable name

spec:
  outputDir: specs            # .feature output directory
  defaultLanguage: en         # Default language
  confidenceThreshold: 0.6    # Mark as needsReview below this value

verify:
  command: npm test           # Test command
  timeout: 300                # Timeout (seconds)
  reportFormat: [json, html]  # Report formats
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"

plugins:
  readers: []
  writers: []
  parsers: []
```

### Profile Modes

| Profile | Use Case | Constraint Granularity |
|---------|----------|----------------------|
| **strict** | Production, team collaboration | Full ModuleRule + naming conventions + forbidden patterns |
| **normal** | Daily development (default) | Core module boundaries + basic conventions |
| **minimal** | Prototyping, personal projects | Basic module boundaries |

---

## Test Mapping

### Mapping Files (Recommended)

When AI generates test code, it also generates mapping files at `.speclore/mappings/{module}/{feature}.json`:

```json
{
  "feature": "specs/order/create.feature",
  "generatedAt": "2024-01-15T10:30:00Z",
  "scenarios": {
    "Create valid order": {
      "testFile": "tests/order/create.test.ts",
      "testMethod": "should create order with valid items"
    },
    "Reject when inventory insufficient": {
      "testFile": "tests/order/create.test.ts",
      "testMethod": "should reject when inventory is insufficient"
    }
  }
}
```

### Explicit Markers (Fallback)

Add `@speclore-scenario` comment markers in test files:

```typescript
// @speclore-scenario: Create valid order
it('should create order with valid items', () => { ... });
```

### Mapping Priority

```
Mapping files → Explicit markers → unmapped
```

---

## Plugin Development

### Plugin Types

| Type | Interface | Purpose |
|------|-----------|---------|
| **ReaderPlugin** | `{ name, supportedFormats[], canRead(), read() }` | Custom requirement source parsing |
| **WriterPlugin** | `{ toolName, configFile, detect(), write(), remove() }` | Custom AI tool constraint output |
| **ParserPlugin** | `{ framework, canParse(), parse() }` | Custom test result parsing |

### Development Guide

```typescript
// 1. Create plugin
import type { ReaderPlugin, StructuredRequirement } from 'speclore';

export class ConfluenceReader implements ReaderPlugin {
  readonly name = 'confluence-reader';
  readonly supportedFormats = ['confluence-url'];

  canRead(source: string): boolean {
    return source.includes('atlassian.net/wiki');
  }

  async read(source: string): Promise<StructuredRequirement[]> {
    // Fetch from Confluence API and parse
    // ...
  }
}

// 2. Publish as npm package
// 3. Register in config.yaml
// plugins:
//   readers:
//     - name: confluence-reader
//       package: speclore-confluence-reader
```

---

## MCP Tool Reference

SpecLore provides 4 MCP tools, used in workflow order:

> `speclore.status` → `speclore.spec` → `speclore.code` → `speclore.verify`

Each tool returns a `workflow` field with current state and recommended next step.

### `speclore.status`

Check project workflow status, feature states, and recommended actions.

**Input**:
```json
{
  "feature": "specs/auth/register.feature"  // optional, omit for all
}
```

**Output**:
```json
{
  "project": { "initialized": true, "configCreated": false, "testCommand": "pnpm test", "aiToolsDetected": ["qoder"] },
  "features": [
    { "file": "specs/auth/register.feature", "state": "constrained", "scenarios": 3, "constraintFiles": [".qoder/rules/speclore.md"], "testFiles": ["tests/auth/register.test.ts"] }
  ],
  "summary": { "total": 1, "specified": 0, "constrained": 1, "coding": 0, "verified": 0 },
  "recommendedActions": ["Fill in test scaffolding implementations, then start coding."]
}
```

### `speclore.spec`

Requirements → .feature files.

**Input**:
```json
{
  "source": "User registration requires email verification, password at least 8 characters",
  "module": "auth"
}
```

**Output**:
```json
{
  "createdFiles": ["specs/auth/register.feature"],
  "scenarios": [
    {
      "feature": "User Registration",
      "name": "Valid email registration succeeds",
      "given": ["System is running"],
      "when": ["User provides valid email and password and submits registration"],
      "then": ["System creates account and sends verification email"]
    }
  ],
  "constraints": "Generated 1 feature file(s) with 3 scenario(s).",
  "nextSteps": "Run `speclore code` to generate AI coding constraints.",
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "specified",
    "nextStep": "Call speclore.code to generate constraints and test scaffolding.",
    "projectSummary": { "total": 1, "specified": 1, "constrained": 0, "coding": 0, "verified": 0 }
  }
}
```

### `speclore.code`

.feature → AI coding constraints.

**Input**:
```json
{
  "features": ["specs/auth/register.feature"],
  "tools": ["cursor", "claude"]
}
```

**Output**:
```json
{
  "writtenFiles": [".cursor/rules/speclore.mdc", ".claude/rules/speclore.md"],
  "constraintContent": "Constraints for 2 module(s)...",
  "moduleRules": [...],
  "activeConstraints": [...],
  "codingGuidance": "Project: my-app. Language: TypeScript...",
  "scaffoldFiles": [
    { "testFile": "tests/auth/register.test.ts", "framework": "vitest", "scenarios": 3 }
  ],
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "constrained",
    "nextStep": "Start coding. Constraints and test scaffolding are ready.",
    "projectSummary": { "total": 1, "specified": 0, "constrained": 1, "coding": 0, "verified": 0 }
  }
}
```

### `speclore.verify`

Test execution → acceptance report.

**Input**:
```json
{
  "features": ["specs/auth/register.feature"],
  "impact": false
}
```

**Output**:
```json
{
  "summary": "5/5 scenarios passed (100%)",
  "passed": 5,
  "failed": 0,
  "unmapped": 0,
  "details": [...],
  "failedDetails": [],
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "verified",
    "nextStep": "All features verified. Add new requirements with speclore.spec.",
    "projectSummary": { "total": 1, "specified": 0, "constrained": 0, "coding": 0, "verified": 1 }
  }
}
```

---

## Supported AI Clients

| Client | Status | Config Files |
|--------|--------|-------------|
| Cursor | v1 built-in | `.cursor/mcp.json` + `.cursor/rules/speclore.mdc` |
| Claude Code | v1 built-in | `.mcp.json` + `.claude/rules/speclore.md` |
| Qoder | v1 built-in | `.qoder/mcp.json` + `.qoder/rules/speclore.md` |
| Copilot / Windsurf / Cline / Gemini CLI / Trae / AGENTS.md | Community | — |

---

## Architecture

```
┌─────────────────────────────────────────────────────────
│                     CLI / MCP Server                     │
──────────┬──────────┬────────────────────┬─────────────┤
│  M1      │  M2      │  M3      │  M4      │  M5         │
│ Requirement│ Feature │ Constraint│ Acceptance│ Context     │
│ Ingestion │ Generator│ Coder    │ Verifier  │ Engine      │
├──────────┴──────────┴──────────┴──────────┴─────────────
│              M7 Advanced Analysis (RDG/CDG/Impact)        │
├─────────────────────────────────────────────────────────┤
│              AI Provider (OpenAI / Claude / Ollama)       │
├─────────────────────────────────────────────────────────┤
│              Plugin System (Reader / Writer / Parser)     │
├─────────────────────────────────────────────────────────┤
│              Infrastructure (Config / Logger / FileLock)  │
└─────────────────────────────────────────────────────────┘
```

---

## Development

### Local Development

```bash
git clone https://github.com/cheneyzhang93/speclore.git
cd speclore
pnpm install
pnpm dev        # Watch mode
pnpm test       # Run tests
pnpm build      # Build
```

### Contributing

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## License

MIT
