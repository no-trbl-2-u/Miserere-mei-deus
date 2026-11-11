# Deadlines — Act 1, Chapter 1 on Nov 30; Act 1 on Dec 26

> Replanned by T in an attended session, 2026-11-10. The plan before it is in git history (`git log -- plan/deadlines.md`).
> It put a date on every act and booked 28.6 hours into two weeks against a stated 5-8 hours a week, so the dates
> could not hold and done work read as overdue. This plan has two dates and one queue.

## The milestones

- **Mon 2026-11-30 — Act 1, Chapter 1 released** (moved from Nov 17 by T, 2026-11-10: "Keep scope, move date"). A full Breakwater run on the phone: Chapter 1's enemies and their art,
  the six lane relics, item icons, the questline, and all eight event screens in their full treatment (encounter,
  hazard, rest, quest, village, travel, loot cache, cutscene; T, 2026-11-10: "All eight screens"). **When Chapter 1
  is complete, the version is set to v0.9.0**, the last minor before v1 (T, 2026-11-06). That is the only version
  this plan names.
- **Sat 2026-12-26 — Act 1 released.** All four chapters complete and playable on a phone, ending at the Act Boss.

## How it works

- **Two dates, one queue.** An act has no date of its own. Its `Due` cell holds the date of the milestone it serves
  (the last day of its window; the lint fails any other date, since each distinct date is forecast as a milestone),
  and its place in the Items table is its priority: T works the table top to bottom.
- **Every Item is a T act** (plot, pitch, decide, pick, author, play, review, merge, tag), with its hours in its name
  as `(N h)`. Loop rows are not listed here: the build plan (`plan/README.md`) orders them. A loop row an act needs
  goes in that act's `Waits on` cell.
- **The budget is stated once**, under `## Budget`. `node scripts/deadlines.mjs` reads it and says, for each
  milestone, whether the hours queued up to it fit the hours T has before it, and the day the queue reaches it at this
  pace. A milestone that does not fit is reported, never hidden: T cuts scope, moves the date or adds hours.
- **The reminder shows only this week.** It lists the acts T can do now, in order, until the week's hours are spent.
  Acts that wait on the loop are counted, with the rows owed.
- **Status.** An Item whose `Rows` names build-plan rows is ticked by `node scripts/deadlines.mjs --write` when they
  ship. A `T` or `needs plot` Item is ticked by hand. Spec 169 (DL3a) adds the lint that catches an open Item naming a
  merged pull request.
- **To reorder, move the row.** To move an act to the other milestone, change its `Due` and `Window` cells. Nov 30's
  acts sit above Dec 26's. When two plots add acts at the same spot, the merge keeps them grouped by milestone and
  in the order it met them; move a row afterwards if its place matters.

## Windows

| Window | Dates | Milestone |
|---|---|---|
| W1 | Nov 10 - Nov 30 | Act 1, Chapter 1 released |
| W2 | Dec 1 - Dec 26 | Act 1 released |

## Budget

Hours a week: 10

T, 2026-11-10: "10 as an average", between about 16 hours in the week to Nov 17 and the 5 to 8 hours a week stated before. Change the number and the forecast follows.

## Items

