# Live deadlines — the next two weeks

> Generated 2026-11-10 by `node scripts/deadlines.mjs --write` from `plan/deadlines.md` (the whole plan) and the
> build plan. Do not edit by hand: change `plan/deadlines.md`. Lists only what needs T: an item with no
> build-plan rows yet ("needs a plot"), a task or attended row ready for T ("needs you"), or an attended row
> whose prerequisites are not shipped ("waiting on the loop"). A T act lists the loop rows it waits on.

| Due | Item | What it needs | Window |
|---|---|---|---|
| 2026-11-07 (3 days overdue) | Merge PR #1409, the six Breakwater enemy frame sets, so the recast's art chunk can wire them. `main`'s verify-mobile is red until spec 157's EN3c lands, and every open PR is gated behind it (0.1 h) | needs you: your task | W2 |
| 2026-11-08 (2 days overdue) | Event kind 6, travel ("move to X?", secret paths): pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (1 h) | needs a plot: no build-plan rows yet | W2 |
| 2026-11-08 (2 days overdue) | Find two travel images: Chapter 1 to Chapter 2, and the Chapter 1 cave shortcut (0.5 h) | needs you: your task | W2 |
| 2026-11-08 (2 days overdue) | Fix the title and combat image cut with a light fog blur (1 h). The combat half was picked on 2026-11-08 (a fog gradient over the plate's foot, never covering the foe) and plotted as TU1a; the title screen's half is still open | needs you: your task | W2 |
| 2026-11-09 (1 day overdue) | Live hazard routing for the other five Act 1 hazard nodes (Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2; each draws a random puzzle from the thirty; the Breakwater's six are HP6) and the cuts (plot, 1 h) | needs a plot: no build-plan rows yet | W2 |
| 2026-11-09 (1 day overdue) | Event kind 7, loot cache: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (0.5 h) | needs a plot: no build-plan rows yet | W2 |
| 2026-11-09 (1 day overdue) | Event kind 8, cutscene: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it (0.5 h) | needs a plot: no build-plan rows yet | W2 |
| 2026-11-09 (1 day overdue) | Plot cloud container enhancements, and settle the path forward for claims and cloud containers (1 h). Three live problems: a background worker cannot post PR screenshots at all (release upload is refused for its session type, the browser route needs a browser it has no access to, and only CI can upload today); `pr-autofix` fires on a branch a live session holds a claim on, so two agents push the same branch; and a claim that has lapsed or was never taken reads the same as an abandoned branch, which made a worker treat a live PR as dead | needs a plot: no build-plan rows yet | W2 |
| 2026-11-10 (today) | The quest screen: pitch its UI/UX rework (layout, NPC art, transitions, copy, working end to end), settle it and plot it. ET1d settled the giver scene, but the screen itself was never reworked (T, 2026-11-07), so the Nov 11 review has nothing reworked to read until this lands (0.5 h) | needs a plot: no build-plan rows yet | W2 |
| 2026-11-10 (today) | Answer Chapter 1's `[content]` rows (node copy, map fixes) (1 h) | needs you: your task | W2 |
| 2026-11-10 (today) | Write Chapter 1's quest chain lines: quest names and asks, giver and turn-in lines, the four refusal lines, gate reasons, every step's XP and reward (0.5 h) | needs you: BW1d ready for you | W2 |
| 2026-11-10 (today) | Review the reworked encounter (combat start), hazard (hazard start) and rest screens against their settled pitches (1.5 h) | needs you: your task | W2 |
| 2026-11-11 (tomorrow) | Review the held loop-doctrine candidates (R11 watch ends, 1 h) | needs you: your task | W2 |
| 2026-11-11 (tomorrow) | Review the reworked quest screen (with NPC art), village screen (rest, shop, Anvil, with NPCs) and card upgrade screen (the string of beads) (1.5 h) | needs you: your task; the loop still owes VL1b, VL1d, VL1e, UP1i, UP1j | W2 |
| 2026-11-12 (in 2 days) | Review the reworked travel, loot cache and cutscene screens (1.5 h) | needs you: your task | W2 |
| 2026-11-13 (in 3 days) | Buffer: fixes from the event-screen reviews (1 h) | needs you: your task | W2 |
| 2026-11-14 (in 4 days) | Mid-MVP check: Chapter 1 on the preview build, file what broke (1 h) | needs you: your task | W2 |
| 2026-11-14 (in 4 days) | Decide the stat scaling: whether +20% per stat point (one-shot) and +10% (repeating) runs too high, after playing the first character (0.5 h) | needs you: your task | W2 |
| 2026-11-14 (in 4 days) | Play your quest line on the preview build and rule on its lines (0.5 h) | needs you: your task; the loop still owes BW1e | W2 |
| 2026-11-15 (in 5 days) | File what is still broken (`/plot` or `/messy`) and decide what the MVP run must show (1 h) | needs you: your task | W2 |
| 2026-11-16 (in 6 days) | MVP demo: Act 1, Chapter 1 complete, a full Breakwater run on the phone with puzzle hazards, Chapter 1's enemies and art, lane relics, icons, new event UI (1.5 h, Sun Nov 15) | needs you: your task | W2 |
| 2026-11-17 (in 7 days) | Re-tune Chapter 1's enemies against the recast roster: levels (all under 10), how often each normal repeats, VITAE. Your Nov 1 tuning pass was against the old seventeen; the recast leaves five named normals (Saltwick Swarm became an elite, spec 162) over fourteen fight nodes at a repeat ceiling of three, and regenerates `docs/reports/chapter1-enemies.md`. Look at the level 5 Coralback at `bw-t6`: the sim has it beating the grey deck 11% of the time, costing 14% VITAE (it took the Swarm's fight in spec 162). Also check the player reaches the level 8 Saint at level 8-10 (1 h) | needs you: your task | W3 |
| 2026-11-17 (in 7 days) | Plot how a foe's attack is shown on screen: hide all the UI except the animated foe, make the screen look like a card, and put the effect's text on it | needs a plot: no build-plan rows yet | W3 |
| 2026-11-18 (in 8 days) | Design Chapters 2-4's maps before enemy session 3, as the Breakwater's was before session 1: each chapter's node list (total and count per kind), its quest route and travel pairs, and room on its plate for the marks (1.5 h) | needs you: your task | W3 |
| 2026-11-19 (in 9 days) | Plot the hazard swap: hand-pick the five other Act 1 hazard puzzles (Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2), and swap any of HP6's Breakwater six you want, after playing the thirty in `/dev` (1 h) | needs you: your task | W3 |
| 2026-11-19 (in 9 days) | Plot Chapters 2-4's maps from the design (0.5 h) | needs a plot: no build-plan rows yet | W3 |
| 2026-11-21 (in 11 days) | Enemy session 3: Chapters 2-4's normal rosters and elites (2 h) | needs you: your task | W3 |
| 2026-11-22 (in 12 days) | Enemy session 4: Chapters 2-4's bosses and the Act Boss, at the end of Chapter 4 (2 h) | needs you: your task | W3 |
| 2026-11-23 (in 13 days) | Plot Chapters 2-4's enemies and their art brief (1 h) | needs a plot: no build-plan rows yet | W3 |
| 2026-11-24 (in 14 days) | Pitch Chapters 2-4's weapons and armor, after the enemy sessions: how many of each, what each does, where each drops, and settle them (1 h) | needs you: your task | W3 |
