# THE REVAMP — main build plan

> [!IMPORTANT]
> ## ENDED: the revamp ended at RC; Phase R11 (2026-10-12) closed it
>
> This folder is now the **record** of the revamp and the home of the part
> plans the owner-led B-rows still point to. The loop's rules since R11
> (D84–D90): code lands by `loop:pr` PRs T merges; the loop builds only
> briefed rows and never writes a brief; T's intake is `/plot` and
> `/messy`; content per surface below (§7, "Content per surface").
> Read `plan/bearings.md` → "THE LOOP SINCE R11" for the current rules.

> [!NOTE]
> ## STATUS: RATIFIED 2026-09-28 (D64)
>
> T ratified this plan on 2026-09-28, after ruling every open call
> (decisions **D46–D64** in `plan/2026-09-25-refactor-strategy.decisions.md`).
> The R-rows and B4 in `plan/steps/01_build_plan.md` are unblocked, in the
> order of §7; owner-led B-rows stay `[blocked: owner-led]` — the loop never
> starts them. `/march` and `night` stay **disabled** until Phase R0
> (attended) merges; then `gh workflow enable march night`.
>
> **Card process: Plan B, ratified 2026-09-30 (D73).** One slice per lane;
> lanes group into families (a relic names a family); the first pool is 3
> families × 1 lane; bridge cards join sub-lanes within a family. The B4
> gate still applies; THE CARD HOLD (D37) was lifted by D99 (2026-10-22).
> See [cards.md](cards.md).

## 1. What this is

The revamp resets Miserere Mei, Deus to a small, honest core and rebuilds
from there in owner-led sessions. This folder is the map of both halves:

- **Reset (R-phases)** — delete or park everything the core does not use.
  Loop-shippable once ratified, one phase per tick, main green between
  them (pushed to main at the time; since R11 the loop lands code by PR).
- **Checkpoint (RC)** — the Act 1 release T tags when the reset is done:
  the point to reset to before anything grows again ([checkpoint.md](checkpoint.md)).
- **Rebuild (B-phases)** — T's guided sessions. The loop never starts one
  (D37, D88).

Each major part has its own plan file. This README orders them.

## 2. What "zero" is — the core that survives the reset

