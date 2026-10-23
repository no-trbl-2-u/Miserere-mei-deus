# Deadlines — v0.3 "Act 1 complete, playable"

> Set by T in an attended session, 2026-10-19, to focus the work. Five two-week windows from Monday 2026-10-20
> to 2026-12-28. Each window has one goal and a demo T checks at its end. T's attended time is 5-8 hours a week.
> **The loop is not restricted to the current window** (T): `/march` keeps picking open rows top to bottom; the
> windows tell T what to plot, attend and check, and when.

## The milestone

**v0.3: Act 1 complete and playable on a phone**, a build T would hand a tester. T's bar: with Blood Price, upgraded
cards and a levelled-up player, Act 1 can be cleared. In scope:

- hazards are fixed puzzles, with scripted results that look random (dice rolls, draws and rerolls animate like
  live play);
- every Act 1 event node works (the event UX redesign comes after v0.3);
- card upgrades;
- the enemy revamp and the Act Boss;
- the relic pass.

**Lowest priority (stretch):** new cards and the card-creator workflow (B5, B6). In v0.3 only if a window has time
left; otherwise after.

**After v0.3:** the event UX redesign, B7 deck tab UI, B8 card art, B10 dev menu, B9 Labyrinth re-theme, PF2.

## Windows

| Window | Dates | Goal | Demo T checks at the end |
|---|---|---|---|
| W1 | Oct 20 - Nov 2 | Hazard puzzles locked | T plays the thirty graded candidates on the live board with scripted randomness; the kept set, its patterns and its clocks follow |
| W2 | Nov 3 - Nov 16 | Act 1 hazards are puzzles | An Act 1 run where every hazard is a puzzle; difficulty measured |
| W3 | Nov 17 - Nov 30 | Card upgrades and every event node works | A walk of all four regions where every node type resolves; a card upgraded and used in a fight |
| W4 | Dec 1 - Dec 14 | Enemy revamp and the Act Boss | An Act 1 clear with Blood Price, upgrades and a levelled player, ending at the Act Boss |
| W5 | Dec 15 - Dec 28 | Relic pass and ship | The v0.3 APK on T's device; a playtester walk; T tags v0.3 |

### W1 — Hazard puzzles locked (Oct 20 - Nov 2)

- Shipped in the first days of the window: HP1c, HP1c2, HP1d (cost cards and the worse-copy test), HP3a, HP3b
  (the illusion of randomness), HP2c (the move log), HP2a (the card audit and the pool), HP2b (five difficulty
  features).
- **What the window now turns on: HP4a-HP4f.** T played all six routes of the three demos on 2026-10-19 and solved
  every one in under ten seconds, so the demos are not puzzles. HP4 authors thirty graded candidates (ten easy,
  ten medium, ten hard), puts them on the live board, and T plays them. **Phase B3f was cut on 2026-10-20** (its
  timed demo solves happened and its verdict was "change X"); the clocks it was to set are HP4g's, from the kept
  candidates.
- Also in the window: DL1a-DL1c, the deadline lint, so this plan cannot silently drift from the build plan again.
- Alongside, needing no time from T: LG1a-LG1e (loop gates), CT1 (real-fight combat tests), RS1 (the loop sweeps
  reports), VE1c-VE1d, IT1a.
- T's time (about 3 h): playing the thirty candidates once each (HP4e) at the end of the window, timed by HP2c's
  move log, with no candidate's label described beforehand.

### W2 — Act 1 hazards are puzzles (Nov 3 - Nov 16)

- Rows: HP4f (the authoring patterns from the kept set), HP4g (the band clocks from the kept set's times), then
  HP2d-HP2f (calibration set, attended calibration solves, bands on the measure). HP2c moved to W1. HP2d-HP2f are
  amended once HP4e's rulings exist: the calibration set should be drawn from HP4's kept candidates, and HP2e's
  Spearman bar has nothing to fit while every solve is under ten seconds
  (`plan/phases/phase_HP4_graded_puzzle_set.md` Follow-ups).
- To plot in W2: the Act 1 puzzle set, routing the live hazard nodes to the puzzle, and the cuts (RE-CAST cards,
  the saved hazard deck, `deadcard`; B3 Follow-ups).
- T's time (about 5 h): calibration solves (HP2e); a card session designing the first cost cards (Toll, Debt,
  Overdrive; HP1 Follow-ups).
- Nov 11: the R11 watch ends; the five held loop-doctrine candidates come up for review.

