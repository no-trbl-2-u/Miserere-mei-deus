# 150 — The open rows, checked against the code

> Every open row says what is still true: shipped rows close, moot rows retire, half-done rows shrink to what is left, attended rows stop hiding loop work, and finished briefs leave `plan/`.

## Why

### Sources

- T, 2026-11-04, attended: "Can you check to see if they're all still relevant?" about the open specs and rows, then "plot those asap".
- A read-only audit of all 56 open chunks and the 13 non-spec files in `plan/`, on main at 704f1a0f8, in three parts. 41 chunks are live as written and are not touched here.
- T tagged v0.4.0 on 2026-11-04, so the deadline plan's "v0.3" milestone (Dec 28) names a version that already exists.

### What exists today (read 2026-11-04, at 0776931ad)

- **Shipped or moot.** 132.1 ST1a shipped in #1249 (`SettingsBody.tsx` has the music row and the feedback form) and was never closed. 99.5's footgun `spare-table-unreached` (`identity/footguns.md:41`) says the Spare roll has no caller. It has one now: `settleSpareAction` (`state/combat/store-actions.ts:121`) and the reducer's `APPLY_SPARE_REWARD`.
- **Already guarded.** `small-face-line-fit` (99.3) has `paid-line.fit.engine.test.ts`, and `glyph-in-text` (99.4) has `CombatCardFace.glyph-mode.test.tsx`. Neither footgun line says so, and nobody has yet shown that the 99.4 test fails with an Svg under a Text.
- **Half done.**
  - 111.3 MC1c: f5158a132 cut the legend and step count. The viewport is still measured once (`MapCanvas.tsx:554`), and the gesture line still sits inside the frame.
  - 126.4 OV1d: only A11 (the conflict test) is left, per `docs/reports/vault-bridge.md`.
  - 135.7 SM2h: its "lane bots never spare" half (A18) is overtaken by spec 144. `laneFightPolicy('merciful').mercyCheck` is `'spare'` on purpose. A19 (guard when hit) is still live.
- **Premise gone.**
  - 120.6 HP4f and 120.7 HP4g need T's solve times per kept candidate, and none were recorded. HP4e closed 2026-11-03 with no per-candidate data, and `HAZARD_PUZZLE_CLOCK_SECONDS` keeps its placeholders.
  - 124.4–124.6 HP2d–HP2f calibrate on a set that was never built (no `HAZARD_PUZZLE_CALIBRATION`). HP4 and HP6's graded 30-puzzle set replaced it.
- **Attended rows hiding loop work.**
  - 125.8 LG1h: no `android-smoke.yml` or Maestro flow exists, so the loop must build them before T can watch a run.
  - 123.1 PF2: its step 1 (`renderToHardwareTextureAndroid`) is code. T's part is the Android measurement, and its "30 Svg roots / 330 paths" count predates the board changes.
  - 122.2 R12: the text predates the reset, and its "how hard is Chapter 1" question overlaps SM2f's nightly report.
- **Stale text.**
  - Spec 135 still describes befriending in several places. Its Measure line says 12 open, but 7 are.
  - 135.3 A7 cites `mercyChoice: 'exploit'`; the code uses `mercyCheck`.
  - 134.5 B2 still reads as the whole enemy revamp, but only Chapters 2–4 and the Act Boss are left (deadlines, Unscheduled).
  - `plan/deadlines.md` names "v0.3" as the Dec 28 ship.
- **Finished briefs in `plan/`.** These nine are executed and done. D66 says history is deleted and read from git, never kept in a `plan/archive/` folder.
  - The three Trim the Fat files (`2026-09-25-trim-the-fat.prompt.md`, `.spec.md` and `trim-t2a-handoff`), plus `trim-t5-handoff`.
  - `2026-09-27-stat-scaling.prompt.md` and `2026-10-12-r11-reopen-loop.prompt.md`.
  - Both map-revamp briefs (`2026-09-25-map-revamp-kickoff`, `-m3`).
  - `2026-09-02-big-numbers-overhaul.prompt.md`.

  Inbound links to repoint: `axiomancer-mobile/assets/images/maps/provenance.json`, `plan/AUDIT.md`, a comment in `relic-vitae-persistence.engine.test.ts`, `plan/revamp/engine.md:10`, `axiomancer-mechanics/docs/reports/deck-tuning-2026-09-04.md` and `plan/CANDIDATES.md:939`. Three files stay. `2026-09-25-refactor-strategy.decisions.md` is the live D1–D83 log. `2026-09-27-keyword-card-revamp.plans.md` stays while B5 and B6 are open. `2026-09-02-big-numbers-overhaul.decisions.md` has one "open follow-up" line still unchecked.

## Design

Plan edits only. No game code, rule, card, price or tuning value changes, except PC1d's new smoke workflow and flow, which are CI files. Each change rides the normal close and retire path: a closed row gets an ARCHIVE line, a retired row a retire line naming this spec, and a shrunk row keeps its id and alias. `plan/deadlines.md` is reconciled in the same chunk as the rows it names, so `check-deadlines` stays green.

