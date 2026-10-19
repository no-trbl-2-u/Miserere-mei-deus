# 01 — Build plan

> Style guardrails for every phase below. Always ship tests
> alongside code — never "add tests later". Hermetic e2e at the
> highest public entry point. Break work into small, focused
> modules with their own tests. Prefer 5 small files with clear
> names over 1 dense file. Scope the verify gate to the touched
> workspace (see `plan/bearings.md` § Verify gate).

## Status (at-a-glance)

`/march`, `/ship-a-phase`, and (transitively) `/loop` read this
block to find the next phase. Status vocabulary: `[ ]` pending
-> `[x]` shipped (with commit hash); `[skipped]` (set only via
`/oversight`); `[blocked: <reason> <date>]` (set by
`ship-a-phase` on a phase-shaped failure — `/march` skips it,
`/oversight` unblocks it); `[-]` partial-with-carry-overs.
Tick in this file in the same commit that ships the phase. Shipped rows
are one line (title + commit hash); the full text of every row collapsed
in TRIM THE FAT T4 (2026-09-25) lives verbatim in
`archive-pre-revamp:plan/archive/BUILD_PLAN_2026.md`.

> **AUDIT-DRAIN MODE LIFTED (via /oversight 2026-08-15 — T called it
> off).** The banner set 2026-08-12 paused `ship-a-phase` dispatch
> queue-wide so `/march` would fall through to `/iterate` and drain
> `plan/AUDIT.md`'s Pending queue. It is no longer in force: `/march`
> Step 3a dispatches normally again, and every `[ ]` row below is
> pickable on its ordinary turn.
>
> **Why it was lifted, recorded honestly.** It did not hold. Phases 52c
> and 52d shipped 2026-08-13 and 52e on 2026-08-15, none of them the
> banner's single named exception (Phase 55), while the drain the hold
> was meant to force closed exactly one AUDIT row in three days
> (`c297d92`). T's ruling on being shown that: lift it — a hold nothing
> obeys is worse than no hold, and the queue was already voting with its
> feet. AUDIT rows keep draining through `/iterate` on its normal turns
> in the `/march` rotation, which is where that work belonged all along.
> No category bias was set; `/iterate` works top-down by score.
> (Historical note kept from the original banner: Phase 44i shipped in
> the same window the banner was being written, before it landed on
> `main`, and was left as-is rather than reverted.)

**Already shipped (pre-loop):**
- [x] Phase 0 — nexus methodology adoption (`chore: adopt nexus methodology`)

