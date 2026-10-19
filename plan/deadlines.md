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
| W1 | Oct 20 - Nov 2 | Hazard puzzles locked | T plays the three demos on the live board with scripted randomness; clocks set from timed solves |
| W2 | Nov 3 - Nov 16 | Act 1 hazards are puzzles | An Act 1 run where every hazard is a puzzle; difficulty measured |
| W3 | Nov 17 - Nov 30 | Card upgrades and every event node works | A walk of all four regions where every node type resolves; a card upgraded and used in a fight |
| W4 | Dec 1 - Dec 14 | Enemy revamp and the Act Boss | An Act 1 clear with Blood Price, upgrades and a levelled player, ending at the Act Boss |
| W5 | Dec 15 - Dec 28 | Relic pass and ship | The v0.3 APK on T's device; a playtester walk; T tags v0.3 |

### W1 — Hazard puzzles locked (Oct 20 - Nov 2)

- Rows: HP1c (cost cards: signed costs, extra die, reroll), HP1d (worse-copy test), HP3 (the illusion of
  randomness, to plot now), HP2c (the move log, moved up from W2: it times B3f's solves), B3f (attended: timed
  demo solves and the clocks), HP2a (card audit; T rules the cut at
  its merge), HP2b (difficulty features).
- Alongside, needing no time from T: LG1a-LG1e (loop gates), CT1 (real-fight combat tests), RS1 (the loop sweeps
  reports).
- T's time (about 3 h): B3f's timed solves (one per route, the playtester agent covers the rest; T, 2026-10-19);
  HP2a's cut; playing the demos at the end.

### W2 — Act 1 hazards are puzzles (Nov 3 - Nov 16)

- Rows: HP2d-HP2f (calibration set, attended calibration solves, bands on the measure). HP2c moved to W1.
- To plot in W2: the Act 1 puzzle set, routing the live hazard nodes to the puzzle, and the cuts (RE-CAST cards,
  the saved hazard deck, `deadcard`; B3 Follow-ups).
- T's time (about 5 h): calibration solves (HP2e); a card session designing the first cost cards (Toll, Debt,
  Overdrive; HP1 Follow-ups).
- Nov 11: the R11 watch ends; the five held loop-doctrine candidates come up for review.

### W3 — Card upgrades and every event node works (Nov 17 - Nov 30)

- To plot at the start of W3: an audit of all twelve map event kinds in Act 1 (encounter, interaction,
  gathering, rest, village, cutscene, hazard, loot cache, narration, blacksmith, travel, labyrinth) with a fix for
  each that does not work; finishing the card-upgrade path (the engine and the Blacksmith screen exist; the grant
  path is the open call).
- T's time (about 2 h): the upgrade grant call; the region walk at the end.

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

The reminder, printed when T starts a chat and kept in `LIVE_DEADLINES.md`, names only what is stuck without T,
due within two weeks or overdue: "needs a plot" (`needs plot`, or a named id with no row) and "needs you" (an open
`T` task, or a named row that is attended or owner-led and whose prerequisites have shipped). Work the loop can
finish alone stays silent. Dates are drafts T can move; a moved date is recorded in the change log below.

| Status | Due | Item | Window | Rows |
|---|---|---|---|---|
| [ ] | 2026-10-24 | Cost-card engine and the worse-copy test | W1 | HP1c, HP1c2, HP1d |
| [ ] | 2026-10-27 | The puzzle looks random (roll, draw, reroll) | W1 | HP3a, HP3b |
| [ ] | 2026-10-26 | The dev-only move log (times B3f's solves) | W1 | HP2c |
| [ ] | 2026-10-29 | Timed demo solves and the clocks | W1 | B3f |
| [ ] | 2026-10-30 | Card audit; T rules the cut at the HP2a merge | W1 | HP2a |
| [ ] | 2026-10-31 | Difficulty features in the solver | W1 | HP2b |
| [ ] | 2026-11-02 | W1 demo: T plays the three demos | W1 | T |
| [ ] | 2026-11-04 | Act 1 puzzle set, live hazard routing and the cuts | W2 | needs plot |
| [ ] | 2026-11-07 | The calibration set | W2 | HP2d |
| [ ] | 2026-11-11 | Calibration solves | W2 | HP2e |
| [ ] | 2026-11-11 | Review the held loop-doctrine candidates (R11 watch ends) | W2 | T |
| [ ] | 2026-11-12 | Cost-card design session (Toll, Debt, Overdrive) | W2 | T |
| [ ] | 2026-11-13 | Bands on the calibrated measure | W2 | HP2f |
| [ ] | 2026-11-16 | Loop gates, real-fight tests, report sweep | W2 | LG1a, LG1b, LG1c, LG1d, LG1e, LG1f, LG1g, CT1a, CT1b, RS1 |
| [ ] | 2026-11-16 | W2 demo: an Act 1 run with every hazard a puzzle | W2 | T |
| [ ] | 2026-11-17 | Event-node audit and fixes (all twelve kinds) | W3 | needs plot |
| [ ] | 2026-11-17 | Card-upgrade path | W3 | needs plot |
| [ ] | 2026-11-18 | Upgrade grant call | W3 | T |
| [ ] | 2026-11-30 | W3 demo: a four-region walk, every node resolves | W3 | T |
| [ ] | 2026-12-02 | Enemy revamp session and the Act Boss | W4 | B2 |
| [ ] | 2026-12-11 | Combat playtest (winnable and dangerous) | W4 | R12 |
| [ ] | 2026-12-14 | W4 demo: an Act 1 clear ending at the Act Boss | W4 | T |
| [ ] | 2026-12-16 | Relic pass session | W5 | B1 |
| [ ] | 2026-12-23 | Android smoke test on the preview APK | W5 | LG1h |
| [ ] | 2026-12-26 | Playtester walk of all four regions | W5 | needs plot |
| [ ] | 2026-12-28 | Tag v0.3 and build the APK | W5 | T |

## How a window closes

At the end of each window T runs the demo. A missed goal moves to the next window and the plan shifts, recorded
here with the date; nothing is dropped silently. A window's "to plot" items are plotted at its start, in an
attended session.

## Change log

- **2026-10-19** — the Items table and the reminder added (T): per-item due dates, reminders only for what needs a
  plot or needs T, `LIVE_DEADLINES.md` for the next two weeks.
- **2026-10-19** — created by T (attended decision round): milestone, rhythm, scope and order chosen via
  AskUserQuestion.
