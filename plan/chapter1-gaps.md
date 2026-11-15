# Chapter 1 gaps (audit of 2026-11-14)

> What stands between the tree at cd8654b and a complete Chapter 1 (the Breakwater), outside the text. Filed by T's `/messy` of the gap audit on 2026-11-14. Text gaps are not here: T is working on them in another session (spec 177 and the narrator ballots).

"Complete" is the plan's own Chapter 1 definition (a full Breakwater run on the phone: its enemies and their art, the six lane relics, item icons, the questline, all eight event screens, then v0.9.0), plus what a finished chapter needs that the definition never names (T, 2026-11-14: "Repo definition + extras").

Each theme says what exists, with the file read, and what is proposed. A theme marked **plotted** has a spec; the rest are `[owner]` candidates in `plan/CANDIDATES.md` that T promotes with `/plot`.

## Themes

### 1. The chapter has no end · plotted, spec 182 (CE1a, CE1b)

Crossing the bridge logs a chapter clear, shows a toast and drops the player into the placeholder Charcoal Wood (`axiomancer-mobile/state/travel/store-actions.ts`). T: "Create a chapter complete screen and show stats".

### 2. Three of the six lane relics cannot be earned · plotted, spec 183 (LR2a)

The Bleeding Signet, the Elementalist's Brooch and the Elementalist's Belt are paid by no quest and no drop (`Items/relic.library.ts`, `Combat/combat.rewards.ts`). T: "Add to the elite drop pool".

### 3. The sim report counts the wrong hazards · plotted, spec 184 (SC1a)

`chapterHazards` lists the three-round board's six hazards; the Breakwater's seven nodes play puzzles, so the nightly report reads 0 of 6 (`World/chapter1-content.ts`, `docs/reports/sim/latest.md`).

### 4. The game model is out of date · plotted, spec 185 (GM1a)

`docs/game-model.md` on the lethal hazard, the foe roster, the questline's rewards.

### 5. Scene pictures · candidate

- 22 scenes play on the Breakwater and four pictures serve them: the windmill headland shows for 15 scenes, the clifftop chapel for 5, the old watchtower and the high pass for one each (`BW_NODE_SCENES`, `World/MapEvents/content.ts`). 18 scenes have no picture of their own.
- The five pictures that exist, the narrator figure and the bridge travel image are public-domain stand-ins marked TEMP (`assets/images/cutscenes/provenance.json`, `travel/provenance.json`).
- Art is T's (D88). The loop's part is wiring a picture to its scene once T supplies it.

### 6. Foe and cast portraits · candidate

- Seven of Chapter 1's thirteen foes wear stand-in portraits "until T's portrait swap": Net-Mender, Brine-Widow, The Cave Choir, The Tithe-Collector, The Lamplighter, The Wrecker, The Half-Taken (`assets/images/enemies/provenance.json`). Their 24 animation frames were drawn from the stand-ins, so a swap means new frames.
- All eight cast portraits are stand-ins, and `givers/lighthouse-keeper.webp` is a copy of `keepers/host.webp`: Enoch Marrable and Ann Greave share one face.
- Portraits are canon for how a creature looks (story ruling 13), so a swap can force a description to be redrawn.

### 7. Smaller stand-ins · candidate

- Map fog is a placeholder ("T supplies the real fog image", `map-fog/provenance.json`).
- The loot cache's card picture is TEMP; the chest and hoard pictures have no traced source (`treasure/provenance.json`).
- The hazard screen has no picture.
- The fifteen player portraits are a temp drop (`portraits/provenance.json`).
- The Brimming Locket and the Penitent's Brooch borrow another relic's icon (`items/index.ts`). Whether Chapter 1 pays either was not confirmed.
- The three grey starter cards borrow art; that one is already 134.8's (B8).

### 8. Sound · candidate

- No sound effect plays (`state/settings.ts`: the SFX volume setting says so).
- One music track exists; combat and hazards have none (`music.engine.ts`).

### 9. Chapter 1 is too easy and the player outlevels it · candidate

- Nightly sim, 2026-11-14 (build 7f981f29): 20 of 20 clears; players reach the boss at level 14.4 to 18 and end at 18.8 to 21.6. The enemies are levelled under 10.
- Measured truth (stamp c45ddb8, 2026-11-13): every Breakwater cell wins 92 to 100%.
- The level 5 Coralback at `bw-t6` is met at about level 15.
- Tuning numbers is T's. The loop's part is the measurement: where the levels come from (XP per fight, per quest step, per hazard) and what curve reaches the boss at a level T names.

### 10. Nothing teaches a first fight · candidate

- Every tutorial window was removed in R10d; only dead `*-tutorial-done` flags remain (`game.migrate.ts`).
- Open findings on reading a fight already sit in the queues and are not copied here: PHASE labels, hand names cut off at 375 px, printed numbers that differ from what lands, the hazard reward sheet (`plan/CRITIQUE.md`, `plan/CANDIDATES.md`).

### 11. The spare-or-finish choice is rare on the Breakwater · candidate

- The story has the choice "each time" (story ruling 4). In the engine only normal foes get it, on a 15% roll (phase MR1c), and no Chapter 1 foe has a spare story.
- The finish line of a foe is never shown: a felled foe goes to the victory screen.
- The lines themselves are text and are T's other session's; the rule (how often, for whom, and where the finish line shows) is this theme.

### 12. A restart mid-fight starts the fight over · candidate

- A save survives a restart in a fight, but the fight begins again with the hand and dice lost (`state/e2e/mid-fight-resume.engine.test.tsx`). Resume inside a hazard puzzle or an event screen was not checked.

### 13. Release marks · candidate

- `app.json` says version 1.0.0 and `axiomancer-mobile/package.json` says 1.9.0. Nothing sets v0.9.0, the version the plan names for a complete Chapter 1.
- The Clifftop chapel's hazard puzzle is "a placeholder pick until T chooses" (`World/Hazard/puzzle/breakwater-puzzles.ts`).

## Already planned, not repeated here

- Node arena plates: 146.7 (T picks).
- Grey starter card art: 134.8.
- The starting ring and stat-only relics: 134.2.
- Tester token, phone checks, iPhone builds: specs 163, 166, 123, 129.

## Open questions

Only T can answer these; each candidate carries its own.

1. Scene pictures: one per scene (18 more), or a smaller set shared by place?
2. Foe portraits: swap all seven before release, or ship the stand-ins?
3. Sound: is any sound in Chapter 1's scope, and where do the files come from?
4. Balance: what level should the player reach the Saint Beneath at? The sim report's target reads 8 to 10.
5. Teaching: a guided first fight, or hints on the board as they are needed?
6. Spare-or-finish: every normal fight, or the roll as it is?
7. Mid-fight restart: restore the fight exactly, or restart it and say so?
8. The other three relics no run can earn (Carapace Belt, Brimming Locket, Penitent's Brooch): spec 183's call 1.

## Not verified

- Whether a screen shows the Breakwater's map description.
- Resume inside a hazard puzzle or an event screen.
- `npm run roster-health` was not run (dependencies were not installed in the audit's container); reachability was read from the code.
