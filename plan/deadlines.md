# Deadlines — MVP Nov 16, then v0.3 "Act 1 complete, playable"

> Set by T in an attended session, 2026-10-19, to focus the work. Five two-week windows from Monday 2026-10-20
> to 2026-12-28. Each window has one goal and a demo T checks at its end. T's attended time is 5-8 hours a week
> (T recommitted to that pace for the MVP, 2026-10-26). **The loop is not restricted to the current window** (T):
> `/march` keeps picking open rows top to bottom; the windows tell T what to plot, attend and check, and when.

## The milestones

**Each region is a chapter (D106, T 2026-10-26).** Act 1 is the four regions: Chapter 1 the Breakwater, Chapter 2
the Charcoal Wood, Chapter 3 the Beacon Crags, Chapter 4 the Lantern Deep. A later act may revisit a region.

**MVP, Nov 16 (T, 2026-10-26): Act 1, Chapter 1 complete** (T: "Act 1 Chapter 1 completed is the mid November
deadline"): a full Breakwater run on the phone with Chapter 1's real enemies and their art, the six lane relics T
authored (three per lane, LR1b), actual item icons, the Breakwater's one questline (QL1, T 2026-10-27, D111), and a
a full treatment (art, transitions, copy, animation, working end to end) for the four node kinds every Breakwater
run hits: encounter, hazard, rest and quest. Act 1 has eight node kinds since NK1 (D112, T 2026-10-28: encounter,
hazard, rest, loot cache, cutscene, quest, village, travel); each is pitched, settled and plotted in its own sitting,
spread out so T is never researching or plotting them all at once (T, 2026-10-28), and the other four (travel,
village, loot cache, cutscene) get theirs in W3. The MVP pulls the
enemy revamp for Chapter 1 (B2, was W4), the lane relics (LR1, was undated), the item icons (IT1b, was undated) and
the event-node UX (was after v0.3) into W2. The MVP is a run, not a tuned run: hazard calibration, the hand-picked
hazard swap, the cost-card session and the combat playtest come after it.

**v0.3, Dec 28: all of Act 1 complete and playable on a phone** (T: "All 4 regions combined is Act 1 and the
deadline is the end of the year"), a build T would hand a tester. T's bar: with Blood Price, upgraded cards and a
levelled-up player, Act 1 can be cleared. In scope:

- hazards are fixed puzzles, with scripted results that look random (dice rolls, draws and rerolls animate like
  live play);
- each of the eight node kinds (D112) is proper: its art, transitions, copy and animation, and it works end to end
  (T, 2026-10-28: "make sure each and every event type has art, transitions, narration, animations, function
  properly"), from one sitting per kind, four before the MVP and four in W3;
- card upgrades;
- the enemy revamp for all four chapters, with Chapters 2-4's enemies and enemy art (T, 2026-10-26), and the Act
  Boss;
- the relic pass (the six lane relics are the MVP's; B1 keeps the rest).

**The watchtower fight (bw-17) is Chapter 1's boss** (T, 2026-10-26: "Chapter 1 boss"), and **the Act Boss sits at
the end of the Lantern Deep, Chapter 4** (T: "Yes, end of Ch4"; D106). It is designed in enemy session 4, Nov 22.

**Lowest priority (stretch):** new cards and the card-creator workflow (B5, B6). In v0.3 only if a window has time
left; otherwise after.

**After v0.3:** B7 deck tab UI, B8 card art, B10 dev menu, B9 Labyrinth re-theme, PF2.

## Windows

| Window | Dates | Goal | Demo T checks at the end |
|---|---|---|---|
| W1 | Oct 20 - Nov 2 | Hazard puzzles locked; Chapter 1's sessions held | T plays the thirty graded candidates on the live board with scripted randomness; Chapter 1's enemy sessions are held and plotted |
| W2 | Nov 3 - Nov 16 | MVP: Act 1, Chapter 1 complete | A full Breakwater run on T's phone: both hazards puzzles, Chapter 1's real enemies and art, the six lane relics, real item icons, every Breakwater node in its new UI |
| W3 | Nov 17 - Nov 30 | Chapters 2-4 designed; hazards tuned | A walk of all four chapters where every node resolves; Chapters 2-4's enemy sessions held and plotted; calibrated hazard bands |
| W4 | Dec 1 - Dec 14 | The rest of the relic pass, combat proven, an Act 1 clear | An Act 1 clear with Blood Price, upgrades and a levelled player, ending at the Act Boss; the combat playtest's verdict |
| W5 | Dec 15 - Dec 28 | Ship | The v0.3 APK on T's device; a playtester walk; T tags v0.3 |

### W1 — Hazard puzzles locked; Chapter 1's sessions held (Oct 20 - Nov 2)

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
- **Pulled forward for the MVP (2026-10-26):** the item-icon pick (IT1b) and Chapter 1's two enemy sessions (B2),
  so the loop can build Chapter 1's enemies and icons from Nov 2.
- T's time (about 8 h, Oct 26 - Nov 1; see "MVP schedule" below): the icon pick, the Breakwater map design, two enemy sessions, the thirty
  candidates in two sittings (HP4e).

### W2 — MVP: Act 1, Chapter 1 complete (Nov 3 - Nov 16)

- Rows: HP4f (the authoring patterns from the kept set) and HP4g (the band clocks from the kept set's times), as
  before. **Moved to W3:** HP2d-HP2f (calibration), which the MVP does not need; they are still amended once HP4e's
  rulings exist (`plan/phases/phase_HP4_graded_puzzle_set.md` Follow-ups).
- To plot in W2: routing the live hazard nodes to the puzzle board, each of the eleven Act 1 hazard nodes (six on the Breakwater, D114) drawing a
  random puzzle from the thirty for now (T, 2026-10-24), and the cuts (RE-CAST cards, the saved hazard deck,
  `deadcard`; B3 Follow-ups). The hand-picked set, "the swap", moves to W3.
- The MVP's loop work, which the reminder never names: Chapter 1's enemies and their art, from the B2 plot on Nov 2;
  the lane relics RW1a, LR1a and LR1c-LR1e (`plan/phases/phase_LR1_lane_relics.md`); the Breakwater's questline
  QL1a-QL1f (`plan/phases/phase_QL1_breakwater_questline.md`; LR1f skipped for it, D111; QL1g follows DY1b); the icons IT1b applies once T
  picks; AW1b; NK1a-NK1d (the node kinds cut to eight, D112); and each event kind's treatment once its sitting
  plots it.
- To pitch and plot in W2, one kind per sitting: encounter (Nov 4), hazard (Nov 5), rest (Nov 6) and quest (Nov 12).
  The node map (`plan/revamp/breakwater-map.md`) and AW1a's audit (`docs/reports/act1-event-audit.md`) are the
  starting picture. Travel, village, loot cache and cutscene follow in W3 (Nov 17, 20, 24 and 27).
- T's time (about 15 h, Nov 2 - Nov 15): the B2 plot, the hazard plot, four event-kind sittings,
  the title plate and arena backgrounds, the Defender check, a quest-line play, the pre-run triage,
  Chapter 1's enemy art, a mid-MVP check on the preview build, the walk's `[content]` answers with the Breakwater's
  quest line, the R11 review, and the MVP run.
- Nov 11: the R11 watch ends; the five held loop-doctrine candidates come up for review.

### W3 — Chapters 2-4 designed; hazards tuned (Nov 17 - Nov 30)

- Plotted early (T, 2026-10-25) as AW1a-AW1b (`plan/phases/phase_AW1_act1_walk.md`); AW1a shipped (#918) and AW1b
  moved to W2 with the MVP.
- Enemy sessions 3 and 4 for Chapters 2-4 (normals and elites; bosses and the Act Boss), then their plot. The loop
  builds those enemies and their art through W4 and W5.
- Rows: UP1a-UP1g shipped; UP1h, the boss check, moves here from W4. HP2d-HP2f (calibration) move here from W2.
- T's time (about 9 h): the hazard swap plot, two enemy sessions and their plot, Chapters 2-4's quest lines,
  calibration solves (HP2e), and the four-chapter walk at the end.

### W4 — The rest of the relic pass, combat proven, an Act 1 clear (Dec 1 - Dec 14)

- B1 (owner-led): T's session for the rest of the relic pass (the starting ring, stat-only relics), then the loop
  builds. Moved here from W5, so W5 is only the ship.
- R12, the combat playtest, and the cost-card session move here from W3, to make room for Chapters 2-4's enemy
  sessions.
- Chapters 2-4's enemy art: T picks from the loop's candidates on Dec 13.
- The stretch (B5, B6) can take the window's spare time.
- T's time (about 10.5 h): the relic session, the cost-card session, R12 in two sittings, Chapters 2-4's art, the
  Act 1 clear.

### W5 — Ship (Dec 15 - Dec 28)

- LG1h (attended): the Android smoke test on the preview APK.
- Ship: a playtester walk of all four chapters, the full gate, T tags v0.3 and the APK is built.
- T's time (about 3 h): the device check; the walk's plot; the tag.

## MVP schedule

T's human-in-the-loop work from 2026-10-26 to the MVP, in pieces of one to two hours (T works 9-5 on weekdays,
so weekday pieces are evenings and weekends carry the longer sessions). No weekday is held free: T works on
Miserere every day, Thursdays included (T, 2026-10-27). Each piece is a
Item in the Items table below, on the same date; every Item is T's act, and loop work appears only as the `Waits on` of the act it unblocks. The daily reminder
reads this table for the day's piece, the high-level task it serves, how AI can help, and the next days' pieces.

| Date | Hours | Piece | High-level task | How AI helps |
|---|---|---|---|---|
| Mon Oct 26 | 0.5 | Merge the lane-relic plot (#922), then this plan's PR | Lock the MVP plan | Done (#922 merged) |
| Tue Oct 27 | 1 | Pick the item icons (IT1b), the six lane relics included | Real item icons | Claude renders the 2026-10-19 candidate sheet at 28 px beside each item and finds candidates for the six new relics; you pick (art is yours, D88) |
| Wed Oct 28 | 0.5 | Design the Breakwater map before enemy session 1: the total node count and how many of each kind, drop the two gathering nodes, and check on the coast art (`act1-coast.webp`) whether more keep nodes fit | Chapter 1's real enemies; event-node UX | Claude brings the current count from `plan/revamp/breakwater-map.md` (22 nodes since QL1d) and the coast art beside it; you decide the kinds and counts |
| Wed Oct 28 | 1 | Enemy session 1: Chapter 1's normal roster (the Breakwater's 15 fight nodes on T's new map, D114; B2) | Chapter 1's real enemies | Claude drafts stat blocks and decks against measured truth and the S3 curve; you decide each foe |
| Thu Oct 29 | 1 | Author the first character (CH1e): portrait, starting relic and its lane, two starting lanes, three lane cards, the playstyle line | First character playable | Claude lays out the Defender's and the other lanes' cards and relics against the stats you set; you decide (D88) |
| Fri Oct 30 | 1 | Play the ten hard candidates (HP4e, part 1) | Hazard puzzles locked | None while you play (no labels shown); afterwards Claude writes the rows from the move log |
| Sat Oct 31 | 1 | Enemy session 2: Chapter 1's three elites and the sea keep's boss (B2) | Chapter 1's real enemies | Claude drafts decks and telegraphs and checks every keyword has a live counter (D45); you decide each foe |
| Sun Nov 1 | 2 | Play the twenty cost-card candidates; rule keep or cut (HP4e, part 2) | Hazard puzzles locked | Claude records your rulings in your words |
| Mon Nov 2 | 1 | `/plot` Chapter 1's enemies and their art brief (B2) | Chapter 1's real enemies | `/plot` writes the rows and briefs; you confirm the slot |
| Tue Nov 3 | 1 | `/plot` live hazard routing and the cuts | Every hazard a puzzle | `/plot` |
| Wed Nov 4 | 1 | Event kind 1, encounter: pitch its full treatment, settle it and `/plot` it | Event-node UX | Claude brings AW1's screenshot of a fight node and two or three directions (art, transitions, copy, animation) to react to |
| Thu Nov 5 | 1 | Event kind 2, hazard: pitch, settle and `/plot` its full treatment | Event-node UX | The same, for the hazard node, beside the live puzzle board |
| Fri Nov 6 | 0.5 | Event kind 3, rest: pitch, settle and `/plot` its full treatment | Event-node UX | The same, for the rest node |
| Sat Nov 7 | 0.5 | Pick the title plate (TP1b) and the four arena backgrounds from your art dossier | Title screen and combat backgrounds | The dossier already grades each candidate against the wordmark and a real sprite; you pick one per slot (art is yours, D88) |
| Sat Nov 7 | 0.5 | `/plot` the arena-background swap from your picks | Title screen and combat backgrounds | `/plot` |
| Sun Nov 8 | 2 | Chapter 1's enemy art: pick from the loop's candidates | Chapter 1's real enemies | Claude lays the candidates out beside each foe's stat block; you pick (art is yours, D88) |
| Mon Nov 9 | 1 | Mid-MVP check: Chapter 1 on the preview build | The MVP run | Claude turns your notes into `/plot` or `/messy` rows |
| Tue Nov 10 | 1.5 | Answer Chapter 1's `[content]` rows (node copy, map fixes) and write Chapter 1's quest chain lines (BW1d) | Event-node UX; the lane relics | Claude drafts copy options per row and giver lines in the game's voice; you pick and rewrite |
| Wed Nov 11 | 1 | Review the held loop-doctrine candidates (R11 watch ends) | Loop health | Claude summarises each candidate's evidence since Oct 12 |
| Thu Nov 12 | 0.5 | Event kind 4, quest: pitch, settle and `/plot` its full treatment | Event-node UX | The same, for the quest node, beside QL1's built screens |
| Thu Nov 12 | 0.5 | Play the Defender test deck on the preview build; check the reward pool (DF1f) | The Defender lane | Claude sets up the `/dev` deck steps; you play and rule |
| Fri Nov 13 | 0.5 | Play your quest line on the preview build; rule on its lines | The Breakwater's questline | Claude turns your notes into fixes for BW1e |
| Sat Nov 14 | 1 | File what is still broken (`/plot` or `/messy`); decide what Sunday's run must show | The MVP run | Claude lists what the mid-MVP check filed and what has shipped since; you cut or keep |
| Sun Nov 15 | 1.5 | The MVP run: a full Breakwater run on the phone | The MVP | Afterwards Claude reads the play log and lists what broke; `/messy` the dump |

Every day from Oct 26 to Nov 15 has a piece of T's own (T, 2026-10-28: "make sure each item is something I need to
do"). Total: about 23 hours in three weeks (8, 7.5 and 7.5). Chapter 1's scope freed about 3.5 hours (shorter enemy sessions, eight kinds to pitch, one quest line; the quest kind, QL1, made it nine); 2 of
them go to Chapter 1's enemy art, which the MVP now includes.

After the MVP, T's pieces are the Items below: W3 about 12 hours (Chapters 2-4's enemy sessions on Nov 21 and 22,
and the travel, village, loot-cache and cutscene sittings),
W4 about 10.5 (B1, the cost-card session, R12, Chapters 2-4's art on Dec 13).

## Items

The reminder reads this table (`scripts/deadlines.mjs`; T, 2026-10-19). **Every Item is something T does** (T,
2026-10-28: "make sure each item is something I need to do, not just running an agent against a phase row";
"Realistically every item in deadline should be this way"): plot, pitch, decide, pick, author, play, review, merge
or tag. Each row is one such act: a due date, a name, its window, **Rows**, and **Waits on**. **Rows** is `T` (a task
only T does; tick its Status `[x]` when done), `needs plot` (no rows yet; tick it `[x]` by hand once a plot has
answered it), or the ids of build-plan rows that wait on T (attended or owner-led), which finish the Item.
**Waits on** is the loop rows this act needs before T can do it, or `-`; the loop has no dates of its own, so a
loop row is listed under the first T act it unblocks, and the reminder says `the loop still owes <ids>` while one is
open. Status is only set by hand on `T` and `needs plot` rows; phase Items read their state from the build plan, and
`Waits on` never ticks an Item. A session that `/plot`s an Item replaces its `needs plot` with the new phase ids
only when they wait on T; loop rows go under the `Waits on` of the T act that follows, or under `## Unscheduled`.

**Status is derived for phase Items; never hand-edit it** (DL1b, 2026-10-21): `node scripts/deadlines.mjs --write`
recomputes it from the build plan (`[x]` when every row the Item names has shipped or been skipped, `[ ]`
otherwise) and rewrites only those cells; the `deadlines` workflow and the tick that ships a phase both run it.
`scripts/check-deadlines.mjs` (DL1a) fails the root `npm test` when an open build-plan row has no Item and no
`## Unscheduled` line, when an Item names a row that does not exist (in `Rows` or `Waits on`), when a row is named
twice, when an Item's `Rows` names a loop row (DL2b), when a date falls outside its window, or when a phase Item's Status disagrees with what `--write` would write. **A `T` Item's Status is hand-ticked and derivable by nothing.** One
drift no check can see: an Item whose *premise* is superseded while the rows it names still exist — the
`W1 demo: T plays the three demos` case of 2026-10-20. The guard for that is the reconcile step `/plot` and
`/messy` carry (DL1c), not a lint.

The reminder, printed when T starts a chat and kept in `LIVE_DEADLINES.md`, names only what is stuck without T,
due within two weeks or overdue: "needs a plot" (`needs plot`, or a named id with no row) and "needs you" (an open
`T` task, or a named row that is attended or owner-led and whose prerequisites have shipped), each with the loop rows
its act still waits on. Work the loop can finish alone, with no T act after it, stays silent. Dates are drafts T can move; a moved date is recorded in the change log below.

| Status | Due | Item | Window | Rows | Waits on |
|---|---|---|---|---|---|
| [x] | 2026-10-26 | Merge the lane-relic plot (#922), then the MVP plan PR (0.5 h) | W1 | T | - |
| [ ] | 2026-10-27 | Pick the item icons, the six lane relics included; the loop applies them (1 h) | W1 | IT1b | - |
| [x] | 2026-10-28 | Design the Breakwater map before enemy session 1: total node count and count per kind, drop the gathering nodes, check the coast art for room for more keep nodes (0.5 h) | W1 | T | - |
| [ ] | 2026-10-28 | Enemy session 1: Chapter 1's normal roster, the Breakwater's 15 fight nodes (1 h) | W1 | T | - |
| [ ] | 2026-10-29 | Author the first character: portrait, starting relic and its lane, two starting lanes, three lane cards, the playstyle line (1 h) | W1 | CH1e | - |
| [ ] | 2026-10-30 | W1 demo part 1: T plays the ten hard candidates (1 h) | W1 | T | - |
| [ ] | 2026-10-31 | Enemy session 2: Chapter 1's three elites and the sea keep's boss (1 h) | W1 | T | - |
| [ ] | 2026-11-01 | W1 demo part 2: T plays the twenty cost-card candidates and rules keep or cut (2 h) | W1 | HP4e | - |
| [ ] | 2026-11-02 | Plot Chapter 1's enemies and their art brief from the two sessions (1 h) | W1 | B2 | - |
| [ ] | 2026-11-03 | Live hazard routing (each of the eleven Act 1 hazard nodes, six of them the Breakwater's, draws a random puzzle from the thirty) and the cuts (plot, 1 h) | W2 | needs plot | - |
| [ ] | 2026-11-04 | Event kind 1, encounter: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (1 h) | W2 | needs plot | - |
| [ ] | 2026-11-05 | Event kind 2, hazard: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (1 h) | W2 | needs plot | - |
| [ ] | 2026-11-06 | Event kind 3, rest: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (0.5 h) | W2 | needs plot | - |
| [ ] | 2026-11-07 | Pick the title plate and the four arena backgrounds (coast, forest, mountains, underworld) from your art dossier (0.5 h) | W2 | TP1b | - |
| [ ] | 2026-11-07 | Plot the arena-background swap from your picks (0.5 h) | W2 | needs plot | - |
| [ ] | 2026-11-08 | Chapter 1's enemy art: pick from the loop's candidates (2 h) | W2 | T | - |
| [ ] | 2026-11-09 | Mid-MVP check: Chapter 1 on the preview build, file what broke (1 h) | W2 | T | CH1f, BW1c, NK1a |
| [ ] | 2026-11-10 | Answer Chapter 1's `[content]` rows (node copy, map fixes) (1 h) | W2 | T | - |
| [ ] | 2026-11-10 | Write Chapter 1's quest chain lines: quest names and asks, giver and turn-in lines, the four refusal lines, gate reasons, every step's XP and reward (0.5 h) | W2 | BW1d | BW1a, BW1b |
| [ ] | 2026-11-11 | Review the held loop-doctrine candidates (R11 watch ends, 1 h) | W2 | T | - |
| [ ] | 2026-11-12 | Event kind 4, quest: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (0.5 h) | W2 | needs plot | - |
| [ ] | 2026-11-12 | Play the Defender test deck on the preview build and check the reward pool (0.5 h) | W2 | DF1f | - |
| [ ] | 2026-11-13 | Play your quest line on the preview build and rule on its lines (0.5 h) | W2 | T | BW1e |
| [ ] | 2026-11-14 | File what is still broken (`/plot` or `/messy`) and decide what the MVP run must show (1 h) | W2 | T | - |
| [ ] | 2026-11-16 | MVP demo: Act 1, Chapter 1 complete, a full Breakwater run on the phone with puzzle hazards, Chapter 1's enemies and art, lane relics, icons, new event UI (1.5 h, Sun Nov 15) | W2 | T | - |
| [x] | 2026-11-18 | Upgrade grant call | W3 | T | - |
| [ ] | 2026-11-17 | Event kind 5, village (paid rest, card shop, Anvil): pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (1 h) | W3 | needs plot | NK1b, NK1c |
| [ ] | 2026-11-19 | Plot the hazard swap: hand-pick the eleven Act 1 hazard puzzles (Breakwater 6, Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2) after playing the thirty in `/dev` (1 h) | W3 | T | HP4f, HP4g |
| [ ] | 2026-11-20 | Event kind 6, travel ("move to X?", secret paths): pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (1 h) | W3 | needs plot | NK1d |
| [ ] | 2026-11-21 | Enemy session 3: Chapters 2-4's normal rosters and elites (2 h) | W3 | T | - |
| [ ] | 2026-11-22 | Enemy session 4: Chapters 2-4's bosses and the Act Boss, at the end of Chapter 4 (2 h) | W3 | T | - |
| [ ] | 2026-11-23 | Plot Chapters 2-4's enemies and their art brief (1 h) | W3 | needs plot | - |
| [ ] | 2026-11-24 | Event kind 7, loot cache: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (0.5 h) | W3 | needs plot | - |
| [ ] | 2026-11-25 | Write Chapters 2-4's quest lines, on Chapter 1's chain (BW1): every quest pays a relic, any lane relic not already paid by Chapter 1 (D114) (1 h) | W3 | T | - |
| [ ] | 2026-11-27 | Event kind 8, cutscene: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (0.5 h) | W3 | needs plot | - |
| [ ] | 2026-11-28 | Calibration solves (2 h) | W3 | HP2e | HP2d |
| [ ] | 2026-11-30 | W3 demo: a four-chapter walk, every node resolves (2 h) | W3 | T | HP2f |
| [ ] | 2026-12-05 | Relic pass session (the rest of B1: the starting ring, stat-only relics; the six lane relics are LR1's, in the MVP) (2 h) | W4 | B1 | - |
| [ ] | 2026-12-06 | Cost-card design session: Toll, Debt, Overdrive (1.5 h) | W4 | T | - |
| [ ] | 2026-12-08 | Combat playtest part 1: the questions the command asks (1 h) | W4 | T | - |
| [ ] | 2026-12-12 | Combat playtest part 2: winnable and dangerous (2 h) | W4 | R12 | - |
| [ ] | 2026-12-13 | Chapters 2-4's enemy art: pick from the loop's candidates (2 h) | W4 | T | - |
| [ ] | 2026-12-14 | W4 demo: an Act 1 clear ending at the Act Boss (2 h) | W4 | T | UP1h |
| [ ] | 2026-12-23 | Android smoke test on the preview APK (1 h) | W5 | LG1h | - |
| [ ] | 2026-12-26 | Playtester walk of all four chapters (plot, 1 h) | W5 | needs plot | - |
| [ ] | 2026-12-28 | Tag v0.3 and build the APK (1 h) | W5 | T | - |

## Unscheduled

Open build-plan rows deliberately left undated, one per line as `- <id> — <reason>`. `scripts/check-deadlines.mjs`
fails the root `npm test` on an open row (`[ ]`, `[-]` or `[blocked: …]`) that neither an Item above nor a line here
names, and on a line here with no reason. **A row listed here is work the loop may still pick on its ordinary turn:
undated is not deprioritised.** When a date is set for one, move it to an Item and delete its line.

- AD1a — plotted 2026-10-21 (#716) without a deadline line; date not set.
- AD1b — plotted 2026-10-21 (#716) without a deadline line; date not set.
- EQ1a — a live defect T hit on device; loop work, needs no time from T; date not set.
- DF1e — the Defender's relics; loop work, waits on LR1d; blocks no window's goal; date not set.
- EQ1b — loop work, needs no time from T; date not set.
- CL1 — plotted 2026-10-26 (ballots pitch no colour, D110); loop work, needs no time from T; date not set.
- NC1 — plotted 2026-10-26 (no caps, D109); loop work, needs no time from T; date not set.
- FM1a — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- FM1b — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- FM1c — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- FM1d — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- FM1e — loop work, needs no time from T beyond confirming the pitch rule; date not set.
- OV1d — attended; only A11 is left, the conflict test, which needs T at the desktop; date not set.
- VE1c — loop work listed alongside W1, needing no time from T; date not set.
- VE1d — loop work listed alongside W1, needing no time from T; date not set.
- PF2 — attended; after v0.3 (The milestone), and waits on T's Android baseline numbers.
- ML1a — loop work; fixes a live merge defect, needs no time from T; date not set.
- ML1b — loop work; follows ML1a, and the brief asks for a comparison before building it; date not set.
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
- IO1b — attended; waits on T enrolling in the Apple Developer Program; date not set.
- IO1d — attended; T and a friend install the first iPhone builds once IO1b and IO1c ship; date not set.
- BV1a — loop work, slotted asap (T); waits on BE2a; blocks no window's goal; date not set.
- BV1b — loop work; follows BV1a; date not set.
- BV1c — attended; T creates the ballot Pages project and submits the first verdict from the phone; date not set.
- BV2a — loop work, slotted asap (T); blocks no window's goal; date not set.
- BV2b — loop work; follows BV2a; date not set.
- BV3 — loop work; serves the next family's ballot, blocks no window's goal; date not set.
- EL1a — loop work, slotted asap (T); card lanes are v0.3 stretch; date not set.
- EL1b — loop work; follows EL1a; date not set.
- EL1c — loop work; follows EL1a and EL1b; date not set.
- EL1d — attended; T's check on the preview APK after EL1c; date not set.
- SP1 — loop work, slotted asap (T); a card rule, blocks no window's goal; date not set.
- FM2a — loop work; T slotted it anytime; date not set.
- FM2b — loop work; follows FM2a; date not set.
- FM2c — loop work; follows FM2a; date not set.
- FM2d — attended; T's look in Obsidian once FM2b and FM2c ship; date not set.
- EM1 — loop work; a measurement (D57) that blocks no window's goal; R12's Item (2026-12-11) still decides what the matrix measures; date not set.
- GL1 — loop work; the board glossary from the Elementalist swarm, blocks no window's goal; date not set.
- LR1g — loop work; signature tracking, blocks no window's goal; date not set.
- EQ2b — loop work; follows EQ2a, the slot words on screen; date not set.
- SB1 — attended: T's set-bonus design session; T said it is not part of the Act 1 MVP deadline; date not set.
- QL1g — loop work; the boss fought again, follows QL1d and DY1b (the death rule, due Nov 8); no date of its own; not needed for the Nov 16 run unless a lost boss fight must be retryable by then.
- MD1c — plotted 2026-10-28 (the merge job checks the merged tree); loop work, but a pipeline PR T merges by hand; date not set.

## How a window closes

At the end of each window T runs the demo. A missed goal moves to the next window and the plan shifts, recorded
here with the date; nothing is dropped silently. A window's "to plot" items are plotted at its start, in an
attended session.

## Change log

- **2026-10-29** — **the art licence question is closed; AL1 plotted** (T, attended `/plot`: "The images we use for everything are open source. We've had this conversation a few times now"; then: publish all of it, D115). **Added** an Unscheduled line for AL1: loop work that needs no time from T and unblocks no T act. No Item is added, edited or ticked: no open Item rests on the licence question.
- **2026-10-29** — **T answered BW1's six calls** (T, in session: a cave-face node C0 is the sea cave's other end, "H6 should travel to C0"; "delete all the original saves"; icons only on "the currently available ones, the connecting ones to the available ones, and the Quest ones"; "we'll drop all the original quests. Furthermore, every completed quest will offer a new relic", and the elite-only relic rule amended). **Edited** the Nov 25 Chapters 2-4 quest-line Item: its premise was QL1's shape and the four quest relics left over; now Chapter 1's chain, every quest paying a relic. No date moved, nothing ticked.
- **2026-10-28** — **Chapter 1 rebuilt to T's vision; BW1 plotted** (T, attended: a `/pitch` locked every node on T's sketch, then "plan and plot how to go from where we are now to the result we just spoke of", and kind icons, D114). **Ticked** "Design the Breakwater map before enemy session 1" (T designed it this session: 43 nodes; the board and `braindump/2026-10-28-breakwater-chapter-1-map.md`). **Edited** enemy session 1 (four fight nodes to 15) and 2 (one elite and the watchtower boss to three elites and the sea keep's boss); the hazard routing plot and the Nov 19 swap (seven Act 1 hazard nodes to eleven, the Breakwater's two to six); the Nov 10 quest-line write (QL1e's four-step line to BW1d's chain, waiting on BW1a and BW1b) and the MVP-schedule pieces naming them; the Nov 13 play (waits on BW1e, not QL1f). **Added** BW1c under the Nov 9 mid-MVP check's `Waits on`. QL1e and QL1f are skipped in the build plan (call 6 on the PR). No date moved.
- **2026-10-28** — **several quests at once, and quest nodes that hold the road, plotted** (T, `/plot`, attended: "players have the ability to have multiple quests at a time ... certain quests will prevent the player from moving on that path any further until the quest is completed"). **Added** MQ1a-MQ1c under `## Unscheduled` (date not set: no T act follows them until T's Breakwater map is locked and its rebuild plotted). **Edited** nothing else: the Nov 10 quest-line Item (QL1e) still names the four-step questline on `main`; T's Chapter 1 vision (`plan/revamp/breakwater-map.md`) will likely re-scope it when the rebuild is plotted.
- **2026-10-28** — **completed nodes can be revisited; the player walks the roads** (T, attended `/plot`: "players should be able to revisit them ... This will allow for backtracking"; "Walk the roads"; "Village, travel, quest"). **Added** Unscheduled lines for WR1a and WR1b: T set no date and they block no window's goal. **Edited** no Item: the MVP run and the event-kind sittings keep their premise (WR1 changes how the player moves, not which nodes exist). Nothing ticked.
- **2026-10-28** — **the node kinds cut to eight, and one sitting per event kind** (T, attended `/plot` of NK1: "I doubt we'll need that many"; then "add to the deadlines for 'complete act 1' that we need to make sure each and every event type has art, transitions, narration, animations, function properly ... to have each event type at least proper for the MVP", "But spread them out so I'm not plotting / researching all of them at the same time", and T picked the split of four kinds before the MVP and four after). **Added** NK1a-NK1d to the `Waits on` of the acts they unblock: NK1a under the Nov 9 mid-MVP check, NK1b and NK1c under the village sitting, NK1d under the travel sitting. **Replaced** the Nov 4 pitch, Nov 5 settle and Nov 6 plot of all nine kinds with one sitting per kind: encounter (Nov 4, 1 h), hazard (Nov 5, 1 h), rest (Nov 6, 0.5 h) and quest (Nov 12, 0.5 h) before the MVP; village (Nov 17, 1 h), travel (Nov 20, 1 h), loot cache (Nov 24, 0.5 h) and cutscene (Nov 27, 0.5 h) in W3. **Edited** the MVP milestone (the four kinds every run hits), the v0.3 scope (all eight kinds proper), the W2 notes and the hours: W2 14.5 h to 15 h, the MVP total 22.5 h to 23 h, W3 9 h to 12 h. The Oct 28 map-design Item keeps its premise (NK1a turns the gathering nodes into empty waypoints; how many of each kind is still T's). No date moved; nothing ticked.
- **2026-10-28** — **the Nov 3 node-map review is dropped** (T, in conversation: "Drop Nov 3 row"). Today's Breakwater map design covers it. **Removed** the Item and MVP-schedule piece "Review the Breakwater node map before the event-node pitch" (2026-11-03, 1 h, Rows `T`). The week of Nov 2 drops to 7.5 h, inside T's 5-8; the MVP total to about 22.5 h. No other date moved.
- **2026-10-28** — **the Breakwater map is designed before enemy session 1** (T, in conversation: "we need to design the map before I start doing work locking in enemies, hazards and other nodes"; "I want to discuss how many nodes are there total and how many of each type of node exists"; "determine if it would be possible to add more keep nodes, also we can drop the gathering nodes entirely"). **Added** the Item and MVP-schedule piece "Design the Breakwater map before enemy session 1", due 2026-10-28 in W1, 0.5 h, Rows `T`, listed before enemy session 1. What "keep nodes" means (fight nodes, castle landmarks or quest nodes) is open for T. No other date moved; the Nov 3 "Review the Breakwater node map" Item stays as it is.
- **2026-10-28** — **every Item is a T act; the Items table gains `Waits on`** (T, in conversation: "make sure each item is something I need to do, not just running an agent against a phase row"; "Realistically every item in deadline should be this way"; phase DL2b). **Dropped** the 27 Items that named only loop rows (20 shipped or mostly shipped, 7 open): "Cost-card engine and the worse-copy test", "The puzzle looks random", "The dev-only move log", "First character playable" (CH1a-CH1d, CH1f, DF1a-DF1d; CH1e is its own Item), "Card audit", "Difficulty features in the solver", "Decision pressure in the puzzle report", "The candidate library shape", "The deadline lint and its reconcile step", "Author the thirty candidates", "Solve times stored online", "The thirty on the live board", "Five hazard cost cards", "The twenty easy and medium candidates go", "Twenty cost-card puzzles on /devpuzzle", "Node blurbs matched to their events", "A first death comes back dying", "The six lane relics in play", "Loop gates, real-fight tests, report sweep" and "Card-upgrade path"; and, as open loop-only Items, "The authoring patterns from the kept set", "The band clocks", "The Breakwater's questline on the map", "T's quest line in the game", "The calibration set", "Upgrades proven on the Act 1 boss" and "Bands on the calibrated measure". The build plan and `plan/ARCHIVE.md` keep the record. **Folded** the open loop rows into the `Waits on` of the T act each unblocks: CH1f under the Nov 9 mid-MVP check; HP4f and HP4g under the Nov 19 hazard swap plot; QL1d under the Nov 10 quest-line write; QL1f under the Nov 13 quest-line play; HP2d under the Nov 28 calibration solves; UP1h under the Dec 14 W4 demo; HP2f under the Nov 30 W3 demo. **Removed** the Unscheduled line for DL2b when the phase shipped. **Edited** the Items prose, the MVP schedule prose and the reminder paragraph. No `T`, attended, owner-led or `needs plot` Item changed its date; Status cells are derived. The lint now fails a loop row in an Item's `Rows`.
- **2026-10-28** — **every day before the MVP gets a piece of T's own; DL2 plotted** (T, in conversation: "yes, but make sure each item is something I need to do, not just running an agent against a phase row. (For instance, what do I need to plot, pitch, or decide on)"; "Realistically every item in deadline should be this way"; "Yes" to plotting it; and "I also want to add that I want to switch some combat backgrounds and the title screen from here [T's art dossier] ... I just need to decide"). **Added** Items and MVP-schedule pieces on the six empty days: author the first character (Oct 29, CH1e, split out of "First character playable"), settle the event-node pitch (Nov 5), pick the title plate and four arena backgrounds (Nov 7, TP1b) and plot their swap (Nov 7, `needs plot`), the Defender check (Nov 12, DF1f), play the quest line (Nov 13), and the pre-run triage (Nov 14). **Moved** TP1b and DF1f from Unscheduled to those Items. **Added** DL2a and DL2b under Unscheduled; DL2b converts this table so every Item is T's act. W1's hours 6.5 to 7.5, W2's 12 to 15.5. Nothing ticked.
- **2026-10-28** — **Chapter 1's questline: T answered the plot's notes** (a spare in each pocket: one extra hazard, fight and fight-or-elite behind the three markers, re-pointing existing nodes; old saves are abandoned for a new run; the Nov 8 date keeps; the death rule is plot DY1, merged). **Edited** the Unscheduled line for QL1g (it follows DY1b; its `[blocked]` marker is gone, as DY1's rows are on `main`) and the W2 note. No date moved, nothing ticked.
- **2026-10-28** — **two open plot PRs stop conflicting** (T, in conversation: "whenever we have two plot/plan PRs open, once I merge one, the other always ends up with a conflict"; `/plot anytime`, run unattended). **Added** Unscheduled lines for MD1a, MD1b and MD1c (T folded MD1c in on the PR): T set no date, the work is a merge driver for this file and a `pr-resolve` step, and it blocks no window's goal. **Edited** no Item: none has a premise this changes.
- **2026-10-28** — **Chapter 1's questline: T answered the plot's four open items** (the next quest node locked until the step is met; every node may move, so each step's supply sits behind its own marker; the bridge by routing, with sealed roads only if routing could not, and a fled fight does not complete its node; a lost boss fight can be fought again, relying on T's death rule, plotted separately). **Edited** the Nov 8 Item's name (no more sealed roads: locks, pockets and the fled-fight rule). **Added** an Unscheduled line for QL1g (`[blocked]` on the death rule's plot, no date). No date moved (QL1b is now sized L; the dates are still the plot's, for T to move), nothing ticked.
- **2026-10-27** — **Chapter 1's questline re-shaped** (T's answers to the plot's six calls: steps 1-3 turned in at the next quest node, step 4 the boss, the bridge unreachable by map routing, no runtime shortfall fallback). **Edited** the Nov 8 Item (three turn-ins, the boss as the fourth step, the sealed roads) and the Nov 10 Item (lines per node). No date moved, nothing ticked.
- **2026-10-27** — **Chapter 1's questline plotted** (T, `/plot asap` run unattended on T's word: one questline in Chapter 1 on a ninth node kind, `quest`, D111; LR1f and its PR #987 dropped). **Added** Items for QL1a-QL1d (the questline on the map, Nov 8), QL1e (T writes the quest line, Nov 10, split out of the Nov 10 `T` Item, which keeps the node copy at 1 h) and QL1f (T's lines in the game, Nov 13); the loop dates are the plot's, before the Nov 9 mid-MVP check and the Nov 16 MVP, and T can move them. **Edited** the event-node pitch (Nov 4) and plot (Nov 6) Items, the milestones, the W2 notes and the schedule from eight kinds to nine; the Nov 13 lane-relics Item drops the Act 1 quests and LR1f (skipped, superseded by QL1); the Nov 25 Item names the four quest relics left for Chapters 2-4 instead of LR1f's `[content]` rows. **Ticked** nothing by hand; `--write` ticked the Nov 13 lane-relics Item, since every row it still names has shipped.
- **2026-10-28** — **the death rule plotted** (T's rule, `/plot` run unattended on T's word, DY1). **Added** the Item "A first death comes back dying", due 2026-11-08 in W2, naming DY1a-DY1d: loop work for the MVP, dated with the Chapter 1 questline rows it serves (the boss re-fight); the date is the plot's, not T's, so move it freely. **Edited** nothing else: the MVP demo and the mid-MVP check still hold, and no open Item's premise changed. **Ticked** nothing. Same day, T answered four calls: the Item's name now says how dying is shown (a full-screen moment and a skull) and that a rest's heal clears it, and it gains DY1d (the skull).
- **2026-10-27** — **Thursdays opened** (T, in conversation: "open them up. I should be getting work done for Miserere everyday"). **Edited** the MVP schedule's rule that left Thursdays free; it now says T works every day. No Item, date or piece moved; nothing ticked.
- **2026-10-27** — **first character moved to Fri Oct 30** (T, in conversation: "Let's move character creation deadline to Friday since it turned out to be more work than I thought"). **Moved** the Item "First character playable" from 2026-10-26 to 2026-10-30, still in W1; its rows (CH1a-CH1f, DF1a-DF1d) and premise hold. Nothing ticked; no other date moved.
- **2026-10-26** — **the third lane plotted** (T in session, `/plot` of the Defender trial set after its verdicts, sims and revisions). **Edited** the Item "First character playable": its premise moved from "waits on a third lane" to the Defender, and it now names DF1a-DF1d, the rows that register the lane CH1e and CH1f were blocked on; its date (T's) is unchanged. **Added** Unscheduled lines for DF1e (the relics, waits on LR1d) and DF1f (T's check). **Ticked** nothing.
- **2026-10-26** — **reward pool narrowed to worn relics** (T in session, plot amend run unattended on RW1a and LR1a, D107). **Edited** the Nov 13 lane-relics Item's name ("Unlocks line" is now "Lane line"); its rows, date and premise hold (the six relics still ship and still feed rewards, now only while worn). **Added** nothing, **ticked** nothing; no date moved.
- **2026-10-26** — **first character dated** (T on the CH1 plot PR, call 8). **Added** the Item "First character playable", due 2026-10-26 in W1, naming CH1a-CH1f; **removed** their six Unscheduled lines. T wants the first character playable by end of day and knows the date is tight: RW1a and the CH1 chain must ship, and CH1e/CH1f wait on a third lane T has not plotted. **Ticked** nothing.
- **2026-10-26** — **character selection plotted** (T in session, `/plot asap` from the pitch, run unattended). **Added** Unscheduled lines for CH1a-CH1f: T targets one character for the Nov 16 MVP and three for a December milestone T is formalising, but no Item covers characters, the MVP milestone does not name them, and CH1e-CH1f are blocked on a third lane T has not plotted; a Nov 16 Item is call #8 on the plot PR. **Edited** no Item: the MVP and W2 relic Items keep their premise (CH1 changes how the pool opens, not whether the six relics ship). **Ticked** nothing; no date moved.
- **2026-10-26** — **no caps, and colour is payment only** (T, attended, `/plot`). **Added** Unscheduled lines for NC1 and CL1: T set no date and neither blocks a window's goal. **Edited** no Item: the MVP Items keep their premise (NC1 changes card numbers, not what ships; CL1 changes how ballots are pitched). **Ticked** nothing.
- **2026-10-26** — **each region is a chapter; the MVP is Chapter 1** (T, in conversation: "All 4 regions combined is Act 1 and the deadline is the end of the year. Act 1 Chapter 1 completed is the mid November deadline. Each region is: Act x Chapter y (With the caveat that later acts may revisit certain regions if the story requires it)"; T confirmed the order and scope: "Yes that's all correct"). **Added** D106 (amends D23, D27, D28). **Edited** the milestones, the windows and the MVP schedule: the MVP is Act 1, Chapter 1 complete (the Breakwater), with Chapter 1's enemy art; v0.3 is all four chapters, with Chapters 2-4's enemies and art. **Edited** Items: enemy sessions 1 and 2 narrowed to Chapter 1 (1.5 h and 2 h to 1 h each); the watchtower is Chapter 1's boss (T: "Chapter 1 boss"), and the Act Boss sits at the end of Chapter 4 (T: "Yes, end of Ch4"), designed in session 4, the B2 plot to Chapter 1's enemies and art brief, the event-node pitch and plot to the Breakwater's eight kinds (all of Act 1's; 1.5 h to 1 h), the mid-MVP check to Chapter 1, the MVP demo to a Breakwater run (2 h to 1.5 h). **Merged** the walk's `[content]` rows (Nov 7) into the quest-line piece (Nov 10, now Chapter 1's rows and the Breakwater's line, 1.5 h). **Added** `T` Items: Chapter 1's enemy art (Nov 8, 2 h), enemy sessions 3 and 4 for Chapters 2-4 (Nov 21 and 22, 2 h each), Chapters 2-4's quest lines (Nov 25, 1 h), Chapters 2-4's art (Dec 13, 2 h), and a `needs plot` Item for Chapters 2-4's enemies (Nov 23). **Moved** HP2e from Nov 21 to Nov 28 and HP2f, which follows it, from Nov 24 to Nov 30, the cost-card session from Nov 22 to Dec 6 (W3 to W4), and R12 from Nov 24/28 to Dec 8/12 (W3 to W4). **Ticked** the Oct 26 merge piece (#922 merged). Windows' dates unchanged; v0.3 still tags Dec 28.
- **2026-10-26** — **the Breakwater node map** (T, in conversation: "I also need to map out all the nodes for act 1 (roughly)" and "Breakwater is Act 1"). **Added** `plan/revamp/breakwater-map.md`, a draft of every Breakwater node, its kind and links, and its gaps, read from the tree, and a `T` Item on 2026-11-03 to review it before the event-node pitch (1 h). No other Item changed: whether Act 1 is the Breakwater alone or all four maps is still to be ruled. Nothing ticked; no date moved.
>- **2026-10-26** — **set bonuses plotted** (T in session, plot run unattended, `/plot`). **Added** an Unscheduled line for SB1 (attended design session): T said it "doesn't need to be part of the Act 1 MVP deadline" and set no date. **Edited** no Item: the MVP Items keep their premise (SB1 builds nothing), and W4's "Relic pass session" (B1) keeps its scope (the starting ring, stat-only relics); D100's five-relic row, which EQ2 had left to B1, moves to SB1 and was never in that Item. **Ticked** nothing.
- **2026-10-26** — **elite respawn plotted** (T in session, plot run unattended, `/plot`). **Added** an Unscheduled line for ER1: T set no date, and the row blocks no window's goal. No Item edited: the MVP and W2 relic Items keep their premise (ER1 changes how often the elite's relic can roll, not whether the six relics ship).
- **2026-10-26** — **the MVP milestone, Nov 16** (T, in conversation: "I think we could get all this done by Nov 16 if we push hard enough"; T committed to 5-8 attended hours a week; plan edit run for T, merged by T). **Added** the MVP to the milestones: a full Act 1 run on the phone with the real Act 1 enemies, T's six lane relics, actual item icons and the event-node UI/UX. **Added** the "MVP schedule" table and a `T` row for each human piece from Oct 26 to Nov 15, one to two hours each, weekday evenings and weekend sessions. **Moved** the enemy revamp (B2) from Dec 2 to Nov 2 (now "Plot the enemy revamp from the two sessions", with two session rows before it), split HP4e into two sittings (Oct 30 and Nov 1; HP4e's Item moved from Nov 2 to Nov 1), re-dated hazard routing from Nov 4 to Nov 3, and moved the Act 1 walk Item (AW1a, AW1b) from W3 Nov 17 to W2 Nov 5. **Added** Items for the item icons (IT1b, Oct 27), the event-node pitch (`T`, Nov 4) and plot (`needs plot`, Nov 6; it was listed as after v0.3), the lane relics (RW1a, LR1a, LR1c-LR1f, Nov 13) and four `T` pieces (the walk's `[content]` answers, a mid-MVP check, the quest lines, the plan merge); **removed** their Unscheduled lines. LR1g stays Unscheduled (signature tracking, not needed for the run). **Moved after the MVP** (W3), since the MVP is a run, not a tuned run: HP2d-HP2f (Nov 7-13 to Nov 18-24), the hazard swap plot (Nov 13 to Nov 19), the cost-card session (Nov 12 to Nov 22), UP1h (Dec 12 to Nov 25) and R12 (Dec 11 to Nov 28, with a 1 h questions piece on Nov 24). **Moved** B1's rest-of-pass session from Dec 16 (W5) to Dec 5 (W4). **Renamed** W1, W2, W3, W4 and W5 to their new goals; the W2 demo is now the MVP demo. Windows' dates unchanged; v0.3 still tags Dec 28. Nothing ticked.
- **2026-10-25** — **lane relics re-plotted on T's relics** (T authored them in session; plot update run unattended on #922). **Removed** LR1b's Unscheduled line (done in session). **Edited** LR1d's and LR1e's Unscheduled lines to their new scope and **added** lines for LR1f (the quests, was LR1e) and LR1g (signature tracking): T set no date. **Edited** the W5 Item "Relic pass session" (B1) and the W5 notes: the six lane relics and their signatures are now LR1's, so B1 keeps the starting ring and stat-only relics. Nothing ticked (LR1b is a build-plan row, not an Item); no date moved.
- **2026-10-25** — **lane relics plotted** (T in session, plot run unattended, `/plot`, slotted after SG1 and BC1). **Added** Unscheduled lines for LR1a-LR1e: T set no date, and LR1b is attended, so its date is T's to pick. **Edited** the W5 Item "Relic pass session" (B1) and the W5 notes: its premise narrowed, since the five lane relics and their sources are now LR1's; B1 keeps the starting ring, the signatures and the rest of the pass. **Ticked** nothing.
- **2026-10-25** — **the equipment slots plotted** (T in session, plot run unattended, `/plot`). **Added** Unscheduled lines for EQ2a-EQ2b: T set no date, and the rows block no window's goal. **Edited** no Item: W5's "Relic pass session" (B1) keeps its premise; EQ2 settles only how many relics are worn (three, D105) and leaves the relic set, signatures and D100's five-relic row to B1. **Ticked** nothing.
>- **2026-10-25** — **the signature trigger re-plotted** (T in session after #921 merged, plot rework run unattended). **Edited** SG1's Unscheduled line to the new scope (no starting ring, every relic grant worn, unworn relics flagged); T set no date. **Edited** no Item: W5's "Relic pass session" (B1) still holds and gains the ring as an unsourced relic for T's later lane; W4's enemy revamp (B2) no longer meets a befriendable Float-Eye, since that call is cut. Nothing ticked; no date moved.
- **2026-10-25** — **the signature trigger plotted** (T in session, plot run unattended, `/plot asap`). **Added** an Unscheduled line for SG1: T set no date, and the fix blocks no window's goal. **Edited** no Item: the W4 "Enemy revamp session and the Act Boss" (B2) still holds, since SG1 only gives Float-Eye befriend terms and the revamp may redo the roster; the W5 "Relic pass session" (B1) still holds, since SG1 authors no relic. Nothing ticked; no date moved.
- **2026-10-25** — **the board cues plotted** (T in conversation, plot run unattended, `/plot`). **Added** an Unscheduled line for BC1: T set no date and board legibility blocks no window's goal. **Edited** no Item: no open Item's premise rests on the self-burn, BLIZZARD or dead-tray cues. Nothing ticked; no date moved.
- **2026-10-25** — **the reward rule plotted** (T, in conversation, `/plot` run unattended). **Added** Unscheduled lines for RW1a-RW1b: T set no date, and the rows block no window's goal. **Edited** no Item: the W5 "Relic pass session" (B1) still holds, since RW1 makes lane relics work but authors none, and the W3 four-region walk already covers the loot cache. Nothing ticked; no date moved.
- **2026-10-25** — **fewer taps plotted** (T, `/plot`, run unattended by a workflow). **Added** an Unscheduled line for TQ1: T set no date, and it blocks no window's goal. **Edited** no Item: the W3 "Event-node audit and fixes (all twelve kinds)" Item still holds, since TQ1 changes the spoils pick and the map's node panel, not whether each node kind resolves (T cut its rest, cache and anvil changes the same day). Nothing ticked; no date moved.
- **2026-10-25** — **the Act 1 walk plotted** (T asked "plot them all, one plot run, one PR"; `/plot` run
  unattended, anytime). **Edited** the W3 Item "Event-node audit and fixes (all twelve kinds)": its `needs plot` is
  now AW1a, AW1b, and its name says the fixes split, code in AW1a and copy or map fixes to T as `[content]` rows
  (D88). The W3 section's "to plot" line now names the plot. The W3 demo Item and the W5 "Playtester walk of all
  four regions" Item still hold (a scripted walk that skips fights is not T's walk nor a playtester's), so neither
  changed. Nothing ticked; no date moved.
- **2026-10-25** — **the playtest harness plotted** (`/plot` run unattended for T, asap). **Added** Unscheduled lines for PH1a-PH1c: T set no date, and the rows are tooling that the attended playtester passes lean on rather than work that finishes an Item. **Edited** no Item: the W5 "Playtester walk of all four regions" and the W3 event-node audit still need their own plots (the walk is still to be done; PH1 only gives it one browser per agent). Nothing ticked; no date moved.
- **2026-10-25** — **the board glossary plotted** (T, conversation, `/plot`, unattended run). **Added** an Unscheduled line for GL1: T set no date, and the row blocks no window's goal (it serves the board, not a window demo). **Edited** no Item: no open Item's premise depends on the board's glossary. Nothing ticked; no date moved.
- **2026-10-25** — **the Elementalist measured truth plotted** (T in conversation, `/plot` run unattended: "plot them all ... one plot run, one PR"). **Added** an Unscheduled line for EM1: T set no date, and it blocks no window's goal. **Edited** no Item: the W4 "Combat playtest (winnable and dangerous)" Item (R12) keeps its premise, since EM1 adds columns to the report R12 reads and decides no policy. Nothing ticked; no date moved.
- **2026-10-24** — **the Elementalist swarm `/messy`** (T, attended session). **Edited** the W2 Item "Act 1 puzzle set, live hazard routing and the cuts": T ruled the Act 1 set is not authored now; each of the seven Act 1 hazard nodes (Breakwater 2, Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2) draws a random puzzle from the thirty, and the routing plus the cuts are what W2 plots (still `needs plot`). **Added** a `T` Item for 2026-11-13: plot the swap to a hand-picked seven after playing the thirty in `/dev`. Nothing ticked; no date moved; candidates only, no rows.
- **2026-10-24** — **the Spell law plotted** (T, attended session, `/plot asap`). **Added** an Unscheduled line for SP1: no date set, and it blocks no window's goal. **Edited** no Item. Nothing ticked; no date moved.
- **2026-10-24** — **the Elementalist trial set plotted** (T, attended session, `/plot asap`). **Added** Unscheduled lines for EL1a-EL1d: T set no date; card lanes are v0.3 stretch (B5, B6) and block no window's goal. **Edited** no Item. Nothing ticked; no date moved.
- **2026-10-24** — **relic loadout fix plotted** (T, attended session, `/plot`). **Added** Unscheduled lines for EQ1a-EQ1b: T set no date, and the rows fix a live defect rather than serve one window's goal. **Edited** no Item: the W5 relic pass (B1) is owner-led and its premise does not depend on how worn state is shown. Nothing ticked; no date moved.
- **2026-10-24** — **ballot colours plotted** (T, attended session, `/plot`). **Added** an Unscheduled line for BV3: no date set, and it blocks no window's goal. **Edited** no Item. Nothing ticked; no date moved.
- **2026-10-23** — **ballot Save plotted** (T, attended session, `/plot asap`). **Added** Unscheduled lines for BV2a-BV2b: T set no date, and the rows block no window's goal. **Edited** no Item. Nothing ticked; no date moved.
- **2026-10-23** — **ballots on the phone plotted** (T, attended session, `/plot asap`). **Added** Unscheduled lines for BV1a-BV1c: T set no date, and the rows block no window's goal (card lanes are v0.3 stretch). **Edited** no Item: no open Item's premise depends on the ballot site. BE2a moved up the build plan's Status block (BV1a requires it); its Unscheduled line stands. Nothing ticked; no date moved.
- **2026-10-22** — **iPhone beta builds plotted** (T, attended session, `/plot`). **Added** Unscheduled lines for IO1a-IO1d: T set no date, and the rows block no window's goal. **Edited** no Item: none in the open windows rests on iOS builds. **Ticked** nothing.
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
