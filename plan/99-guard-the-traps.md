# 99 · Guard the traps: automate every footgun seen twice

**Why:** a trap seen twice gets automated, never logged again. Settle opens this spec when an open footgun
reaches 2×, adds one chunk per footgun with its entry in the Asap lane, and removes the spec and its rows when
its last chunk closes. Write nothing else here.

## Acceptance

- **A11** `win-effects-before-the-check` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.

## Chunks
Measure: 1 open · 10 closed · next A12

- [ ] **99.11** Automate footgun `win-effects-before-the-check` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A11 · needs —
