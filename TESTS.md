# Tests

Vitest is not pre-installed. To run:

```bash
bun add -d vitest
bunx vitest run
```

## Coverage

The audit engine — the entire product surface — has 6 tests in
`src/lib/audit-engine.test.ts`:

| #   | Case                                               | Why it matters                                                           |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | ChatGPT Team → Plus at ≤2 seats                    | Core downgrade rule; if this regresses, our top-3 recommendation breaks. |
| 2   | Cursor Business → Pro at ≤10 seats                 | Second highest-impact rule. Asserts `yearly == monthly × 12`.            |
| 3   | Consolidate two overlapping coding assistants      | Cross-tool rule; touches different code path than per-tool rules.        |
| 4   | Rightsize when reported spend > list × seats × 1.5 | Catches user-input misconfig / hidden overages.                          |
| 5   | "Keep" acknowledgement when nothing is wrong       | Empty-savings case must still return a card, not crash.                  |
| 6   | Totals invariant: yearly == monthly × 12           | Caught the original double-counting bug.                                 |

## What's NOT tested yet

- Form Zod schema (low risk — Zod is already battle-tested).
- Loader decode/encode round-trip (would add 1 test in week 2).
- React components (Storybook + a11y is week 3 work).
