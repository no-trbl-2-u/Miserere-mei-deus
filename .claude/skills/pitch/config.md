# /pitch repo config

Optional file at `<repo>/.claude/pitch.md`. YAML front matter; the body
below it is free prose the skill reads as repo-specific guidance (house
rules, forbidden surfaces, who T is). Every field has a default, so the
file may be absent or hold one line.

## Schema

```yaml
---
pitch_dir: pitches/            # where finished pitch files land
scratch_dir: .pitch/           # where the card lives; must be gitignored
lens: general                  # default lens when --as is not given
handoff:
  command: "/plot"             # the skill to run on a "yes" at the exit question
  modes: [asap, anytime, peek] # the words the command accepts; omitted = print only
  source_field: "Source"       # the brief field that cites the pitch file
harness:                       # commands the lens may run on a scratch basis
  - name: <short name>
    run: "<command>"
    measures: "<what number it yields>"
read_first:                    # paths the skill reads before turn one
  - <path>
rules:                         # repo rules the pitch must respect
  - <one line each>
---
<free prose: anything the skill should know about this repo and this T>
```

Field notes:

- `scratch_dir` must be ignored by git. If the directory is not in
  `.gitignore`, the skill says so on turn one and keeps the card in the
  OS temp directory instead.
- `handoff.command` absent: the skill prints the Handoff block and stops.
  It never invents a planning command for a repo that has none.
- `harness` entries are the only commands the skill may run. A lens may
  ask for a number; if no harness yields it, EVIDENCE records "not
  measurable before build" with the reason, which satisfies the exit
  criterion.
- `rules` are copied into FIXED at turn one with the tag `(repo rule)`,
  so they are never asked about.

## Example: Miserere-mei-deus

```yaml
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
  - "No RNG in hazard puzzles (A2 of the fixed-puzzle ruling)."
  - "Balance numbers come from docs/reports/measured/latest.md with its commit stamp, never the retired deck-matrix baseline."
  - "No emojis, no attribution trailers (AGENTS.md rule 2)."
---
T is the owner. Plans land by PR; the loop never fires /plot, /messy or
/pitch. When a pitch is ready, the exit question offers /plot asap, /plot
anytime, /plot peek, or not now.
```

## Example: a repo with no planning skill

```yaml
---
pitch_dir: docs/pitches/
scratch_dir: .pitch/
lens: ai-harness
---
```

The exit question then offers only "write the pitch file" and the
Handoff block is printed for whatever planning the repo does by hand.
