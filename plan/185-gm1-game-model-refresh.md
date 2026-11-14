# 185 — The game model says what the tree does today

> `docs/game-model.md` matches the code on the points the Chapter 1 gap audit found out of date, and a test keeps the ones that can be checked.

## Why

### Sources

- **T, 2026-11-14 (attended, after the Chapter 1 gap audit, `plan/chapter1-gaps.md`):** "plot whatever you think you can that doesn't need to be attended".
- `docs/game-model.md` is read once per session by every build (`plan/README.md`, "Bearings"), so a wrong line there is carried into new work.

### What exists today

The audit read the doc against the tree at cd8654b and found these lines out of date. Each is a claim to check again at build time, not a ruling:

- **A lethal hazard.** The doc says a lethal hazard crossing in the app "still resets the run until phase DY1c". DY1c shipped (ARCHIVE, 258.3): a fatal hazard goes through `playerDied('hazard')` (`axiomancer-mobile/state/hazard/store-actions.ts`).
- **The foes.** The fight and foe sections speak of three enemies and say no live foe carries a keyword. The library holds Chapter 1's thirteen foes and they carry enemy words.
- **The Breakwater questline.** The doc calls its steps and rewards placeholders "until T's sitting" and names the last step's reward as the Elementalist's Belt. T's lines and rewards landed in phase BW1e: steps 1 and 3 pay a relic (Ruby Signet, Mirror Brooch), step 2 a weapon and step 4 an armor of the lane of the relic before (`World/breakwater-chapter.questline.ts`).
- **Hazard count.** Seven Breakwater hazard nodes play a puzzle (phase SL1a said it once; check every mention agrees).
- **Scenes.** The Breakwater has no cutscene nodes and 22 scenes play from node slots (phases SS1c, NV1i); check the world section says so.

### The small version first

A docs edit, plus one small test for the facts a script can read. One chunk.

## Design

- Each line above is corrected to what the code does, in the doc's own plain present tense. A line about a rule T called provisional (the dying rule) keeps the word provisional.
- No rule, number or name is invented: where the code and the doc disagree and the code looks wrong, the builder stops on that line, leaves it, and lists it in the PR body for T.
- A test in the root `npm test` (beside the other doc checks) fails when `docs/game-model.md` names a phase as still to come that `plan/ARCHIVE.md` lists as shipped (the pattern "until phase <alias>").

### Decisions made upfront (do not ask)

- Docs and one test only. No code behaviour changes.
- If specs 182 or 183 have landed first, their facts (the chapter complete screen, the three relics' source) are written in too; if not, they are left to those chunks.

### Out of scope

- Rewriting sections the audit did not flag.
- `plan/bearings.md`.

## Acceptance

- **A1** `docs/game-model.md` agrees with the tree on the lethal hazard, the foe roster and their keywords, the Breakwater questline's rewards, the hazard count and the scenes; a test fails on an "until phase X" line whose phase the archive lists as shipped.

## Open questions

None.

## Chunks

Measure: 1 open · 0 closed · next A2
- [ ] **185.1** Game model corrected on five points, with a stale-phase test · S · closes A1 · needs — · alias: GM1a
  - Read each flagged line against the code named above before editing it; fix only what the code contradicts.
  - The test: a small script under `scripts/` with its `.test.mjs`, wired into the root `npm test`, that reads the doc for "until phase <alias>" and the archive for that alias.
  - Check siblings: `docs/truth-sources.md` and `AGENTS.md` lines that quote the same facts; the prose and comment lints.
  - Measure: the root `npm test` passes.