### Decisions made upfront (do not ask)

- One spec, asap (T, 2026-11-04).
- The 41 live rows are untouched.
- 132.1 closes, and 99.5 retires with its footgun marked `retired: wired in 144.3`.
- A footgun is marked guarded only after its test is shown failing with the trap put back.

### Out of scope

- Building anything a shrunk or split row still asks for. That stays in its own row.
- `refactor-strategy.decisions.md` and the old D1–D3 clash (decisions-log merge, Nov 11).

## Acceptance

- **A1** 132.1 is closed, 99.5 retired, and 99.3 and 99.4 closed with their footguns guarded, each proven by a failing run with the trap restored. A row whose test does not fail stays open with a line saying why.
- **A3** 120.6, 120.7 and 124.4–124.6 are retired or rewritten per #2, and their deadline Items are reconciled (the Nov 28 calibration Item among them).
- **A4** LG1h, PF2 and R12 are each split so the loop's part is its own unattended chunk and T's part stays attended, with R12 and SM2f owning distinct questions per #3, and the deadline plan names the Dec 28 ship per #4.
- **A5** The nine finished briefs are deleted, every inbound link is repointed or removed (`git grep` finds none), and the big-numbers follow-up line is checked, then folded into a live spec or recorded as done.

## Open questions

1. B8 (card art): CA3a–e painted all four lanes. Is the title wordmark all that is left? And does ST1b, which moves the dev menu into Settings, shrink B10? Default: leave both rows as they are, with a note on each naming CA3 and ST1b for T's next owner-led session. [T to confirm #1]
2. HP4f, HP4g and HP2d–HP2f: retire, or rewrite onto the solve-time backend's data? Default: retire all five. The clocks keep their placeholders, and a new row is plotted when real solve times exist. [T to confirm #2]
3. Who owns "how hard is Chapter 1": R12 or SM2f's nightly report? Default: SM2f owns the number, and R12 keeps T's played judgement (winnable, dangerous). [T to confirm #3]
4. The Dec 28 ship was named v0.3, but v0.4.0 is now tagged. Default: rename it v0.5 throughout `plan/deadlines.md`, moving no dates. [T to confirm #4]
5. BV1c (ballots): the site is believed up, with verdicts in D1. Default: PC1a checks D1 for a `ballot_verdicts` row. If one exists, BV1c shrinks to "T's first verdict on the preview URL"; if not, it stays as written. [T to confirm #5]

## Chunks

Measure: 4 open · 1 closed · next A6

- [ ] **150.1** Shipped and moot rows close, guarded footguns say so · S · closes A1 · needs — · alias: PC1a
- [ ] **150.3** The hazard calibration rows retire · S · closes A3 · needs — · alias: PC1c
- [ ] **150.4** Attended rows split from the loop work they hide, and the ship renamed · M · closes A4 · needs — · alias: PC1d
- [ ] **150.5** Finished briefs leave `plan/` · S · closes A5 · needs — · alias: PC1e

### 150.1 (PC1a) — Shipped and moot rows close, guarded footguns say so · S · closes A1 · requires —

- Close 132.1 (pr #1249) and drop its Unscheduled line. Retire 99.5. For 99.3 and 99.4, restore each trap locally, show the test failing, then close the row and mark the footgun guarded. Check D1 per #5.
- Measure: `plan-check`, `check-deadlines`, and each restore-and-fail run noted in the PR.

### 150.2 (PC1b) — Half-done rows name only what is left · S · closes A2 · requires —

- Rewrite 111.3 (viewport relayout, gesture line placement, the map's foot reachable), 126.4 (A11 only) and 135.7 (A19 only; A18 retired as overtaken by spec 144). Fix spec 135's befriending text, its Measure line and 135.3's A7, and reword 134.5. Add the #1 notes to B8 and B10.
- Measure: `plan-check`, `check-deadlines`, and `git grep -i befriend plan/135-*` finds nothing.

### 150.3 (PC1c) — The hazard calibration rows retire · S · closes A3 · requires —

- Retire per #2, with each retire line naming this spec and the reason. Reconcile their Items in `plan/deadlines.md` (log it in the change log).
- Measure: `plan-check`, `check-deadlines`.

### 150.4 (PC1d) — Attended rows split from the loop work they hide, and the ship renamed · M · closes A4 · requires —

- Split LG1h into a loop chunk (the smoke workflow and flow, built and green on a dispatch) and T's watched run. Split PF2 into its code step and T's measurement, re-counting the Svg figure. Rewrite R12 per #3. Rename the ship per #4.
- Measure: `plan-check`, `check-deadlines`, `node scripts/deadlines.mjs --write` leaving no diff.

### 150.5 (PC1e) — Finished briefs leave `plan/` · S · closes A5 · requires —

- Delete the nine briefs listed above and repoint or remove every link to them. Check the big-numbers decisions file's open follow-up line.
- Measure: `git grep` for each deleted filename finds nothing; root `npm test` (3 known Windows `spawnSync tar EOF` failures aside).
