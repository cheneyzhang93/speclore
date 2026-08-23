# Getting Started

From zero to acceptance in just three steps.

---

## Installation

```bash
npm install -g speclore
```

::: tip Prerequisites
SpecLore requires Node.js 18+ and any of pnpm / npm / yarn package managers.
:::

## Initialize Your Project

```bash
cd your-project && speclore setup
```

`speclore setup` will:

1. **Detect AI tools**: Automatically scan for Cursor / Claude Code / Qoder in your project
2. **Write MCP config**: Generate MCP configuration files for detected AI tools
3. **Generate rules**: Create `.speclore/config.yaml` core configuration

```
✔ Detected AI tools: Cursor, Qoder
✔ Written .cursor/mcp.json
✔ Written .qoder-cn/mcp.json
✔ Generated .speclore/config.yaml
```

## Generate Acceptance Criteria

Generate standard BDD `.feature` files from any requirement source format:

```bash
# From a Markdown file
speclore spec requirements.md

# From plain text
speclore spec "Patient registration requires phone verification and WeChat login"

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

## Generate AI Coding Constraints

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

## Code & Acceptance

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

## Using in AI Clients

`speclore setup` has already configured MCP automatically. You can use natural language in your AI client to complete the entire workflow:

**You**: Help me implement patient registration with phone verification

**AI**: Generated `specs/patient/register.feature` with 3 acceptance scenarios...

**AI**: Generated coding constraints and test scaffolding...

**You**: OK, I'll implement the code and tests

**You**: Run acceptance

**AI**: ✅ 3/3 scenarios passed (100%)

::: tip Next Steps
- Learn the full [Workflow](/en/guide/workflow)
- Check the [Configuration Reference](/en/reference/configuration)
- Explore [MCP Tools](/en/reference/mcp-tools) in detail
:::
