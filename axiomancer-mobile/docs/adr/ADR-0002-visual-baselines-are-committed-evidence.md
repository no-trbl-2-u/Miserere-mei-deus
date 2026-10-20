# ADR-0002 — Visual baselines are committed evidence

Status: Accepted  
Date: 2026-06-01  
Scope: axiomancer-mobile

## Decision

Approved visual smoke baselines are committed evidence. Missing baselines after successful export are baseline approval debt, not product failure.

## Context

The visual smoke gate produced current screenshots before baselines existed. T approved the screenshots, and baselines were committed so the visual gate became meaningful.

## Consequences

- Use `npm run baseline:approve` only when current screenshots are accepted.
- Verify with `npm run verify:visual`; it reuses `.smoke-dist` while the export's stamp matches the tree (`AXM_FORCE_EXPORT=1` re-exports).
- Commit `screenshots/baseline/*.png` with the approval.
- Treat future visual diffs as evidence requiring review, not as noise.

## Links

- `scripts/smoke-screens.mjs`
- `scripts/baseline-approve.mjs`
- Commit `2a2f98c` — approved visual baselines
