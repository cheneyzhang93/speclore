# Test Mapping

> Full content coming soon. Meanwhile, see the [Chinese version](/reference/test-mapping).

SpecLore's acceptance verification (`speclore verify`) needs to map test results back to `.feature` scenarios. Three mapping methods are supported, listed by priority.

---

## Mapping Priority

```
Mapping file (auto) → Explicit markers (manual) → unmapped
```

## Method 1: Mapping Files (Recommended)

AI automatically generates mapping files at `.speclore/mappings/{module}/{feature}.json` when generating test code.

## Method 2: Explicit Markers (Fallback)

Add `@speclore-scenario` comment markers in test files.

## Method 3: Pattern Matching

Auto-match by path patterns configured in `config.yaml` `verify.mapping.patterns`.