| Layer | After the reset |
|---|---|
| Player cards | The grey office: A Plain Blow (DEAL), A Plain Ward (GUARD), A Plain Word (VULNERABLE). Card types **Attack / Skill / Spell** (D51) |
| Player keywords | DEAL, GUARD, VULNERABLE — plus whatever the befriend path prints |
| Combat engine | Tray dice, one roll per threat phase, FREE/PAID lines, reads, VITAE, Conviction, S3 stat scaling (`base × stat ÷ 5`) |
| Relics | The **Suppliant's Ring** only, with **The Open Hand = befriend** (D47); R4 made the other ten GUARD 5 placeholders and R7e deletes them (D72) |
| Enemies | **Float-Eye** (normal fights), **Brine Hag** (rarer mid-region elite), **The Doorwarden** (every region's door fight) — no keywords, no afflictions; the 11 enemy-keyword systems are deleted (D48, D61) |
| Mercy | Befriend → mercy choice, entered only through The Open Hand (D47) |
| World | Act 1 only: Breakwater → Charcoal Wood → Beacon Crags → Lantern Deep. Fishing-village is purged; the other continents' content is deleted in R7e with its plumbing kept (D72); the Labyrinth is parked; the Lantern Deep's deep stair is sealed; one Anvil per region near its exit (D53, D54, D61) |
| Items | Healing potions (D49); relics |
| Rewards | Post-fight card reward from the grey pool (D44); no theme/keyword steering (D50) |
| Hazards | A minimal set, pending T's redesign (D52) |
| Progression | Levels + S3 stats; XP retuned after the resets (D55); card upgrades (D8) and die growth (D20) stay parked |

Everything else is either deleted (git history is the archive, D50) or
parked unreachable with a plan file saying how it comes back.

## 3. Part plans

| File | Part | Phases |
|---|---|---|
| [loop.md](loop.md) | Skills, commands, agents, hooks, workflows, plan hygiene | R0 |
| [tooling.md](tooling.md) | Card editor, baseline, DevLog, orphan scripts | R1 |
| [enemies.md](enemies.md) | Roster reset, keywords, afflictions; the four-tier revamp | R2, B2 |
| [world.md](world.md) | Act 1 only, fishing-village purge, quests, dialogue | R3 |
| [labyrinth.md](labyrinth.md) | Seal the door, park the module, later re-theme | R3 (door), B9 |
| [relics.md](relics.md) | GUARD 5 placeholders, The Open Hand befriend, the relic pass | R4, B1 |
| [items.md](items.md) | Consumables → healing potions, shops, caches | R5 |
| [hazards.md](hazards.md) | Minimal hazard set; T's mechanics redesign | R6, B3 |
| [engine.md](engine.md) | The 47 dead mechanic kinds, card types, reward logic, alt-wins, the stance layer | R7, R7d |
| [content-strip.md](content-strip.md) | Parked world content, the ten non-starter relics; plumbing kept with fixtures | R7e |
| [mobile.md](mobile.md) | App cleanup, card art mapping, app name, theme colours; Deck tab, art and dev-menu revamps | R8, R10, B7, B8, B10 |
| [progression.md](progression.md) | XP / level retune | R9 |
| [cards.md](cards.md) | Card-rules inventory, card-creator workflow, card sessions | B4, B5, B6 |
| [checkpoint.md](checkpoint.md) | Save checkpoint in fights; the Act 1 checkpoint release | R9a, RC |
| [doctrine.md](doctrine.md) | Doctrine rewrite, archive removal, comments and docs truth pass | R10b, R10c |

Tick-by-tick walkthrough of the whole plan: [walkthrough.md](walkthrough.md).

## 4. Build order

`[loop]` = the loop may ship it once ratified. `[attended]` = shipped in a
session with T present. `[owner]` = T's guided session; the loop never
starts it.

| # | Phase | Tag | Requires | Plan |
|---|---|---|---|---|
| R0 | Loop doctrine reset: archive the stewards and design skills, fix every verb's doctrine, fix ci-autofix, telemetry, plan hygiene | attended | — | loop.md |
| R1 | Tooling reset: delete the card editor, retire the baseline, archive the tuning-lab pages, catalog shows live content only | loop | R0 | tooling.md |
| R2a | Enemy reset 1/2: 79 → 3 foes, their data stripped of keywords and afflictions, pools and door pins, save migration | loop | R0 | enemies.md |
| R2b | Enemy reset 2/2: enemy-keyword systems, riders and curse code deleted, carrier sweep | loop | R2a | enemies.md |
| R3 | World reset: Act 1 only, fishing-village purged, other continents parked, Labyrinth door and deep stair sealed, encounters re-pointed, one Anvil per region | loop | R2a | world.md, labyrinth.md |
| R4 | Relic placeholders: 10 signatures → GUARD 5 flat cost; The Open Hand becomes a real befriend | loop | R2a | relics.md |
| R5 | Items reset: healing potions only, save migration, shops/caches/loot re-pointed | loop | R3 | items.md |
| R6 | Hazard reset: minimal hazard deck | loop | R0 | hazards.md |
| R7a | Engine purge 1/3: mechanic kinds, handlers, dead fields, state, fixtures | loop | R2b, R4, R6 | engine.md |
| R7b | Engine purge 2/3: pricing, synergy, themes, draft, reward steering, card types → Attack/Skill/Spell | loop | R7a | engine.md |
| R7c | Engine purge 3/3: the alt-win systems (PLEA, CHARGE, capitulation, region consequences) | loop | R7b | engine.md |
| R7c2 | Engine purge 3b: friendship increments, carrier-less effects, the rung ladder, dead branches, closing carrier sweep (split from R7c, 2026-09-30) | loop | R7c | engine.md |
| R7d | Stance removal: the rock/paper/scissors layer goes; card and dice colour and the Color Law stay (D65); the colour-match bonus was later removed (D79) | loop | R7c2 | engine.md |
| R7e | Content strip: parked world content deleted (maps, events, NPCs, quests, shops), plumbing kept with neutral fixtures; relics → the Suppliant's Ring only; the Labyrinth stays parked (D72) | loop | R7d | content-strip.md |
| R8 | Mobile cleanup: dead flows and glosses, grey card art, app label, VITAE/shillings copy | loop | R7e | mobile.md |
| R9 | Progression retune: XP curve for Act 1 on the 3 survivors | loop | R3, R7c2 | progression.md |
| R9a | Save checkpoint in fights: a reload mid-encounter re-offers the fight | loop | R7c2, R8 | checkpoint.md |
| R10 | Theme colours: move surviving hard-coded hex colours into named `theme/axm.ts` tokens (no visual change) | loop | R8 | mobile.md |
| R10b | Doctrine rewrite 1/2: spec.md, bearings, a one-page game model; specs 33/34 retired (D67) | loop | R10 | doctrine.md |
| R10b2 | Doctrine rewrite 2/2 (split from R10b, 2026-10-02): plan queues swept; `plan/archive/` tagged and removed; `check-lexicon` retired-term guard (D66, D67) | loop | R10b | doctrine.md |
| R10c | Comments and docs truth pass 1/3 (split 2026-10-02): mechanics docs rewritten or deleted, rules linked to the game model (D67) | loop | R10b2 | doctrine.md |
| R10c2 | Comments and docs truth pass 2/3: history stripped from mechanics comments; a comment guard (D67) | loop | R10c | doctrine.md |
| R10c3 | Comments and docs truth pass 3/3: mobile docs and comments; the guard covers mobile (D67) | loop | R10c2 | doctrine.md |
| RC | Act 1 checkpoint release: full gate, a playtester walk of all four regions, then T tags `v0.1.0-checkpoint` | attended | R1–R10c, R7a–e (with R7c2), R9a, B4 | checkpoint.md |
| R11 | Reopen the loop: ends revamp mode (the revamp ended at RC); the loop lands code by PRs T merges, kept green by a Haiku fixer; `/plot` and `/messy` intake; a retro and lessons ladder; content rules per surface (rewritten 2026-10-11) | attended | RC | loop.md |
| R12 | New combat-playtest: write a fresh `/combat-playtest` command for the rebuilt game (the old one was archived in R0) | attended | RC, R11 | loop.md |
| B1 | The relic pass: new relics and real signatures | owner | R4, RC | relics.md |
| B2 | Enemy revamp: four tiers (normal, elite, region boss, **act boss**), roster regrowth, keywords with counters | owner | R9, RC | enemies.md |
| B3 | Hazard mechanics redesign | owner | R6, RC | hazards.md |
| B4 | Card-rules inventory (the gate before any card work) | loop | R7c | cards.md |
| B5 | Card-creator workflow (successor to the card editor) | owner | B4, RC | cards.md |
| B6 | Card sessions (pick a plan from the keyword/card revamp plans) | owner | B4, B5, RC | cards.md |
| B7 | Deck tab UI revamp | owner | R8, RC | mobile.md |
| B8 | Card art revamp (incl. the title wordmark) | owner | R8, RC | mobile.md |
| B9 | Labyrinth re-theme | owner | B2, RC | labyrinth.md |
| B10 | Dev menu revamp (the reset leaves the dev menu alone except for compile fixes) | owner | R8, RC | mobile.md |

B4 is the one rebuild phase the loop may run: it writes an inventory and
creates nothing.

## 5. Reset rules (every R-phase)

1. **Delete, don't park, unless the part plan says park.** Git history is
   the archive for source (D50) and, since R10b2, for markdown too (D66):
   there is no `plan/archive/`.
2. **Tests go with their subjects.** A test pinned to a deleted thing is
   deleted or rewritten to the survivors. Never weaken a test to keep a
   deleted thing alive.
3. **Carrier rule (D45) runs last in each phase.** After a phase removes a
   carrier, remove every glossary/atlas row, glyph, gloss and editor word
   left without one.
4. **Save compatibility.** Anything removed from a player's save (items,
   relics, flags, map positions) ships with a migration in
   `Game/game.migrate.ts` and a test.
