# Architecture

> Full content coming soon. Meanwhile, see the [Chinese version](/advanced/architecture).

## Overview

SpecLore is an AI-powered product-engineering collaboration CLI tool that solves three core problems:

1. **Requirement Structuring**: Transform any format of requirement input into standard BDD .feature acceptance criteria
2. **Acceptance Automation**: Run tests and automatically map results back to .feature scenarios, generating acceptance reports
3. **AI Constraint Generation**: Automatically generate coding constraints for AI coding tools (Cursor / Claude Code / Qoder)

## Technical Architecture

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
│          Infrastructure (Config / Logger / Lock)   │
└──────────────────────────────────────────────────┘
```

## Tech Stack

- **Language**: TypeScript 5.x (strict mode, ESM)
- **Runtime**: Node.js 18+
- **CLI**: Commander.js
- **MCP**: @modelcontextprotocol/sdk
- **Gherkin**: @cucumber/gherkin
- **Build**: tsup (ESM + DTS)
- **Test**: Vitest
- **File Watch**: chokidar
- **AI**: openai SDK (compatible with OpenAI/Claude/Ollama)
