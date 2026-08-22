# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2025-01-XX

### Added

- **Core pipeline**: Full M1→M5 pipeline — requirement ingestion, BDD feature generation, constraint coding, verification, context building
- **Plugin system**: Extensible Reader/Writer/Parser plugin architecture with built-in plugins
  - Readers: Markdown, DOCX, XLSX, PDF, Image (vision API)
  - Writers: Cursor, Claude Code, Qoder
  - Parsers: JUnit, Jest, Vitest
- **AI integration**: Multi-provider support (OpenAI-compatible, Claude, Ollama) with fallback chain
- **Token counter**: Approximate token estimation with CJK/Latin heuristics and model context window detection
- **Cost tracker**: Per-call cost tracking with budget limit enforcement
- **Output validator**: Gherkin syntax validation using `@cucumber/gherkin` official parser
- **Prompt templates**: Reusable, parameterized prompt system for feature generation, constraint coding, and verification
- **CLI**: `speclore init`, `speclore setup`, `speclore status`, `speclore teardown` commands
- **MCP server**: Model Context Protocol integration for AI tool collaboration
- **Configuration**: YAML-based config with three-level merge (defaults → global → project)
- **Type safety**: Full TypeScript strict mode with zero lint warnings
- **Test coverage**: 150+ unit and integration tests

### Configuration

- Profile levels: `strict` / `normal` / `minimal` — controls scenario detail granularity
- Module boundary declarations for cross-module reference prevention
- AI provider fallback chain via `ai.fallbackProviders` config
- Budget limit via `ai.maxBudgetUsd` config
