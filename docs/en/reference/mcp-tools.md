---
title: MCP Tools Reference
description: "Complete I/O reference for SpecLore's 4 MCP tools: speclore.status, speclore.spec, speclore.code, and speclore.verify with workflow constraints."
---

# MCP Tools Reference

SpecLore provides 4 MCP tools, used in workflow order:

> `speclore.status` → `speclore.spec` → `speclore.code` → `speclore.verify`

Each tool's `workflow` response field contains the current state and recommended next step.

---

## `speclore.status`

View project workflow status, feature state distribution, and recommended actions.

**Input**:

```json
{
  "feature": "specs/auth/register.feature"
}
```

> `feature` is optional; omit to return status for all features.

**Output**:

```json
{
  "project": {
    "initialized": true,
    "configCreated": false,
    "testCommand": "pnpm test",
    "aiToolsDetected": ["qoder"]
  },
  "features": [
    {
      "file": "specs/auth/register.feature",
      "state": "constrained",
      "scenarios": 3,
      "constraintFiles": [".qoder/rules/speclore.md"],
      "testFiles": ["tests/auth/register.test.ts"]
    }
  ],
  "summary": {
    "total": 1,
    "specified": 0,
    "constrained": 1,
    "coding": 0,
    "verified": 0
  },
  "recommendedActions": [
    "Fill in test scaffolding implementations, then start coding."
  ]
}
```

---

## `speclore.spec`

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
      "name": "Register with valid email",
      "given": ["System is running"],
      "when": ["User submits registration with valid email and password"],
      "then": ["System creates account and sends verification email"]
    }
  ],
  "constraints": "Generated 1 feature file with 3 scenarios.",
  "nextSteps": "Run `speclore code` to generate AI coding constraints.",
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "specified",
    "nextStep": "Call speclore.code to generate constraints and test scaffolding.",
    "projectSummary": {
      "total": 1,
      "specified": 1,
      "constrained": 0,
      "coding": 0,
      "verified": 0
    }
  }
}
```

---

## `speclore.code`

.feature → AI coding constraints + test scaffolding.

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
  "constraintContent": "Constraints for 2 modules...",
  "moduleRules": [],
  "activeConstraints": [],
  "codingGuidance": "Project: my-app. Language: TypeScript...",
  "scaffoldFiles": [
    {
      "testFile": "tests/auth/register.test.ts",
      "framework": "vitest",
      "scenarios": 3
    }
  ],
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "constrained",
    "nextStep": "Start coding. Constraints and test scaffolding are ready.",
    "projectSummary": {
      "total": 1,
      "specified": 0,
      "constrained": 1,
      "coding": 0,
      "verified": 0
    }
  }
}
```

---

## `speclore.verify`

Test run → acceptance report.

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
  "details": [],
  "failedDetails": [],
  "workflow": {
    "feature": "specs/auth/register.feature",
    "currentState": "verified",
    "nextStep": "All features verified. Add new requirements with speclore.spec.",
    "projectSummary": {
      "total": 1,
      "specified": 0,
      "constrained": 0,
      "coding": 0,
      "verified": 1
    }
  }
}
```

---

## Strong Workflow Constraints

Out-of-order calls return clear errors with correct guidance:

| Scenario | Result |
|----------|--------|
| Call `speclore.code` without .feature files | Returns error: `No .feature files found. Run speclore.spec first.` |
| Call `speclore.verify` without test scaffolding | Returns error: `No test scaffolding. Run speclore.code first.` |
| Call any tool with uninitialized project | Auto-creates `.speclore/config.yaml` with setup prompt |
| Invalid state transition (e.g., `specified` → `verified`) | Throws `Invalid state transition` error |

## Auto-Initialization & Migration

Every MCP tool entry point automatically checks and initializes the project:

1. Ensures `.speclore/config.yaml` exists (generates default config if not)
2. Ensures `.speclore/state.yaml` exists (creates if not)
3. Scans `specs/` directory, registers untracked `.feature` files as `specified` state

After upgrading SpecLore, no manual action is needed — migration happens automatically on first tool invocation.
