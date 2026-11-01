---
pitch_dir: braindump/
scratch_dir: plan/messy/
lens: game-design
handoff:
  command: "/plot"
  modes: [asap, anytime, peek]
  source_field: "Sources"
harness:
  - name: hazard solver
    run: "scratch enumerator over axiomancer-mechanics/src/World/Hazard/puzzle/hazard-puzzle.solver.ts"
    measures: "distinct winning outcomes per layout and band"
  - name: measured report
    run: "read docs/reports/measured/latest.md and name its commit stamp"
    measures: "win rates and engagement, current measurement (D57)"
read_first:
  - plan/bearings.md
  - plan/2026-09-25-refactor-strategy.decisions.md
  - docs/truth-sources.md
rules:
  - "Cards, keywords and art are owner-only (D37, D88); a pitch may plan the engine around them, never the content."
  - "No RNG in hazard puzzles (A2 of the fixed-puzzle ruling, braindump/2026-10-15-hazard-fixed-puzzle.md)."
  - "Balance numbers come from docs/reports/measured/latest.md with its commit stamp, never the retired deck-matrix baseline."
  - "No emojis, no attribution trailers (AGENTS.md rule 2)."
---
T is the owner. Plans land by PR; the loop never fires /plot, /messy or
/pitch. When a pitch is ready, the exit question offers /plot asap,
/plot anytime, /plot peek, or not now. A pitch that touches cards,
keywords or art pitches the engine around them and names the content
boundary in its exit extras.
