---
title: Architecture
description: "SpecLore technical architecture: core modules (requirement reader, feature generator, constraint coder, verifier), AI adapter layer, and plugin system."
---

# Architecture

> AI-Powered Product-Engineering Collaboration CLI — Requirement Structuring → Acceptance Automation → AI Constraint Generation

## 1. Product Positioning

SpecLore is a product-engineering collaboration tool for the AI coding era, solving three core problems:

1. **Requirement Structuring**: Transform any format of requirement input into standard BDD .feature acceptance criteria
2. **Acceptance Automation**: Run tests and automatically map results back to .feature scenarios, generating acceptance reports
3. **AI Constraint Generation**: Automatically generate coding constraints for AI coding tools (Cursor / Claude Code / Qoder)

## 2. Technical Architecture

```
┌──────────────────────────────────────────────────┐
│                   CLI / MCP Server                │
├──────────────────────────────────────────────────┤
│  M1 Requirement │  M2 Feature    │  M3 Constraint │
│  Reader         │  Generator     │  Coder         │
├─────────────────┼────────────────┼────────────────┤
│  M4 Acceptance  │  M5 Context    │  M7 Advanced   │
│  Verifier       │  Engine        │  Analyzer      │
├─────────────────┴────────────────┴────────────────┤
│          AI Adapter (OpenAI / Claude / Ollama)     │
├──────────────────────────────────────────────────┤
│          Plugin System (Reader / Writer / Parser)  │
├──────────────────────────────────────────────────┤
│      Infrastructure (Config / Logger / Lock)       │
└──────────────────────────────────────────────────┘
```

## 3. Core Modules

### 3.1 M1 Requirement Reader

Supports multiple input sources:
- Files: Markdown, DOCX, XLSX, PDF, images (OCR)
- URLs: Public links, Basic Auth, login-required (manual paste)
- Plain text: Command-line argument input

Outputs a unified `StructuredRequirement` structure.

### 3.2 M2 Feature Generator

- Receives `StructuredRequirement` + `ProjectContext`
- Generates Gherkin-format .feature files via AI Provider
- Auto-validates syntax (@cucumber/gherkin)
- Confidence scoring; low-confidence scenarios marked as `needsReview`

### 3.3 M3 Constraint Coder

Detects AI tools in the project and generates constraint files in the corresponding format:
- Cursor → `.cursor/rules/speclore.mdc` (YAML frontmatter + MD)
- Claude Code → `.claude/rules/speclore.md`
- Qoder → `.qoder/rules/speclore.md`

Constraints include: module boundaries, naming conventions, forbidden patterns, test mapping requirements.

Supports `--watch` mode to auto-regenerate constraints when .feature files change.

### 3.4 M4 Acceptance Verifier

- Executes test commands and captures output
- Parses test results (JUnit XML / JSON)
- Maps to .feature scenarios: mapping file → @speclore-scenario markers → unmapped
- Generates JSON + HTML acceptance reports

### 3.5 M5 Context Engine

- Scans project structure, identifies modules, dependencies, entities, APIs
- Detects language/framework, test commands, AI tools
- Generates `.speclore/context.json`
- Cache strategy: refresh when mtime > 1 hour OR git HEAD changes

### 3.6 M7 Advanced Analyzer

- RDG (Requirement Dependency Graph): Parses .feature file dependency declarations
- CDG (Code Dependency Graph): Based on context.json + import analysis
- Alignment analysis: Detects inconsistencies between requirement and code dependencies
- Change impact analysis: git diff → affected modules → affected features

## 4. MCP Integration

3 MCP tools exposed via stdio JSON-RPC 2.0 protocol:

| Tool | Function | Input | Output |
|------|----------|-------|--------|
| `speclore.spec` | Requirements → .feature | source (string) | SpecResult |
| `speclore.code` | .feature → constraints | features (string[]) | ConstraintResult |
| `speclore.verify` | Acceptance verification | features + impact | VerifyMcpResult |

## 5. Configuration System

Three-level config merge: built-in defaults → global `~/.speclore/config.yaml` → project `.speclore/config.yaml`

### Profile Modes

| Profile | Use Case | Constraint Level |
|---------|----------|-----------------|
| strict | Large teams / critical projects | Complete ModuleRule + all checks |
| normal | Regular development | Core rules |
| minimal | Rapid prototyping | Basic conventions |

## 6. Plugin System

Three plugin types:
- **ReaderPlugin**: Custom requirement source parsing
- **WriterPlugin**: Custom constraint output targets
- **ParserPlugin**: Custom test result parsing

11 built-in plugins cover common scenarios.

## 7. Security Design

- Input validation: URL allowlist, source length limit (50000), module name regex validation
- File locks: PID + mtime dual mechanism, 30-minute auto-expiry
- Command execution: Uses `execFileSync` to prevent shell injection
- YAML parsing: Uses `JSON_SCHEMA` to prevent code execution
- Path safety: No path traversal, all paths normalized

## 8. Tech Stack

- **Language**: TypeScript 5.x (strict mode, ESM)
- **Runtime**: Node.js 18+
- **CLI**: Commander.js
- **MCP**: @modelcontextprotocol/sdk
- **Gherkin**: @cucumber/gherkin
- **Build**: tsup (ESM + DTS)
- **Test**: Vitest
- **File Watch**: chokidar
- **AI**: openai SDK (compatible with OpenAI/Claude/Ollama)
