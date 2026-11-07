# 99 · Guard the traps: automate every footgun seen twice

**Why:** a trap seen twice gets automated, never logged again. Settle opens this spec when an open footgun
reaches 2×, adds one chunk per footgun with its entry in the Asap lane, and removes the spec and its rows when
its last chunk closes. Write nothing else here.

## Acceptance

- **A1** `card-voice-stale-rows` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A2** `face-text-parsers` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A6** `font-width-estimates-stale` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A7** `recast-pinned-orphan-lens` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A8** `scratchpad-script-no-resolve` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A9** `stakes-card-vm-undrawn-lines` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.

## Chunks
Measure: 6 open · 3 closed · next A10

- [ ] **99.9** Automate footgun `stakes-card-vm-undrawn-lines` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A9 · needs —
- [ ] **99.8** Automate footgun `scratchpad-script-no-resolve` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A8 · needs —
- [ ] **99.7** Automate footgun `recast-pinned-orphan-lens` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A7 · needs —
- [ ] **99.6** Automate footgun `font-width-estimates-stale` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A6 · needs —
- [ ] **99.2** Automate footgun `face-text-parsers` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A2 · needs —
- [ ] **99.1** Automate footgun `card-voice-stale-rows` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A1 · needs —