**Next up (autonomous loop's queue):**

- [x] Phase 79 — Doctrine lexicon (eb779017)
- [x] Phase 80 — Naming pass: one concept, one word across player-facing surfaces (69c68db6)
- [x] Phase 81 — Late-campaign difficulty cliff (ff9d405e)
- [x] Phase 82 — Glossary reachability: mount tooltip targets on the hazard deck's 14 keyword chips (ee8bf2e5)
- [x] Phase 83 — Combat arena backdrop (cb3b1c97)
- [x] Phase 84 — The Capital: attended `/world-spec` session (5fad261e)
- [x] Phase 85 — Equipment progression (9f313d0c)
- [x] Phase 86 — Engine hook sweep: delete the 19 orphaned `zoneHas` sites in `combat.engine.ts` (7cd4119c)
- [x] Phase 87 — Early-game encounter smoothing (2227fe9c)
- [x] Phase 88 — W5 art adoption (ebb457f4)

- [x] Phase 89 — Art-direction coherence (6137ca5b)
- [-] Phase 90 — Summoner / multi-hit enemy archetype: no roster enemy
      spawns adds or answers a stacked wall with multi-hit; author the
      archetype and stage it (promoted via `/oversight` 2026-09-17 from
      `PHASE_CANDIDATES.md` [score 4.5]; corroborated by `/adjust-enemies`
      pass 11's filed roster gap, commit b718b421). SHIPPED the multi-hit
      half 2026-09-17 (commit `39e2915e`): new `FLURRY N` EnemyKeyword,
      resolved in `resolveThreatPhase` (mirrors SWIFT/BRUTAL), retrofit on
      `enemy-guild-knife`. CARRY-OVER: the summoner/add-spawning half —
      combat is hard-coded to one enemy throughout `resolveThreatPhase`, so
      a literal summoner needs real multi-enemy combat state; verified and
      deferred (see `plan/phases/phase_90_flurry_multi-hit_archetype.md`
      Follow-ups) rather than attempted partially. Re-file as its own
      `PHASE_CANDIDATES.md` row scoped to the engine-architecture question.
- [x] Phase 91 — Amber-CI tick recovery (3f50d663)
- [x] Phase 92 — `march` workflow job ceiling (d7cc91d7)
- [x] Phase 93 — Card-base reconciliation (e0107985)
- [x] Phase 94 — `critique:drive` artifact scope (a438d344)
- [x] Phase 95 — UI fresh-eyes six: ship the six product decisions accepted via `/oversight` 2026-09-15 (2aa77567)
- [x] Phase 96 — Consumable desperation band (417b931)
- [x] Phase 97 — Hand-fan name legibility: the mobile combat hand covered its own card names (cecae8f)
- [x] Phase 98 — Worklet guard in CI (51fede4)
- [x] Phase 99 — A returning player can actually return (fd83aa0)
- [x] Phase 100 — The map tells the truth (42d2ba2)
- [x] Phase 101 — Region arena plates (e4e2704)
- [x] Phase 102 — SUMMON, the add-spawning enemy archetype (e333fbb)
- [x] Phase 103 — The last two arenas: the acquisition pipeline learns to crop a plate off a scanned page (e333fbb)
- [x] Phase 104 — The grey office and the keyword pull (510953cf)

**THE MAP REVAMP — the rest of Act 1's maps** (T, 2026-09-26). Brief for
every row: `plan/2026-09-25-map-revamp-m3.prompt.md` (§1 rulings, §2 phase table, §3a the M3a
pattern to copy). Generate `plan/phases/phase_<id>_<topic>.md` from its §2
row. D26's name picks are already made (brief §1), so no row below needs T.
**Order is strict:** each row requires the one above it ticked `[x]` on
`main`. If it isn't, skip the row this tick (they touch the same registry,
event-pool and layout files).
- [x] Phase M3b — The Charcoal Wood (#389)
- [x] Phase M3c — The Beacon Crags (#392)
- [x] Phase M3d — The Lantern Deep (#396)
- [x] Phase M3e — Retune fishing-village for its place after Act 1 (425525ce)
- [x] Phase M4 — The Labyrinth door (571d5b3f)
- [x] Phase M5 — Map docs (1ec11390)
- [x] Phase T6 — Remove alignment, philosophy and GRACE (67fd0106)
- [x] Phase S3 — Stat scaling (refactor D1 step 3): keyword families by where the effect lands (body: damage to the foe; mind: anything on you; heart: anything on the foe), `base × stat ÷ 5` with repeating amounts at half rate and durations flat, no caps, VITAE `50 + 12·body + 6·mind + 6·heart`, coloured keywords with a stat glyph, final numbers on card faces. Brief `plan/2026-09-27-stat-scaling.prompt.md`. Requires T6 `[x]`.
- [x] Phase P1 — The card purge (D36): purge every player card except the grey office (`grey-strike`, `grey-ward` and the VULNERABLE grey card, D42), and every player keyword except DEAL, GUARD and VULNERABLE; every run deals the grey deck; presets and the 5/5/5 thirds go (card rewards and the cache card offer stay, offering the grey cards: D44). Keyword audit follow-up merged as #407. Enemies keep their keywords. Brief `plan/2026-09-26-card-purge.prompt.md`. Requires S3 `[x]`.

> **THE REVAMP (D46–D64) — RATIFIED 2026-09-28.** Plan: `plan/revamp/README.md`
> (§7 = the recommended order, which these rows follow) + one part plan per
> row. R0 is **attended** (it edits `.claude/**`); `/march` and `night` stay
> disabled until it merges. R1–R10c, R9a and B4 are loop-shippable in the
> order below, one phase per tick, pushed to main. **RC is the Act 1
> checkpoint release (attended):** the loop stops there, T cuts the tag, and
> nothing past it (content, cards, people, story, AI skills, anything beyond
> Act 1) starts before it. The B-rows after it are T's sessions: they stay
> `[blocked: owner-led]`, require RC, and the loop never starts them.
> Tick-by-tick walkthrough: `plan/revamp/walkthrough.md`. The card process
> is **Plan B, ratified 2026-09-30 (D73)**: one slice per lane, families of
> sub-lanes, a first pool of 3 families × 1 lane (`plan/revamp/cards.md`).

- [x] Phase R0 — Loop doctrine reset (attended): stewards, forge, four agents and the design skills archived; every verb carries the revamp banner; ci-autofix, telemetry and plan hygiene fixed. `plan/revamp/loop.md` (ba658cba)
- [x] Phase R1 — Tooling reset: delete the card editor, retire the deck-matrix baseline, archive the tuning-lab pages, catalog shows live content only, orphan scripts. The `.claude/**` items the part plan names (the guard.mjs baseline block, the launch.json card-editor entry, the naming-law allowances in settings.json) are attended residue: R1 leaves them and notes them in its commit. `plan/revamp/tooling.md`. Requires R0. (0cfea70c)
- [x] Phase R2a — Enemy reset 1/2, the data: 79 → Float-Eye / Brine Hag / Doorwarden, their decks and cards (afflictions and riders stripped from the survivors' cards), retired decks, stance maps, enemy cards and portraits deleted, Act 1 pools and door pins (brief scope 1, 2, 5, 6, 7 and the Doorwarden's keywords), save migration. `plan/revamp/enemies.md`; brief `plan/phases/phase_R2_enemy_reset.md`. Split from R2 on 2026-09-29: one tick could not hold the whole reset. Requires R0. (c20ebe14)
- [x] Phase R2b — Enemy reset 2/2, the code: the eleven enemy-keyword systems, SUMMON's adds, the PLEA/premise riders and curse injection deleted; carrier sweep (872de5a7)
- [x] Phase R3a — World reset 1/3, seal and park: the Lantern Deep's deep stair (`ld-18`) and the Labyrinth vault door (`ld-15`) become sealed cutscenes; the northern maps parked (pools emptied, code kept); saves off Act 1 migrate onto the Lantern Deep. `plan/revamp/world.md`, `labyrinth.md`; brief `plan/phases/phase_R3_world_reset.md`. Split from R3 on 2026-09-29, like R2. Requires R2a. (f47fb4c9)
- [x] Phase R3b — World reset 2/3, purge fishing-village and re-home the Anvil (25a6c5e7, 45bb8334)
- [x] Phase R3c — World reset 3/3, hygiene: unstartable quests and unread flags gone, shillings the one currency, reachability pinned to Act 1 (b901c094)
- [x] Phase R4 — Relic placeholders: ten signatures → GUARD 5 at a flat cost; The Open Hand becomes a real befriend (9110c7be)
- [x] Phase R5 — Items reset: healing potions only, save migration, shops/caches re-pointed (b2f91e00)
- [x] Phase R6a — Hazard reset 1/2, honest rewards: Shrine Cache, Bonus Relic, Paradox Token, Sundered and Hexed deleted (two literal shilling chips and the heal remain), sub-quests deleted, token/hexed flags migrated away (ab9e5378)
- [x] Phase R6b — Hazard reset 2/2, the minimal deck: the prototype ten cards, the reward-card pool gone (the offer draws core cards), carrier-less hazard mechanics deleted, glossary and tooltip chips swept, tuning/sim shrunk, deck-flag migration (11e937f2, f0a230f5)
- [x] Phase R7a — Engine purge 1/3: the carrier-less mechanics — CardSpecialMechanic is DEAL and GUARD, dead card fields and ledgers gone, pricing pulled forward, retired-verb fixtures deleted (b7f74606)
- [x] Phase R7b — Engine purge 2/3: synergy, themes, deck draft and presets, reward steering gone; card types are Attack / Skill / Spell, the oath/hex zones deleted; the matrix runs the grey deck (56b0cba7)
- [x] Phase R7c — Engine purge 3/3: the alt-win systems (PLEA / CHARGE / Peroration state, the capitulation offer and the capitulate / concede outcomes, region consequences and `buff_absolved`), keeping befriend → mercy; save hop v32 → v33. Split from R7c on 2026-09-30: one tick could not hold the whole row. `plan/revamp/engine.md` (split (c)); brief `plan/phases/phase_R7_engine_purge.md`. Requires R7b. (00277f40)
- [x] Phase R7c2 — Engine purge 3b: the STAGGER rung ladder and BACKFIRE, friendship increments, the dead `executeCard` branches, test-only modules (7a463a04)
- [x] Phase R7c3 — Engine purge 3c: the effect payload keys no library effect prints (and their readers and helpers), `test-utils/fixture-effects.ts` with the channels only it exercises, then the closing carrier sweep (D45). (c7d0ce6b)
- [x] Phase R7d — Stance removal: the rock/paper/scissors layer goes (player stance, the phase-end punish/yield check, enemy phase stances, and every mechanic, status, keyword and UI piece that reads them; DISRUPT goes with its stance surface). Card colour, dice colour, the Color Law, the colour-match bonus and the momentum chain STAY (D65). `plan/revamp/engine.md` (R7d). (2a727668)
- [x] Phase R7d2 — Stance residue and the carrier sweep (split from R7d, see the brief's as-shipped note): the legacy `CombatState` types (`Advantage`, `choosing_stance`, `CombatAction.stance`) and the Enemy AI stance doc; the word "stance" and the dead "read" prose out of player-facing copy (level-up, deck, character screens, card detail; the face VM's `statusAdv`/`statusDis`); "CHOOSE A STANCE" canon copy (`spec.md`, `axiomancer-mobile/AGENTS.md`); the D45 sweep: STAGGER, ROOT, CONFUSION, charm, DISRUPT, the `advantage` glyph kind and every stance word with no carrier out of the atlas, glossary and glyph registries. `plan/phases/phase_R7_engine_purge.md`. Requires R7d. (1802385a)
- [x] Phase R7e — Content strip, the world (D72; relics split to R7e2, see the brief): the parked world's content goes (northern-forest and the northern continent: maps, map events, 13 NPC trees, 9 quests, 7 shops, layouts); the dialogue, shop and quest plumbing stays, each witnessed by one neutral test fixture; save migration. The Labyrinth stays parked; Act 1 stays as is. `plan/revamp/content-strip.md`. Requires R7d. (1017c8d5)
- [x] Phase R7e2 — Content strip, the relics (split from R7e, see the brief): relics shrink to the Suppliant's Ring; the ten others and their GUARD 5 signature placeholders go; every reader re-pointed (first-node grant and `STAND_IN_RELIC_ID`, starting relics, fixtures, sims, CLI flags, the dev item picker); equip and unequip tested with fixture relics; the save drops deleted relics. `plan/revamp/content-strip.md`. Requires R7e. (37e77313)
- [x] Phase B4 — Card-rules inventory (loop; creates nothing; gates all card work). `plan/revamp/cards.md`. Requires R7e2. (383a331f)
- [x] Phase R8 — Mobile cleanup: dead flows and glosses, grey card art, app label, VITAE/shillings copy. `plan/revamp/mobile.md`. Requires R7e2. (049174f2)
- [x] Phase R9 — Progression retune: a rising XP curve (level L+1 costs L × 250), Doorwarden pins 1/2/3/4; a full Act 1 clear ends at level 5 (61d16fcf)
- [x] Phase R9a — Save checkpoint in fights: a fight settles its node, so a reload mid-fight re-offers it (1bad8fce)
- [x] Phase R10 — Theme colours: hard-coded hex colours moved into named `HUE` tokens (`theme/hue.ts`, re-exported from `theme/axm.ts`), no visual change (349c2ea7)
- [x] Phase R10b — Doctrine rewrite 1/2: `docs/game-model.md`, `spec.md`, bearings and the mechanics package guides describe only the post-revamp game; specs 33/34 retired into the game model and `docs/narrative/DELIVERY_REGISTER.md` (2a79e596)
- [x] Phase R10b2 — Doctrine rewrite 2/2: plan queues swept of moot rows; `plan/archive/` tagged `archive-pre-revamp` and removed, every pointer repointed; `check-lexicon` fails the revamp's retired concepts in live docs (29f3b174)
- [x] Phase R10c — Comments and docs truth pass 1/3, mechanics docs: stale mechanics docs rewritten to the code or deleted, rules linked to `docs/game-model.md` (6f9a74aa)
- [x] Phase R10c2 — Comments and docs truth pass 2/3, mechanics comments: history narration stripped from every mechanics code comment; `scripts/check-comments.mjs` guards it in the root `npm test` (22f4e41f)
- [x] Phase R10c3 — Comments and docs truth pass 3/3, mobile: the two bannered mobile docs deleted; history stripped from every mobile code comment; `scripts/check-comments.mjs` now guards both packages (6bbca8a6, 2ee20eba)
- [x] Phase R10d — Tutorial removal (T, 2026-10-02): every tutorial window removed — the combat primer and coach, the hazard intro overlay and coach, the Anvil and night-watch coaches, the map's first-visit hint chip, the done-flags (dropped from saves on load) and the Settings TUTORIAL HINTS / RESET TUTORIALS controls (859cef19)
- [x] Phase RC — Act 1 checkpoint release (attended), cut 2026-10-02 as `v0.1.0-checkpoint` on 9ddba0f8 with its GitHub release and EAS preview APK (D76): the full gate green, a playtester run from a new game through all four regions' Doorwarden fights (proving Act 1 works, not that the grey deck wins it; unwinnable fights settled with the dev menu, D75), befriend via The Open Hand, save/reload mid-fight; then T tags `v0.1.0-checkpoint`, publishes the GitHub release and builds the EAS preview APK. The reset point before any content work. `plan/revamp/checkpoint.md`. Requires R1, R2a, R2b, R3a, R3b, R3c, R4, R5, R6a, R6b, R7c, R7c2, R7c3, R7d, R7d2, R7e, R7e2, B4, R8, R9, R9a, R10, R10b, R10b2, R10c, R10c2, R10c3, R10d.
- [x] Phase BT — Blood Price trial set (D75): T records the rehearsal ballot's verdicts, then the survivors are wired in as a removable trial set with the engine pieces they need (Curse, Global, SACRIFICE, EXILE, a lane relic naming the family, the 2-random + 1-lane combat reward); tests the reward mechanism and a real Act 1 clear. Removal must stay a small mechanical change (one library file, one registration point, saves drop removed ids, a test that the game runs without the set). `plan/revamp/cards.md` → "The trial set". Requires RC, B4. Shipped attended with T (D80): the 30 kept cards, the grey Curse and the Blood Price lane live; the lane relic and the 2-random + 1-lane reward stay open. (76c52ef4, 25c38066, 9f9e481b, 8a57f4f4)
- [x] Phase BT1 — Blood Price revision 2 (attended, T 2026-10-11): the five Curse cards cut and five SACRIFICE cards added in their slots (Bloodletting, Open Vein, Blood for Blood, Crimson Pact, Transfusion), five buffs, M-08d and E-03d retuned, LEECH as a stacking debuff (turns and potency), a new 20-card test deck chosen by role; the Bleeding Signet (+20 max VITAE, Crimson Covenant) worn beside the Suppliant's Ring in the existing trinket slots; dev GET ALL RELICS; a pacing sim at live foe VITAE with a witness and a human-like driver, and proposed (unapplied) numbers for the 3/5/7 fight-length target (D81). (aa1d98ab, be174886, 839393c0, 01133bd5)
- [x] Phase RC2 — v0.2.0 release (attended, D78), cut 2026-10-11 as `v0.2.0` on eb75f451 with its GitHub release (D83); no EAS build from the tag (T had a same-day preview APK). Gate: checks green; the four-region walk with the Blood Price test deck, honest fights, the dev quick-win only when stuck; four rules bugs accepted and filed. `plan/revamp/checkpoint.md` → "RC2".
- [x] Phase R12a — Measured-truth baseline (plotted by T, 2026-10-12): the grey deck and the Blood Price test deck measured across the Act 1 ledger (fight × stat spread) with lowest VITAE, into `docs/reports/measured/{history.jsonl,latest.md}`; refreshed on every mechanics merge to `main` and Sundays by `measured-truth.yml`; drifts past `thresholds.json` land in the `/digest` entry and as `[content]` AUDIT rows; `docs/truth-sources.md` "Measured truth" points at it. Measurement only (D57), no tuning (D37, D88); the engine half of R12. Brief `plan/phases/phase_R12a_measured_truth_baseline.md`. Requires R9, R11. (#505)
- [x] (#521) Phase BT2a — One card face (D91) (plotted by T, 2026-10-13; the card half of BT2): every face gets the FREE corner pill in the card's colour, a one-line name, seamless art and one die : PAID line; no rarity pips. Brief `plan/phases/phase_BT2a_card_face.md`. Requires BT.
- [x] (#529) Phase BT2b — The combat board layout (D92) (plotted by T, 2026-10-13; the board half of BT2): footer dock (avatar, VITAE bar, wide END), full-width hand, intent top-left, conviction column under it, LOG in the pilgrim modal. Brief `plan/phases/phase_BT2b_board_layout.md`. Requires BT2a.
- [blocked: owner-led — T's session 2026-09-28] Phase B1 — The relic pass. `plan/revamp/relics.md`. Requires R4, RC.
- [blocked: owner-led — T's session 2026-09-28] Phase B5 — Card-creator workflow. `plan/revamp/cards.md`. Requires B4, RC.
- [blocked: owner-led — T's session 2026-09-28] Phase B6 — Card sessions. Plan B, one slice per lane; families of sub-lanes and bridge cards within a family (D73). `plan/revamp/cards.md`. Requires B4, B5, RC.
- [blocked: owner-led — T's session 2026-09-28] Phase B2 — Enemy revamp: normal / elite / region boss / act boss. `plan/revamp/enemies.md`. Requires R9, RC.
- [blocked: owner-led — T's session 2026-09-28] Phase B10 — Dev menu revamp (the reset leaves the dev menu alone except compile fixes). `plan/revamp/mobile.md`. Requires R8, RC.
- [blocked: owner-led — T's session 2026-09-28] Phase B7 — Deck tab UI revamp. `plan/revamp/mobile.md`. Requires R8, RC.
- [blocked: owner-led — T's session 2026-09-28] Phase B8 — Card art revamp. `plan/revamp/mobile.md`. Requires R8, RC.
- [blocked: owner-led — T's session 2026-09-28] Phase B9 — Labyrinth re-theme. `plan/revamp/labyrinth.md`. Requires B2, RC.
- [x] Phase R11 — Reopen the loop (attended, T 2026-10-12, D84-D90): revamp mode removed; code lands by `loop:pr` PRs T merges, kept green by `pr-autofix` (Haiku) and mergeable by `pr-resolve`, at most 3 open; `/plot` and `/messy` as T's intake, the loop builds only briefed rows; a Retro step and the counted lessons ladder (`check-lessons`); content per surface (D88), `/expand` bold (D89). `plan/revamp/loop.md` → "R11" ("As shipped"). (#503)
- [x] (#553) Phase PF4 — No exploration map under live combat (plotted by T, 2026-10-14): while the fight is on screen the exploration screen unmounts the map canvas, node grid, confirm panel, badge, toast and header; prelude and aftermath keep the map behind them. Brief `plan/phases/phase_PF4_no_map_under_combat.md`. Requires nothing.
- [x] Phase PF3 — Sentry performance on preview builds (#549) (plotted by T, 2026-10-14): preview APKs send slow/frozen frames per screen, app start, and one span per combat drag (`combat.drag.<kind>`) to Sentry; production and web send none. Brief `plan/phases/phase_PF3_sentry_perf_drag_spans.md`. Requires nothing.
- [x] (#571) Phase LV1 — The level curve (plotted by T, 2026-10-15): a full Act 1 clear ends at level 20 (base 70 XP, each level 10% dearer to 20, 15% to 40, 20% after), 1 stat point per level, no VITAE refill on level-up, saves keep their level (v37). Brief `plan/phases/phase_LV1_level_curve.md`. Requires nothing.
- [x] (#596) Phase RV1a — The gate (plotted by T, 2026-10-16): `pr-review.yml` with an always-reporting `verify-gate` check (green only when every triggered `verify-*` is green, running root `npm test` itself on uncovered paths), `scripts/pr-risk.mjs` deriving `risk:low|medium|high` from the diff and `verify-gate` applying it to every same-repo PR at open, and the ruleset command T runs in evaluate mode. Brief `plan/phases/phase_RV1_pr_review_pipeline.md` § RV1a. Requires nothing.
- [x] (#602) Phase RV1b — The reviewer (plotted by T, 2026-10-16): `skills/review.md` as a shadow reviewer on `loop:pr` and `plot` PRs (inline MED/HIGH findings, one verdict comment with its marker, the `risk:*` label raised only with a reason, no Edit/Write), the `pr-review` judge in the escape ledger, and Stage 2 filed as one `plan/NEEDS_T.md` row (D86 holds). Brief `plan/phases/phase_RV1_pr_review_pipeline.md` § RV1b. Requires RV1a.
- [x] (#610) Phase RV1c — Three lenses, then the seeded replay (plotted by T, 2026-10-16): on `risk:medium` and `risk:high` the review skill runs three Sonnet sub-agents with distinct lenses (Rules, Tests, Blast radius) merged into the one verdict; then `seeded-replay --judge review` scores that reviewer on D1–D4 against the Part 4 thresholds. Brief `plan/phases/phase_RV1_pr_review_pipeline.md` § RV1c. Requires RV1b.
- [x] (#628) Phase HP1a — No bin, an honest count, the card report, demos back in band (plotted by T, 2026-10-18): puzzle sessions have no discard; a winning outcome counts only cards that change the result; `hazardPuzzleCardReport` and `npm run puzzle:report`; demos re-authored into band. Brief `plan/phases/phase_HP1_hazard_cost_utility.md` § HP1a. Requires nothing.
- [x] (#631) Phase HP1b — The puzzle board loses its bin (plotted by T, 2026-10-18): `/devpuzzle` shows no bin; the live `/hazard` board keeps it. Brief `plan/phases/phase_HP1_hazard_cost_utility.md` § HP1b. Requires HP1a, B3e2.
- [ ] Phase HP3a — The puzzle rolls and draws like a live hazard (plotted by T, 2026-10-19): the dice roll in on the layout's faces and the clock starts after; drawn cards slide in from the reserve; nothing random. Brief `plan/phases/phase_HP3_puzzle_randomness_illusion.md` § HP3a. Requires nothing.
- [ ] Phase HP3b — Rerolls and gained dice animate (plotted by T, 2026-10-19): a reroll plays the roll onto the layout's next faces and a gained die arrives like a salvage die. Brief `plan/phases/phase_HP3_puzzle_randomness_illusion.md` § HP3b. Requires HP3a, HP1c.
- [x] (#633) Phase HP1c — Signed costs, +1 die, reroll to set faces (plotted by T, 2026-10-18): negative card values on either line, the `gainDie` and `reroll` effects with layout-set reroll faces, DRAW and CONVERT with costs, tested on fixture cards only (no card or keyword added, D37). A paid cost (a die spent on a card that still costs) needs a second utility, and `gainDie` and `reroll` counts are per card with no defaults (T, 2026-10-19). Brief `plan/phases/phase_HP1_hazard_cost_utility.md` § HP1c. Requires HP1a.
- [ ] Phase HP1d — The worse-copy test (ruled by T, 2026-10-19): a library test fails a card that is unused in every layout holding it, or that another card beats in every layout. Brief `plan/phases/phase_HP1_hazard_cost_utility.md` § HP1d. Requires HP1c.
- [x] (#623) Phase B3e2 — The hazard puzzle on the live hazard board (plotted by T, 2026-10-18): the `/devpuzzle` demo board renders through the live `HazardBoard`, cards, dice, drag controller and `RouteSelect`, adding only the clock, reserve count, unlock line and outcome in the hazard palette; the B3e tap-button view is deleted; a live `hazard-board` visual shot sits beside `devpuzzle-board`. Brief `plan/phases/phase_B3_hazard_puzzle.md` § B3e2. Requires B3e.
- [ ] Phase R12 — New combat-playtest (attended): design and write a new `/combat-playtest` command for the rebuilt game (the old one was archived in R0), around the real questions after the reset: does stat growth track the Act 1 curve, are the survivors winnable and dangerous, what the matrix should measure (lowest VITAE included). Keeps the engine matrix CLI; designs the command on top of R12a's `measuredTruthCells`. `plan/revamp/loop.md`. Requires RC, R11, R12a.
- [ ] Phase PF2 — Combat SVG rasterisation (plotted by T, 2026-10-13) (attended): the combat board's static SVG layers drawn once, first as cached textures, then as webp only if T's Android numbers say the SVGs still cost frames; no pixel changes (D37, D88). Brief `plan/phases/phase_PF2_combat_svg_raster.md`. Requires PR #510 merged and its Android baseline tables filled by T.
- [x] Phase EV1a — The escape ledger (#565) (plotted by T, 2026-10-15): every `loop:pr` PR merged since 2026-10-12 with the checks that ran and the ones path filters skipped, 7-day fix or revert follow-ups and antagonist verdicts, plus the six seeded 2026-10-14 escapes, each naming the gate that should have caught it; measurement only, no gate changes. Brief `plan/phases/phase_EV1_loop_eval_ledger.md` § EV1a. Requires nothing.
- [x] (#576) Phase EV1b — Do the tests fail on the parent? (plotted by T, 2026-10-15): each ledger PR's new tests are run against its parent commit; tests that pass there are flagged "could not fail" and acceptance ticks resting on them are listed as unproven. Brief `plan/phases/phase_EV1_loop_eval_ledger.md` § EV1b. Requires EV1a.
- [x] (#579) Phase EV1c — Planted defects and mutation scores (plotted by T, 2026-10-15): StrykerJS on the combat engine and two presenters, the 2026-10-14 real bugs replayed on local scratch branches, and a miss-rate table per judge (CI path filters, verify, antagonist, /critique, merge gate, builder `[x]`). Brief `plan/phases/phase_EV1_loop_eval_ledger.md` § EV1c. Requires EV1a.
- [x] (#583) Phase EV1d — Ranked fixes, success evidence and the /messy dump (plotted by T, 2026-10-15): fixes ranked by misses prevented per size, a frozen past-PR set with expected verdicts, a seeded-defect catch-rate target, the 20-merge change-failure baseline and a "For /messy" section, one theme per gate; no fix built. Brief `plan/phases/phase_EV1_loop_eval_ledger.md` § EV1d. Requires EV1b, EV1c.
- [x] (#581) Phase B3a — Puzzle layout and one-round session (plotted by T, 2026-10-15): a fixed layout (hand, predetermined DRAW reserve, dice, a goal per route, band, stat unlocks) played once on the existing card and die rules with no RNG; RE-CAST rejected; Act 1 hazards untouched. Brief `plan/phases/phase_B3_hazard_puzzle.md` § B3a. Requires nothing.
- [x] (#584) Phase B3b — The solver and the band check (plotted by T, 2026-10-15): counts distinct winning outcomes through the session transitions; a library test fails any layout that is unsolvable or outside its band (easy 30+, medium 5-29, hard 1-4). Brief `plan/phases/phase_B3_hazard_puzzle.md` § B3b. Requires B3a.
- [x] (#587) Phase B3c — Outcome: XP, loot, completion bonus and scaled failure (plotted by T, 2026-10-15): one pure outcome function: XP, a modest consumable roll and a region material always; the route purse on full completion; VITAE loss scaled by value reached; scar under half. Brief `plan/phases/phase_B3_hazard_puzzle.md` § B3c. Requires B3a.
- [x] (#588) Phase B3d — Stat unlocks (plotted by T, 2026-10-15): optional per-layout thresholds: +1 die (Body red, Mind blue, Heart purple), an extra card, or blanks turned to authored faces; the solver proves no unlock makes a puzzle harder. Brief `plan/phases/phase_B3_hazard_puzzle.md` § B3d. Requires B3b.
- [x] (#592) Phase B3e — Three demos and the dev-menu board (plotted by T, 2026-10-15): three demo puzzles (easy, medium, hard) authored backward with the solver, played from a dev-menu HAZARD PUZZLES board with a per-band clock. Brief `plan/phases/phase_B3_hazard_puzzle.md` § B3e. Requires B3b, B3c, B3d.
- [ ] Phase B3f — Timed demo solves and the process lock (plotted by T, 2026-10-15) (attended): first-time solves timed by the playtester agent and T, clocks set to median x 1.5, and T's verdict on locking the process before Act 1 rollout. Brief `plan/phases/phase_B3_hazard_puzzle.md` § B3f. Requires B3e, B3e2, HP1a, HP1b, HP3a.
- [ ] Phase HP2a — Card audit and the puzzle card pool (plotted by T, 2026-10-18): `npm run puzzle:audit` writes the card audit (identical-behaviour groups, banned and inert fields, keep or cut); `HAZARD_PUZZLE_CARD_POOL` is the list T's merge approves (D37), enforced by `validateHazardPuzzleLayout`; `HAZARD_DECK` unchanged. Brief `plan/phases/phase_HP2_puzzle_card_audit_difficulty.md` § HP2a. Requires HP1a.
- [ ] Phase HP2b — Five difficulty features in the solver (plotted by T, 2026-10-18): winning lines, opening share, near misses, shortest win and draw dependence per layout and route, in `puzzle:report`. Brief `plan/phases/phase_HP2_puzzle_card_audit_difficulty.md` § HP2b. Requires HP1a.
- [ ] Phase HP2c — The dev-only move log (plotted by T, 2026-10-18): `/devpuzzle` logs each move with a timestamp and copies the log as JSON in dev builds; production records nothing. Brief `plan/phases/phase_HP2_puzzle_card_audit_difficulty.md` § HP2c. Requires HP1b.
- [ ] Phase HP2d — The calibration set (plotted by T, 2026-10-18): 13 to 20 calibration puzzles from the pool (3 to 5 held out), each feature taking at least four values. Brief `plan/phases/phase_HP2_puzzle_card_audit_difficulty.md` § HP2d. Requires HP2a, HP2b.
- [ ] Phase HP2e — Calibration solves and the difficulty report (plotted by T, 2026-10-18) (attended): T and the `playtester` agent solve every calibration puzzle first-time; `puzzle:calibrate` picks the feature with the highest Spearman ρ against pooled median time (bar 0.7) and checks the held-out bands; `docs/reports/hazard-puzzle-difficulty.md` records it with T's verdict. Brief `plan/phases/phase_HP2_puzzle_card_audit_difficulty.md` § HP2e. Requires HP2c, HP2d, B3f.
- [ ] Phase HP2f — Bands on the calibrated measure (plotted by T, 2026-10-18): `HAZARD_PUZZLE_BANDS` moves to the adopted measure and the demos sit in band, or the report records why the count bands stayed. Brief `plan/phases/phase_HP2_puzzle_card_audit_difficulty.md` § HP2f. Requires HP2e.
- [ ] Phase LG1a — Plan-queue lint (plotted by T, 2026-10-18): `scripts/check-plan-queues.mjs` lints the AUDIT, CRITIQUE, PHASE_CANDIDATES and Status-block rows in the root `npm test`. Brief `plan/phases/phase_LG1_loop_gates.md` § LG1a. Requires nothing.
- [ ] Phase LG1b — Path coverage in verify-gate (plotted by T, 2026-10-18): `verify-gate` fails and names a changed path no `verify-*` filter owns. Brief `plan/phases/phase_LG1_loop_gates.md` § LG1b. Requires nothing.
- [ ] Phase LG1c — Acceptance proof in verify-gate (plotted by T, 2026-10-18): every ticked acceptance line names a test, shot or command, or says `(no test: <reason>)`. Brief `plan/phases/phase_LG1_loop_gates.md` § LG1c. Requires nothing.
- [ ] Phase LG1d — Fail-on-parent in verify-gate (plotted by T, 2026-10-18): an added test that passes on the parent fails the gate unless marked `guard-test:`. Brief `plan/phases/phase_LG1_loop_gates.md` § LG1d. Requires nothing.
- [ ] Phase LG1e — The critique pass record (plotted by T, 2026-10-18): each `/critique` pass appends to `docs/reports/critique/passes.jsonl` and the miss-rate table counts it. Brief `plan/phases/phase_LG1_loop_gates.md` § LG1e. Requires nothing.
- [ ] Phase LG1f — The judge job (plotted by T, 2026-10-18): a `judge` job re-runs each named acceptance proof on the PR head; a failure turns `verify-gate` red. Brief `plan/phases/phase_LG1_loop_gates.md` § LG1f. Requires LG1c.
- [ ] Phase LG1g — Report-only mutation on changed lines (plotted by T, 2026-10-18): Stryker on a PR's changed lines under a 15-minute budget, score and survivors posted, never failing. Brief `plan/phases/phase_LG1_loop_gates.md` § LG1g. Requires nothing.
- [ ] Phase LG1h — Android smoke test (plotted by T, 2026-10-18) (attended): a hand-run workflow builds the preview APK, boots an emulator and runs a Maestro flow to one combat round. Brief `plan/phases/phase_LG1_loop_gates.md` § LG1h. Requires nothing.
- [ ] Phase CT1a — Real-fight helper and the state tests (plotted by T, 2026-10-19): `startRealFight` boots a fixture save into a real encounter; the 12 state and presenter tests start from it. Brief `plan/phases/phase_CT1_real_fight_tests.md` § CT1a. Requires nothing.
- [ ] Phase CT1b — Combat board tests and the mock deleted (plotted by T, 2026-10-19): the 25 combat board tests start from a real fight; `state/mocks/combat.mock.ts` deleted with an import guard. Brief `plan/phases/phase_CT1_real_fight_tests.md` § CT1b. Requires CT1a.
- [ ] Phase RS1 — The loop sweeps hand-written reports (plotted by T, 2026-10-19): `scripts/report-sweep.mjs` finds unfiled `axiomancer-*/docs/reports/*.md`; `/march` triage files one CRITIQUE row each. Brief `plan/phases/phase_RS1_report_sweep.md`. Requires nothing.
- [x] (#569) Phase CR1a — The combat route and its gate, map and labyrinth (plotted by T, 2026-10-15): a global `CombatGate` starts each fight and pushes `/combat-encounter`, now the live fight route (`fullScreenModal`, no back or swipe out, a reload replays the fight onto it); exploration and labyrinth stop rendering combat; the pre-v1 dev sandbox and its tests are deleted and every tool that used it reaches a fight through `/dev` instead. Brief `plan/phases/phase_CR1_combat_route.md` § CR1a. Requires nothing.
- [x] (#573) Phase CR1b — Delete the overlay era, labyrinth round-trip e2e (plotted by T, 2026-10-15): `EncounterModalOverlay`, its chain bars and rivets, `inEncounterModal` tab hiding and locking, `fightOnScreen` and the `StatusCard` skip deleted, proven by a grep; a new labyrinth combat round-trip e2e. Brief `plan/phases/phase_CR1_combat_route.md` § CR1b. Requires CR1a.
- [skipped] Phase CR1c — Combat drag numbers before and after the route (plotted by T, 2026-10-15) (attended): Sentry `combat.drag.*` p75 per kind from T's preview APK, before CR1a and after CR1b, in `docs/perf/combat-drag-baseline.md`. Brief `plan/phases/phase_CR1_combat_route.md` § CR1c. Requires CR1b. Skipped by T, 2026-10-15: Sentry holds no performance data from before the route (PF3 tracing landed the same day and no APK with it was played), and PF4 had already removed the map cost the route was expected to change.
- [x] (#523) Phase SF1 — The SACRIFICE floor points at the VITAE bar (plotted by T, 2026-10-14): a line refused because its SACRIFICE would leave you below 1 VITAE flags the player VITAE bar and shows the unpaid SACRIFICE; the engine supplies the shortfall, mobile only draws it. Brief `plan/phases/phase_SF1_sacrifice_floor_callout.md`. Requires PR #516 merged.
- [x] Phase GS1 — Globals stack, experimental (plotted by T, 2026-10-14): a second copy of a Global in play is no longer refused; each copy is its own instance, fires its own trigger and leaves on its own expiry; every rule line marked experimental. Brief `plan/phases/phase_GS1_stacking_globals.md`. Requires nothing. (#520)
- [x] (#507) Phase RH1 — Roster-health lenses (plotted by T, 2026-10-12): `auditRosterHealth` over enemies, consumables, relics, NPCs, dialogue trees and quests; a dangling reference (names an id that does not exist) fails the engine test and is a `gap` the loop fixes by deleting or re-pointing the reference; an orphan (nothing reaches it) is pinned in the test and filed as a `[content]` AUDIT row for T (D88). CLI `npm run roster-health`; `/iterate` §4 gains category H. Nothing staged, granted or retired. Brief `plan/phases/phase_RH1_roster_health_lenses.md`. Requires R11.
- [x] Phase CS1 — Card-spec scaffold and card-rules lint (plotted by T, 2026-10-12): `docs/card-spec.md` as a DRAFT skeleton, one section per card rule from the B4 inventory (Live rule / Ratified, not built / T's call, the calls pasted from T's interactive ballot); `card-rules.engine.test.ts` fences the complexity budget by rank, the scrap floor, the Global text template and the carrier rule with a pinned exemptions fixture (today's offenders filed as `[content]` rows for T's next card session); `check-prose` reads the card libraries; `content-drift` checks ledger ↔ lane parity. No card, keyword, relic or text changed (D37, D88); B5's tool shape stays T's. Brief `plan/phases/phase_CS1_card_spec_scaffold.md`. Requires B4, R11. (#509)
- [x] Phase PF1 — Weekly performance audit (D77): a Sunday workflow measures web load and bundle, runtime smoothness on a scripted combat round, and engine speed; keeps a committed history and budgets; a budget breach or week-over-week drift files a `[perf]` row in `plan/AUDIT.md`. Report-only, never a gate. Tooling only. `plan/revamp/tooling.md` → "PF1"; brief `plan/phases/phase_PF1_weekly_perf_audit.md`. Requires RC. (ca2e13db; first audit and seeded budgets 2fe31b97)
- [x] Phase DC1 — Dev menu CARDS section (attended, T 2026-10-10): `/dev` gains CARDS: TEST LANE DECK (a drop-down of card lanes + SET DECK, which replaces the whole deck with the lane's test deck) and REWARD POOL (a checkbox per lane + SET REWARD POOL, saved as `Character.devRewardLaneIds`). The engine gains the card-lane registry (`Cards/card.lanes.ts`); the grey office is its only lane, and BT registers Blood Price there. Tooling only, no card content. (b7e977c9)

**Field evidence blockers (direct T promotion):**
- [x] Phase 14 — First-map route audit and survivorship semantics (9180fa5d)

**Calibration (small, low-risk — prove the loop works in this repo):**
- [x] Phase 1 — Combat test-coverage backfill (0af106ff)

**Engine depth (status-effect doctrine):**
- [x] Phase 2 — Projected-lethality readout API (128659e0)
- [x] Phase 3 — Enemy combat-phase progression / "rage mode" (e87559d0)
- [x] Phase 4 — Balance-sim population witnesses for the HP kill-paths still lacking pop-level coverage (d9763659)

**Mobile surfaces (presenter-only, low engine risk):**
- [x] Phase 5 — Village SELL tab: surface the engine's `sellItem` / `defaultSellPrice` (98e7b2bc)
- [x] Phase 6 — Memoir run-history surface: read-back of deaths (48d2c802)
- [x] Phase 7 — `combatMana` -> engine `combatResources` migration (bdca1068)

**Content pipeline:**
- [x] Phase 8 — Northern Forest region content extension (3bb6eeaa)
- [x] Phase 9 — Author the first real character/story/world specs (7ea06a6e / 6fa7f090)

**Equipment / signature refactor (T-directed 2026-07-09 — a 5-phase
epic, phases 18-21 + 23 (22 was taken by the shipped CLI guardrail
phase); ship in order, each phase leaves `main` green + playable.
Promoted above phase 17 by T-direction 2026-07-09):**

The end state: a character wears **exactly 5 pieces across 3 slot
kinds — 1 weapon, 1 armor, 3 accessories** (an accessory is one of an
explicit extensible kind list — head, hands, feet, amulet, ring, charm
for now; torso wear is armor, NOT an accessory; the three positions
are interchangeable). Equipment is decoupled from effects and from the
procedural modifier/rarity/affix machinery; the only equipment is a
fixed set of **8 "signet" relic pieces** (2 weapons, 2 armor, 4
accessories), each granting **one** signature skill plus a **static
stat bump**. Signatures are no longer selected by archetype — they come
solely from the worn loadout, so the slot model IS the wear-cap and the
build choice (2 × 2 × C(4,3) = 16 loadouts). Briefs carry the full
decision log (see each phase file).

- [x] Phase 18 — 5-slot equipment model (5e4ca6e0)
- [x] Phase 19 — Equipment-granted signatures + the 8 signet relics (fbf3d52c)
- [x] Phase 20 — Decouple equipment from effects (8907c08f)
- [x] Phase 21 — Retire the procedural equipment library (51c2cb51)
- [x] Phase 23 — Teardown of dead equipment machinery (e4d02d21)

**Cross-cutting / debt:**
- [x] Phase 10 — Multi-screen integration test harness (7692758e)
- [x] Phase 11 — Tutorial / onboarding flow (1fb1d7f8)
- [x] Phase 12 — Doc-sync pass: reconcile `spec.md` / `docs/combat.md` with the shipped engine surface (cb5c6467)
- [x] Phase 13 — Hazard v2 engine port (9d279c13)
- [x] Phase 15 — Hazard first-crossing tutorial (0e03ee02)
- [x] Phase 16 — Loot-Cache ("The Reliquary") first-delve tutorial (95f67302)
- [skipped] Phase 17 — Quest Board ("The Boy's Almanac") first-session
      tutorial (GAP-001 follow-up), mirroring the Rest/Gathering/Combat
      tutorials (mobile) (skipped via /oversight 2026-07-10 — already
      shipped-then-reverted once as premature (`375b141f`); a pending
      CRITIQUE.md finding proposes redesigning the entire early game as
      canned per-battle preset-deck tutorials, which would subsume or
      reshape this scope. Drop rather than reship narrow; let the
      early-game rethink go through `/iterate`/a design pass first, and
      re-derive a quest-board tutorial phase from whatever that lands on.)

**CLI verification guardrail (T-directed 2026-07-09):**

- [x] Phase 22 — Mechanics CLI verify-gate coverage (01a3d2ed)

**Docs/harness integrity (T-directed 2026-07-10):**

- [x] Phase 24 — axio-query: MCP surface over the live engine data (7a33efbc)
- [x] Phase 25 — /consolidate memory curator + 2026-07-09 harness re-apply (f7868e2a)

**Engagement-overhaul roadmap (promoted via `/oversight` 2026-07-10 —
owner-ratified 2026-07-10, all four decision gates cleared; ship in
order, intra-batch gates noted per phase):**

- [x] Phase 26 — The Turn Law (f849c5a2 / 6ea123fc)
- [x] Phase 27 — Re-baseline (30e43eb2)
- [x] Phase 28 — Show the Engine (60af3044)
- [x] Phase 29 — The Language (cc39fb5f)
- [x] Phase 30 — FREE Lines (5e723df3)
- [x] Phase 31 — The Roll and the Read (380e3849 / 48c89f34 / 040202fd)
- [x] Phase 32 — Theme Deep Work (10 part commits, 7392573c … 801e2d26)
Phase 33 — Enemy Answers (specs 29/30 slice + enemy counterplay).
SPLIT into shippable slices via oversight 2026-07-16 — the single
mega-brief bundled ~6 verbs and carried the Phase 32 stall risk on
oversized ticks. Each slice below must finish and commit on its own
tick. Shared sources: `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/tuning/2026-07-10-turn-texture.md` §3 +
`archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/tuning/2026-07-10-theme-identity.md` §1 +
`archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/tuning/2026-07-10-out-of-flow-mechanics.md` §2. All gated on
Phase 26 (numbers) but design-independent of the owner session
(mechanics).

- [x] Phase 33a — Reactive-verb core (69b2ccf1)
- [x] Phase 33b — Enemy archetypes + variable-rung telegraphs (8ceb86e5)
> **Owner priority 2026-07-18:** all remaining D-sequence phases ship
> before 33c/33d. Their pending rows are ordered after D7 below so `/march`
> cannot dispatch them early.

**Critique infra (promoted via `/oversight` 2026-07-10):**

- [x] Phase 34 — Non-MCP transport for unattended `/critique` (eab8429a)

**Loop infra (promoted via issue-triage 2026-07-14):**

- [x] Phase 35 — Reliable phase-issue auto-close (59cf9e6e)

**Pricing model (promoted via chat session 2026-07-17, T direct):**

- [x] Phase 36a — Alt-win-aware card pricing (7d26bebd)
- [x] Phase 36b — Tempo-aware card pricing (1927b15e)

**Combat rework (promoted via chat session 2026-07-17, T direct — spec 33
`33-upgradeable-dice.md`):** the four-die Upgradeable-Dice rework. Promote as
a SEQUENCE with per-phase gates. D1 is a thinking/review gate (no code, safe
to run live); **D2+ touch the engine — pause the `/march` + night crons
before starting them** (collision discipline). D1 also owns reconciling the
supersession collisions before any engine work.

- [x] Phase D1 — Upgradeable-Dice spec review-and-land (4adf7266)
- [x] Phase D2 — Engine core, flagged (18cf5e3b)
- [x] Phase D3 — Sim harness + economy derivation (61bbc8ca)
- [x] Phase D4 — Pricing re-derivation + card re-authoring (0e3bd2bb)
- [x] Phase D5 — Die gear + blacksmith (a25373be)
> **Phase D6 SPLIT into D6a–D6d (2026-07-17, ship-a-phase §10.8 decisive
> re-scope).** A scope scout confirmed the flag-on mobile combat render is
> GREENFIELD — zero mobile code reads any spec-33 state field
> (`momentumV2`/`dieGear`/dice `.face`/the new events); the D2/D5 engine is
> built and waiting. As one phase D6 is unrealistic: a type-level `CombatDieVM`
> rewrite touching the app's most delicate interaction (the Reanimated
> drag-to-power), a whole self-contained blacksmith screen (gate + slice +
> interception + route + forge UI — sibling encounters were each their own
> phase), a momentum-V2 chip reshape, and net-new e2e flag-hook plumbing (there
> is no Playwright in mobile — the browser e2e are bespoke `scripts/*.mjs` and
> the flag is bundle-time only). Parent brief `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/phases/phase_D6_mobile_ui.md`
> stays the north star; each sub-phase renders spec-33 rules AS-IS by EXTENDING
> the existing `STANCE_COLORS`/glyph/#5-SIDE-RAIL conventions (never forking),
> flag-gated so flag-off stays byte-identical.
>
> **D6e added via /oversight 2026-07-18** — a fifth D6-band row that is
> NOT mobile: enemy stanceCheck content (yield-lever), draining D3-F2.
> Parallel-safe with D6a–d, hard dep of D7. Listed after D6d below.

- [x] Phase D6a — Flag-on combat render core (311e2c3c)
- [x] Phase D6b — Momentum/stance chips + stance-check telegraph + gear rail (4cf7b752)
- [x] Phase D6c — Blacksmith screen (7c315d5f)
- [x] Phase D6d — Flag-on combat e2e (7af8dbc8)
- [x] Phase D6e — Enemy stanceCheck telegraphs (0b29ff42)
- [x] Phase D6f — The Roll Ritual (10ffe174)
- [x] Phase D7 — Tuning, ratification + honest re-baseline (701762bd)

- [x] Phase D-FLIP — Upgradeable Dice is the default player and balance-witness model (app-layer flip ae51ab3d; resolved by T 2026-07-23)
- [x] Phase D8 — One dice valve in every starter preset (10ec4fe8)
- [x] Phase D9 — Authored stance-check variety (2848fb6a)

**Post-D sequence (owner-deferred until every D phase ships, 2026-07-18):**

- [x] Phase 33c — THE COVETED DIE (fc7fddbf)
> **March order (set via /oversight 2026-07-20):** of the three unchecked
> phases, ship **Phase 37** (retire fallacy/paradox — independent, low-risk
> teardown) NEXT. Then Phase 38 (juice layer, owner-selected — now also
> carries the used-dice grey-out jot, see its brief). Phase 33d (GLYPHS
> pilot) last of the three.

- [x] Phase 33d — GLYPHS pilot (ac1853b2)

**Legacy-combat cleanup (owner-directed 2026-07-18, chat — ships on its own
branch, parallel to the D-sequence; does NOT preempt the D-sequence march
order):**

- [x] Phase 37 — Retire the fallacy/paradox card category + the dead `combatResources` token pool (5137511c)

**Mobile feel layer (promoted via chat session 2026-07-20, T direct —
missing-layers survey):**

- [x] Phase 38 — Central juice/animation layer (6f291ece)

**THE UNSHACKLING (T direct, /oversight 2026-08-08, second batch — a
product-level pivot that VOIDS several previously "locked" doctrines).**

> T's instruction, near-verbatim: *"remove constraints across the entire
> application. Normal damage is allowed, deck tuning is allowed to change
> anything about a card, no more philosophy based theme. I want to give
> you full freedom to take this deckbuilder in any direction."*
>
> This overrides `plan/bearings.md`'s "locked — do not re-litigate"
> entries by the documented source-of-truth hierarchy (*T's latest
> explicit decision > ADRs/CDRs > build plan > candidates > critique/
> audit > historical reports*). Three constraints fall:
>
> 1. **The strike is alive.** Cards may deal raw enemy-HP damage. The
>    no-strike law (spec 32 v3 §1/§12) and the status-effect-dominance
>    balance doctrine are both VOID for combat.
> 2. **`/deck-tuning` has full card authority.** No sandbox-first
>    quarantine, no byte-identity law, no recolor-not-repartition rule,
>    no owner ballot per change, no `[needs-user-call]` on recolors or
>    new cards. It may change anything about any card.
> 3. **Philosophy theming is retired** as the product's organising
>    fiction.
>
> **Sequencing consequence — read before touching Phase 39 or 40.** Both
> were promoted EARLIER THE SAME DAY against the old doctrine and are now
> built on removed premises: Phase 39 tuned toward a status-dominance
> band that no longer exists (and without normal damage, which is now the
> single largest available lever), and Phase 40 would author card text
> for cards about to be renamed. Both are RESEQUENCED behind the
> unshackling phases below — scope preserved, order changed. See the
> Queue change log.

- [x] Phase 41 — Constraint demolition (1bd9bd2b)
- [x] Phase 42 — The Dark Fantasy campaign bible (46b5a5df)
- [x] Phase 43 — Objective function v2 (21a68f2, squash-merged as 46b5a5df)

**Retheme execution (44a-44i) — decomposed 2026-08-08 at T's request.
Whole-product scope. Each sub-phase is independently shippable and
verifiable; run them IN ORDER — the map and the guard come first so every
later phase has a safety net, and the product shell comes last because it
describes what the others changed. All depend on Phase 42 being ratified;
none may start early (bearings forbids opportunistic renaming).**

- [x] Phase 44a — Rename infrastructure (c5e0f13b)
- [x] Phase 44b — Keyword registry + glossary retheme (04c75d22)
- [x] Phase 44c — Card library retheme (d64bcadc)
- [x] Phase 44d — Themes + presets retheme (c73173a5, verification-only)
- [x] Phase 44e — Enemies + threat sequences retheme (865eb90a)
- [x] Phase 44f — World, maps and minigame naming (4b9083c1)
- [x] Phase 44g — Characters, story, dialogue and quests (74f66110)
- [x] Phase 44h — Morality + alignment retheme (abee6e92)
- [x] Phase 44i — Product shell + docs (9a1dabde)

- [skipped] Phase 45a — Re-home dice upgrades: design session (attended).
      **ANSWERED BY T DIRECT, attended chat 2026-08-08 — no session
      needed.** 45a existed to decide where D5's HONE/TEMPER die-gear
      economy lives, given the blacksmith screen is dev-menu-only and T
      ruled it the wrong surface on 2026-07-18 (candidates named: rest
      site, relic, event). T picked the **rest site**, unprompted, as
      part of the rest-choice ruling: the anvil is one of three doors on
      every rest node, at rest-node cadence — which settles the cadence
      half of 45a in the same stroke. Superseded by **Phases 52a-52f**;
      see the Queue change log.
- [skipped] Phase 45b — Re-home dice upgrades: implementation.
      Superseded by **52c** (the anvil offer, composing the existing D5
      blacksmith engine), **52d** (the screen — which makes the anvil
      player-reachable for the first time and retires the dev-menu-only
      entry as the sole door) and **52f** (de-placeholdering the prices
      against measured shilling income). Nothing in 45b's scope is
      dropped; it is redistributed.

**The rest-choice epic (52a-52f) — T direct, attended chat 2026-08-08.
Removes the Night Watch rest minigame and replaces the rest node with a
ONE-SHOT THREE-WAY CHOICE: heal 20%, upgrade a die at the anvil for a
high price, or cut a card from the deck for a low-but-escalating price.
Once an option is chosen the node is done and locked. Ship IN ORDER —
the replacement must be reachable before the Night Watch comes out, or
`main` ships a map node with no host screen.**

> T verbatim: *"I want you to plan and add phases to remove the Rest
> mini-game and replace it with a choice for the players: 1) Rest (heal
> 20% of the player's health) 2) Use the blacksmith (upgrade a die for a
> high price of whatever currency name we have) 3) Remove a card from the
> player's deck (Low price to start, but every time the player does this
> across the game, it costs a little more). Once the player chooses an
> option, the rest is done/completed/locked."*
>
> The currency is **SHILLINGS** (`Character.currency`). Four follow-up
> rulings in the same session: **full retirement** of the Night Watch
> (over park-behind-a-flag / keep-as-rare-node); **flat 20%, inns
> exempt**; **prices proposed now, calibrated later** in a dedicated
> phase; and **45a/45b collapse into this epic**.
>
> Naming is theme-bearing and Phase 42 has not ratified the bible yet —
> `plan/bearings.md` forbids improvising dark-fantasy flavor in passing.
> Every phase below uses NEUTRAL working names (`RestChoice`, `rest` /
> `anvil` / `cut`) and keeps player copy in the mobile copy layer so
> Phase 44f can rename it properly. Do not name this node poetically.
>
> **Interaction with the V-sequence (noted 2026-08-08 at merge).** The
> Woodcut Codex landed while this epic was being planned; the two queues
> touch in two places. (a) **V5** wires backgrounds into "encounter
> screens" — `/rest` is one, and **52e deletes the Night Watch screen**.
> Whichever runs second wins; running V5 first means styling a screen
> about to be replaced. Prefer 52d/52e first, or have V5 skip `/rest`
> and pick it up after. V6's glyph unification names hazard / gathering
> / cache / combat and NOT rest, so it is unaffected. (b) **V1 already
> restyled `axiomancer-mobile/app/blacksmith/index.tsx`** — 52d's
> "reuse the blacksmith screen, do not rebuild it" still holds and is
> now cheaper, but read the current file, not the pre-Woodcut one.

- [x] Phase 52a — Deck-removal engine primitive + the escalating price (dd5c46a, squash-merged as 46b5a5df)
- [-] Phase 52b — Make the inn a first-class thing. T's "inns exempt" is
      unimplementable against current data: `INN_REST_HEAL_FRACTION`
      makes "is this an inn?" mean `healFraction >= 1.0`, and **three
      wilderness nodes are authored at 1.0** (`nf-4` cold spring, `nf-24`
      hidden grove, and every `fvRestPool` node) — so two forest springs
      currently mend hazard-scarred max-VITAE like a paid shelter. That
      is a live bug the flat-20% rule would cement. Add
      `RestPayload.shelter: 'camp' | 'inn'`, re-author all six rest
      pools, re-home the scar mend onto it, retire `healFraction`.
      Changes no heal numbers — 52c does the arithmetic, so a regression
      here stays legible. (mechanics + mobile) Deps: none.
      Brief: `plan/phases/phase_52b_first_class_inn.md`.
      — `feat(mechanics,mobile): make the inn a first-class thing — phase 52b` (8444922)
      **CARRY-OVER:** retiring a per-node knob was not fully number-neutral.
      Four nodes whose sub-1.0 authoring had nowhere to go now heal at the
      carried-forward default 1.0 (`nf-11` 0.75, labyrinth act default 0.2,
      waystones 0.35/0.5). 52c overwrites all four — until it ships, those
      rests are player-favorable. `REST_PASSIVE_HEAL_FRACTION` is marked
      carried-forward-pending-52c; do not tune it elsewhere.
- [x] Phase 52c — The rest-choice engine (e1ae8318)
- [x] Phase 52d — The rest-choice screen, and the anvil finally reaches players (3dda879a)
- [x] Phase 52e — Retire the Night Watch (d83978cb)
- [x] Phase 52f — Calibrate the shilling economy (97560058)

**Narrative encounters (53a-53e) — added 2026-08-09 at T's request
("add phases in order to make sure narrative encounters work"). Evidence:
`axiomancer-mechanics/docs/reports/NARRATIVE-ENCOUNTER-AUDIT.md`; design:
`specs/story/S-02-fishing-village-voices.md`. Ship IN ORDER — the sequence
is machinery → placement → content → reactivity, because authoring against
a broken gate ships more dead content, which is how this state arose.
Orthogonal to 44g: that phase rewrites what existing lines SAY, this batch
changes which lines a player can REACH. Either order works; 53a first grows
44g's surface from 3 reachable trees to 7.**

- [x] Phase 53a — Narrative reachability: the guard, then the mismatches (fafc7b4e)
- [x] Phase 53b — The dialogue gate context, completed in the live path (75fb5205)
- [x] Phase 53c — Placement: the quest-giver on the spine, and a coverage floor (44fab3ae)
- [x] Phase 53d — Author S-01's four dilemmas (7d14acd6)
- [x] Phase 53e — The read-back web: consequences that come back (ccb8654c)

- [x] Phase 46a — Early-game rethink: design session (8decc1c9)
- [x] Phase 46b — Early-game: canned preset-deck tutorial content (a5996b62)
- [x] Phase 46c — Early-game: Quest Board tutorial re-derivation (3a1b7291)

**Expo decouple (47a-47e) — decomposed 2026-08-08 at T's request. T's
"not now" from 2026-07-18 is lifted by the unshackling. Do NOT run this
batch concurrently with 44* — both churn the whole mobile surface.**

- [x] Phase 47a — Decouple inventory + shim layer (3473520f)
- [x] Phase 47b — Navigation: `expo-router` → a bare-RN router (49b6f55a)
- [-] Phase 47c — Assets: `expo-image`, `expo-font` +
      `@expo-google-fonts/*` → bare-RN equivalents, preserving the
      existing font-bundle splitting. (mobile) Deps: 47a.
      Brief: `plan/phases/phase_47c_expo_decouple_assets.md`.
      Shipped `5a69cdb5` — `@expo-google-fonts/*` vendored locally
      (dropped as a dependency, same .ttf bytes, zero behavior change).
      `expo-image` swap attempted + reverted: `verify:visual` caught a
      52.8% pixel-diff regression on the title screen from a custom
      `contentPosition` positioning wrapper that `npm run verify` alone
      couldn't see was broken — root cause not fully isolated, reverted
      rather than shipped guessed-at. `expo-font` itself carried over —
      no native project exists yet to statically link fonts into (47e's
      prebuild). See the brief's "Follow-ups" for both residues.
- [-] Phase 47d — Device APIs: `expo-haptics` (→
      react-native-haptic-feedback or similar), `expo-constants`,
      `expo-linking`, `expo-splash-screen`, `expo-status-bar`,
      `expo-navigation-bar`. Note Phase 38's juice layer already
      co-fires haptics through a single wrapper — that wrapper was built
      as the Expo-decouple swap point, so use it. (mobile) Deps: 47a.
      Brief: `plan/phases/phase_47d_expo_decouple_device_apis.md`.
      Shipped `1dd887b5` — `expo-status-bar` → React Native core
      `StatusBar` and `expo-haptics` → `react-native-haptic-feedback`
      swapped clean (web-verified; native path unverified, no native
      project exists yet). `expo-constants`, `expo-linking`,
      `expo-splash-screen`, `expo-navigation-bar` carried over — each
      blocked on 47e's native-project prebuild or `app.config.ts`
      re-platform. See the brief's "Follow-ups" for all four residues.
- [-] Phase 47e — Build + CI re-platform. `jest-expo` → the bare RN
      Jest preset, `expo lint` → direct ESLint, the `expo start` dev/web
      scripts and dev-server container, and the EAS build path
      (`deploy:preview` / `deploy:production`) → whatever replaces it.
      Post-decouple the RN↔native-lib version matrix becomes manually
      managed (Expo SDK 54 curates it today) — document that explicitly
      in bearings as part of this phase. `@shopify/react-native-skia`
      becomes available here as the parked D6f roll-ritual upgrade path
      (adds a native binary + a CanvasKit-WASM web-loading step that
      should be wired ONCE, into the kept pipeline) — evaluate, do not
      auto-adopt. (mobile + CI) Deps: 47b, 47c, 47d.
      Brief: `plan/phases/phase_47e_build_ci_replatform.md`.
      Shipped `2c26f89f` — `expo lint` → `eslint app components` swapped
      clean (verified byte-identical output to `expo lint`'s own default
      scope: 19 problems, 0 errors, 19 warnings, exit 0); RN↔native-lib
      version-matrix note appended to `bearings.md`; `@shopify/react-native-skia`
      re-evaluated against D6f's 2026-07-18 verdict — unchanged, still not
      adopted. `jest-expo` preset, `expo start` dev/web scripts +
      dev-server container, and the EAS build path all carried over —
      each blocked on a native project (`ios`/`android`) that doesn't
      exist yet and can't be created or verified in this execution
      environment (no Xcode/Android SDK). See the brief's "Follow-ups"
      for all three residues.

- [x] Phase 48 — Root-cause the `Closes #N` auto-close, for real (0aac2d3, squash-merged as 46b5a5df)
- [x] Phase 49 — GLYPHS follow-up 1: completeness-critic touch-UX pass (f1171746)
- [x] Phase 50 — GLYPHS follow-up 2: mobile UI (7e62a007)
> ## NEXT UP — the minigame retirements (T direct, 2026-08-22)
>
> T: *"I've been trying to retire the quest, gathering, and rest
> minigames. Rest is retired but the other 2 are not."* Rest went out
> with Phase 52e (`d83978cb`); the other two had stalled — **Phase 61**
> was ruled on 2026-08-15 but sat behind eight rows, and **Gathering had
> never been ruled at all** (deliberately left out of the 58-65 block
> rather than swept in by implication). T ruled it now and directed that
> both jump the queue.
>
> **The loop takes Phase 61 and Phase 76 FIRST**, ahead of every other
> unchecked row including Phase 58. Both are deletions against the proven
> Phase 52e template, so they are low-risk and they stop the project
> paying attention-tax on systems already decided dead. Normal queue
> order resumes after them (58 is next, and remains "ship it first"
> among the rest).

- [x] Phase 51 — GLYPHS follow-up 3: sim `crackAt` policy heuristic + the A/B promotion court (a0e377d8)

**Balance doctrine repair (promoted via /oversight 2026-08-08, T direct —
the queue had fully drained and the red curve had no phase assigned;
RESEQUENCED the same day behind the unshackling — see above):**

- [x] Phase 39 — Post-D8 flag-on curve repair + library theme-symmetry restoration (8d50591e)

- [x] Phase 40 — Card-text grammar + full copy pass (0048e3ea)

- [x] Phase 54 — Route live combat through `endCombat` (556ec152)

- [x] Phase 55 — Retire the dead "THE STRIKE IS DEAD" doctrine string from the engine-truth MCP (20b5a1be)

**Promoted via `/oversight` 2026-08-15 (T direct, attended web session):**

- [x] Phase 56 — The dice valves under-sink: add the starter Press Fate grant alongside them (962dc05a)

- [x] Phase 57 — Stop publishing the private DevLog: the in-repo half of the Pages scope-down (cb788468)

**The encounter reshape (58-65) — T direct, attended web session
2026-08-15.** T opened the session asking that "every encounter has a
narration with it so the player has some flavor in terms of what's
happening," then defined three of the non-combat events outright. This
block is that definition, queued. It continues the arc 52a-52f started
(the rest minigame retired for a choice screen) and partially executes
the standing candidate T filed 2026-08-10 — *"folding the treasure,
quest, rest, and narration events into a single 'encounter' event,
taking away the minigames... The minigames as they are are just time
consuming and seem to add nothing."* **Deliberately NOT in scope:** the
Gathering minigame ("The Gleaning") and the hazard board both survive
this pass — the candidate names Gathering for retirement but T did not
rule on it here, so it stays open rather than being swept in by
implication. Combat and Hazard-Pattern Combat are untouched.

- [x] Phase 58 — Carry authored narration to the player (426912a9)

- [x] Phase 59 — Rest is two offers: heal 25%, or cut a card (94b85569)

- [x] Phase 60 — Re-home the Anvil to its own map node (68977b93)

- [x] Phase 61 — Retire the Quest Board minigame (f674c147)

- [x] Phase 76 — Retire the Gathering minigame (f18e6643)

- [x] Phase 62 — Ally cards (0b78483c)

- [x] Phase 63 — The loot cache becomes a three-way choice (a7032809)

- [x] Phase 64 — The journal reads the goodwill back (405bbab0)

- [x] Phase 65 — Village goodwill rewards (045e5241)
- [x] Phase 66 — Lexicon lint: catch retired-doctrine prose, not just retired identifiers (d3b46d59)
- [x] Phase 67 — Title migration: "Axiomancer" → "Miserere Mei, Deus" (fad33688)

- [x] Phase 68 — Keyword-drift hardening (25e3e3cb)
- [x] Phase 69 — Card-editor round-trip fidelity (3317e337)
- [x] Phase 70 — Prose lint for shipped `.ts` content + naming law in CI (b06a4449)
- [x] Phase 71 — Art acquisition pipeline (3ae179b9)
- [x] Phase 72 — Harness grants for content work (0a3f73f5)

- [x] Phase 73 — Art generation pipeline (b31c94a0)
- [x] Phase 74 — N-1: fold the ratified North Star into spec 34 (385f6ba5)
- [x] Phase 75 — N-3: the re-voice pass (33df8c91)

> **Note (issue-triage 2026-07-19):** issue #132 asked for a
> `devlog-build` GitHub Action; re-triage found it re-classified as
> `enhancement` (was `docs`, stale after the owner corrected the issue
> body same-day) and was about to queue a Phase 38 for it, but
> `.github/workflows/build-devlog.yml` landed on `main` out-of-band in
> the same window (`ci(devlog): add deterministic site build action`,
> `Refs #132`) — `workflow_dispatch`, Node 22 + `npm ci`, `npm run
> site:build`, output validation, artifact upload, guarded commit-back
> to `main`. Matches the issue's acceptance criteria structurally; no
> queued phase needed. Not yet confirmed via a live manual run.

**The Woodcut Codex — full visual redesign (T-directed 2026-08-08, web
session: "keys to the kingdom … full wipe on all the constraints I had
before regarding the direction of the game's design"; master plan:
`plan/phases/phase_V_visual_redesign_masterplan.md` — sub-briefs generate
on pickup):**

- [x] Phase V1 — Iconography canon: one data-driven icon registry (a69eab56, PR #179)
- [-] Phase V2 — The map as an artifact: WILDS map scene redesign —
      parchment-void backdrop (hatch + vignette + torn frame,
      procedural), registry node/kind icons (treasure→chest), compass
      rose, region-accent theming (mobile; after V1)
      PARTIAL via PR #179: chart sheet (hatch + contour hills), compass
      rose, edge vignette, registry node/kind icons (treasure→chest,
      boss→crowned skull; blacksmith + village promoted to first-class
      NodeTypes with anvil/huts marks, tags, colors, tooltips), plus a
      REAL backdrop ahead of schedule — Doré Inferno Plate 1 as
      `assets/images/maps/forest-dark.webp` (provenance-stamped) behind
      a `mapBackdropFor(region)` registry and a `MapCanvas` art slot.
      REMAINING: torn frame, region-accent theming, legend refresh.
- [-] Phase V3 — Menus & chrome: tab bar on the registry with the
      handoff active treatment, ✠-eyebrow header convention audited into
      one shared component, panel-furniture consistency pass across
      SELF/SATCHEL/MEMOIR + modals (mobile; after V1)
      PARTIAL via PR #179: tab bar consumes the registry (5 inline path
      copies deleted) + sulfur active-tick; screen-furniture marks
      landed (anvil/THE ANVIL, huts/SETTLEMENT, tombstone/REMAINS).
      REMAINING: shared ✠-eyebrow header component, panel-furniture
      (TornPanel/rivets/seals) consistency pass.
- [x] Phase V4 — Background acquisition pipeline (4e93450d)
- [x] Phase V5 — Backgrounds wired: `ScreenBg` keyed art slot with dim/vignette (15ef285f)
- [-] Phase V6 — Combat & minigame glyph unification: shared subset of
      hazard/gathering/cache/combat glyph kits folds into the registry;
      keyword-mark canon audit (mobile; after V1)
      PARTIAL 2026-08-30: gathering/cache dropped from scope (both retired to
      no glyph kit — see the brief's "What exists, measured"). Hazard/combat's
      one real duplicate (`BoonIcon('chest')`) now renders the registry's
      `action-chest`. The dead V1-era orphan `EffectChip.tsx` (built, tested,
      never wired into the live board) deleted. `glyphShapes.ts` gets its
      first dedicated test plus a keyword-canon audit, which caught and
      removed one stale entry (`BARRIER`, merged into `GUARD` at Phase 29,
      confirmed unreachable). REMAINING: the row's full ask — combat draws
      the same ~7 status concepts three ways (registry SVG / `statusGlyphs.ts`
      emoji / `glyphShapes.ts` card-face SVG) and collapsing them into one
      canonical mark per keyword is a real design call with pinned-test +
      multi-component blast radius, deliberately left to a follow-up brief
      (see `plan/phases/phase_v6_glyph_unification.md` Follow-ups) rather than
      guessed at autonomously.
- [-] Phase V7 — Illustration upgrades: replace remaining procedural
      illustration SVGs with acquired art per `SVG_ASSET_SPEC.md` §5–8;
      PixelEmblem carve-out preserved (assets + mobile; after V4)
      PARTIAL 2026-08-30 (6f731252): surveyed every §5–8 target before
      acquiring anything — `<Splatter>` (§5) is the only one with a live,
      high-frequency production audience (combat victory, level-up, the
      exploration map), so it got real art: four acquired Rorschach-plate
      ink silhouettes (public domain), a new `acquire-art.mjs` "silhouette"
      alpha-matte recipe, rendered via `tintColor`. The event/boss
      illustration family (§6–7) and the body diagram (§8) turned out to be
      dead or near-dead code — reachable only through `app/event/index.tsx`,
      a defensive fallback shell nothing routes to in production, or (body
      diagram) zero call sites at all — so no art was acquired for them;
      REMAINING is V8's keep-or-delete call on that code, plus a 47-plate
      labyrinth room-scene backdrop acquisition, both out of scope for one
      phase tick (see `plan/phases/phase_v7_illustration_upgrades.md`
      Follow-ups).
- [x] Phase V8 — Closure (04fe2f46 / b70303bb)
- [x] Phase W1 — The Door (62008ebf)
- [x] Phase W2 — The Caverns (62008ebf)
- [x] Phase W3 — Northern City: map 2 of the northern continent per the `map.library.ts` narrative seam (3b16305a / 0f04f49f)
- [x] Phase W4 — The Connecting River + Town Across the River: maps 3–4 of the northern continent (b8546a59 / 41272f9f)
- [-] Phase W5 — New blood: per-map enemy roster growth so no two maps
      share >70% of a pool; every new enemy through the ~10-edit
      checklist with unique portrait + provenance (`/forge`; after W2,
      parallel to W3/W4)
      PARTIALLY DRAINED by W3 (2026-08-28): 9 northern enemies shipped
      through the full checklist (see the W3 row). northern-city meets
      the <70% bar (3/8 vs any sibling); caverns∩northern-forest still
      sits at 10/14.
      FURTHER DRAINED by W4 (2026-08-31): 7 more enemies (Reed Ambusher,
      Toll-Skiff, Weir-Widow, the Waterreeve, Dowry Collector, the Kept
      Suitor, the Portreeve) through the full checklist — connecting-river
      and town-across-river are BRAND-NEW pools with zero overlap against
      every sibling map. The remaining drain is coastal/forest pool
      differentiation (caverns∩northern-forest still at 10/14).
- [x] Phase G1 — `.claude/**` OPEN GATE doc sync (61376b82)
- [x] Phase 77 — In-house crash capture (6249b19b)
- [x] Phase 78 — Art-pass: open-source art sourcing research for W5 portraits (67be65e0)
- [x] Phase W6 — The Capital: map 5 of the northern continent, the ribbon-roads' destination (f56fa198)

> **After the queue drains:** `/march` transitions to `/iterate`
> — draining `plan/AUDIT.md` + `plan/CRITIQUE.md`, doc-drift,
> `as any` clusters, hex-literal -> AXM migration, a11y, and
> file-length extraction. `/expand` grows the queue from
> accumulated signals.

---

## Per-phase scope

Detailed briefs live at `plan/phases/phase_<N>_<topic>.md`. If a
brief is missing when the loop reaches its phase, it generates one
per `skills/plan-a-phase.md` from the scope line above + the
canonical sibling (a prior shipped phase of the same shape) +
`plan/bearings.md`.

### Phase 1 — Combat test-coverage backfill

Add hermetic e2e coverage at the mechanics public entry point for
`sig-overwhelming-argument`'s funded (success) path and any HP
kill-path lacking a population-level witness. Test-only; no engine
behavior change. Canonical sibling: the existing
`src/Combat/e2e/*.engine.test.ts` suites. Deliberately small — it
is the calibration run that proves the mechanics verify gate + the
CI-green deploy gate work end-to-end before ambition.

### Phases 2–12

See the status rows above; generate briefs on demand.

---

## Carry-overs / known gaps (update as phases ship)

(Add `[-]` rows for partial-but-shipped phases with linked notes here.)

- [-] **V1 residue (filed 2026-08-08, post-#179 merge):** the
  pixel-heart emblem pair still coexists
  (`components/aftermath/PixelHeartEmblem.tsx` vs
  `components/event/aftermath/PixelEmblem.tsx` — near-duplicates; keep
  the PixelEmblem carve-out, collapse to one), and the three orphaned
  components (`BodyDiagram`, `MindMark`, `FriendshipMeter` — zero
  non-test importers) are still undecided (delete, or wire via a V3/V6
  surface). Small, bounded; fold into the next V-phase pickup rather
  than a bespoke tick.
- [-] **V2/V3 remainders:** listed inline on their `[-]` rows above —
  torn frame, region-accent theming, legend refresh (V2); shared
  ✠-eyebrow header component, panel-furniture pass (V3).

## Queue change log

> Append-only. Records provenance whenever T, via Hermes,
> directs a mutation of this file's queue (add / remove /
> reorder / reprioritize / split / merge / skip / block / unblock
> / material scope change to a phase row). Filed via `/oversight`
> 2026-07-30 (issue #129) — forward-looking only; existing queue
> history above is NOT reconstructed into this log. The entry
> must land in the SAME commit as the queue mutation it records.
> Format per row: date, actor, action + affected phase ID(s),
> confirmation this was T's request, T's stated reason (or
> "reason not stated" — never invent one), and the resulting
> commit/issue/phase-brief when available.

- **2026-09-23** — actor: **T via `/oversight`** (attended session, branch
  `claude/oversight-7vknwr`). Action: **re-scoped Phase 84** (material
  scope change, not add/remove). The phase's original brief — an attended
  `/world-spec`/`/story-spec` session deciding what the-capital's
  advisor-selection payoff sets up for the player character — was found
  stale on read: THE BLANK PAGE (2026-09-18) retired that narrative as
  non-canon three days after Phase 84 was promoted, and
  `content/story/story-overview.md`'s own pivot question 3 (where the
  seven shipped maps sit relative to the new road) is still undecided.
  Flagged to T before proceeding rather than run the session on a stale
  premise. Confirmed T's request: yes — T answered the `AskUserQuestion`
  ballot "Phase 84's premise is legacy narrative THE BLANK PAGE already
  ruled non-canon... how should I proceed?" with "Re-scope Phase 84
  narrowly: treat the-capital as purely legacy/mechanical (its map
  structure, node layout) and design a NEW, small world beat for it that
  doesn't depend on the old advisor-selection canon at all." T's stated
  reason: not stated beyond the ballot option as written. Resulting
  artifact: `specs/world/W-02-the-capital-door-onward.md` (a door-onward
  beat past the Factor fight, `cap-9`, authored with zero story-canon
  content); phase marked `[x]` shipped in this same commit.

- **2026-09-17** — actor: **T via `/oversight`** (attended session,
  branch `claude/oversight-kqgvvc`). Action: ADD seven phase rows —
  Phases 89, 90, 91, 92, 93 (promoted from `PHASE_CANDIDATES.md`) and
  Phases 94, 95 (promoted from `plan/AUDIT.md` loop-call rows already
  decided at `/oversight` 2026-09-15 but unshipped). Confirmed T's
  request: yes — T answered the `AskUserQuestion` ballot "The build plan
  has zero pending phases" with "Promote top 5 candidates now", and "Two
  decisions from the 2026-09-15 oversight were routed to /iterate and
  never shipped" with "Promote both to phase rows". T's stated reason:
  reason not stated beyond the ballot options as written — the queue was
  empty so `/march` could never reach `/ship-a-phase`, and `/iterate`'s
  score queue had not reached the 2026-09-15 rulings in 12 commits, so
  the phase lane owns them instead. Resulting commit: this one.

- **2026-08-08** — actor: **T via `/oversight`** (attended web session,
  not Hermes). Action: **added Phase 39** (post-D8 flag-on curve repair +
  library theme-symmetry restoration, merged from three standing
  candidates) and **Phase 40** (card-text grammar + full copy pass,
  ruled 2026-07-18 but never queued), and recorded Phase 40 as dependent
  on Phase 39. Confirmed T's request: yes — both promotions were chosen
  by T from an `/oversight` questionnaire ("Promote curve-repair +
  theme-symmetry together"; "Card-text grammar + full copy pass" among
  the unlocked gated candidates). T's stated reason: the build-plan queue
  had fully drained at Phase 38, leaving `/march` nothing but 2.x-score
  hygiene rows to pick while the flag-on balance curve had read mid 0.0%
  / late 0% for six consecutive nightly baselines with no phase assigned
  to it. Resulting commit: this one; briefs still to generate.
- **2026-08-08** — actor: **T via `/oversight`** (attended web session,
  same session as the row above, second batch). Action: **added Phases
  41-51** (constraint demolition, new organising fiction, objective
  function v2, retheme execution, re-home dice upgrades, early-game
  rethink, Expo decouple, `Closes #N` root-cause, GLYPHS follow-ups
  1-3), and **resequenced Phases 39 and 40** behind them (scope
  preserved; 39 additionally annotated as rescoped because its target
  band and its lever set both changed). Confirmed T's request: yes —
  T gave the instruction directly and then, when asked-adjacent work was
  listed back, replied "make phases for everything you mentioned". T's
  stated reason, near-verbatim: *"remove constraints across the entire
  application. Normal damage is allowed, deck tuning is allowed to change
  anything about a card, no more philosophy based theme. I want to give
  you full freedom to take this deckbuilder in any direction."* Note this
  mutation VOIDS previously-locked doctrine (spec 32 no-strike,
  status-dominance balance, philosophy theming, the Expo "not now") under
  the source-of-truth hierarchy; see `plan/bearings.md` § "THE
  UNSHACKLING". Resulting commit: this one; briefs still to generate.
- **2026-08-08** — actor: **T via `/oversight`** (attended web session,
  third batch). Action: **ratified the replacement fiction** — "Dark
  Fantasy deckbuilding RPG campaign", whole product — which collapsed
  **Phase 42** from a three-proposal ballot into authoring a single
  bible; and **decomposed Phases 44, 45, 46 and 47** into **44a-44i,
  45a-45b, 46a-46c and 47a-47e** (23 rows where there were 4). Confirmed
  T's request: yes — T named the direction and the whole-product scope
  unprompted, then said *"I want you to decompose everything you
  mentioned above into phases if you haven't already."* T's stated
  reason, near-verbatim: *"It's looser, not that different from what we
  already have, and should be an easy pivot while opening up A LOT of
  doors for us."* Resulting commit: this one; briefs still to generate.
- **2026-08-08** — actor: **T via `/oversight`** (attended web session,
  fourth batch). Action: **carved three systems out of the unshackling**
  and wrote the guard into Phases 41, 42, 43, 44b and 39 (no rows added,
  removed or reordered — this narrows the scope of existing rows).
  Confirmed T's request: yes, unprompted and verbatim: *"the Conviction,
  Surge meter, and Dice mechanics system, those are LOCKED into place and
  will need to stay. Cards can effect them, but agents should not remove
  the mechanics."* T's stated reason: not stated beyond "LOCKED into
  place and will need to stay". Effect: the unshackling's "full freedom"
  no longer extends to removing/replacing/no-op'ing Conviction, the Surge
  meter or the Dice system; those decisions are explicitly excluded from
  the standing big-decisions authority and must surface as
  `[needs-user-call]`. See `plan/bearings.md` § "LOCKED MECHANICS".
  Resulting commit: this one.
- **2026-08-08** — actor: **T via attended web session** (Claude Code on
  the web, branch `claude/game-visual-redesign-5v21po`). Action: **added
  the V-sequence** (Phases V1–V8, the Woodcut Codex full visual
  redesign). Confirmed T's request: yes — verbatim: *"I am giving you
  complete freedom to take the game in any visual theme. I am currently
  trying to do a full wipe on all the constraints I had before regarding
  the direction of the game's design"*, with explicit instructions to
  plan the phases into the loop, replace the app's scattered SVGs with
  the provided icon/glyph directory, and add acquired background
  imagery; map first, then menus. T's stated reason: full game visual
  redesign toward a "finished" visual design. Resulting artifacts:
  master plan `plan/phases/phase_V_visual_redesign_masterplan.md`; V1
  (map + menus slice) implemented in the same session/PR that lands this
  row.
- **2026-08-08** — actor: **T direct** (attended chat session, this
  worktree — not `/oversight`, not Hermes). Action: **added Phases
  52a-52f** (the rest-choice epic: deck-removal primitive, first-class
  inn, rest-choice engine, mobile screen, Night Watch retirement,
  shilling-economy calibration); **marked Phases 45a and 45b
  `[skipped]`** as superseded by them; and **amended Phase 44f's row**
  to drop The Night Watch from its four-minigame rename list while
  keeping the surviving rest node in scope for naming. Confirmed T's
  request: yes — T gave the instruction directly and verbatim: *"I want
  you to plan and add phases to remove the Rest mini-game and replace it
  with a choice for the players: 1) Rest (heal 20% of the player's
  health) 2) Use the blacksmith (upgrade a die for a high price of
  whatever currency name we have, I forget) 3) Remove a card from the
  player's deck (Low price to start, but every time the player does this
  across the game, it costs a little more). Once the player chooses an
  option, the rest is done/completed/locked."* T's stated reason: not
  stated beyond the instruction itself. Four follow-up rulings were
  collected in the same session and are recorded in the 52a-52f block:
  full retirement of the Night Watch (chosen over park-behind-a-flag and
  keep-as-a-rare-node), flat 20% heal with inns exempt, prices proposed
  now and calibrated in a dedicated later phase, and the collapse of
  45a/45b into this epic. Note this ruling **answers 45a's open design
  question** (where dice upgrades live — the rest site) and **resolves
  the standing `[needs-user-call]` at
  `axiomancer-mechanics/src/World/MapEvents/types.ts:141-146`**
  (blacksmith map placement and cadence), both open since 2026-07-18.
  Resulting commit: this one; six briefs generated under
  `plan/phases/phase_52*.md`.
- **2026-08-09** — actor: **T direct** (attended web session, not Hermes).
  Action: **added Phases 53a-53e** (narrative encounters — reachability
  guard, dialogue gate context, placement + coverage floor, S-01's four
  dilemmas, the read-back web), inserted as an ordered batch between the
  52* block and 46a. No existing row was reordered, rescoped or
  renumbered. Confirmed T's request: yes — T's instruction, verbatim:
  *"file both audit rows, then add phases in order to make sure
  'narrative' encounters work. Author content using the skills
  available."* T's stated reason: not stated beyond the instruction
  itself; the batch follows a first-map audit T commissioned the day
  before, whose residue this drains. Scope was derived rather than
  dictated — the six findings behind these rows come from a fresh audit
  run in the same session
  (`axiomancer-mechanics/docs/reports/NARRATIVE-ENCOUNTER-AUDIT.md`), and
  the two critical ones are that no NPC conversation in the game is
  reachable by legal play and that the first map's premise quest has no
  giver. Deliberately NOT promoted in the same pass: inter-map travel
  (already a phase candidate from the first-map audit) and any retheme of
  existing dialogue prose (Phase 44g owns it by name). Two content calls
  were made at planning time rather than left blocking, both reversible
  and both recorded in the specs they touch: S-01's node-reslotting and
  `moralDelta` questions. Resulting commit: this one; briefs generated
  under `plan/phases/phase_53*.md`; design record
  `specs/story/S-02-fishing-village-voices.md`.

- **2026-08-10** — actor: **T via `/oversight`** (attended session).
  Action: **added Phase 54** (route live combat through `endCombat`),
  resolving the standing `[needs-user-call]` at `plan/AUDIT.md`'s "live
  combat exit path bypasses the engine's end-of-combat reducer entirely"
  row (first-map audit 2026-08-08, finding F3); and **amended Phase 40's
  row** to flag scope overlap with open PR #193 ("strip the prose off
  the card face"), instructing it be re-scoped against whatever #193
  ships before its brief is generated. Confirmed T's request: yes — T
  selected "Route through endCombat (Recommended)" for the first and
  "Note re-scope-after-#193 in Phase 40's row (Recommended)" for the
  second when asked directly. T's stated reason: not stated beyond the
  selections themselves. Resulting commit: this one.

- **2026-08-15** — actor: **T via `/oversight`** (attended web session,
  not Hermes). Action: **lifted the AUDIT-DRAIN MODE banner** (a
  queue-wide unblock — every `[ ]` row returns to normal
  `ship-a-phase` dispatch), and **added Phase 56** (land the D7 reroll
  sink via both mechanisms, then re-run the flag-on matrix) and **Phase
  57** (stop publishing the private DevLog — the in-repo half of the
  Cloudflare Pages scope-down). Confirmed T's request: yes — all three
  were T's own selections from an `/oversight` questionnaire ("Lift the
  banner"; "Both — grant and promote"; "Queue the in-repo half now").
  T's stated reason: not stated beyond the selections themselves; the
  evidence each selection was made against is recorded in the banner's
  own replacement text and in the two new phase rows (respectively: the
  banner was bypassed by Phases 52c/52d/52e while closing one AUDIT row
  in three days; the post-D8 nightlies show the dice valves under-sink,
  which is the exact revisit condition Phase D8's row wrote for itself;
  and the private DevLog has been live unauthenticated on the production
  domain since at least 2026-08-12 with a 2026-08-10 ruling nobody could
  execute). **Correction recorded against this pass:** the questionnaire
  put the D7 sink to T as an open `[needs-user-call]`, which it was not —
  `plan/PHASE_CANDIDATES.md`'s row had been resolved via `/oversight`
  2026-07-18 (valves-only, no starter grant) and sits in that file's
  `## Promoted` section; the sweep matched residual "needs-user-call"
  wording inside the resolved row's own decision line. T's 2026-08-15
  answer is therefore a **supersede** of the 2026-07-18 call, not the
  draining of an open one, and Phase 56's row states it that way. The
  supersede is well-founded on D8's own revisit clause, so the phase
  stands as queued. Not mutated in the same pass: the product-name
  `[needs-user-call]` (genuinely open), which T left open pending a
  second candidate pass. Resulting commit: this one; briefs for 56 and
  57 still to generate.

- **2026-08-15** — actor: **T via attended web session** (design
  conversation, not Hermes, and not `/oversight` — T asked directly).
  Action: **added Phases 58-65**, the encounter reshape. Confirmed T's
  request: yes — T opened with *"I want to make sure that every encounter
  has a narration with it so the player has some flavor in terms of
  what's happening"*, then defined three events verbatim (**Rest:**
  *"Heal 25% health or remove a card. One liner narration."*; **Loot
  cache:** *"Card reward, item reward, or sacrifice reward... noted on
  their journal as 'Helped <current map> n times'... discounts at the
  shop, an ally card reward, and other various rewards"*; **Quest:**
  *"let's just remove it entirely"*, narrowed on question to *"Minigame
  only and keep it"*), ruled the ally-card chain in scope ("everything
  including Ally"), and closed with *"queue all of these up"* against the
  eight-row table these rows are written from. T's stated reason,
  near-verbatim: the minigames *"are just time consuming and seem to add
  nothing"* (T's 2026-08-10 framing on the standing fold candidate, which
  this batch partially executes). **Two items recorded as inference, not
  instruction, so a later reader can correct them:** (1) Phase 60's
  anvil **re-home** is read from T selecting a table in which it was the
  listed option, after being asked re-home vs. retire — the reversible
  reading, and the row says so; (2) Phase 59 keeps Phase 52a's escalating
  card-removal price, since T said "remove a card" without ruling on
  cost. **Not swept in by implication:** the Gathering minigame, which
  the fold candidate names for retirement but T did not rule on here —
  it stays a live surface and an open candidate. Resulting commit: this
  one; briefs for 58-65 still to generate.

- **2026-08-20** — actor: **T via attended web session** (`/oversight`,
  not Hermes). Action: **added Phase 66** (lexicon lint — catch
  retired-doctrine prose, not just retired identifiers), promoted from
  `plan/PHASE_CANDIDATES.md`'s sole pending candidate (score 7.5,
  proposed 2026-08-15 by expand pass 8, unpromoted since). Confirmed T's
  request: yes — T's answer to this oversight's candidate-promotion
  question was "Promote." T's stated reason: not stated beyond the
  selection; the candidate's own rationale (three independent incidents
  of retired-doctrine prose surviving a rename pass in one week) is the
  evidence it was promoted against. Resulting commit: this one; brief
  for 66 still to generate.

- **2026-08-20** — actor: **T via attended web session** (`/oversight`,
  not Hermes). Action: **added Phase 67** (title migration, "Axiomancer"
  → "Miserere Mei, Deus"). Confirmed T's request: yes — T ruled the
  naming session directly mid-`/oversight` conversation, decided alongside
  setting *Mörk Borg* as the game's new tonal North Star (art/narration/
  encounters; mechanics unchanged) — see `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/new-north-star.prompt.md`. T's
  stated reason: "Miserere Mei, Deus" sounds good, chosen directly rather
  than from either naming-session pass; T explicitly scoped this
  `/oversight` tick to the name only, deferring the wider pivot to a
  future brainstorm session. Resulting commit: this one, plus
  `plan/AUDIT.md`'s product-name row (`[x]` resolved),
  `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/naming-session-2026-08-12.md` §6 (closed), `plan/bearings.md`'s
  name line, and `archive-pre-revamp:plan/archive/2026-09-25-trim-t5/new-north-star.prompt.md`; brief for 67 still to
  generate.

- **2026-08-22** — actor: **T via remote Claude Code session** (the
  content-pipelines-audit session, PR #228 — not Hermes). Action:
  **added Phases 68-72** (keyword-drift hardening; card-editor
  round-trip fidelity; `.ts` prose lint + naming law in CI; art
  acquisition pipeline; harness grants for content work). Confirmed
  T's request: yes — T reviewed the content-pipelines audit and
  directed *"what do you need from me to free up ALL these pipelines?
  Try to do it yourself first, then get back to me"*; the same
  directive is recorded as THE PIPELINE LIBERATION in
  `plan/bearings.md`. T's stated reason: ensure the nexus loop has
  the freedoms and capabilities every content pipeline needs. The
  doc/doctrine unblocks shipped in the same PR; these five phases
  carry the engineering remainder. Resulting commit: this one
  (branch `claude/content-pipelines-audit-43v3d7`, PR #228).

- **2026-08-22** — actor: **T via remote Claude Code session** (the
  content-pipelines walkthrough, PR #228 — not Hermes). Action:
  **added Phases 73-75** (art generation pipeline; N-1 fold the North
  Star into spec 34; N-3 re-voice pass) and **rescoped Phase 71**
  (acquisition legs now feed generation too). Confirmed T's request:
  yes — T answered a four-question `AskUserQuestion` walkthrough,
  picking art route "A-then-B" and "Ratify as-is" for the North Star.
  T's stated reason: not separately stated beyond the option choices;
  the walkthrough was T's response to the audit's open owner calls.
  Resulting commit: this one (branch
  `claude/content-pipelines-audit-43v3d7`, PR #228).

- **2026-08-22** — actor: **T via remote Claude Code session** (the
  minigame-retirement walkthrough — not Hermes). Action: **added Phase
  76** (retire The Gleaning, keep the gathering map node) and
  **reprioritized Phase 61 + Phase 76 to the front of the queue**, ahead
  of Phase 58. Confirmed T's request: yes — T opened with *"I've been
  trying to retire the quest, gathering, and rest minigames. Rest is
  retired but the other 2 are not,"* answered the priority question with
  "retire quest + gathering next", and delegated the retirement's shape
  to the loop (*"You decide everything"*). T's stated reason: the
  minigames "are just time consuming and seem to add nothing"
  (2026-08-10 candidate, restated by this session's framing). Resulting
  commit: this one (branch `claude/content-pipelines-audit-43v3d7`,
  PR #228).

- **2026-08-28** — actor: **T direct** (attended local session — THE
  OPEN GATE, see `plan/bearings.md`). Action: **added Phases W1–W5**
  (inter-map travel; the caverns; northern city; connecting river +
  town across the river; per-map enemy roster growth) **and Phase G1**
  (`.claude/**` doc sync), and **wired the new `/forge` content-foundry
  verb into `/march` step 3b**. Confirmed T's request: yes — verbatim:
  *"setup the pipeline in order to allow for the nexus loop to create
  new enemies, new cards, new everything ... Furthermore, NEW
  CONTINENTS, NEW MAPS!. Why do I still only see the first
  continent?"* T's stated reason: content growth has been requested
  repeatedly and the world still shows one reachable continent.
  Resulting commit: this one (W1+W2 implemented in the same session).

- **2026-09-02** — actor: **T via `/oversight`** (Claude Code on the
  web, branch `claude/oversight-yz12cc`). Action: **added Phase 77**
  (in-house crash capture, promoted from the `[score 8.5]` candidate
  filed by `/expand` pass 10) and **added Phase 78** (art-pass:
  open-source art sourcing research for W5 portraits, a fresh row with
  no prior candidate). Confirmed T's request: yes — Phase 77 via the
  questionnaire's "Promote top candidate" answer; Phase 78 via T's own
  instruction during the W3 loop-call walkthrough, near-verbatim:
  *"create an 'art-pass' phase where an agent researches online for
  some open source art that fits the theme. Gather two candidates from
  a few sources, and then present them during the next oversight. Once
  I decide, that'll be our new art source until we end up generating
  our own."* T's stated reason: Phase 77 closes a six-week-old
  unpromoted owner ruling that two independent [HIGH] user crash
  reports have since made urgent; Phase 78 replaces ad hoc per-enemy
  art sourcing (the W3/W5 silhouette call) with a standing
  research-and-present process. Resulting commit: this one; briefs
  generate on demand per the Status block scope lines.

- **2026-09-15** — actor: **T via `/oversight`** (Claude Code, branch
  `claude/oversight-didrne`). Action: **added Phases 79–88** — 9 promoted
  from `plan/PHASE_CANDIDATES.md`'s 11 scored Pending rows (doctrine
  lexicon 79, naming pass 80, late-campaign difficulty cliff 81, glossary
  reachability 82, combat arena backdrop 83 absorbing its [score 4.5]
  duplicate, The Capital design session 84, equipment progression 85,
  engine hook sweep 86, early-game encounter smoothing 87) plus **Phase
  88** (W5 art adoption, a direct instruction closing `plan/AUDIT.md`'s
  W5 art-pass loop-call, same shape as Phase 77/78). One scored candidate
  ([score 6.5] lexicon preset-ids) was found stale (its evidence was
  fixed today by an unrelated commit) and closed rather than promoted.
  Confirmed T's request: yes — T's stated reason for the batch: the
  build-plan queue had fully drained (0 pending phases) while
  `PHASE_CANDIDATES.md` carried 11 live scored rows sitting unpromoted;
  T asked for "top 30" and, on learning only 11 scored/live rows existed
  (the rest being unscored 2026-07/08-era bookkeeping debt), said
  "promote 9 + also flag the ~49 legacy rows" — the flag is filed at the
  top of `PHASE_CANDIDATES.md`'s Pending section, recommending a
  `/consolidate` cleanup pass. Three embedded sub-choices the source rows
  themselves called out as needing an `/oversight` pick were also ruled
  this session: Phase 81 verifies against current baseline before
  picking a design option (deferred, not guessed); Phase 84 ruled a
  `/world-spec`/`/story-spec` session over a mechanical map-6 bolt-on;
  Phase 85 ruled designing new signature skills over breaking the 1:1
  relic-identity rule. Also this session: ratified `plan/AUDIT.md`'s open
  `[loop-call]`/`[needs-user-call]` rows (UI fresh-eyes 6 decisions
  accepted per the report's own recommendations, `critique:drive`
  wipe-scope fix, keyword Chaos/Upgrade proposal authorized, baseline
  watch-path narrowing, Northern-Continent NPC sparseness routed to an
  attended `character-spec`/`story-spec` session) and widened the 5
  content stewards' audit criteria in `skills/adjust-{cards,enemies,
  equipment,keywords,npcs}.md` per the "zero-diff at pass 9-10" plateau
  flag. Resulting commit: this one; briefs generate on demand per the
  Status block scope lines.

- **2026-09-26** — actor: **T, attended session** (branch
  `claude/map-revamp-queue`). Action: **added Phases M3b, M3c, M3d, M4
  and M5** (the map revamp's remaining phases, brief
  `plan/2026-09-25-map-revamp-m3.prompt.md`). M3b is blocked while this
  session builds it; M3c is blocked until M3b merges; M3d, M4 and M5 are
  pickable in order. Confirmed T's request: yes. T, near-verbatim: *"make
  sure what's left of this revamp has been distributed to the build plan
  so the nexus loop can tackle some of the work while I'm sleeping"*.
  The same session T picked the three remaining D26 names (The Charcoal
  Wood, The Beacon Crags, The Lantern Deep), so no row waits on T. T's
  stated reason: let the loop work overnight. Resulting commit: this one.

- **2026-09-26** — actor: **T, attended session** (branch
  `claude/map-revamp-calls`). Action: **added Phase M3e** (retune
  fishing-village after Act 1, D35), between M3d and M4, and pointed M3d
  at the brief's new §3d (D30–D35). Confirmed T's request: yes. T
  answered the six agent calls from M3a/M3b in a ballot ("Retune after
  M3d" for fishing-village), then: *"Open the PR, file the residue,
  merge, then keep it moving"*. Resulting commit: this one.

- **2026-09-26** — actor: **T, attended session** (branch
  `claude/card-purge-queue`). Action: **added Phase S3** (the D4 stat
  hooks, blocked for an attended session: the loop pauses at the card
  phase, D38) and **Phase P1** (the card purge, D36), after M5.
  Confirmed T's request: yes. T, near-verbatim: *"I want to pause at the
  card phase"*, then *"purge all the cards and all the combat related
  keywords except for the grey strike and grey guard cards and keyword.
  Then work can continue, but no card generation unless it's a guided
  session with me"*. Scope settled by ballot (D36-D38). Resulting
  commit: this one.

- **2026-09-27** — actor: **T, attended session** (branch
  `claude/stat-model`). Action: **added Phase T6** (remove alignment,
  philosophy and GRACE, D39) before S3, rewrote S3 around the decided
  stat model (D40-D41, brief `plan/2026-09-27-stat-scaling.prompt.md`),
  and widened P1 to keep a third grey card, VULNERABLE (D42). Confirmed
  T's request: yes. T, near-verbatim: *"remove everything that has to do
  with alignment and philosophy. That includes grace"*, and T picked
  "Loop, after M5" for its timing. Resulting commit: this one.

- **2026-09-27** — actor: **T, attended session** (branch
  `claude/stat-scaling`). Action: **shipped Phase S3** (stat scaling) and
  set the grey office's third card by ballot (D43): A Plain Word,
  VULNERABLE +25% for 2 turns (FREE +10% for 1), adds up and refreshes,
  grey frame; the fresh-run deck is Blow 5 / Ward 3 / Word 2. Confirmed
  T's request: yes (T picked "Start S3 now" and every ballot). Resulting
  commit: this one.

- **2026-09-27** — actor: **T, attended session** (branch
  `claude/card-purge`). Action: **shipped Phase P1** (the card purge, D36):
  the player library is the grey office alone (Blow, Ward, Word); presets,
  haunts, allies, curses and enemy curse injection went with it. T amended
  D36 by ballot (D44): the grey cards are the reward pool, so card rewards
  and the cache's card offer stay on. Confirmed T's request: yes ("purge
  the card library of all the cards except these 3 grey starters").
  Resulting commit: this one.

- **2026-09-27** — actor: **T, attended session** (branch
  `claude/keyword-audit`, PR #407). Action: removed every card keyword,
  gloss, glyph, editor word and effect only purged cards used, and the inert
  per-card engine hooks keyed on purged ids. Enemy keywords were kept.
  Baseline unchanged. A live playtest confirmed card rewards: four wins, each
  offering Blow, Ward and Word, with TAKE CARD growing the deck 10 → 11.
  Confirmed T's request: yes ("audit the keyword library and glossary …
  then remove them"). Resulting commit: `36238fd8`.

- **2026-09-27** — actor: **T, attended session** (branch
  `claude/purge-residue`). Action: filed the P1 and keyword-audit residue
  (decisions doc, four post-purge `plan/AUDIT.md` rows, #216 evidence,
  premiseShed candidate marked moot) and fixed A Plain Word's FREE value
  ("×10" → "+10%"). Confirmed T's request: yes ("file the residue, clean
  up any remaining work"). Resulting commit: this one.

- **2026-09-28** — actor: **T, attended session** (branch
  `claude/axiomancer-unused-audit-ac0db7`). Action: **added THE REVAMP**
  (D46–D60): Phases R0–R9 (reset) and B1–B9 (rebuild), all blocked until T
  ratifies `plan/revamp/README.md`. Seven read-only audits (engine, mobile,
  content, tooling, core loop, content stewards, design skills) were put to
  T one ballot question at a time. `/march` and `night` disabled on GitHub
  the same day ("pause the /march loop until we ratify the build plan").
  Confirmed T's request: yes ("start breaking all these down … so we can
  update the plan"). Resulting commit: this one.

- **2026-09-28** — actor: **T, attended session** (same branch, PR #410).
  Action: walked THE REVAMP's open calls one at a time (D61–D63); **added
  Phases R10** (theme colours) **and B10** (dev menu revamp) and widened R3
  (the Doorwarden on every region's door fight, the deep stair sealed, one
  Anvil per region). All rows stay blocked until ratification. Confirmed
  T's request: yes ("walk me through the §6 open calls one at a time").
  Resulting commit: this one.

- **2026-09-28** — actor: **T, attended session** (same branch, PR #410).
  Action: **ratified THE REVAMP** (D64): R0–R10 and B4 unblocked and
  reordered to `plan/revamp/README.md` §7; owner-led B-rows stay blocked;
  the card part records that no card process plan is picked and points
  agents at the summary HTML. Workflows stay disabled until R0 merges.
  Confirmed T's request: yes ("ratify the plan"). Resulting commit: this one.

- **2026-09-28** — actor: **T via `/oversight`** (attended session, branch
  `claude/oversight-2026-09-28`). Action: **added Phase RC** (Act 1
  checkpoint release, attended) after R10, and made R11, R12 and every
  owner-led B-row require it; **added Phase R9a** (save checkpoint in
  fights), promoted from PHASE_CANDIDATES; **split R7** into R7a/R7b/R7c
  along `plan/revamp/engine.md`'s own three-way split so each tick ships a
  bounded slice (downstream Requires R7 → R7c); noted on R1 that its
  `.claude/**` items are attended residue. Confirmed T's request: yes (RC:
  "get everything to a good checkpoint with the mechanics in place, the map
  working, and everything cleaned up. Then we'll cut a release before we
  start work on content"; R9a: "Promote to a phase before RC"; B-rows: "All
  B-rows after RC"). The R7 split is the agent's alignment call under that
  same instruction. Resulting commit: this one.
- **2026-10-02** — actor: **T, attended session** (branch
  `claude/revamp-roadmap-status-62453c`). Action: **material scope change
  to Phase RC** (the walk proves Act 1 works, not a winnable grey-deck
  clear) and **added Phase BT** (Blood Price trial set, owner-led) after
  RC (D75). Confirmed T's request: yes ("I verify act 1 works at all, as
  is, THIS is where we'll cut the version. Then we'll use the 'sacrifice'
  trial set of cards to test the reward mechanism"). Reason: "I can't do a
  real playthrough of act 1 with just the starter cards." Resulting
  commit: this one.
- **2026-10-02** — actor: **T, attended session** (same branch). Action: **added Phase R10d** (tutorial removal) and made RC require it. Confirmed T's request: yes ("add a phase to remove all the tutorial windows as well because they're miserable"; via AskUserQuestion: before the tag, all coaches plus the map hint). Reason: "they're miserable". Resulting commit: this one.
- **2026-10-10** — actor: **T, attended session** (`/plan-a-phase`, branch `ccr-5df028d7-j2y1wv`). Action: **added Phase PF1** (weekly performance audit, D77) after R12, ready now. Confirmed T's request: yes ("I want a phase to cake in performance testing into a weekly audit"; scope, regression handling, thresholds, budgets and queue position chosen via AskUserQuestion). Reason: reason not stated. Resulting commit: this one; brief `plan/phases/phase_PF1_weekly_perf_audit.md`.
- **2026-10-10** — actor: **T, attended session** (same branch). Action: **added Phase RC2** (v0.2.0 release, D78) after PF1. Confirmed T's request: yes ("I also want to schedule a v0.2.0 after the first performance audit"; release shape and gate chosen via AskUserQuestion). Reason: reason not stated. Resulting commit: this one.
- **2026-10-10** — actor: **T, attended session** (same branch). Action: **added and shipped Phase DC1** (dev menu CARDS section). Confirmed T's request: yes ("Dev Tools in app has a 'cards' section with 2 sub sections"; lane source, lane-deck contents, override lifetime and ship-now chosen via AskUserQuestion). Reason: reason not stated. Resulting commit: b7e977c9.
- **2026-10-11** — actor: **T, attended session** (branch `ccr-5df028d7-j2y1wv`). Action: **shipped Phase BT** (Blood Price trial set, D80) and **added Phase BT2** (combat UI declutter, attended fast-follow) right after it. Confirmed T's request: yes (T accepted the 30-card list and the 20-card test deck on 2026-10-11 and asked for BT2 as a fast-follow). Reason: reason not stated. Resulting commit: this one.
- **2026-10-11** — actor: **T, attended session** (branch `ccr-5df028d7-j2y1wv`). Action: **added and shipped Phase BT1** (Blood Price revision 2, D81) after BT. Confirmed T's request: yes (T approved every card and relic change and asked for the second signet, the dev GET ALL RELICS button, the sim pacing check and the 3/5/7 fight-length target). Reason: reason not stated. Resulting commit: this one.
- **2026-10-11** — actor: **T, attended session** (branch `ccr-5df028d7-j2y1wv`). Action: **material scope change to Phase BT1** — the Doorwarden's slower ramp (D82) and Open Vein's TETHER-first wording. Confirmed T's request: yes (T chose "slower damage ramp" for a ~7-turn Doorwarden and asked to finish and merge when it holds up). Reason: fight-length target of about 7 turns for the boss. Resulting commit: this one.
- **2026-10-11** — actor: **T, attended session** (`/oversight`, branch `claude/axiomancer-017fb6`). Action: **reordered Phase RC2** (v0.2.0 release) ahead of Phase BT2 (combat UI declutter); both stay attended. Confirmed T's request: yes (ballot answer "RC2 first": tag v0.2.0 and build the APK now, since its gate is met; BT2 follows). Reason: RC2's gate (PF1 and its first audit on main) is already met. Resulting commit: this one.
- **2026-10-11** — actor: **T, attended session** (branch `claude/axiomancer-017fb6`). Action: **shipped Phase RC2** (v0.2.0 on eb75f451, D83) with the EAS build dropped from its cut. Confirmed T's request: yes ("let's cut the v0.2.0 tag. We don't need an APK because I got one already from this morning"; full gate with the Blood Price deck and a quick-win for stuck fights; "Tag now, file all"). Reason: T already had a same-day preview APK. Resulting commit: this one.
- **2026-10-12** — actor: **T, attended session** (`/plot asap`, branch `claude/r11-loop-next-steps-d239f4`). Action: **added Phase R12a** (measured-truth baseline) above BT2, and made R12 require it. Confirmed T's request: yes ("Measured-truth baseline" chosen first of three from the next-steps ballot; cadence "on merge to main + weekly" and drift handling "also file an AUDIT row" chosen via AskUserQuestion). Reason: every blocked B-row decision needs numbers and none exist since D57. Resulting commit: this one.
- **2026-10-12** — actor: **T, attended session** (`/plot`, branch `claude/r11-loop-next-steps-d239f4`). Action: **added Phase RH1** (roster-health lenses) after R12, anytime, from the `[owner]` candidate of the same name (moved to Promoted as briefed). Confirmed T's request: yes (second of three from the next-steps ballot). Reason: anytime because it blocks nothing and fixes no live defect; it gives the loop an unattended row and B2 an inventory. Resulting commit: this one.
- **2026-10-12** — actor: **T, attended session** (`/plot`, branch `claude/r11-loop-next-steps-d239f4`). Action: **added Phase CS1** (card-spec scaffold and card-rules lint) after RH1, anytime. Confirmed T's request: yes (third of three from the next-steps ballot; spec home `docs/card-spec.md` and "pin today's violations, fail on new ones" chosen via AskUserQuestion; T then asked for the card-spec calls to be gathered in an interactive HTML artifact, built in-session, not by the loop). Reason: anytime because it blocks nothing live; it is the fence the first card session after the spec inherits. Resulting commit: this one.
- **2026-10-13** — actor: **T, attended session** (`/plot`, branch `ccr-9327878f-vn0e49`). Action: **added Phase PF2** (combat SVG rasterisation) after R12, anytime, attended. Confirmed T's request: yes ("Plot it, after Android numbers" chosen via AskUserQuestion). Reason: anytime because it blocks nothing and its value is unmeasured until T runs PR #510's Android script. Resulting commit: this one.
- **2026-10-14** — actor: **T, attended session** (`/plot asap`, branch `ccr-9327878f-vn0e49`). Action: **added Phase PF3** (Sentry performance on preview builds, combat drag spans) above R12. Confirmed T's request: yes ("plot 1 and 2" via AskUserQuestion: Sentry tracing on preview, per-drag spans; no profiling, no in-app perf log). Reason: asap because it gives PF2 field data from normal play. Resulting commit: this one.
- **2026-10-13** — actor: **T, attended session** (`/plot`, branch `claude/new-session-99555a`). Action: **wrote the brief for Phase BT2** and rewrote its row; the row stays attended and in place. Confirmed T's request: yes (T picked layout B and card face 6 from on-screen prototypes, kept BT2 attended, and dropped the Truth/Legality ordering). Reason: BT2's scope was to be set with T after the BT playtest; this is that scope. Resulting commit: this one.
- **2026-10-13** — actor: **T, attended session** (`/plot`, branch `claude/new-session-99555a`). Action: **split Phase BT2** into **BT2a** (card face, D91) and **BT2b** (board layout, D92, requires BT2a), both no longer attended, in BT2's slot. Confirmed T's request: yes ("Split into BT2a + BT2b", so the loop can pick them up as two reviewable PRs). Reason: one PR touching the board, every card face and ten suites was too large; both edit `CombatBoard.tsx`, so they ship in order. The Android check moves to T's review (D86). Resulting commit: this one.
- **2026-10-14** — actor: **T, attended session** (`/plot`, branch `loop/plot-PF4-no-map-under-combat`). Action: **added Phase PF4** (no exploration map under live combat) above the first open row. Confirmed T's request: yes ("I no longer want the exploration map rendering underneath combat"). Reason: asap because combat jank is a live defect T reported on the APK. Resulting commit: this one.
- **2026-10-15** — actor: **T, attended session** (`/plot`, branch `loop/plot-EV1-loop-eval`). Action: **added Phases EV1a, EV1b, EV1c, EV1d** (measuring how well the loop judges its own work: escape ledger, fail-on-parent replay, planted defects and mutation scores, ranked fixes) after PF2, anytime. Confirmed T's request: yes (T's own prompt: "Measure before designing ... Don't build anything yet"). Reason: anytime because it measures and blocks no open row; EV1a is the first unattended row after PF3. Resulting commit: this one.
- **2026-10-15** — actor: **T, attended session** (`/plot`, branch `loop/plot-B3-hazard-puzzle`). Action: **briefed blocked owner-led Phase B3** (hazard mechanics redesign) and replaced its row with **Phases B3a, B3b, B3c, B3d, B3e, B3f** after EV1d, anytime; B3f attended. Confirmed T's request: yes ("/plot it now" via AskUserQuestion after the hazard brainstorm; one round, fixed layouts, both routes, solver band test, stat unlocks, loot and XP rewards, scaled failure, demos before any Act 1 puzzle). Reason: anytime because it blocks no open row and fixes no live defect; T wants demos to lock the process before the loop builds Act 1's puzzles. Resulting commit: this one; brief `plan/phases/phase_B3_hazard_puzzle.md`.
- **2026-10-15** — actor: **T, attended session** (`/plot`, branch `loop/plot-LV1-level-curve`). Action: **added Phase LV1** (the level curve) above the first open row, asap. Confirmed T's request: yes ("lower the experience amount a player would need to level up … level 20 by the time they start ACT 2"; stat points, enemy pins, the curve past 20, saves and the level-up refill chosen via AskUserQuestion). Reason: asap because B3's hazard XP and the coming Act 1 enemy retune build on this curve. Resulting commit: this one; brief `plan/phases/phase_LV1_level_curve.md`.
- **2026-10-15** — actor: **T, attended session** (`/plot`, branch `loop/plot-CR1-combat-route`). Action: **added Phases CR1a, CR1b, CR1c** (live combat on its own `/combat-encounter` route, the overlay era and the pre-v1 sandbox deleted, Sentry before/after) after B3f, anytime. Confirmed T's request: yes (T's prompt, and AskUserQuestion: fight in the store like hazard, delete the overlay, take `/combat-encounter` and delete the sandbox, labyrinth on the same route with its boss bug filed). Reason: anytime because PF4 already removed the map cost T reported and nothing open waits on it. Resulting commit: this one.
- **2026-10-15** — actor: **T, attended session** (`/march CR1c`). Action: **skipped Phase CR1c** (Sentry drag numbers before and after the combat route). Confirmed T's request: yes (AskUserQuestion: "Drop CR1c"). Reason: Sentry has received no performance transaction for `axiomancer-mobile` (`firstTransactionEvent` false), so no before-the-route window exists, and PF4 had already taken the map out from under combat. Acceptance A10 of the CR1 brief is dropped with it. Resulting commit: this one.
- **2026-10-16** — actor: **T, attended session** (`/plot asap`, branch `loop/plot-RV1-pr-review`). Action: **added Phases RV1a, RV1b, RV1c** (PR review pipeline: the always-reporting `verify-gate` check and risk derivation, the shadow Claude reviewer scored by the eval ledger, then three distinct-lens Sonnet sub-agents on medium and high risk and the seeded replay; RV1c added in the same session at T's word: "if the PR is a medium or higher impact, the reviewer skill triggers 3 sub agents ... not just 3 reviewers checking the same exact thing") above the first open row. Confirmed T's request: yes (T asked for a review pipeline modelled on Anthropic's published practice: risk tiers, shadow mode first, low-risk auto-merge later; the research pass is `docs/reports/pr-review-research.md`, carried in this PR). Reason: asap because the merge gate is the loop's largest measured miss (3 of 26 merges before checks or over a "not a pass", 9 of 26 diffs on uncovered paths) and every open `loop:pr` PR benefits from the first tick. Auto-merge is not wired: Stage 2 and D95 are a `plan/NEEDS_T.md` row (D86 holds). Resulting commit: this one; brief `plan/phases/phase_RV1_pr_review_pipeline.md`.
- **2026-10-18** — actor: **T, attended session** (`/plot asap`, branch `loop/plot-B3e2-puzzle-live-ui`). Action: **added Phase B3e2** (the hazard puzzle on the live hazard board) above the first open row, and made B3f require it. Confirmed T's request: yes (T played the B3e board: "ewwww! gross! ... nothing like the UI/UX"; chose "/plot reuse of live UI" via AskUserQuestion). Reason: asap because B3f's timed solves on the button board would set clocks for a UI the game will not ship. Resulting commit: this one; brief `plan/phases/phase_B3_hazard_puzzle.md` § B3e2.
- **2026-10-18** — actor: **T, attended session** (`/plot asap`, branch `loop/plot-HP1-cost-cards`). Action: **added Phases HP1a, HP1b, HP1c** (hazard puzzle cost-utility engine) above the first open row, and made B3f require HP1a and HP1b. Confirmed T's request: yes (T asked for cost-utility cards, ran the brainstorm, ruled "Players should not be able to bin/discard cards" for puzzles, and chose "/plot the engine phase" via AskUserQuestion). Reason: asap because the no-bin rules move two demos out of band, and B3f must time the demos as they will ship. Resulting commit: this one; brief `plan/phases/phase_HP1_hazard_cost_utility.md`; design record `braindump/2026-10-18-hazard-cost-utility-cards.md`.
- **2026-10-18** — actor: **T, attended session** (`/plot`, branch `loop/plot-HP2-card-audit`). Action: **added Phases HP2a, HP2b, HP2c, HP2d, HP2e, HP2f** (hazard puzzle card audit and difficulty calibration) after the last open row, anytime; HP2e attended. Confirmed T's request: yes ("plot the card audit prompt", the `/anthropic-skills:prompt` rewrite of "audit the current cards for the hazard puzzles ... figure out a way to measure difficulty"; B3f kept separate and first, pooled solvers, ρ ≥ 0.7 and a dev-only move log chosen via AskUserQuestion). Reason: anytime because it blocks no open row and fixes no live defect. Resulting commit: this one; brief `plan/phases/phase_HP2_puzzle_card_audit_difficulty.md`.
- **2026-10-18** — actor: **T, attended session** (`/plot`, PR #629, branch `ccr-8eb99fbc-h2jb8v`). Action: **added Phases LG1a-LG1h** (loop gates) after the last open row, anytime; LG1h attended; promoted all eight loop-gate `[owner]` candidates from the same session's `/messy`. Confirmed T's request: yes ("Plot everything we just pushed through messy same PR"). Reason: anytime because these fix the loop's merge gates, not a live game defect, and block no open row. Resulting commit: this one; brief `plan/phases/phase_LG1_loop_gates.md`.
- **2026-10-19** — actor: **T, attended session** (decision round, pushed to `main` at T's word). Action: **added Phase HP1d** (the worse-copy test) after HP1c and amended HP1c (no `gainDie` or reroll defaults; a paid cost needs a second utility). Confirmed T's request: yes (T: "if you pay for the card with a die AND you lose progress on the card, there better be another utility benefit"; "Automatic test now"). Reason: HP1c was unclaimed, so its brief changes before a tick builds it. Resulting commit: this one.
- **2026-10-19** — actor: **T, attended decision round** (`/plot`, branch `loop/plot-HP3-CT1-RS1`). Action: **added Phases HP3a, HP3b** (the illusion of randomness) above the first open row, asap, and made B3f require HP3a; **added Phases CT1a, CT1b and RS1** after the last open row, anytime. Confirmed T's request: yes (T chose "/plot it now", "Replace with real-fight tests" and "Loop sweeps reports", then "Plot them now as one PR"). Reason: HP3 asap because B3f must time solves on the board as it ships (`plan/deadlines.md` W1); CT1 and RS1 anytime (test quality and a process fix; no live defect). Resulting commit: this one.

## Phase log (commit hashes)

- phase 0 — (adoption commit) — nexus methodology adopted
- phase 1 — 0af106ff — combat test-coverage backfill (sig-overwhelming-argument funded-path victory witness)
- phase 5 — 98e7b2bc — village SELL tab (sellVillageItem action + presenter sellables/hasShop)
- phase 6 — 48d2c802 — memoir REMAINS section (death tally via hazardDeathCount + merged Rest/LootCache keepsake read-back)
- phase 4 — d9763659 — balance-sim population witnesses (execute finisher + escalation clock; Conclusion/BODY-sig already had coverage)
- phase 9 — 7ea06a6e / 6fa7f090 — character/story/world specs (C-01 the Sophist, W-01 the Aporia, S-01 fishing-village dilemmas; already shipped pre-tracking, recorded this tick)
- phase 13 — (port pre-tracking; mechanics `src/World/Hazard/` + `audit/` parity harness, mobile `state/hazard/store-actions.ts` consumer) — hazard v2 engine port verified already landed, mobile duplicate deleted, content parity confirmed; recorded this tick
- phase 25 — f7868e2a — /consolidate janitor mandate (terminology-sweep step + AUDIT finding) + `verify-mechanics.yml` stale `src/Skills/` impact-path fix; Part A harness re-apply verified already present at HEAD, no re-derivation needed
- phase D1 — 4adf7266 — spec 33 review landed (PASS-WITH-EDITS; die-gear expansion, STAKE retired, momentum null-reset, pool-law binding rule; supersession banners on HANDOFF-2026-07-09 + phase 31; 33c/33d re-scoped; Fate Engine P2 re-scoped, P3 retired)
- phase D2 — 18cf5e3b — Upgradeable-Dice engine core behind flag (four-die roll law + die-gear interface, stance-from-cards + open stance checks, null-reset momentum + until-spent surge, honest 1◆ Press Fate, 7-object ceiling overflow→+1◆, OVERHEAT crack primitive; draft/STAKE/read/variety-refresh retired in-flag; 24 hermetic tests, flag-off byte-identical, mobile re-verified)
