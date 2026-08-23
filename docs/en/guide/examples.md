# Examples

A complete walkthrough using the "Patient Registration" feature to demonstrate SpecLore's full workflow.

---

## Scenario

> Patient registration requires phone number verification, passwords must be at least 8 characters, and WeChat quick login is supported.

---

## Step 1: Initialize Project

```bash
cd my-healthcare-app && speclore setup
```

Output:

```
✔ Detected AI tools: Cursor, Qoder
✔ Written .cursor/mcp.json
✔ Written .qoder-cn/mcp.json
✔ Generated .speclore/config.yaml
```

## Step 2: Generate Acceptance Criteria

```bash
speclore spec "Patient registration requires phone verification, password at least 8 characters, WeChat quick login"
```

Output:

```
✔ Generated specs/patient/register.feature

  Scenario 1: Register with valid phone number
    Given the system is running
    When user submits registration with valid phone and password
    Then system creates patient account and sends verification code

  Scenario 2: Reject invalid phone format
    Given the system is running
    When user provides invalid phone format (e.g., abc123)
    Then system rejects registration with phone format error

  Scenario 3: Warn on duplicate phone
    Given phone 13800138000 is already registered
    When user registers with the same phone number
    Then system rejects registration with duplicate phone warning
```

## Step 3: Generate AI Coding Constraints

```bash
speclore code
```

Output:

```
✔ Written .cursor/rules/speclore.mdc
✔ Written .qoder/rules/speclore.md
✔ Generated test scaffold tests/patient/register.test.ts
```

## Step 4: AI Coding

Code normally in Cursor / Qoder / Claude Code. The AI automatically reads constraint rules while you fill in the `it.skip` test scaffolding.

## Step 5: Acceptance

```bash
speclore verify
```

Output:

```
  Running tests: pnpm test

  ✔ 3/3 scenarios passed (100%)

  specs/patient/register.feature
    ✓ Register with valid phone number    → passed
    ✓ Reject invalid phone format         → passed
    ✓ Warn on duplicate phone             → passed

  ✅ Acceptance passed
```

---

::: tip Next Steps
- Explore [Configuration](/en/reference/configuration) Profile modes
- See [MCP Tools](/en/reference/mcp-tools) for AI client integration
- Learn [Test Mapping](/en/reference/test-mapping) strategies
:::
