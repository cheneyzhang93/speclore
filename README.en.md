# SpecLore

**中文** | [English](README.en.md)

[![npm](https://img.shields.io/npm/v/speclore.svg)](https://www.npmjs.com/package/speclore)
[![CI](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml/badge.svg)](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Product-engineering collaboration for the AI coding era — turn requirements into verifiable BDD specs, and verification into an automated pipeline.**

SpecLore transforms scattered requirements (docs, chats, verbal specs) into structured BDD `.feature` acceptance criteria, generates coding constraints for AI tools like Cursor / Claude Code / Qoder, then runs tests and produces acceptance reports. Seamless collaboration with AI clients via MCP protocol.

```
Requirements (any format) → BDD .feature → AI constraints + test scaffolding → acceptance report
```

---

## Install

```bash
npm install -g speclore
```

## Quick Start

Three steps from zero to acceptance:

```bash
# 1. Initialize project (auto-detect AI tools, generate config)
cd your-project && speclore setup

# 2. Generate .feature acceptance criteria from requirements
speclore spec "Patient registration requires phone verification, support WeChat login"

# 3. Generate AI coding constraints + test scaffolding
speclore code
```

Then code in your AI client, and run acceptance when done:

```bash
speclore verify
```

That's it. You can also complete the entire workflow using natural language in your AI client (Cursor / Qoder / Claude Code) — `setup` already configured MCP automatically.

---

## Workflow

```
speclore.status → speclore.spec → speclore.code → (AI codes) → speclore.verify
   check status    generate feature  constraints+scaffold   implement     verify tests
       ↓                ↓               ↓               ↓              ↓
   project state   → specified     → constrained     → coding     → verified
```

Each tool returns current state and next-step guidance. Out-of-order calls produce clear errors:

| Out-of-order scenario | Error message |
|----------------------|---------------|
| Call `code` without .feature files | `No .feature files found. Run speclore.spec first.` |
| Call `verify` without test scaffolding | `No test scaffolding. Run speclore.code first.` |
| Project not initialized | Auto-creates `.speclore/config.yaml` |

---

## Example

A complete conversation in an AI client for "patient registration":

**You**: Help me implement patient registration with phone verification

**AI** (calls `speclore.spec`): Generated `specs/patient/register.feature` with 3 acceptance scenarios:
- Successful phone registration
- Reject invalid phone format
- Conflict on duplicate phone number

**AI** (calls `speclore.code`): Generated coding constraints and test scaffolding:
- `.qoder/rules/speclore.md` — coding constraints (with business rules)
- `tests/patient/register.test.ts` — test scaffolding (3 `it.skip` placeholders)

**You**: OK, I'll implement the code and tests

*(AI reads constraint rules while coding; you fill in the `it.skip` test scaffolding)*

**You**: Run acceptance

**AI** (calls `speclore.verify`): ✅ 3/3 scenarios passed (100%)

---

## Supported Input Formats

Markdown · Word · Excel · PDF · Image (OCR) · URL · Plain text

```bash
speclore spec requirements.md          # Markdown
speclore spec design.docx              # Word
speclore spec specs.xlsx               # Excel
speclore spec mockup.png               # Image
speclore spec https://jira.example/123 # URL
speclore spec "Users need password reset"  # Plain text
```

## Command Reference

| Command | Purpose |
|---------|---------|
| `speclore` | Show project status |
| `speclore setup` | Initialize project (detect AI tools → write MCP config → generate rules) |
| `speclore spec <source>` | Requirement source → `.feature` acceptance criteria |
| `speclore code` | `.feature` → AI coding constraints + test scaffolding |
| `speclore verify` | Run tests → acceptance report (mapped to .feature scenarios) |
| `speclore verify --watch` | Watch mode, auto-rerun on file changes |
| `speclore status` | View project state, workflow progress, recommended actions |
| `speclore migrate` | Migrate existing .feature files to workflow state after upgrade |
| `speclore init` | Scan project structure, generate context file |
| `speclore teardown` | Uninstall cleanup |

## MCP Tools

SpecLore provides 4 MCP tools, called by AI clients via MCP protocol:

| Tool | Purpose | State change |
|------|---------|-------------|
| `speclore.status` | Project status + recommended actions | — |
| `speclore.spec` | Requirements → .feature | → `specified` |
| `speclore.code` | .feature → constraints + test scaffolding | → `constrained` |
| `speclore.verify` | Tests → acceptance report | → `verified` |

Every tool response includes a `workflow` field (`currentState` + `nextStep`) to guide AI through the correct sequence.

## Supported AI Clients

| Client | Config file | Constraint rules file |
|--------|------------|----------------------|
| Cursor | `.cursor/mcp.json` | `.cursor/rules/speclore.mdc` |
| Claude Code | `.mcp.json` | `.claude/rules/speclore.md` |
| Qoder | `.qoder/mcp.json` | `.qoder/rules/speclore.md` |

`speclore setup` auto-detects and configures.

---

## Configuration

Core config in `.speclore/config.yaml` (generated by `setup`):

```yaml
verify:
  command: "pnpm test"              # Your test command
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
```

<details>
<summary>Full config reference</summary>

```yaml
project:
  name: my-project
  profile: normal            # strict | normal | minimal
  modules:
    order:
      path: src/order
      responsibility: Order management
      dependsOn: [inventory, payment]

ai:
  provider: openai-compatible  # openai-compatible | claude | ollama
  baseUrl: https://api.openai.com/v1
  model: gpt-4
  apiKeyEnv: OPENAI_API_KEY

spec:
  outputDir: specs
  defaultLanguage: en
  confidenceThreshold: 0.6

verify:
  command: npm test
  timeout: 300
  reportFormat: [json, html]
  mapping:
    patterns:
      - feature: "specs/{module}/{name}.feature"
        test: "tests/{module}/{name}.test.*"
```

</details>

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  CLI / MCP Server                      │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ Ingest   │ Feature  │Constraint│ Verify   │ Context  │
│ (M1)     │ Gen (M2) │ (M3)     │ (M4)     │ Eng (M5) │
├──────────┴──────────┴──────────┴──────────┴──────────┤
│       State Manager · Test Scaffolder · Impact Analysis │
├──────────────────────────────────────────────────────┤
│          AI Provider (OpenAI / Claude / Ollama)        │
├──────────────────────────────────────────────────────┤
│          Plugin System (Reader / Writer / Parser)      │
└──────────────────────────────────────────────────────┘
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Configuration](docs/configuration.md) | Full `config.yaml` reference, Profile modes, all CLI commands |
| [MCP Tools](docs/mcp-reference.md) | Complete I/O for 4 MCP tools, workflow guards, auto-init & migration |
| [Test Mapping](docs/test-mapping.md) | Three ways to map test results back to .feature scenarios |
| [Plugin Development](docs/plugin-guide.md) | Build and publish Reader / Writer / Parser plugins |
| [Product Spec](docs/product-spec.md) | Full product technical specification |

---

## Development

```bash
git clone https://github.com/cheneyzhang93/speclore.git
cd speclore && pnpm install && pnpm build
pnpm test       # 333 tests
pnpm dev        # watch mode
```

## License

MIT
