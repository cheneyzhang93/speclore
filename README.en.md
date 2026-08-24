# SpecLore

**中文** | [English](README.en.md)

[![npm](https://img.shields.io/npm/v/speclore.svg)](https://www.npmjs.com/package/speclore)
[![CI](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml/badge.svg)](https://github.com/cheneyzhang93/speclore/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**Requirements-driven AI coding tool — turn requirements into verifiable BDD specs, with constrained coding, automated acceptance, and full traceability.**

SpecLore solves the core pain points of AI-assisted development: requirements scattered across docs, chats, and verbal specs; AI-generated code lacking business constraints; tests disconnected from requirements. It transforms requirements in any format into structured BDD `.feature` acceptance criteria, generates coding constraints for AI tools like Cursor / Claude Code / Qoder, then runs tests and produces acceptance reports. Seamless collaboration with AI clients via the MCP protocol.

```
Requirements (any format) → BDD .feature → AI constraints + test scaffolding → acceptance report
```

---

## Install

```bash
npm install -g speclore
```

> **Prerequisites**: Node.js 18+

---

## Quick Start

SpecLore offers three ways to work — pick the one that fits your workflow:

| Approach | Best for | Core experience |
|----------|----------|----------------|
| **CLI** | Terminal-oriented developers | Manual commands, full control |
| **MCP + AI Client** (Recommended) | Cursor / Qoder / Claude Code users | Natural language conversation, AI handles the full pipeline |
| **Hybrid** | Best of both worlds | CLI for setup, AI client for the rest |

### Approach 1: CLI

For developers who prefer terminal operations and precise control over each step.

```bash
# 1. Initialize project (detect AI tools → write MCP config → generate config files)
cd your-project && speclore setup

# 2. Generate .feature acceptance criteria from requirements
speclore spec "Patient registration requires phone verification and WeChat login"

# 3. Generate AI coding constraints + test scaffolding
speclore code

# 4. After coding in your AI client, run acceptance
speclore verify
```

That's it. `setup` runs only once — after that, each new requirement is just `spec` → `code` → `verify`.

### Approach 2: MCP + AI Client (Recommended)

If you use Cursor, Qoder, or Claude Code, this is the most natural way — conversation replaces commands.

**Step 1**: Open your project in the AI client first. `setup` needs to detect the client's marker before writing MCP config (Cursor requires `.cursor/`, Qoder requires `.qoder/`, Claude Code requires `.claude/` or `CLAUDE.md`).

**Step 2**: Run `speclore setup` in your project directory. It auto-detects your AI client and writes the MCP config. You **don't need to manually edit any MCP config**.

**Step 3**: **Restart or reopen** your AI client so it loads the new MCP configuration.

**Step 4**: Start chatting:

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

### Approach 3: Hybrid

Use CLI for initialization and requirement generation, AI client for coding and acceptance:

```bash
# CLI: initialize + generate .feature
speclore setup
speclore spec requirements.md
speclore code
```

Then code in your AI client, and let AI call `speclore.verify` for acceptance.

---

## Workflow

SpecLore's workflow is a stateful pipeline — each step has explicit state transitions:

```
speclore.status → speclore.spec → speclore.code → (AI codes) → speclore.verify
   check status    generate feature  constraints+scaffold   implement     verify tests
       ↓                ↓               ↓               ↓              ↓
   project state   → specified     → constrained     → coding     → verified
```

Each tool returns the current state and next-step guidance. Out-of-order calls produce clear errors:

| Out-of-order scenario | Error message |
|----------------------|---------------|
| Call `code` without .feature files | `No .feature files found. Run speclore.spec first.` |
| Call `verify` without test scaffolding | `No test scaffolding. Run speclore.code first.` |
| Project not initialized | Auto-creates `.speclore/config.yaml` |

---

## Supported Input Formats

SpecLore generates `.feature` files from any requirement source:

| Format | Example |
|--------|---------|
| Markdown | `speclore spec requirements.md` |
| Word | `speclore spec design.docx` |
| Excel | `speclore spec specs.xlsx` |
| PDF | `speclore spec design.pdf` |
| Image (OCR) | `speclore spec mockup.png` |
| URL | `speclore spec https://jira.example/123` |
| Plain text | `speclore spec "Users need password reset"` |

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `speclore setup` | Initialize project (detect AI tools → write MCP config → generate rules) |
| `speclore spec <source>` | Requirement source → `.feature` acceptance criteria |
| `speclore code` | `.feature` → AI coding constraints + test scaffolding |
| `speclore verify` | Run tests → acceptance report (mapped to .feature scenarios) |
| `speclore verify --watch` | Watch mode, auto-rerun on file changes |
| `speclore status` | View project state, workflow progress, recommended actions |
| `speclore init` | Scan project structure, generate context (optional — auto-runs on first spec/code call) |
| `speclore migrate` | Migrate existing .feature files to workflow state after upgrade |
| `speclore mcp add <client>` | Manually write MCP config for a specific client (cursor \| claude \| qoder) |
| `speclore mcp remove <client>` | Manually remove MCP config from a specific client |
| `speclore mcp list` | Show MCP configuration status for all clients |
| `speclore teardown` | Uninstall cleanup |

---

## MCP Integration

SpecLore provides 4 MCP tools that AI clients can call directly:

| MCP Tool | Purpose | State change |
|----------|---------|-------------|
| `speclore.status` | Project status + recommended actions | — |
| `speclore.spec` | Requirements → .feature | → `specified` |
| `speclore.code` | .feature → constraints + test scaffolding | → `constrained` |
| `speclore.verify` | Tests → acceptance report | → `verified` |

`speclore setup` auto-detects your AI client and writes the corresponding MCP config (only for clients actually detected):

| AI Client | Detection marker | MCP Config File |
|-----------|-----------------|----------------|
| Cursor | `.cursor/` directory exists | `.cursor/mcp.json` |
| Claude Code | `.claude/` directory or `CLAUDE.md` exists | `.mcp.json` (project root) |
| Qoder | `.qoder/` or `.qoder-cn/` directory exists | `.qoder/mcp.json` or `.qoder-cn/mcp.json` |

**Manual MCP configuration**: If `setup` did not detect your AI client, configure it manually:

```bash
speclore mcp add cursor   # Write MCP config for Cursor (auto-creates .cursor/)
speclore mcp add claude   # Write MCP config for Claude Code
speclore mcp add qoder    # Write MCP config for Qoder (auto-creates .qoder/)
speclore mcp remove qoder # Remove MCP config from Qoder
speclore mcp list         # Show MCP config status for all clients
```

Every MCP tool response includes a `workflow` field (`currentState` + `nextStep`) to guide the AI through the correct sequence.

---

## Configuration

Core config in `.speclore/config.yaml` (generated by `speclore setup`):

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
──────────────────────────────────────────────────────┐
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
| [Getting Started](docs/en/guide/getting-started.md) | Complete tutorial with all three usage approaches |
| [Workflow](docs/en/guide/workflow.md) | State machine-driven workflow guide |
| [Configuration](docs/en/reference/configuration.md) | Full `config.yaml` reference, Profile modes, all CLI commands |
| [MCP Tools](docs/en/reference/mcp-tools.md) | Complete I/O for 4 MCP tools, workflow guards, auto-init & migration |
| [Test Mapping](docs/en/reference/test-mapping.md) | Three ways to map test results back to .feature scenarios |
| [Plugin Development](docs/en/advanced/plugin-guide.md) | Build and publish Reader / Writer / Parser plugins |
| [Product Spec](docs/en/advanced/architecture.md) | Full product technical specification |

---

## Development

```bash
git clone https://github.com/cheneyzhang93/speclore.git
cd speclore && pnpm install && pnpm build
pnpm test       # Run tests
pnpm dev        # Watch mode
```

## License

MIT
