# Live deadlines — the queue

> Generated 2026-11-11 by `node scripts/deadlines.mjs --write` from `plan/deadlines.md` (the whole plan) and the
> build plan. Do not edit by hand: change `plan/deadlines.md`. An act has no date of its own: it serves a
> milestone, and the queue's order is its priority. The forecast assumes 10 h a week.

## Milestones

- **2026-11-30** — Mon, Nov 30 (in 19 days): 13 acts open (13 h), 13 h queued up to it, 27.1 h available: fits, with 14.1 h to spare.
- **2026-12-26** — Sat, Dec 26 (in 45 days): 25 acts open (31.5 h), 44.5 h queued up to it, 64.3 h available: fits, with 19.8 h to spare.

## This week (10 h)

| # | Act | Hours | What it needs |
|---|---|---|---|
| 1 | Write Chapter 1's quest chain lines: quest names and asks, giver and turn-in lines, the four refusal lines, gate reasons, every step's XP and reward (0.5 h) | 0.5 | needs you: BW1d ready for you |
| 2 | Find the bridge travel image: Chapter 1 to Chapter 2 (the cave shortcut uses the Breakwater map, zoomed; T, 2026-11-11) (0.5 h) | 0.5 | needs you: your task |
| 3 | Fix the title and combat image cut with a light fog blur (1 h). The combat half was picked on 2026-11-08 (a fog gradient over the plate's foot, never covering the foe) and plotted as TU1a; the title screen's half is still open | 1 | needs you: your task |
| 4 | Answer Chapter 1's `[content]` rows (node copy, map fixes) (1 h) | 1 | needs you: your task |
| 5 | Buffer: fixes from the event-screen reviews (1 h) | 1 | needs you: your task |
| 6 | Mid-release check: Chapter 1 on the preview build, file what broke (1 h) | 1 | needs you: your task |
| 7 | Decide the stat scaling: whether +20% per stat point (one-shot) and +10% (repeating) runs too high, after playing the first character (0.5 h) | 0.5 | needs you: your task |
| 8 | File what is still broken (`/plot` or `/messy`) and decide what the release run must show (1 h) | 1 | needs you: your task |
| 9 | Chapter 1 release check: Act 1, Chapter 1 complete, a full Breakwater run on the phone with puzzle hazards, Chapter 1's enemies and art, lane relics, icons, new event UI (1.5 h) | 1.5 | needs you: your task |
| 10 | Live hazard routing for the other five Act 1 hazard nodes (Charcoal Wood 1, Beacon Crags 2, Lantern Deep 2; each draws a random puzzle from the thirty; the Breakwater's six are HP6) and the cuts (plot, 1 h) | 1 | needs a plot: no build-plan rows yet |
| 11 | Plot cloud container enhancements, and settle the path forward for claims and cloud containers (1 h). Three live problems: a background worker cannot post PR screenshots at all (release upload is refused for its session type, the browser route needs a browser it has no access to, and only CI can upload today); `pr-autofix` fires on a branch a live session holds a claim on, so two agents push the same branch; and a claim that has lapsed or was never taken reads the same as an abandoned branch, which made a worker treat a live PR as dead | 1 | needs a plot: no build-plan rows yet |

21 more acts are ready after these.

## Waiting on the loop

- Review the reworked fight reveal (look G for normal and elite foes, the boss's held title card F; spec 175)... — the loop still owes FR1a, FR1b
- Review the reworked quest screen (with NPC art), village screen (rest, shop, Anvil, with NPCs) and card upg... — the loop still owes QS1a, QS1b, QS1c
- Review the reworked travel, loot cache and cutscene screens (1.5 h) — the loop still owes TV1a, TV1b, LC1a, LC1b, CU1a, CU1b
- Play your quest line on the preview build and rule on its lines (0.5 h) — the loop still owes BW1e
- Re-tune Chapter 1's enemies against the recast roster: levels (all under 10), how often each normal repeats... — the loop still owes MS1a, MS1b
- Demo: an Act 1 clear ending at the Act Boss (2 h) — the loop still owes UP1h

## No hours stated

- Plot how a foe's attack is shown on screen: hide all the UI except the animated foe, make the screen look l...