| Status | Due | Item | Goal | How AI helps | Window | Rows | Waits on |
|---|---|---|---|---|---|---|---|
| [ ] | 2026-11-30 | Write Chapter 1's quest chain lines: quest names and asks, giver and turn-in lines, the four refusal lines, gate reasons, every step's XP and reward (0.5 h) | The Breakwater's questline | Claude drafts giver lines in the game's voice; you pick and rewrite | W1 | BW1d | BW1a, BW1b |
| [x] | 2026-11-30 | The quest screen: pitch its UI/UX rework (layout, NPC art, transitions, copy, working end to end), settle it and plot it. ET1d settled the giver scene, but the screen itself was never reworked (T, 2026-11-07), so its review has nothing reworked to read until this lands; settled on Nov 10 (S-03g, the quest card) and plotted as QS1a, QS1b, QS1c (0.5 h) | Event-node UX | Have Claude propose designs, then `/plot` | W1 | needs plot | - |
| [x] | 2026-11-30 | Event kind 6, travel ("move to X?", secret paths): pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (1 h) | Event-node UX | Have Claude propose designs, then `/plot` | W1 | T | NK1d |
| [x] | 2026-11-30 | Event kind 7, loot cache: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it; settled in the screens ballot on Nov 10 (S-04j, picture first, the reward hidden until taken) and plotted as LC1a, LC1b (0.5 h) | Event-node UX | Have Claude propose designs, then `/plot` | W1 | needs plot | - |
| [ ] | 2026-11-30 | Event kind 8, cutscene: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (0.5 h) | Event-node UX | Have Claude propose designs, then `/plot` | W1 | needs plot | - |
| [ ] | 2026-11-30 | Find the bridge travel image: Chapter 1 to Chapter 2 (the cave shortcut uses the Breakwater map, zoomed; T, 2026-11-11) (0.5 h) | Event-node UX | Claude can lay candidates beside the travel screen; you pick (art is yours, D88) | W1 | T | - |
| [ ] | 2026-11-30 | Fix the title and combat image cut with a light fog blur (1 h). The combat half was picked on 2026-11-08 (a fog gradient over the plate's foot, never covering the foe) and plotted as TU1a; the title screen's half is still open | Title screen and combat backgrounds | Have Claude propose three fog/blur options on both screens; you pick | W1 | T | - |
| [ ] | 2026-11-30 | Answer Chapter 1's `[content]` rows (node copy, map fixes) (1 h) | Event-node UX | Claude drafts copy options per row; you pick and rewrite | W1 | T | - |
| [ ] | 2026-11-30 | Review the reworked encounter (combat start), hazard (hazard start) and rest screens against their settled pitches (1.5 h) | Every event screen proper | Have Claude list each screen's gaps against its pitch; you rule | W1 | T | UK2e, UK2i |
| [ ] | 2026-11-30 | Review the reworked quest screen (with NPC art), village screen (rest, shop, Anvil, with NPCs) and card upgrade screen (the string of beads) (1.5 h) | Every event screen proper | Have Claude list each screen's gaps against its pitch; you rule | W1 | T | UK2f, VL1a, VL1b, VL1c, VL1d, VL1e, UP1i, UP1j, QS1a, QS1b, QS1c |
| [ ] | 2026-11-30 | Review the reworked travel, loot cache and cutscene screens (1.5 h) | Every event screen proper | Have Claude list each screen's gaps against its pitch; you rule | W1 | T | UK2d, UK2g, TV1a, TV1b, LC1a, LC1b |
| [ ] | 2026-11-30 | Buffer: fixes from the event-screen reviews (1 h) | Every event screen proper | Have Claude turn your review notes into fix rows | W1 | T | - |
| [ ] | 2026-11-30 | Mid-release check: Chapter 1 on the preview build, file what broke (1 h) | The MVP run | Claude turns your notes into `/plot` or `/messy` rows | W1 | T | CH1g, CH1f, CH1h, CH1i, CH1j, BW1c, NK1a, MU1, EN2a, EN2b, CD1a, CD1b, SM1a, SM1b, SM1c, SM1d, BUG1b, MC1a, MC1b, MC1c, CX1a, CX1b, SM2a, EQ3a, EQ3b, EQ3c, XP1a, SD1a, AN6a, AN6b, CP1a, XR1a, MR1a, MR1b, MR1c, MR1d, MR2a, MR2b, MR2c, MR2d, MR2e, TP1b, TP1c, AP1a, AP1b, AP1c, AP1d, AP1e, AP1f, AP1h, AP1i, MR3a, MR3b, MR4a, MR4b, TU1a, TU1b, TU1c, TU1d, TU1e, TU1f, GO1a, MV1a, MV1b, MV1c, MV1d, MV1e, MV1f |
| [ ] | 2026-11-30 | Decide the stat scaling: whether +20% per stat point (one-shot) and +10% (repeating) runs too high, after playing the first character (0.5 h) | Stat scaling (`Combat/stat-scaling.ts`) | Have Claude recommend tuning from a table of each lane's numbers | W1 | T | - |
| [ ] | 2026-11-30 | Play your quest line on the preview build and rule on its lines (0.5 h) | The Breakwater's questline | Claude turns your notes into fixes for BW1e | W1 | T | BW1e |
| [ ] | 2026-11-30 | File what is still broken (`/plot` or `/messy`) and decide what the release run must show (1 h) | The MVP run | Claude lists what the mid-MVP check filed and what has shipped since; you cut or keep | W1 | T | SM2b, SM2c, SM2d, SM2e, SM2f |
| [ ] | 2026-11-30 | Chapter 1 release check: Act 1, Chapter 1 complete, a full Breakwater run on the phone with puzzle hazards, Chapter 1's enemies and art, lane relics, icons, new event UI (1.5 h) | The MVP | Afterwards Claude reads the play log and lists what broke; `/messy` the dump | W1 | T | IT2b, ET1a, ET1b, ET1c, ET1d, HP6a, HP6b, HP6c, EQ3d, EQ3e, EQ3f, EQ3g, EQ3h, EQ3i, EQ3j, EQ3k, EQ4a, EQ4b, UK1a, UK1b, UK1c, UK1d, UK1e, UK1f, UX1a, UX1b, UX1c, UX1d, UX1e, UX1f, UK2a, UK2b, UK2c, UK2h, DR1a, DR1b, DR1c, DR1d, EN3a, EN3b, EN3c |
| [ ] | 2026-12-26 | Live hazard routing for the other five Act 1 hazard nodes (Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2; each draws a random puzzle from the thirty; the Breakwater's six are HP6) and the cuts (plot, 1 h) | Every hazard a puzzle | Have Claude plot it | W2 | needs plot | - |
| [ ] | 2026-12-26 | Plot cloud container enhancements, and settle the path forward for claims and cloud containers (1 h). Three live problems: a background worker cannot post PR screenshots at all (release upload is refused for its session type, the browser route needs a browser it has no access to, and only CI can upload today); `pr-autofix` fires on a branch a live session holds a claim on, so two agents push the same branch; and a claim that has lapsed or was never taken reads the same as an abandoned branch, which made a worker treat a live PR as dead | The loop runs itself | Have Claude lay out the options, then `/plot` | W2 | needs plot | - |
| [ ] | 2026-12-26 | Review the held loop-doctrine candidates (R11 watch ends, 1 h) | Loop health | Claude summarises each candidate's evidence since Oct 12 | W2 | T | - |
| [ ] | 2026-12-26 | Re-tune Chapter 1's enemies against the recast roster: levels (all under 10), how often each normal repeats, VITAE. Your Nov 1 tuning pass was against the old seventeen; the recast leaves five named normals (Saltwick Swarm became an elite, spec 162) over fourteen fight nodes at a repeat ceiling of three, and regenerates `docs/reports/chapter1-enemies.md`. Look at the level 5 Coralback at `bw-t6`: the sim has it beating the grey deck 11% of the time, costing 14% VITAE (it took the Swarm's fight in spec 162). Also check the player reaches the level 8 Saint at level 8-10 (1 h) | Chapter 1's real enemies | Claude re-runs the tuning table against the new roster and lists where a repeat reads thin; you set the numbers | W2 | T | MS1a, MS1b |
| [ ] | 2026-12-26 | Plot how a foe's attack is shown on screen: hide all the UI except the animated foe, make the screen look like a card, and put the effect's text on it | Chapters 2-4 designed; hazards tuned | `/plot` | W2 | needs plot | - |
| [ ] | 2026-12-26 | Design Chapters 2-4's maps before enemy session 3, as the Breakwater's was before session 1: each chapter's node list (total and count per kind), its quest route and travel pairs, and room on its plate for the marks (1.5 h) | Chapters 2-4 designed; hazards tuned | `/pitch` per chapter, on the Breakwater's 44-node pitch | W2 | T | - |
| [ ] | 2026-12-26 | Plot the hazard swap: hand-pick the five other Act 1 hazard puzzles (Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2), and swap any of HP6's Breakwater six you want, after playing the thirty in `/dev` (1 h) | Chapters 2-4 designed; hazards tuned | `/plot` | W2 | T | - |
| [ ] | 2026-12-26 | Plot Chapters 2-4's maps from the design (0.5 h) | Chapters 2-4 designed; hazards tuned | `/plot` | W2 | needs plot | - |
| [ ] | 2026-12-26 | Enemy session 3: Chapters 2-4's normal rosters and elites (2 h) | Chapters 2-4 designed; hazards tuned | - | W2 | T | - |
| [ ] | 2026-12-26 | Enemy session 4: Chapters 2-4's bosses and the Act Boss, at the end of Chapter 4 (2 h) | Chapters 2-4 designed; hazards tuned | - | W2 | T | - |
| [ ] | 2026-12-26 | Plot Chapters 2-4's enemies and their art brief (1 h) | Chapters 2-4 designed; hazards tuned | `/plot` | W2 | needs plot | - |
| [ ] | 2026-12-26 | Pitch Chapters 2-4's weapons and armor, after the enemy sessions: how many of each, what each does, where each drops, and settle them (1 h) | Chapters 2-4 designed; hazards tuned | `/pitch`, on Chapter 1's ten (spec 136) | W2 | T | - |
| [ ] | 2026-12-26 | Write Chapters 2-4's quest lines, on Chapter 1's chain (BW1): quests alternate a relic, then a weapon or armor (D114 as amended by EQ3h), and a relic quest pays any lane relic not already paid by Chapter 1 (1 h) | Chapters 2-4 designed; hazards tuned | - | W2 | T | - |
| [ ] | 2026-12-26 | Plot Chapters 2-4's weapons and armor from the pitch (0.5 h) | Chapters 2-4 designed; hazards tuned | `/plot` | W2 | needs plot | - |
| [ ] | 2026-12-26 | Demo: a four-chapter walk, every node resolves (2 h) | Chapters 2-4 designed; hazards tuned | - | W2 | T | - |
| [ ] | 2026-12-26 | Relic pass session (the rest of B1: the starting ring, stat-only relics; the six lane relics are LR1's, in the MVP) (2 h) | Relic pass, combat proven, an Act 1 clear | - | W2 | B1 | - |
| [ ] | 2026-12-26 | Cost-card design session: Toll, Debt, Overdrive (1.5 h) | Relic pass, combat proven, an Act 1 clear | - | W2 | T | - |
| [ ] | 2026-12-26 | Tune the cards: a numbers pass across the lanes against Chapter 1's new enemies, after the enemy tuning (1.5 h) | Relic pass, combat proven, an Act 1 clear | - | W2 | T | - |
| [ ] | 2026-12-26 | Combat playtest part 1: the questions the command asks (1 h) | Relic pass, combat proven, an Act 1 clear | - | W2 | T | - |
| [ ] | 2026-12-26 | Combat playtest part 2: winnable and dangerous (2 h) | Relic pass, combat proven, an Act 1 clear | - | W2 | R12 | - |
| [ ] | 2026-12-26 | Chapters 2-4's enemy art: pick from the loop's candidates (2 h) | Relic pass, combat proven, an Act 1 clear | - | W2 | T | - |
| [ ] | 2026-12-26 | Demo: an Act 1 clear ending at the Act Boss (2 h) | Relic pass, combat proven, an Act 1 clear | - | W2 | T | UP1h |
| [ ] | 2026-12-26 | Android smoke test on the preview APK (1 h) | Ship Act 1 | - | W2 | CK1d | LG1i |
| [ ] | 2026-12-26 | Playtester walk of all four chapters (plot, 1 h) | Ship Act 1 | `/plot` | W2 | needs plot | - |
| [ ] | 2026-12-26 | Build the Act 1 APK (1 h) | Ship Act 1 | - | W2 | T | - |

## Change log

- **2026-11-10** — **The loot cache plotted** (T's screens ballot verdict, S-04j). **Ticked** the act "Event kind 7, loot cache ... settle it and plot it" and named its plot, spec 174 (LC1a, LC1b: the choice stays blind, the outcome shows the goods or the one card taken). **Added** LC1a and LC1b to the `Waits on` of the act "Review the reworked travel, loot cache and cutscene screens".
- **2026-11-10** — **the quest screen plotted as spec 173** (T's screens ballot verdict: "S-03 Quest: KEEP S-03g (The quest card) | note: Get rid of "A Quest" and Step 4 of 4"). **Ticked** the quest screen's pitch-and-plot Item, now plotted as QS1a, QS1b, QS1c. **Added** QS1a, QS1b, QS1c to the `Waits on` of the review of the reworked quest, village and card upgrade screens.
- **2026-11-11** — **Travel's cave picture answered** (T on PR #1585: "the image should just be the map with the cave as the focal point, wherever they're entering ... Zoom in a bit"). **Edited** "Find two travel images" to "Find the bridge travel image": the cave shortcut's picture is now a zoomed crop of the coast map plate, built in TV1a, so only the bridge image is T's to find. Hours kept at 0.5 h (not re-estimated).
- **2026-11-10** — **Travel settled and plotted** (T's screens ballot verdict, S-01b with T's note: only the question, the scene line, MOVE and STAY). **Ticked** the travel "settle it and plot it" act (its Rows now `T`; NK1d stays in its Waits on). **Added** spec 171's TV1a and TV1b to the `Waits on` of the act that reviews the reworked travel, loot cache and cutscene screens. TV1b also waits on T's act "Find two travel images" (Held on the roadmap until Nov 30).
- **2026-11-10** — **Chapter 1 moved to Nov 30, the budget set to 10 hours a week, and two loop specs plotted** (T, attended, after a gap audit of the Breakwater and a first playtest: about 100 placeholder strings, stand-in art, four screens with no settled treatment, and combat a new player cannot read; T: "Keep scope, move date", "10 as an average", Dec 26 kept for now). **Moved** the 17 Chapter 1 acts and window W1 to 2026-11-30; W2 now starts Dec 1. **Set** `Hours a week: 10`. **Plotted** spec 170 (MS1a, MS1b: Chapter 1's unmeasured numbers) and two rows into spec 169 (DL3b, DL3c: Held rows join the queue by themselves; an act may carry a proof). **Added** MS1a and MS1b to the `Waits on` of the enemy re-tune act. Not yet in the queue: the audit's writing, art and combat findings, which wait on T's voice work and on the screenshots of every screen.
- **2026-11-10** — **the deadline plan cleared and replanned as a queue** (T, attended, after a delivery audit of the repo's raw records). **Removed** every dated Item, the five windows, the pace section, the `## Unscheduled` list and the earlier change log; git history keeps them. **Set** two milestones: Act 1, Chapter 1 on Nov 17 with all eight event screens, and Act 1 on Dec 26. **Carried over** the 42 open acts in priority order, 17 to Nov 17 and 25 to Dec 26. Three acts that were dated before the old MVP moved to Dec 26 because they are not Chapter 1 content: hazard routing for the other chapters' nodes, the cloud container plot, and the loop-doctrine review. **Ticked** the Nov 7 "Merge PR #1409" Item before the clear (merged 2026-11-07T00:36Z). **Plotted** spec 169 (DL3a).