5. **Gates:** mechanics `verify`, mobile `verify`, root `npm test`,
   `lint:content`, `check-lexicon`. `baseline:check` is retired (D57).
6. **No content creation.** An R-phase re-points and deletes. It never
   authors a card, keyword, enemy, relic, map, NPC, event or art (D58).

## 6. Open calls — resolved 2026-09-28 (D61–D63)

T walked the agent defaults one at a time the same day. None remain open.

| # | Call | Ruling |
|---|---|---|
| 1 | Where the survivors stand | **The Doorwarden on every region's door fight** (a region-boss preview; overturns D30 everywhere); Brine Hag as a rarer mid-region fight; Float-Eye on normal fights (D61) |
| 2 | Enemy-keyword engine code | Delete all 11; keep an optional empty `Enemy.keywords` (D63) |
| 3 | The Lantern Deep's exit | **Sealed**, like the vault door; the player keeps wandering Act 1; no end-of-run state (D61) |
| 4 | Level-up Learn Card | Deleted; level-ups give stat points only (D63) |
| 5 | RELENT (PLEA/capitulation) and CONDEMN (premises/peroration) | Both cut; befriend → mercy is the only non-lethal ending (D63) |
| 6 | Dev menu | **Left alone** by the reset except compile/test fixes forced by deletions; a new owner-led **B10 Dev Menu revamp** does the rest (D62; D19 stands) |
| 7 | Hard-coded hex colours | A small loop phase **R10** after R8 (D62) |
| + | Hazard reset depth | Minimal playable core, as drafted in hazards.md (D63) |
| + | The Anvil (found during call 6) | Its only placement was on fishing-village; **re-home it once per region, near the exit** (D61) |