### W3 — Card upgrades and every event node works (Nov 17 - Nov 30)

- To plot at the start of W3: an audit of all twelve map event kinds in Act 1 (encounter, interaction,
  gathering, rest, village, cutscene, hazard, loot cache, narration, blacksmith, travel, labyrinth) with a fix for
  each that does not work.
- Rows: UP1a-UP1g (plotted 2026-10-20, `plan/phases/phase_UP1_card_upgrades.md`): Blood Price names, the upgrade
  law (rarity limits upgrades; numbers go up), Blood for Blood as the first rare, and the rest, blacksmith and
  elite grant paths. The grant call was made in the 2026-10-20 session. UP1h, the boss check, waits for B2 (W4).
- T's time (about 2 h): the region walk at the end.

### W4 — Enemy revamp and the Act Boss (Dec 1 - Dec 14)

- B2 (owner-led): T's enemy session (normal, elite, region boss, Act Boss), then the loop builds from its brief.
- R12 (attended): the new combat playtest, asking whether the Act 1 roster is winnable and dangerous.
- T's time (about 5 h): the enemy session; R12.

### W5 — Relic pass and ship (Dec 15 - Dec 28)

- B1 (owner-led): T's relic session, then the loop builds.
- LG1h (attended): the Android smoke test on the preview APK.
- Ship: a playtester walk of all four regions, the full gate, T tags v0.3 and the APK is built.
- T's time (about 4 h): the relic session; the device check; the tag.

## Items

The reminder reads this table (`scripts/deadlines.mjs`; T, 2026-10-19). Each row is one deadline item: a due date,
a name, its window, and **Rows**: the build-plan phase ids that finish it, `needs plot` (no rows yet), or `T` (a task
only T does; tick its Status `[x]` when done). Status is only set by hand on `T` rows; phase items read their state
from the build plan. A session that `/plot`s an item replaces its `needs plot` with the new phase ids.

**Status is derived for phase Items; never hand-edit it** (DL1b, 2026-10-21): `node scripts/deadlines.mjs --write`
recomputes it from the build plan (`[x]` when every row the Item names has shipped or been skipped, `[ ]`
otherwise) and rewrites only those cells; the `deadlines` workflow and the tick that ships a phase both run it.
`scripts/check-deadlines.mjs` (DL1a) fails the root `npm test` when an open build-plan row has no Item and no
`## Unscheduled` line, when an Item names a row that does not exist, when two Items name one row, when a date falls
outside its window, or when a phase Item's Status disagrees with what `--write` would write. **A `T` Item's Status is hand-ticked and derivable by nothing.** One
drift no check can see: an Item whose *premise* is superseded while the rows it names still exist — the
`W1 demo: T plays the three demos` case of 2026-10-20. The guard for that is the reconcile step `/plot` and
`/messy` carry (DL1c), not a lint.

The reminder, printed when T starts a chat and kept in `LIVE_DEADLINES.md`, names only what is stuck without T,
due within two weeks or overdue: "needs a plot" (`needs plot`, or a named id with no row) and "needs you" (an open
`T` task, or a named row that is attended or owner-led and whose prerequisites have shipped). Work the loop can
finish alone stays silent. Dates are drafts T can move; a moved date is recorded in the change log below.

