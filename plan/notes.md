

Defaults taken: migration 0008 was the next free number; the cron's clock is `controller.scheduledTime`; child deletes also filter on `source IN ('sim','harness')`, so a stray `human` row sharing a bot run id is kept rather than deleted with the run.

Live proof (first cron log line, `GET /v1/play-runs?source=sim` with no run older than 14 days) is a post-merge step after `backend-deploy` runs.

- Shipped as HP6a in #1280 (merge c3c717f68) before the nexus v2 cut-over (NX1d), which carried the v1 brief into spec 110 with this chunk still open. This file closes it after the fact; no code changes.

- `pickChapterHazardPuzzles` (hazard-puzzle.pick.ts) and `BREAKWATER_HAZARD_PUZZLES` (World/Continents/Coastal-Village/breakwater-puzzles.ts) shipped; the report ends with the six-node table, written by `npm run puzzle:sim`.
- Defaults: one node takes the middle of the window; a window too small for `n` throws; the pick re-sorts the rows with `compareHazardPuzzleCurveRows`, so a curve passed in any order gives the same picks.
- The table is node id to candidate id. After any HP4e cut or a change to the sim, re-run `npm run puzzle:sim` and copy the six-node table into `BREAKWATER_HAZARD_PUZZLES`; the pick test fails until it matches.
- 110.1 was treated as done (shipped in #1280); its close file rides in #1317.

- `state/hazard/puzzle-node-actions.ts` holds the puzzle on `hazard.puzzle` (never saved); `beginHazardAction` opens it when the node is in `BREAKWATER_HAZARD_PUZZLES` and no hazard id is pinned. `/hazard` renders `HazardPuzzleNodeBoard` (stakes card with the one goal, then the dev board with no route select); the run driver and the dev skip play it with `noisy-greedy`.
- Measure: the `bw-h4` walk passes (`state/e2e/hazard-puzzle-node.engine.test.ts`); `npm run sim:run -- --policy wanderer --runs 10 --seed 1` gave 10 chapter-clears, every run playing all six puzzles.
- Defaults: a pinned hazard id (option, `__AXM_HAZARD_ID__`, or the unified minigame config) keeps the three-round board, so dev entries and every Playwright harness that injects the default pin (smoke, critique, playtest) keep the old board at bw-m2; the smoke routes `hazard-puzzle-stakes` and `hazard-puzzle-node` drop the pin. The node is spent when its arrival resolves, as an old hazard's is (the held road opens on arrival, not on confirm); a reload mid-puzzle returns to the move's checkpoint, so the same puzzle opens again. New fixture `l30-cw-hazard-arrive` (cw-3) pins an old-board arrival.
- The new smoke routes have no committed baseline: CI's restamp writes them (Windows renders differ from the Linux baselines).

- Defaults taken under the loop: `RunRoadOption` also carries `distanceToStory` (the rusher needs "nearest the story's next step", which a one-road `story` flag cannot measure); `PLAYER_WITNESS` keeps greedy's `id` (`'greedy'`) because the `CombatSimPolicyId` union lives in `combat.sim-policies.ts`, left untouched; hazards are listed as the hazard library (any hazard node draws any hazard, by seed), hazard-crossing loot is not enumerated; `story` on a road is the current step's targets plus unspent held nodes plus an unbeaten boss.
- Retro: `src/CLI/e2e/cli.process-smoke.engine.test.ts` timed out (spawnSync ETIMEDOUT) inside a loaded full `verify` on this Windows box and passed alone; timing only, no code cause.

- The rows are counts for T to read; nothing grades the game from them (D57). `run-pacing` time is nodes resolved, since the sim has no clock.

- Defaults taken: `measuredTruthCells` takes `worn` (`'grey-pair'` by default, `'none'`) and `bareLanes`; every deck and
  family wears the grey pair through `wearGreyPair`, so the `grey even` column is the "grey even, grey pair worn" column;
  a control deck `grey+bare` (the grey deck with nothing worn, `MEASURED_BARE_LANES`) sits after the half-upgraded deck
  and each deck entry carries its `worn`; `renderLatest` names the column and marks each deck's loadout; the act-1 door
  fixtures wear the pair and `bw-k2` joins the excused-free set (it wins about 99% with the pair worn).
- Met here: the `stand-in-still-worn` footgun in 136.6's close and the `special-needs-a-weapon` one in 136.5's close;
  `Combat/combat.grey-sword.ts` and its `GREY_SWORD_STAND_IN` / `wearGreySword` exports are deleted.
- The run appended one `history.jsonl` line whose cells all moved (the pair is worn), so the next measured-truth run
  compares against it and files no drift for this change.

- Defaults taken: a wear from the ItemModal clears the picked row after it commits (so the next wear does not silently
  replace the same row); the 55% column rule applies below 900 pt (tablet included), the wide layout above is
  unchanged; the row glyph box shrank 40 to 34 pt, the gap and side padding 8 to 6 pt, so "Elementalist's Brooch" fits
  the narrower column unellipsed even when its row is picked (the picked border is 2 pt); the superseded
  `EquipmentDock.S3-sheet-C11.test.tsx` (slot column flexes) is deleted, its contract replaced by the rewritten
  portrait-box test.

- Defaults taken: a satchel tile on a touch device lifts after a 220 ms hold (on web, after 10 pt of movement), so the
  satchel list still scrolls under a swipe; a dock row lifts after 10 pt everywhere, so its tap and long press stay;
  the refusal line ("Only a relic fits RELIC I.") sits under the rows and clears after 2.4 s; a worn relic dragged from
  its satchel tile onto another relic row moves it (`moveRelic`) rather than wearing it twice; the satchel list is lit
  while a worn piece is dragged; built inline by the worker (no separate builder agent).

- Defaults taken: the library exports `weaponLibrary`, `armorLibrary` and `equipmentLibrary` (both) beside
  `EQUIPMENT_LANE` (the eight lane pieces only; the grey pair is absent), `greyPair()` and `wearGreyPair(character)`;
  the grey pair is worn and also carried in the inventory as copies (the satchel lists only inventory rows, so a worn
  piece missing from it could never be listed or kept on take-off); the pre-run shell (no character) wears nothing;
  `buildStagePlayer` wears the whole grey pair through `wearGreyPair`, and the mobile sim now fights the player as they
  stand (a new run wears the pair); the dice test players that kept a bare weapon wear the library blade alone; the dev
  item chips gained a weapons-and-armor row and the by-id lookup resolves them (carried while the grey pair holds the
  slots); `combat.grey-sword.ts` stays for the measured-truth cells and the act-1 door fixtures.

- Defaults taken: one presenter (`state/presenters/equipment-effect-line.ts`) words every piece (`equipmentEffectLine`,
  `equipmentEffectParts`, `specialFaceText`, `equipmentFiredText`); the satchel row and the dock row print the line
  (a signet relic keeps "grants ..."), the detail card gets an EFFECT block in place of the empty stat block; a fired
  piece is a player-side log line with no float, and a glyph chip beside the rune column (`CombatGear.tsx`) pulses and
  counts its firings in its label; the dice tray's BOON gloss and die a11y label read the worn weapon's payload
  (`vm.specialGloss`), the old Conviction figure from `dieGear` is no longer read by any surface.
- Not done, named: the SELF screen has no effect line (its worn rows carry no sub-label today); the blacksmith copy
  still says a BOON "pays its conviction payload".

- Defaults taken: `EQUIPMENT_DROP_TUNING` lives in `Items/equipment-drop.ts` with the pool and the roll (`equipmentDropPool`,
  `rollEquipmentDrop`, `carriedPieceIds`), and carries the shop fields (`shopCount` 2, `shopPrice` 40) for 136.9; the elite
  piece rolls on top of the relic roll and is not the whole reward (the XP, loot and card draft stand), queued on
  `/item-reward` under "DROPPED BY"; a befriended elite hands one at 100% under "GIVEN BY"; the cache roll is opt-in
  (`rollCacheReward` takes a `carrier`, the hazard puzzle passes none) on its own seed stream, so no seed's consumables move;
  `qualifiesForItemRewardScreen` now also says yes to a piece with an `effect` (a weapon or armor has no stat line or
  signature, so a quest-paid one would have been silently granted inline).

- Defaults taken: the stock is rolled when the village event resolves (`villageEquipmentShopFor`, seeded by the run and the node like the card shop, drawing `EQUIPMENT_DROP_TUNING.shopCount` ids from `equipmentDropPool`) and rides on the pending event as `equipmentShop`, only on a village that has a card shop; an empty pool omits the counter; `buyVillageEquipment` charges `shopPrice` and grants the piece unworn through `grantItem`; `VillageVisit.boughtEquipmentIds` is optional so older visit literals still type; the screen section sits under the card shop and above the Anvil, a row per piece (sprite, name, slot, price) in the counter's `wareRow` style; each row also shows the shared `equipmentEffectLine` (136.7 had merged); the game CLI's village menu does not list the counter yet.

- Defaults taken: `checkFaceGrammar(cards, keywords?)` takes an optional atlas word set (the fence passes every atlas row; without it the capitalised words the cards print stand in), so the one-argument contract still holds; it reads `faceLines(card)`: FREE and PAID from `cardLinesText` (the discard rider included), or a Global's `text` and `paidDelta`, never the trigger opener or the "In play 3 turns." stand-in; one violation per card, keyed by card id; the closed lists (entities, logic words, `spent`) and `RETIRED_FORMS` sit in `Cards/card-rules.ts`; `checkTextOrder` compares the first appearance of each step keyword (a keyword after `=`, `your`, `foe's`, `has` or `each` is a value, not a step) with `recordVerbs`'s call order under both probe queries, judging only keywords both sides have; plain cards have no program, so only the grammar reads them; base cards only, as the sibling rules. Today: 123 of 123 library cards pinned under `face-grammar`, 0 under `text-order`. The fixture's new rows carry the reason "pinned at CF1a: today's wording, rewritten to docs/card-voice.md by CF1b".

- Built inline by the pilot worker (no Workflow tool in a worker), gated by the lead's gate.
- A4: 0 `face-grammar` and 0 `text-order` rows in `card-rules.exemptions.json`; the reseed also dropped two rows the rewrite fixed (`complexity-budget bp-e-04c`, `global-template el-e-06a`). Every `run` body is byte-for-byte except Callus (DEAL X FREE or PAID) and the Global type change (`ProgramGlobal.free`/`paid`/`paidDelta` became one `run`). A pin test prints the voice's twelve worked examples exactly (`card-rules.engine.test.ts`).
- A5: `KEYWORD_GLOSS` gains `Discard` (always random, a cost); `Vulnerable` reads "VULNERABLE 25% means 25% more damage from every hit"; the systems glossary gains READING A LINE (left to right, debuffs land on the foe), HALF YOUR VITAE (half or less) and ELEMENTS, and GLOBAL says "3 turns played FREE, the whole combat played PAID".
- A10: `checkGlobalTemplate` lost its PAID-change clause; `faceLines` and `checkTextOrder` read the one Global effect.
- Defaults taken (T rules on the PR): DISCARD got an atlas row as a Rule keyword (it names the discard pile, so the budget skips it); 49 words the closed lists could not cover are accepted as "Pending T" (`docs/card-voice.md` §3, `FACE_PENDING_*` in `card-rules.ts`); the SACRIFICE trigger prints `When you SACRIFICE X:`; the face projection ends each program line with `. Costs 1 die.` and joins a discard rider with `. `; the lane bots' vocabulary skips CONVICTION (now printed in capitals by three lanes).

- Built inline by the pilot worker. A6: the twelve sample cards each print their whole PAID line at 10px in at most three rows with nothing clipped on the 120 by 176 hand card, measured in the web export (before/after in the PR). A7: a Global's small face wears a GLOBAL plate where the FREE pill sits, no FREE line and no duration; its large face states "3 turns played FREE, the whole combat PAID".
- The small face renders `face.paidLine` (`paidFaceLine` in `combat.cards.ts`): Bebas capitals for keywords, numbers and X, IM Fell for the logic words, sized by `paid-line.engine.ts` (10px, down to 8px for a line that needs more than three rows). The die cube rides the ledger's top-right corner. The large face keeps its keyword-and-value row.
- Fixed from the 137.2 review: a Global's projected PAID text no longer doubles its full stop; the HEAL-times-a-board-number headline reads "HEAL varies". Stat-scaled grey cards now print the voice (`DEAL 6`, `VULNERABLE 35% for 2 turns`) at every stat, and a plain DEAL no longer carries a generated "over its run".
- Defaults taken: the small face drops the stat-family tint on its numbers (the whole line is final numbers); the deck tab stays a row list (it never drew the small face); 31 of 123 library lines are longer than 44 characters and a few (the longest 109) need the 8px floor and still clip a third row, the large face prints them whole.

- Built inline by the pilot worker. A8: `PlayerSettings.cardText` (`'words'` default; a save without it reads `words`, no schema version change) with a "Card text: Words / Glyphs" row under TEXT SIZE; glyph mode changes only each printed keyword's form on the small face, and the open card shows the glyph beside the word in both modes. A9: every printed keyword has a glyph (bar VITAE, CONVICTION and HOLDS, system words that stay words) (`components/keyword-glyphs/`, one component per keyword behind `KEYWORD_GLYPH_COMPONENT`, labelled with the keyword's word, coloured by category from `HUE.glyph*`); a test pins that the set equals the capital words the library prints, bar VITAE.
- The mock's twelve glyphs are ported as drawn (MERCY a laurel); the other nine (HEAL, WAIVE, STORM, FROZEN, DRAW, THORNS, REFLECT, RETRIEVE, RADIANCE, YIELDING) are drawn here in the same hand and each differs from every other glyph.
- The Measure, run once (Sonnet, no tools, faces plus legend plus glossary, 23 lines per mode, glyphs given as shape names with a legend): 0 confident wrong readings in both modes; mean confidence 4.13 (words) and 4.09 (glyphs). The table is in the PR body.
- Defaults taken: colours by category as fixed hues, HEAL green, STORM yellow, EXILE salmon; the large face reads its glyph from the headline keyword or, when the headline is the whole line (`Deal 9`), the value's first word.

- Built inline by the pilot worker. A11: the 17 pending logic words moved into `FACE_LOGIC_WORDS` and the 32 pending content words into `FACE_CONTENT_WORDS` in `card-rules.ts`; both pending sets and their check in `faceLineIssues` are gone, and `checkFaceGrammar`'s header names the closed lists without a pending clause. `docs/card-voice.md` §3 gains the logic rows (`+` between two values included) and a closed content list beside `spent`, each word with a library example; the "Pending T" heading and paragraph are deleted.
- A unit test pins a formerly pending logic word (`+`), a content word (`debuffs`) and `this` passing, and a stranger word still failing. No card text changed; the exemptions fixture needed no reseed.
- Defaults taken: T's "For now, approve them all" read as every one of the 49 words, with no word reworded. `only` joins the table with its one library use, `(foe only)`, noted as the line 137.6 (CF1f) rewords away.

- Built inline by the pilot worker. Re-measured every library PAID line (base and every upgrade level, words and glyphs, with the die-and-colon lead) after e1d1fe8de: ten cards were over three rows at 10px, not three.
- Reworded to fit in the closed word lists, no `run` body or number changed: Repaid in Kind, Pin with Lightning, Shed the Shell, Call Back a Kindness, Not Yet (`go` joins the closed words), Shatter the Frost (`for each spent`, T's pick).
- Two effect changes by T's ruling (2026-11-01), against A12's "no run body changes": Boil to Steam's INFERNO is now ordinary (`c.inferno(x)` instead of foe-only), so it burns both sides by its own rule, and its lines print `BLIZZARD 2, INFERNO 1` and `Spend all your INFERNO. For each: BLIZZARD 2, INFERNO 2. EXILE`. Stay the Hand reads `its next attack deals N less` (`its` and `deals` join the closed words); no run change.
- `paid-line.fit.engine.test.ts` fails any card over three rows unless it is in `PARKED_FOR_T`, and fails a parked card that now fits. Still parked: Boil to Steam and Stay the Hand (four rows at 10px in words, T picked the wording), Uneven Trade (T allows it), Feeding Mark (waits on a keyword T is designing). A12 stays open for those four.

- Fired by T through `/bug`, fix now. A13: both faces print `f.paidLine` through `PaidLineText`; the old headline (`keywordGlyph`, `keywordText`, `paidValueFor`, `kwColor`, `tintFor`) and the staged card's dead `heroOverride` are gone. `armedValue` and the VM's `keyword`, `heroText` and `familyGlyph` fields stay, since the presenter's tests and other readers use them.
- Defaults taken: the large line prints at 15 to 17 px by width (`largePaidLineSize`); a keyword with no glyph (VITAE, CONVICTION, HOLDS) stays a word in Glyphs mode, as on the small face; the colon takes the same ink as the line; no Asap lane entry, because the plot and its close land in one PR.

- A14: an opened card shows no Global duration line, no meta strip and no system notes. Removed: `durationLine` and its `combat-card-face-duration` block in `CombatCardFace`'s large branch; the meta strip and the rarity pip row (`detailMetaRow`) in the combat detail; the meta line in `DeckCardDetailOverlay` and on the `DeckCardTile` list tile (stance dot and strip); the system-notes block and its `systemTerms` plumbing (`systemTermsForCard`, the match tables, `CombatCardDetailVM.systemTerms`, and the pip-row-only `rarityLabel`, `rarityPips`, `rarityColor`). Render tests fail on the old build and pass now.
- Kept: `SYSTEM_GLOSSARY` and all its entries (a Rules Glossary button in Settings is plotted separately) (the board glossary reads CONVICTION, RESERVE & PIPS and GLOBAL; the keyword atlas and `scripts/content-drift.mjs` read the term list), `globalDurationLine` (the lifecycle sentence in `programLifecycle` uses it), and (T, 2026-11-02, "Remove it too") `metaChip` is deleted from both view models since nothing reads it.
- Defaults taken: the whole tile row goes with the strip, its stance dot included; the rarity pips are the "trailing dot" T scribbled, so the combat detail loses them too (the large face still prints the rarity word).
- T: a Rules Glossary button in Settings, plotted separately; until it lands no screen teaches the reading rules.

- Closed by the deadlines reconcile of 2026-11-03 (T asked three times to remove the overdue items). No code changes; the Held line for 120.5 is removed in the same PR.

Defaults taken: plates at the shared 640px recipe, plate-page crop only for Rousseau and Bierstadt (scan mounts), Bierstadt's artist corrected by hand in provenance, and the twelve requires parked in a `KEPT_ARENA_PLATE_ART` record in `combat/index.ts` so the provenance gate sees them until 146.2 builds the library.

Defaults taken: the library is `ARENA_PLATES` keyed by plate id (exported with `ArenaPlateId` and `ARENA_PLATE_IDS` for 146.3); the Drowned Parish and the fallback stay outside the twelve, so a node cannot name them; the temporary `KEPT_ARENA_PLATE_ART` record is gone, the library's `require()`s keep the provenance gate green. Alt text was written from looking at each plate, and the Riesengebirge one says what is truly there: a pale empty sky over faint ridges.

- T corrected the spec's premise at the /pilot gate: combat draws animation cells, not the roster stills, and the cells of all seventeen foes carry real transparency (alpha sampled across every cell, not the file flag), Death Beholder and Green Jelly included. T's answers: Backing source, "One per foe, all cells"; Open question 3, "Remove it".
- The pane draws the matte only while `ARENA_PLATES_SHOWN` is true: over the black scene it showed as a faint blob, because the scene is `deepBg` and web's tint filter shifts a near-black (`#070509` renders as 13,0,13). 146.5's flip turns it on with no pane edit.
- Defaults taken under the run: mattes live in `assets/images/enemies/backing/`, not beside the cells, because `scripts/frame-cells.test.mjs` counts every `.webp` under `anim/<key>/` as a cell. Mattes are not world plates, so `docs/art-catalog.json` is untouched. A detached spark under 0.4% of the cell gets no backing, so it does not hang a dark blot in the air on every frame.

- The report composites what combat draws: the foe's idle-clip resting cell (`<key>-00.webp`) over its all-cells matte tinted to the default theme's `AXM.bg`, over the plate, at the pane's fallback figure geometry on a 390x844 phone. It does not model the HUD-measured top, idle breath, lunge or the scrims.
- Region membership is read from `mapContent(def).enemies` per Act 1 map: the Breakwater stages all 17 foes, each other region stages Float-Eye, Green Jelly and Death Beholder. No foe is regionless.
- With the backing on, separation is the same on every plate of a region by construction (the foe sits wholly on its matte); the report says so and tables the no-backing figure beside it. The aura is not measured.
- Regenerate with `node axiomancer-mobile/scripts/measure-arena-separation.mjs`. A measurement, never a gate (D57).

Defaults taken: `NodeLayout.arena?: ArenaPlateId` is a type-only import from assets (state layouts already import assets, assets import nothing from state). The resolver cannot look up layouts without a cycle, so `arenaBackdropFor` and `arenaAltTextFor` take `(region, nodePlate?)` and `nodeArenaFor(region, nodeId)` in `state/exploration-maps` turns the node into its plate; the pane calls both, and art and words follow one choice. The route already held `nodeId`; the panel now passes it to the board and the board to the pane. A fight with no node (labyrinth, dev sandbox) passes none. No layout names a plate yet.

- A5's "a new decision supersedes D32" is met once, by `D?combat-plates-on` in `plan/pending/plot-arena-plates.md`, which already supersedes D32. This close files no second copy; it relies on that plot settling.
- The pane's figure geometry is unchanged.
- With plates on, a hard dark edge and a lighter rectangle showed under the HUD on web. Cause: the pane's three scrim `Svg`s named no size, and web draws that as the browser's default 300x150 box. They now say `width="100%" height="100%"`; native is unchanged.
- `map-walk-e2e.mjs` asserted the black scene (no image); it now asserts the plate is drawn.