## 7. Roadmap — recommended order (D64)

### Reset track (loop, one phase per tick)

| Step | Phase | Why here |
|---|---|---|
| 1 | **R0** Loop doctrine reset (attended) | The loop must stop teaching retired doctrine and routing to archived agents before it ships anything. Re-enable `march`/`night` after it merges |
| 2 | **R1** Tooling reset | Deleting the card editor frees R7 from a third package; retiring the baseline stops every session printing a stale stamp |
| 3 | **R2a–R2b** Enemy reset, in two ticks (data, then code) | Everything downstream (world, relics' befriend data, the engine carrier sweep) keys off the three survivors |
| 4 | **R3** World reset | Needs the survivors to re-point encounters; shrinks the world before items/shops are touched |
| 5 | **R4** Relic placeholders | Removes the Bill exploit and most signature carriers early; gives B1 its floor |
| 6 | **R5** Items reset | Only Act 1's shops and caches remain to re-point |
| 7 | **R6** Hazard reset | Independent; placed here so R7's carrier sweep sees the final hazard glossary |
| 8 | **R7a–R7c2** Engine purge, in four ticks | Last big deletion — needs R2, R4, R6 to have removed their carriers; split along engine.md's own three-way split so each tick is bounded |
| 8a | **R7d** Stance removal | The RPS layer is engine + mobile wiring left over from spec 33; it goes before B4 so the inventory never records it (D65) |
| 8b | **R7e** Content strip | T's checkpoint is scaffolding only (D72): the parked world's content and the ten non-starter relics go before B4, so the inventory records the stripped tree; the plumbing stays, witnessed by fixtures |
| 9 | **B4** Card-rules inventory (loop) | Straight after R7 so the inventory records the final tree and card work can start in parallel with the rest |
| 10 | **R8** Mobile cleanup | Consumes R7's final exports |
| 11 | **R9** Progression retune | Needs Act 1 and the engine final; its XP numbers feed B2 |
| 11a | **R9a** Save checkpoint in fights | A reload must not skip a Doorwarden before the checkpoint is cut |
| 12 | **R10** Theme colours | Last: R8 has already deleted about half the literals |
| 12b | **R10b** Doctrine rewrite | After every deletion, so spec.md, bearings and the game model are written once against the final tree; removes `plan/archive/` so the old game cannot be grepped back in (D66, D67) |
| 12c | **R10c** Comments and docs truth pass | Last: comments and docs describe the code that survived; the 2026-09-23 pass left mobile comments and six bannered docs undone (D67) |
| 12d | **R10d** Tutorial removal | T, 2026-10-02: every coach, the hazard intro and the map hint go before the tag |
| 12a | **RC** Act 1 checkpoint release (attended) | The reset point: mechanics in place, the map working, everything cleaned up. T tags it; nothing below starts before it |
| 13 | **R11** Reopen the loop (attended) — **shipped 2026-10-12, #503 (D84–D90)** | Closed the revamp, which ended at RC: removed revamp mode (D58), moved the loop onto pull requests T merges, gave T an intake (`/plot`, `/messy`), added a retro step, and set the content rules per surface |
| 14 | **R12** New combat-playtest (attended) | Written once the survivors, Act 1 and the XP curve are final (R9) and the loop's content rules are set (R11), so it measures the game that exists |

### Rebuild track (T's sessions, after RC)

Every B-row requires RC (T, via `/oversight` 2026-09-28). Picking the card
process plan (step a) is a decision, not a phase, and can happen any time.
The B-rows stay `[blocked: owner-led]` in the build plan.

**Content per surface (R11, D88).** What the loop may create:

| Surface | Loop authority |
|---|---|
| Cards, keywords, art, enemies, relics, maps, NPCs, events (D99 lifted THE CARD HOLD, D37) | Propose as `/expand` candidates (D89); build only from a build-plan row whose brief T wrote or approved (`/plot`, attended `/plan-a-phase`, `/oversight` promotion) |
| Code, tooling, tests, docs, fixes | Yes, as briefed phases or `/iterate` fixes, landed by `loop:pr` PRs T merges (D84–D87) |

| Step | Phase / decision | Ready after | Why here |
|---|---|---|---|
| a0 | **BT** Blood Price trial set (D75) | RC + T's ballot verdicts | Grey cards cannot carry a real clear; a removable trial set tests the reward mechanism, Curse/Global/SACRIFICE/EXILE and a full Act 1 run, and may become the first lane family |
| a | **Pick the card process plan** (A, B or C) — open `plan/2026-09-27-keyword-card-revamp.summary.html` | now | Nothing else in card work can be scheduled until it is picked; picking early lets B5/B6 follow B4 immediately |
| b | **B1** Relic pass | R4 | Signatures are the player's only non-card actions; small, and it restores texture to fights early |
| c | **B5** Card-creator workflow | B4 | The tool shape follows the inventory and the picked plan |
| d | **B6** Card sessions | B4, B5 | The player's kit — the biggest rebuild |
| e | **B2** Enemy revamp (four tiers, Act Boss) | R9 (and B6 under way) | Threats are designed against a real kit. **If T picks Plan C (threat first), move B2 before B6** |
| f | **B3** Hazard redesign | R6 | Independent of combat; any time after R6 |
| g | **B10** Dev menu revamp | R8, R10 | Builds on the final palette and the post-reset content |
| h | **B7** Deck tab revamp | R8 (better after B6 adds cards) | A deck of 3 cards gives the redesign little to show |
| i | **B8** Card art revamp | B6 | Art per card type once the types beyond Attack/Skill/Spell exist |
| j | **B9** Labyrinth re-theme | B2 | Needs the enemy roster and tiers |