| Status | Due | Item | Window | Rows |
|---|---|---|---|---|
| [x] | 2026-10-24 | Cost-card engine and the worse-copy test | W1 | HP1c, HP1c2, HP1d |
| [x] | 2026-10-27 | The puzzle looks random (roll, draw, reroll) | W1 | HP3a, HP3b |
| [x] | 2026-10-26 | The dev-only move log (times HP4e's solves) | W1 | HP2c |
| [x] | 2026-10-30 | Card audit; T rules the cut at the HP2a merge | W1 | HP2a |
| [x] | 2026-10-31 | Difficulty features in the solver | W1 | HP2b |
| [x] | 2026-10-23 | Decision pressure in the puzzle report | W1 | HP4a |
| [x] | 2026-10-23 | The candidate library shape | W1 | HP4b |
| [x] | 2026-10-24 | The deadline lint and its reconcile step | W1 | DL1a, DL1b, DL1c |
| [x] | 2026-10-27 | Author the thirty candidates | W1 | HP4c |
| [x] | 2026-10-30 | Solve times stored online (Workers + D1) | W1 | BE1a, BE1b, BE1c, BE1d |
| [x] | 2026-10-28 | The thirty on the live board | W1 | HP4d |
| [x] | 2026-10-24 | Five hazard cost cards, shown on the board | W1 | HP5a, HP5b |
| [x] | 2026-10-23 | The twenty easy and medium candidates go | W1 | HP5c |
| [x] | 2026-10-28 | Twenty cost-card puzzles on /devpuzzle | W1 | HP5d |
| [ ] | 2026-11-02 | W1 demo: T plays the thirty (ten hard + twenty cost-card) | W1 | HP4e |
| [ ] | 2026-11-04 | Act 1 puzzle set, live hazard routing and the cuts | W2 | needs plot |
| [ ] | 2026-11-05 | The authoring patterns from the kept set | W2 | HP4f |
| [ ] | 2026-11-06 | The band clocks, from the kept set's times | W2 | HP4g |
| [ ] | 2026-11-07 | The calibration set | W2 | HP2d |
| [ ] | 2026-11-11 | Calibration solves | W2 | HP2e |
| [ ] | 2026-11-11 | Review the held loop-doctrine candidates (R11 watch ends) | W2 | T |
| [ ] | 2026-11-12 | Cost-card design session (Toll, Debt, Overdrive) | W2 | T |
| [ ] | 2026-11-13 | Bands on the calibrated measure | W2 | HP2f |
| [ ] | 2026-11-16 | Loop gates, real-fight tests, report sweep | W2 | LG1a, LG1b, LG1c, LG1d, LG1e, LG1f, LG1g, CT1a, CT1b, RS1 |
| [ ] | 2026-11-16 | W2 demo: an Act 1 run with every hazard a puzzle | W2 | T |
| [ ] | 2026-11-17 | Event-node audit and fixes (all twelve kinds) | W3 | needs plot |
| [ ] | 2026-11-17 | Card-upgrade path | W3 | UP1a, UP1b, UP1c, UP1d, UP1e, UP1f, UP1g |
| [x] | 2026-11-18 | Upgrade grant call | W3 | T |
| [ ] | 2026-11-30 | W3 demo: a four-region walk, every node resolves | W3 | T |
| [ ] | 2026-12-02 | Enemy revamp session and the Act Boss | W4 | B2 |
| [ ] | 2026-12-11 | Combat playtest (winnable and dangerous) | W4 | R12 |
| [ ] | 2026-12-12 | Upgrades proven on the Act 1 boss | W4 | UP1h |
| [ ] | 2026-12-14 | W4 demo: an Act 1 clear ending at the Act Boss | W4 | T |
| [ ] | 2026-12-16 | Relic pass session | W5 | B1 |
| [ ] | 2026-12-23 | Android smoke test on the preview APK | W5 | LG1h |
| [ ] | 2026-12-26 | Playtester walk of all four regions | W5 | needs plot |
| [ ] | 2026-12-28 | Tag v0.3 and build the APK | W5 | T |

## Unscheduled

Open build-plan rows deliberately left undated, one per line as `- <id> — <reason>`. `scripts/check-deadlines.mjs`
fails the root `npm test` on an open row (`[ ]`, `[-]` or `[blocked: …]`) that neither an Item above nor a line here
names, and on a line here with no reason. **A row listed here is work the loop may still pick on its ordinary turn:
undated is not deprioritised.** When a date is set for one, move it to an Item and delete its line.

- AD1a — plotted 2026-10-21 (#716) without a deadline line; date not set.
- AD1b — plotted 2026-10-21 (#716) without a deadline line; date not set.
- FM1a — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- FM1b — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- FM1c — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- FM1d — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- FM1e — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- OV1d — attended; only A11 is left, the conflict test, which needs T at the desktop; date not set.
- VE1c — loop work listed alongside W1, needing no time from T; date not set.
- VE1d — loop work listed alongside W1, needing no time from T; date not set.
- PF2 — attended; after v0.3 (The milestone), and waits on T's Android baseline numbers.
- IT1b — blocked: owner-led, art is T's; date not set.
- ML1a — loop work; fixes a live merge defect, needs no time from T; date not set.
- ML1b — loop work; follows ML1a, and the brief asks for a comparison before building it; date not set.
- TP1b — blocked: owner-led, art is T's; date not set.
- B5 — blocked: owner-led; the card-creator workflow is v0.3 stretch, in only if a window has time left.
- B6 — blocked: owner-led; card sessions are v0.3 stretch, in only if a window has time left.
- B7 — blocked: owner-led; after v0.3 (The milestone).
- B8 — blocked: owner-led; after v0.3 (The milestone).
- B9 — blocked: owner-led; after v0.3 (The milestone).
- B10 — blocked: owner-led; after v0.3 (The milestone).
- 90 — pre-revamp partial (the multi-hit half shipped); the summoner half is not v0.3 work; date not set.
- 52b — pre-revamp partial (the inn as a first-class rest); not v0.3 work; date not set.
- 47c — pre-revamp partial (Expo decouple, assets); not v0.3 work; date not set.
- 47d — pre-revamp partial (Expo decouple, device APIs); not v0.3 work; date not set.
- 47e — pre-revamp partial (Expo decouple, build and CI); not v0.3 work; date not set.
- V2 — pre-revamp partial (map scene remainders); not v0.3 work; date not set.
- V3 — pre-revamp partial (menus and chrome remainders); not v0.3 work; date not set.
- V6 — pre-revamp partial (glyph unification remainders); not v0.3 work; date not set.
- V7 — pre-revamp partial (illustration upgrades); art is T's; not v0.3 work.
- W5 — pre-revamp partial (map roster growth); enemies wait on T's B2 session; date not set.
- AN1a — loop work; ships changing no pixel, needs no time from T; date not set.
- AN1b — loop work; follows AN1a; date not set.
- AN1c — loop work, but T sequenced it after seeing AN1b work; date not set.
- AN1d — loop work under D97 (used enemies only); follows AN1c; date not set.
- AN1e — loop work; the row that actually installs the float-eye, requires AN1c and AD1a; date not set.
- AN2a — loop work; removes the overlay covering the enemy animation; date not set.
- AN2b — loop work; delays the flinch until the played card clears; date not set.
- AN3a — loop work; the Hag becomes the Green Jelly, fight unchanged; date not set.
- AN3b — loop work; the Jelly's frame set; follows AN3a; date not set.
- AN4a — loop work; the Act 1 boss stops being a placeholder; date not set.
- AN4b — loop work; the Beholder's frame set; follows AN4a; date not set.
- RV4 — loop plumbing; removes the merge cap that is blocking today's chain; date not set.
- BE2a — loop work; T's card-logging request, blocks nothing in a window; date not set.
- BE2b — loop work; follows the same request; date not set.
- BE2c — loop work; follows BE2a and BE2b; date not set.
- BE2d — loop work; follows BE2c; date not set.
- BE2e — loop work; follows BE2a and BE2b; date not set.
- BE2f — loop work; follows BE2a; date not set.
- BE2g — attended; T's check on a preview APK once BE2c-BE2f ship; date not set.
- BV1a — loop work, slotted asap (T); waits on BE2a; blocks no window's goal; date not set.
- BV1b — loop work; follows BV1a; date not set.
- BV1c — attended; T creates the ballot Pages project and submits the first verdict from the phone; date not set.
- BV2a — loop work, slotted asap (T); blocks no window's goal; date not set.
- BV2b — loop work; follows BV2a; date not set.
- FM2a — loop work; T slotted it anytime; date not set.
- FM2b — loop work; follows FM2a; date not set.
- FM2c — loop work; follows FM2a; date not set.
- FM2d — attended; T's look in Obsidian once FM2b and FM2c ship; date not set.

## How a window closes

At the end of each window T runs the demo. A missed goal moves to the next window and the plan shifts, recorded
here with the date; nothing is dropped silently. A window's "to plot" items are plotted at its start, in an
attended session.

## Change log

- **2026-10-23** — **ballot Save plotted** (T, attended session, `/plot asap`). **Added** Unscheduled lines for BV2a-BV2b: T set no date, and the rows block no window's goal. **Edited** no Item. Nothing ticked; no date moved.
- **2026-10-23** — **ballots on the phone plotted** (T, attended session, `/plot asap`). **Added** Unscheduled lines for BV1a-BV1c: T set no date, and the rows block no window's goal (card lanes are v0.3 stretch). **Edited** no Item: no open Item's premise depends on the ballot site. BE2a moved up the build plan's Status block (BV1a requires it); its Unscheduled line stands. Nothing ticked; no date moved.
- **2026-10-22** — **modular feature map plotted** (T, attended session, `/plot anytime`). **Added** Unscheduled lines for FM2a-FM2d: T set no date and the rows serve no window's goal. **Edited** no Item: the FM1 map they extend has shipped and no open Item depends on it.
- **2026-10-22** — **card and combat logging plotted** (T, attended session, `/plot`). **Added** Unscheduled lines for BE2a-BE2g: T set no date and the rows block no window's goal. **Edited** no Item: no open Item's premise depends on the play log. Nothing ticked; no date moved.
- **2026-10-21** — **cost-card puzzles plotted** (T, attended session, `/plot asap`). **Added** three W1 Items for HP5a-HP5d (five hazard cost cards and their board display, the twenty easy and medium candidates deleted, twenty cost-card puzzles). **Edited** the W1 demo Item: T's thirty are now HP4c's ten hard plus HP5d's twenty, and HP4e requires HP5d. Nothing ticked; no date moved.
- **2026-10-21** — **phase Item Status is derived** (phase DL1b, the loop). `deadlines.mjs --write` now rewrites
  every phase Item's Status cell from the build plan, and the lint fails a cell that disagrees. Its first run
  ticked the four HP4 Items whose rows had shipped (HP4a, HP4b, HP4c, HP4d). No date moved; no `T` row changed.
- **2026-10-20** — **card upgrades plotted** (T, attended session, `/pitch` then `/plot anytime`). `Card-upgrade
  path` now names UP1a-UP1g; **added** `2026-12-12 | Upgrades proven on the Act 1 boss | W4 | UP1h` (UP1h requires
  B2's boss); **ticked** `Upgrade grant call`, which T made in the session (rest, blacksmith, elite).

- **2026-10-21** — **`## Unscheduled` added and the deadline lint live** (phase DL1a, the loop). Every open
  build-plan row no Item names is listed there with its reason, read row by row from the build plan: VE1c and VE1d,
  PF2, the art rows IT1b and TP1b, the owner-led B-rows, and ten pre-revamp `[-]` partials. No date moved and no
  Item changed. `scripts/check-deadlines.mjs` now fails the root `npm test` when the two plans disagree, and the
  reminder reads wrapped build-plan rows whole, so an attended row's `Requires` on a continuation line (HP4e's
  `Requires HP4c, HP4d`) is no longer read as "Requires nothing".
- **2026-10-20** — **the plan reconciled with the build plan, and a lint plotted so this cannot recur** (T,
  attended session). T asked "what's next", was shown a stale reminder, and named the defect: *"The deadline items
  don't update with the work that's been done. I've already tested the 3 puzzles and we've already created a new
  spec to create 10 of each puzzle."* What changed here:
  - **Removed** `2026-10-29 | Timed demo solves and the clocks | B3f`. Phase B3f was cut the same day: T's timed
    solves happened on 2026-10-19 and the verdict was "change X". T's rule, verbatim: *"if there's an equivalent
    for testing the 30 puzzles, then cut it. Otherwise adapt it."* HP4e is that equivalent.
  - **Re-scoped** `2026-11-02 | W1 demo: T plays the three demos | T` to `W1 demo: T plays the thirty candidates`,
    Rows `HP4e`. That playthrough had already happened; the W1 demo is the thirty.
  - **Added** Items for HP4a, HP4b, HP4c, HP4d, HP4e, HP4f and the new HP4g (the band clocks, carrying cut B3f's
    A17), and for DL1a-DL1c. HP4a-HP4f had been plotted on 2026-10-19 with **no Item at all**, so the real W1
    critical path was invisible to the reminder — the drift that produced this entry.
  - **Renamed** the move-log Item, which named B3f's solves, to name HP4e's.
  - **Ticked** the five W1 Items whose rows have all shipped (HP1c/HP1c2/HP1d, HP3a/HP3b, HP2c, HP2a, HP2b).
    Hand-set for now; **DL1b** makes `deadlines.mjs --write` recompute every phase Item's Status from the build
    plan, and **DL1a** fails the root `npm test` when the two plans disagree at all. Until DL1b lands, a phase
    Item's Status is still a hand-edited cell the reminder ignores.
  - **The W1 and W2 window sections and the W1 demo column** rewritten to the same effect. No date moved except
    the two rows above.
- **2026-10-19** — the Items table and the reminder added (T): per-item due dates, reminders only for what needs a
  plot or needs T, `LIVE_DEADLINES.md` for the next two weeks.
- **2026-10-19** — created by T (attended decision round): milestone, rhythm, scope and order chosen via
  AskUserQuestion.
