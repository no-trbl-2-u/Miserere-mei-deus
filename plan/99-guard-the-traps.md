# 99 · Guard the traps: automate every footgun seen twice

**Why:** a trap seen twice gets automated, never logged again. Settle opens this spec when an open footgun
reaches 2×, adds one chunk per footgun with its entry in the Asap lane, and removes the spec and its rows when
its last chunk closes. Write nothing else here.

## Acceptance

- **A1** `card-voice-stale-rows` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A2** `face-text-parsers` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A3** `small-face-line-fit` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A4** `glyph-in-text` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.
- **A5** `spare-table-unreached` is guarded: a test, hook or lint fails on the trap, and its footgun line says `guarded by` it.

## Chunks
Measure: 5 open · 0 closed · next A6

- [ ] **99.5** Automate footgun `spare-table-unreached` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A5 · needs —
- [ ] **99.4** Automate footgun `glyph-in-text` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A4 · needs —
- [ ] **99.3** Automate footgun `small-face-line-fit` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A3 · needs —
- [ ] **99.2** Automate footgun `face-text-parsers` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A2 · needs —
- [ ] **99.1** Automate footgun `card-voice-stale-rows` (seen 2×): a test, hook or lint, then mark it guarded · S · closes A1 · needs —
