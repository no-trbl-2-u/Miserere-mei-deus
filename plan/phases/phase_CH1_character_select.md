# Phase CH1 — Character selection: each run opens as a character

## Sources

- `/plot asap` from T, 2026-10-26, chosen at the end of the character-selection `/pitch` (plot run unattended, T
  not present to answer). The pitch file is `braindump/2026-10-26-character-selection.md`; its "Handoff to /plot"
  block is this brief's input: the Task is the Outcome, A1-A6 and the Measure carry over, and the Rulings are the
  decisions below. T's surface question, verbatim: "The player will be able to select from a series of characters.
  Each character has: a unique portrait, a starting relic (starts equipped), a starting stat allocation, two
  specific starting lanes DIFFERENT from their relic's lane. This overrides the decision where 'when a relic is
  acquired, it unlocks the lane for the random card rewards'."
- Recorded as **D108** (`plan/2026-09-25-refactor-strategy.decisions.md`): the character-selection rule. It
  overrides D104's carry-to-unlock rule and builds on D107 (PR #944, open at the time of this plot), which narrowed
  the pool to worn relics and called the worn-only pool a stopgap "until character selection exists".
- Decisions it rests on: D71 and D100 (worn relics weight the offer toward their lane), D104 (the reward rule,
  RW1), D105 (three relic slots; EQ2), D88 (portraits, relics, stat spreads and playstyle lines are T's content;
  T is asking now), D57 (the measured report is a measurement, not a gate).
- Plans it extends, not duplicates: RW1a (`plan/phases/phase_RW1_reward_rule.md`, open, amended by #944) builds
  `unlockedLaneIds(player)` and `rewardPoolFor`; CH1b adds the starting lanes to that one function. LR1
  (`plan/phases/phase_LR1_lane_relics.md`) builds the six lane relics a starting relic may be drawn from.
- Code read while shaping this (already built, already planned, new):
  - **Already built — presets, not characters.** `axiomancer-mechanics/src/Character/presets.ts` holds three dev
    presets (apprentice, wanderer, sage) that differ only by level, stats and items; no relic, no lane, no portrait.
    They are dev tooling (the DEV preset picker, the playtest runner, tuning bands) and stay as they are.
  - **Already built — the new run.** `createNewGameState` (`Game/game.reducer.ts:134`) makes a level-1 player at
    `{ heart: 5, body: 5, mind: 5 }` (15 points, the budget `presets.engine.test.ts` "stat curve" pins) with no
    relic (SG1, #928). Mobile: the title's NEW GAME goes to `/saves?mode=new`, the slot pick calls
    `startNewGameAction` (`state/menu/store-actions.ts:92`), then `enterRun` routes into the run.
  - **Already built — the portrait.** `components/art/PlayerPortraitImage.tsx` reads a `portrait:<id>` flag from
    the save; the SELF screen's bust cycles the gallery on tap (`app/(tabs)/character/index.tsx:64`);
    `assets/images/portraits/index.ts` holds `PLAYER_PORTRAITS`.
  - **Already built — lanes.** `Cards/card.lanes.ts`: `GREY_LANE` plus `CARD_LANES` (registered: `blood-price`,
    `elementalist`). Grey is the starter office, not a lane (T, pitch t2).
  - **Already planned — the pool function.** RW1a adds `Equipment.laneId`, the relic-lane resolver and
    `unlockedLaneIds(player)`; as amended by #944 it reads worn relics only and falls back to grey when empty.
  - **Already built — the measured report.** `scripts/measured-truth.mjs` over `Combat/combat.measured-truth.ts`
    writes `docs/reports/measured/latest.md` (fight cells by deck; no reward-offer section).
  - **New:** the character definition and roster, the save fields, the select screen, the report section, and the
    first character's content.
  - **Missing primitive, named:** a character needs three distinct lanes (its relic's plus two starting lanes), and
    only two are registered. The third lane is T's to plot (pitch, out of scope). CH1e and CH1f wait on it.
    Met by DF1d: the Defender is the third registered lane (`defender`, 2026-10-27). The Merciful is the fourth
    (`merciful`, MF1d, 2026-10-30), and the Suppliant's Ring is its relic (`laneId: 'merciful'`), so CH1e can pick it.
- **Amended by `/plot asap` from T, 2026-10-30, at the CH1e sitting** (attended): T authored the Chosen and changed
  the deck rule for every character (A8, CH1g): grey Blow 3 / Ward 3 / Word 2 plus one card from each starting
  lane, none from the relic's lane. CH1a-CH1d had shipped (#974, #978, #979, #981), so the amend is a new phase,
  not an edit of CH1a; CH1f now requires it and names the Chosen.
- **Amended by `/plot asap` from T, 2026-10-31** (attended, during `/heads-down CH1`): after CH1f (#1180) shipped, a
  game over still restarted the run as the same character with everything kept, and a full reset rebuilt the same
  character. T: "New run, new character"; "Ending a run means, yes, you should make a new character". T also ruled
  that a Labyrinth defeat ends the run, and that the codex carries over (A9, A10; CH1h, CH1i).
- **Amended on the plot PR (#1181) by T, 2026-10-31:** "can we ratify this that the player gets a Game over
  screen?" A run end shows a Game Over screen before character select (A11, CH1j).

## Outcome

Add a character select at run start, so each run opens as an archetype. Each character has a portrait, an equipped
starting relic, a stat spread, and two starting lanes other than the relic's. The reward pool is those two lanes
plus the lane of every worn relic, never grey, so late-run lane control differs from the start.

## Acceptance

- **A1** A character definition (engine) carries a portrait key, a starting relic id, base stats, two starting lane
  ids, three starting lane cards and a short playstyle line. A content test fails if a character's starting lanes
  include its relic's lane, or name an unregistered lane; if its stats do not total 15; or if its starting lane
  cards are not exactly one card from each of its three lanes (the two starting lanes and the relic's), or include
  a Spell, a Global or a Curse.
- **A2** Starting a run with a character equips its relic, applies its stats, deals the character deck (Blow 3,
  Ward 2, Word 2 plus its three lane cards), and records its two starting lanes on the save. Until the first
  character goes live (CH1f), a save with no character loads as today's run.
- **A3** The reward pool is the character's two starting lanes plus every worn relic's lane. Wearing an off-lane
  relic adds its lane; unwearing removes it; an unworn relic changes nothing; grey is never offered. An engine test
  covers each case.
- **A4** The character select screen: a two-row carousel of squares at the bottom (locked squares show a
  question-mark icon); above it the portrait and the starting relic as the two focal elements, then stats and a
  one-line playstyle. Starting lanes are never named on the screen. A screen test pins the layout's elements and
  the absence of lane names.
- **A5** The measured report gains a column: the lane mix of reward offers at run start and after three worn
  relics, per character.
- **A6** The first character is selectable; the other carousel squares are locked. From then on every run starts at
  character select: the grey empty-pool fallback is deleted (a test asserts a run's pool is never empty), and a save
  made before characters cannot be continued: its slot reads "Made before characters" and offers only deletion
  (T, 2026-10-26).
- **A7** T's first character is written down in this brief's "T's characters" table: the portrait (a gallery id or
  an image T supplies), the starting relic (an existing library relic or one T writes, with its lane), the stat
  spread, the two starting lanes, the three starting lane cards and the playstyle line, each in T's words. (Split out of A6 so the authoring and
  the wiring are closed by different phases.)
- **A8** (T, CH1e, 2026-10-30; amends A1's and A2's deck rule) A character carries two starting lane cards, one from
  each starting lane and none from its relic's lane, and its run deals Blow 3, Ward 3, Word 2 plus those two. The
  content test fails a character whose starting cards are not exactly one from each starting lane, include a card
  of the relic's lane, or include a Spell, a Global or a Curse.
- **A9** (T, 2026-10-31: "New run, new character"; "Ending a run means, yes, you should make a new character") A run
  ends at a game over (a death while dying, on the map or at a hazard) and at a Labyrinth defeat (T, same day). A
  run end keeps only the codex (T: carry it) and the rng state; the character, its level, deck, relics, gold,
  quests, flags and world are dropped, and the state says the run is over with no character chosen. Starting the
  next run as a roster character gives that character's fresh level-1 run with the codex carried. `RESET_RUN` never
  reuses the previous `characterId` by itself. An engine test covers each run end and the codex carry.
- **A10** After a run end the player lands on character select for the same save slot: CONFIRM starts the next run
  in that slot as the chosen character (codex carried), BACK returns to the slot list. A slot saved at a run end is
  never "Made before characters": it reads as a finished run, and continuing it opens character select. A screen or
  store test covers the map game over, the hazard game over and the Labyrinth defeat.
- **A11** (T, 2026-10-31: "the player gets a Game over screen") Every run end (map game over, hazard game over,
  Labyrinth defeat) first shows a full-screen Game Over: a title, one line of copy and one button that goes on to
  character select for the same slot (A10). It is a moment, not a save state: a reload while it shows, or continuing
  the run-over slot later, opens character select directly. A screen test covers the three run ends passing
  through it.

Measure: the A3 engine test passes, and the A5 report column shows the late-run lane mix includes a lane absent at
run start.

## Phases

### CH1a — The character in the engine, and the save · M · closes A1, A2 · requires RW1a

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile` green; the roster
content test, the validator's fixture cases and the new-run-with-character test pass; a current-version save with
no character loads unchanged.

- Scope: new `axiomancer-mechanics/src/Character/roster.ts`: `CharacterDefinition` (`id`, `name`, `portraitKey`,
  `startingRelicId`, `baseStats`, `startingLaneIds: readonly [string, string]`, `startingCardIds: readonly [string,
  string, string]`, `playstyle`), `CHARACTER_ROSTER`
  (empty in this phase; T's content lands in CH1f), `getCharacterDefinition(id)`, and
  `characterProblems(def, lanes?, relics?)` returning every broken rule (relic not in the library, relic with no
  registered lane, a starting lane equal to the relic's lane, a starting lane not registered, the two starting
  lanes equal, `grey` named as a lane, stats not totalling the fresh-run budget, starting lane cards that are not
  one card from each of the three lanes, or that include a Spell, a Global or a Curse). `Character/types.ts`:
  `characterId?: string` and `startingLaneIds?: string[]` on `Character`. `Game/game.reducer.ts`:
  `createNewGameState({ startMap?, characterId? })`; with a character it applies the stats (and the max VITAE they
  give), equips the starting relic through the existing equip path (it takes the first relic position), deals the
  character deck (Blow 3, Ward 2, Word 2 plus its three `startingCardIds`; a run with no character keeps Blow 5,
  Ward 3, Word 2) and records `characterId` and `startingLaneIds`; with an unknown id it throws. Exports from `Character/index.ts` and
  `src/index.ts`. Mobile: `startNewGameAction` gains an optional `characterId` passed through; no screen change.
- Consumers: `startNewGameAction`, the CLI's new-game path if it builds a state (it passes no character), the
  catalog exporter if the typecheck names it.
- Save / schema: two optional, additive fields on the saved player; no `game.migrate.ts` hop unless the builder
  finds a reader that rejects unknown fields (then the next free version, after EQ2a's v39 if that has landed).
  A save with no `characterId` is a run with no character.
- Tests matrix: new `Character/e2e/character-roster.engine.test.ts` (A1: the real roster passes
  `characterProblems`; fixture definitions, fixture lanes and fixture relics hit each broken rule once); new
  `Game/e2e/new-run-character.engine.test.ts` (A2: a fixture character's run has its relic worn, its stats and max
  VITAE, the ten-card character deck, its two lanes and its id on the player; a fresh run with no character is today's run; an unknown id
  throws; a saved fixture with no `characterId` round-trips through `migrate` with both fields absent); a mobile
  store test that `startNewGameAction(…, characterId)` writes the character's run to the slot.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`.

### CH1b — The pool: starting lanes plus worn relics · S · closes A3 · requires CH1a

Measure: the A3 engine test (`Combat/e2e/character-pool.engine.test.ts`) passes over many seeds with fixture lanes,
relics and a fixture character.

- Scope: `Combat/combat.rewards.ts`: `unlockedLaneIds(player)` returns the player's `startingLaneIds` plus every
  worn relic's lane, each once, in registry order, `grey` never in it; `rewardPoolFor` keeps RW1a's empty-pool
  fallback for a player with no character (the D107 stopgap). The lane slot count (D100) is unchanged: it counts
  worn relics only, so starting lanes widen the pool and never add a guaranteed slot. The dev override stays an
  override. Comments in `Character/types.ts` updated.
- Consumers: none beyond RW1a's (the combat aftermath, the cache and the elite reward all read the same function).
- Save / schema: none.
- Tests matrix: new `Combat/e2e/character-pool.engine.test.ts` (A3): a fixture character with lanes X and Y and a
  worn relic of lane Z offers only X, Y and Z cards; wearing a relic of lane W adds W; unequipping it removes W;
  carrying it unworn changes nothing; taking off the starting relic removes Z; no offer is ever a grey card; a
  player with no character keeps RW1a's behaviour (its tests pass unchanged).
- Verify gate: `npm run verify -w axiomancer-mechanics`; `npm run verify -w axiomancer-mobile`; `npm run e2e:combat`.

### CH1c — The select screen · M · closes A4 · requires CH1a

Measure: the screen test passes; a 375-wide browser screenshot of the screen (the all-locked state from `/dev`, and
a fixture character rendered in the test) is attached to the PR.

- Scope: new route `axiomancer-mobile/app/character-select/index.tsx`, registered in `app/_layout.tsx`; a presenter
  `state/presenters/character-select.engine.ts` building the view model from `CHARACTER_ROSTER`; components under
  `components/character-select/`. Layout, top to bottom: the portrait and the starting relic (icon and name) as the
  two largest elements, then the stats (HEART, BODY, MIND numbers), then the one-line playstyle, then a CONFIRM
  button, then the carousel: two rows of squares at the very bottom, a selectable square showing a small version of the
  character's portrait (T, 2026-10-26: the small portrait in the square and the large one above), a locked square a
  question-mark icon. Tapping a selectable square shows that
  character; tapping a locked square does nothing (its a11y label reads "Locked"). No lane name, lane colour key or
  card list appears anywhere on the screen. Flow: after the slot pick on `/saves?mode=new`, the app opens
  `/character-select?slot=<n>` when the roster holds at least one character; CONFIRM calls
  `startNewGameAction(…, characterId)` and enters the run; BACK returns to the slot list. While the roster is empty
  the flow is today's (no screen). `/dev` gains a row that opens the screen in its all-locked state.
- Consumers: `app/saves/index.tsx` (`startNewGame` routes through the screen when the roster is non-empty),
  `state/SaveSlotsProvider.tsx`, `lib/platform/router.ts` if routes are listed there, bearings' route list.
- Save / schema: none.
- Tests matrix: new `state/presenters/__tests__/character-select.test.ts` (squares from a fixture roster, locked
  padding, the selected character's VM); new `app/__tests__/character-select.screen.test.tsx` (A4: the portrait,
  relic, stats and playstyle elements exist by testID in that order above the carousel; two carousel rows; locked
  squares render the question-mark icon; no registered lane's `name` or `id` appears in the rendered text);
  `state/e2e/saves.screen.test.tsx` gains the non-empty-roster route and keeps the empty-roster flow.
- Verify gate: `npm run verify -w axiomancer-mobile`.

### CH1d — The report column · S · closes A5 · requires CH1b

Measure: `npm run measured:truth` regenerates `docs/reports/measured/latest.md` with a "Reward lanes by character"
section; with an empty roster it holds the no-character baseline row only.

- Scope: `Combat/combat.measured-truth.ts` (or a sibling `combat.reward-lanes.ts`): for each roster character, roll
  N seeded combat rewards at run start (its starting relic worn) and after three worn relics (the starting relic
  plus the two library lane relics that add the most lanes not already in the pool, ties in library order), and
  report each lane's share of the offered cards and the lanes present in each state; one baseline row for a run
  with no character. `scripts/measured-truth.mjs` prints the section; the report's history line records it.
- Consumers: `scripts/measured-compare.mjs` if it parses sections (it must ignore or carry the new one).
- Save / schema: none.
- Tests matrix: a unit test of the section builder with a fixture roster, fixture lanes and fixture relics (the
  late state names a lane the start lacks when such a relic exists); `scripts/measured-compare.test.mjs` if the
  parser changes.
- Verify gate: `npm run verify -w axiomancer-mechanics`; root `npm test`.

### CH1e — T authors the first character · S · closes A7 · requires nothing · attended · blocked until a third lane is registered

Measure: the "T's characters" table below holds one complete row in T's words, and `characterProblems` would pass it
against the lanes then registered.

- T, in session: picks the portrait, the starting relic (from the library or newly written, with its lane), the
  stats, the two starting lanes, the three starting lane cards (one per lane, no Spell or Global, ideally thematic
  enough to show the player what each lane is about) and the playstyle line. The stats are already set: Body 7,
  with Heart and Mind 5 and 3 (T settles which in the sitting). The session records them below and in
  `plan/revamp/relics.md` if the relic is new. Nothing is built.
- The row is `[blocked: T to plot a third lane …]`: a character needs its relic's lane plus two others, and two
  lanes exist. T keeps the block (2026-10-26): the character waits on at least one new lane, and T plans two new
  lanes before a character goes live. The plot that registers the third lane (or T) turns the row to `[ ]`.

### CH1g — The character deck rule, amended · S · closes A8 · requires nothing (CH1a shipped)

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile` green; the roster
content test's fixture cases hit each amended rule once, and the new-run-with-character test deals Blow 3, Ward 3,
Word 2 plus the two lane cards.

- Scope: `Character/roster.ts`: `startingCardIds: readonly [string, string]` (one per starting lane; the doc
  comment says so); `CHARACTER_GREY_DECK` becomes Blow 3, Ward 3, Word 2; `characterProblems` replaces the
  one-per-three-lanes match with one card per starting lane, and adds a rule (its own `CharacterProblemCode`) for a
  starting card in the relic's lane; the Spell/Global/Curse rule stays. The run's deck already comes from
  `CHARACTER_GREY_DECK` plus `startingCardIds` (`roster.ts`, the ten-card deck helper), so the reducer is
  unchanged. The roster stays empty; no content.
- Consumers: every fixture that builds a `CharacterDefinition` with three cards:
  `Character/e2e/character-roster.engine.test.ts`, `Game/e2e/new-run-character.engine.test.ts`,
  `Combat/e2e/character-pool.engine.test.ts`, `Combat/combat.reward-lanes.test.ts`, and on mobile
  `app/__tests__/character-select.screen.test.tsx`, `state/e2e/menu-store-actions.engine.test.ts`,
  `state/presenters/__tests__/character-select.test.ts`.
- Save / schema: none (the roster is empty; no save holds a character yet).
- Tests matrix: the roster test's fixture cases (a relic-lane card, two cards from one starting lane, a missing
  starting-lane card, a Spell) each fail once and a sound two-card fixture passes; the new-run test pins the
  ten-card deck.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`.

### CH1f — The first character, selectable · M · closes A6 · requires CH1b, CH1c, CH1d, CH1e, CH1g

Measure: on the web build, NEW GAME after the slot pick opens the select screen with the Chosen selectable and
the other squares locked; the regenerated report's "Reward lanes by character" row for the Chosen is read
against the Measure above.

- Scope: the Chosen from the "T's characters" table into `CHARACTER_ROSTER`: id `the-chosen`, name "The Chosen",
  portrait `altair-man`, relic `relic-disarming-plea` (the Suppliant's Ring, already in the library, lane
  `merciful`), stats Heart 7 / Body 3 / Mind 5, starting lanes `defender` and `blood-price`, starting cards Hedge
  Strike `df-e-04a` and Scar Tissue `bp-p-02a`, playstyle "Fumbling Squire trying to hold the line". No new relic or
  portrait is needed;
  `PlayerPortraitImage` reads the character's portrait for a run with a character. The character becomes
  mandatory: NEW GAME always goes through the select screen; RW1a's grey empty-pool fallback is deleted, and the
  new-run path cannot build a player with an empty pool (dev presets, the CLI and the sims pass a roster character
  or an explicit lane list); a save with no `characterId` shows "Made before characters" on its slot with only a
  delete action (the existing delete-slot path), and cannot be continued (T, 2026-10-26). `npm run measured:truth`
  regenerated.
- Consumers: the SELF screen bust, the combat medallion, the pilgrim inspect modal (all via `PlayerPortraitImage`);
  `app/saves/index.tsx` (the old-save slot); `rewardPoolFor`'s callers (no fallback).
- Save / schema: none.
- Tests matrix: the roster content test (A1) now covers a real character; a screen test with the real roster (one
  selectable square, the rest locked); a store test that confirming T's character starts a run with its relic worn
  and its lanes recorded; the portrait test for a character run; a pool test that no run's pool is ever empty and
  no offer is grey; a saves screen test that a slot with no `characterId` reads "Made before characters", offers
  delete, and offers no continue.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, root `npm test`.

### CH1h — A run end drops the character · M · closes A9 · requires nothing (CH1f shipped, #1180)

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile` green; the run-end engine
test shows a game over and a Labyrinth-defeat reset leave no character, keep the codex, and the next run as the
Chosen starts at level 1 with its ten-card deck and the codex entries unlocked before.

- Today (read 2026-10-31): `Game/death.ts` `resolveDeath` answers a death while dying with
  `freshRunKeepingCharacter` (the whole player kept: level, deck, relics, gold); `RESET_RUN` with `keepCharacter:
  false` rebuilds the same character via `again` (`game.reducer.ts`, CH1f); mobile's Labyrinth defeat calls
  `resetRun({ keepCharacter: true })` (`app/combat-encounter/index.tsx`).
- Scope (engine): one run-end state, built in `Game/death.ts` (or a sibling): the pre-run shell (`createNewGameState()`
  with no character, as CH1f left it) with the old `codex` and `rngState` carried and a run-over marker on the state
  (e.g. `runOver: true`, optional and additive), so a caller can tell "a run ended, pick a character" from "a save
  made before characters". `resolveDeath`'s run-over outcome returns it; `RESET_RUN { keepCharacter: false }`
  returns it and drops `again`. A new-run entry that takes a character id and the codex to carry (e.g.
  `createNewGameState({ characterId, codex })` or a `START_RUN` action) clears the marker. `RESET_RUN { keepCharacter:
  true }` and `freshRunKeepingCharacter` stay for the DEV "RESET RUN" control only; no player path calls them after
  CH1i. Engine store: `playerDied` and `resetRun` keep their return values.
- Consumers: `Game/store.ts` (`playerDied`, `resetRun`), `Game/death.ts`, mobile `state/actions.ts` (types only in
  this phase), the run-end play-log record (`recordRunEnd`, unchanged), every test asserting a game over keeps the
  player (grep `freshRunKeepingCharacter`, `run-over`, `keepCharacter`).
- Save / schema: the run-over marker is optional and additive; no `game.migrate.ts` hop unless a reader rejects
  unknown fields.
- Tests matrix: new `Game/e2e/run-end.engine.test.ts`: a death while dying gives the run-over state (no
  `characterId`, codex kept, world and quests fresh, marker set); `RESET_RUN { keepCharacter: false }` from a Chosen
  run gives the same, never the Chosen again; the new-run entry as the Chosen from it gives level 1, the ten-card
  deck, the Ring worn, the codex kept and no marker; `keepCharacter: true` is unchanged (dev). Death-rule tests
  (DY1) that pin the old "run over keeps the character" are rewritten.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`.

### CH1i — After a run end, character select · M · closes A10 · requires CH1h

(CH1j then puts the Game Over screen in front of this route; CH1i routes straight to character select so each
phase ships alone.)

Measure: on the web build, a second death on the map opens character select for the same slot; CONFIRM starts a
fresh Chosen there with the codex kept; a reload at character select reopens it, never "Made before characters".

- Scope (mobile): the map fight's run-over branch (`app/combat-encounter/index.tsx`, `actions.playerDied` returns
  `'run-over'`), the hazard's run-over branch (`state/hazard/store-actions.ts`, `armingHazardDeath`) and the
  Labyrinth defeat (today `resetRun({ keepCharacter: true })`, now a run end: `resetRun({ keepCharacter: false })`)
  each save the run-over state and route to `/character-select?slot=<current slot>`. Character select gains the
  run-end entry: CONFIRM starts the next run in that slot through CH1h's new-run entry with the slot's codex
  carried (not `startNewGameAction`'s blank state), BACK goes to the slot list. The saves list and main menu read a
  run-over slot as a finished run (copy in the presenter's copy table, e.g. "Run over") whose continue action opens
  character select; `mostRecentSlot` and CONTINUE treat it the same way. "Made before characters" stays for saves
  with no `characterId` and no run-over marker. DEV "NEW RUN" routes the same way; DEV "RESET RUN" keeps its
  dev behaviour.
- Consumers: `app/combat-encounter/index.tsx`, `state/hazard/store-actions.ts` and its screen, `app/labyrinth/`,
  `app/character-select/index.tsx`, `state/presenters/character-select.engine.ts`, `state/menu/store-actions.ts`,
  `state/persistence/saveSlots.ts` (`SaveSlotSummary`), `app/saves/index.tsx`, `state/presenters/main-menu.engine.ts`,
  `components/DebugRunControls.tsx`, `app/death-return` (unchanged for a first death).
- Save / schema: `SaveSlotSummary` reads the run-over marker.
- Tests matrix: store/screen tests for the map game over, the hazard game over and the Labyrinth defeat each landing
  on character select for the slot; CONFIRM from there starting the Chosen in the slot with the codex kept; the
  saves list and main menu showing a run-over slot as continuable into character select; a pre-character save still
  delete-only. UI change: before/after shots in the PR body (heads-down §4) for the saves list and the run-end
  arrival at character select.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, root `npm test`.

### CH1j — The Game Over screen · S · closes A11 · requires CH1i

Measure: on the web build, a second death on the map shows GAME OVER; its button opens character select for the
same slot; a reload on the Game Over screen opens character select, never the map.

- Today (read 2026-10-31): `app/death-return/index.tsx` is the first death's full-screen moment (title, one body
  line, CONTINUE; presenter `state/presenters/death-return.engine.ts`, copy `death-return.copy.ts`; armed in memory
  by `state/death-return.ts`, so a reload skips it). CH1i's three run ends route to
  `/character-select?slot=<n>`.
- Scope (mobile): a new `/game-over?slot=<n>` screen built the same way as `/death-return`: `app/game-over/index.tsx`,
  a presenter `state/presenters/game-over.engine.ts` and its copy table `game-over.copy.ts` (title `GAME OVER`, one
  placeholder line, button `NEW CHARACTER`; T may rewrite the copy later, no new art), an in-memory arm set by the
  run end (no save field). CH1i's map, hazard and Labyrinth run-end branches route to `/game-over?slot=<n>` instead;
  its button replaces the route with `/character-select?slot=<n>`. Unarmed (a reload, a deep link) it replaces to
  character select for the slot at once; `?preview=1` on a dev build shows it for the visual baseline. Registered
  in `app/_layout.tsx` beside `death-return`. The saves list and CONTINUE keep CH1i's behaviour (straight to
  character select). DEV "NEW RUN" also passes through it.
- Consumers: `app/_layout.tsx`, `app/combat-encounter/index.tsx`, `state/hazard/store-actions.ts`, `app/labyrinth/`,
  `components/DebugRunControls.tsx`, the CH1i run-end tests (their expected route gains the Game Over stop).
- Save / schema: none.
- Tests matrix: `app/__tests__/game-over.screen.test.tsx`: renders the title, line and button; the button lands on
  character select for the slot; unarmed it redirects there. CH1i's three run-end tests now pass through Game Over.
  UI change: a before/after shot of the Game Over screen in the PR body (heads-down §4), plus the visual baseline.
- Verify gate: `npm run verify -w axiomancer-mobile`, root `npm test`.

## T's characters

Filled in CH1e (T, in session, 2026-10-30).

| Character | Portrait | Starting relic (lane) | HEART / BODY / MIND | Starting lanes | Starting lane cards | Playstyle |
|---|---|---|---|---|---|---|
| The Chosen (T: "for now, just 'The Chosen'") | `altair-man` (the gallery's Knight-Errant) | Suppliant's Ring, `relic-disarming-plea` (`merciful`) | **7 / 3 / 5** (T: "to encourage the swap to focus on healing. Plus this character should not start optimized"; max VITAE 158, against 170 at 5/5/5) | `defender`, `blood-price` | Hedge Strike (Defender), Scar Tissue (Blood Price); none from the Merciful lane (T: "no suppliants ring") | "Fumbling Squire trying to hold the line (again, not optimized)" |

T changed the deck rule in the same sitting, for every character (built by CH1g, A8):

- **A character's deck is grey Blow 3 / Ward 3 / Word 2 plus one card from each of its two starting lanes** (T:
  "3/3/2 + 1 Defender + 1 BP"; "Let them do their thing!"). Ten cards. This replaces Blow 3 / Ward 2 / Word 2 plus
  one card from each of the three lanes.
- **No starting card from the relic's lane.** The relic's lane still reaches the reward pool through the worn relic.
- T weighed two cards per lane (grey 3/2/1 plus four lane cards) in the sitting and dropped it as too much.
- The Stats line changes T's 2026-10-26 Body 7: Heart is now the 7 and Body the 3.

## Scope

Both workspaces: the engine contract, the pool and the report (CH1a, CH1b, CH1d); the screen and the flow (CH1c);
T's content and its wiring (CH1e, CH1f). No card, keyword or enemy changes; no relic content except what T writes
in CH1e.

## Consumers to update

Listed per phase. Cross-plot overlaps:

- **RW1a (open; amended by PR #944).** CH1a requires it for the relic-lane resolver; CH1b extends its
  `unlockedLaneIds`. If #944 is closed unmerged, RW1a still carries D104's carry rule; D108 overrides that rule for
  character runs either way, and CH1b's A3 is built as written (Follow-ups).
- **EQ2a (open).** It renames the relic slot and takes save version 39. CH1a needs no hop; if it finds it needs one,
  it takes the next free version. Neither requires the other.
- **LR1c-LR1e (open).** A starting relic may be one of T's six lane relics; CH1f then needs that relic in the
  library, which CH1e records as an extra `Requires` on CH1f's row when T picks it.

## Save / schema contracts

- `Character.characterId?: string` and `Character.startingLaneIds?: string[]`, optional and additive (CH1a).
- No migration hop expected. Until CH1f a save with no character plays as today's run; from CH1f it cannot be
  continued and its slot offers only deletion (T, 2026-10-26).

## Decisions made upfront — DO NOT ASK

T's rulings in the pitch, one line each:

- Each character has a unique portrait, a starting relic (equipped), a starting stat allocation, and two starting
  lanes different from the relic's lane (t1).
- This overrides D104's carry-to-unlock rule (t1).
- Bending the archetype means equipping and unequipping relics to control the reward pool (t2).
- Grey starter cards are not a lane (t2), and are never offered as rewards (t4).
- Blocked until T plots at least one more lane, because a character needs its relic's lane plus two others (t2).
- Roster: one character for the mid-November deadline, three for December (t2).
- The reward pool is the character's two starting lanes plus the lane of every worn relic. Worn relics weight
  rewards toward their lane (D100 slots). Unequipping removes the lane. A carried, unworn relic does nothing (t3).
- RW1a and LR1a are amended now, separately (t4; PR #944, D107).
- Measure: both an engine pool test and a start-vs-late column in the measured report (t5).
- The select screen looks like a fighting-game character select: a two-row carousel of squares at the very bottom,
  locked squares a question-mark icon; above it the character's stats, starting relic and playstyle; the starting
  lanes are not named, only the playstyle; not wordy, not cluttered, the portrait and the starting relic the two
  main focuses (t5).

Calls this plot made, T not present:

- **The empty-pool fallback for a run with no character is PR #944's call, not this plot's.** For a character run
  the pool is never empty (two starting lanes), so the fallback only reaches old saves and runs started while the
  roster is empty. CH1b keeps whatever RW1a ships. Confirmed by T (2026-10-26): grey only until the first
  character goes live; then every run starts at character select and CH1f deletes the fallback. A save made before
  characters cannot be continued: its slot offers only deletion.
- **One attended authoring phase per milestone.** CH1e authors the November character; the December roster gets
  one attended phase for both characters, plotted with it. Confirmed by T (2026-10-26).
- **The Measure stays as written, and it cannot pass until a fourth lane exists.** With three lanes, a character's
  start already holds all three (two starting lanes plus the relic's), so no late lane can be absent at the start.
  The report column also prints each lane's share at start and late, so the shift toward worn lanes shows from the
  first character; the "absent lane" clause is met once the December roster brings a fourth lane. Confirmed by T
  (2026-10-26): keep it as written. T plans two new lanes before a character goes live, so four lanes exist and the
  first character's start leaves one out; the clause can pass with the first character.
- **A character run shows the character's portrait, and the SELF screen bust stops cycling for it.** Old saves and
  runs with no character keep the tap-to-cycle gallery. Confirmed by T (2026-10-26).
- **A character starts with a smaller grey deck plus one card from each of its lanes.** Confirmed by T (2026-10-26),
  changed from the default: Blow 3 / Ward 2 / Word 2, plus one card from each of the two starting lanes and one from
  the starting relic's lane (ten cards). No Spell or Global; ideally cards thematic enough that the player gets a
  sense of each lane. T picks them in CH1e. **Superseded by T (2026-10-30, CH1e):** Blow 3 / Ward 3 / Word 2 plus
  one card from each starting lane, none from the relic's lane (A8, CH1g).
- **A character's stats total the fresh-run budget of 15 points**, as every level-1 preset does; the content test
  enforces it, so no character starts stronger than another. Confirmed by T (2026-10-26). The first character is
  7/5/3 with Body at 7. Max VITAE is 50 + 12·Body + 6·Mind + 6·Heart (`calculateMaxHealth`), so Body is the one
  stat that buys extra VITAE.
- **The carousel is two rows of four squares**: roster characters first, the rest locked. Three characters in
  December still leave five locked squares. Confirmed by T (2026-10-26); each unlocked square shows a small version
  of the character's portrait, with the large portrait above.
- **The first character is due 2026-10-26, end of day (T).** Confirmed by T (2026-10-26), changed from the default
  (no date): one Item, "First character playable", dated 2026-10-26 in W1, names CH1a-CH1f. T knows the date is
  tight: RW1a and five CH1 phases must ship, and CH1e/CH1f wait on a third lane T has not plotted yet.

Further decisions, no call needed:

- **Characters are a new roster, not the presets.** The presets are dev tooling with a pinned consumer list; a
  character carries a relic, lanes, a portrait and a playstyle they lack.
- **The select screen sits after the slot pick, before the run starts.** BACK returns to the slot list; an
  abandoned select writes nothing to the slot.
- **The screen appears only once the roster holds a character.** CH1c can ship before any character exists
  without changing what NEW GAME does.
- **The starting relic takes a relic position like any other**; it can be taken off (EQ1), and then its lane
  leaves the pool (T, t3).
- **The third-lane dependency is a `[blocked: …]` status on CH1e and CH1f**, not a `Requires`: no phase id exists
  to name, and a blocked row is never pickable (`skills/march.md` §3 "Pickable phase"). CH1a-CH1d use fixture
  lanes and need no third lane.
- **Slot: asap (T).** The six rows sit directly above the first open row, in `requires` order. CH1a cannot be
  picked before RW1a ships.

## Tests matrix

Listed per phase. Deleted: nothing.

## Verify gate

Per phase, foreground, never `--no-verify`.

## Commit body template

```
CH1a: the character in the engine, and the save

A character definition carries a portrait key, a starting relic,
base stats, two starting lanes and a playstyle line; the roster is
empty until T's first character. A new run with a character wears
its relic, takes its stats and records its lanes (D108). Old saves
load as runs with no character.

Closes A1, A2 of plan/phases/phase_CH1_character_select.md.
```

(CH1b closes A3; CH1c A4; CH1d A5; CH1e A7; CH1f A6; CH1g A8; CH1h A9; CH1i A10; CH1j A11.)

## DoD

A1-A11 ticked across CH1a-CH1j; the Measure met.

## Follow-ups (out of scope)

- **The Game Over copy and art:** CH1j ships placeholder copy and no art; T's words or an image for it are T's
  content, a later `[content]` row if T wants one.

- **The December roster:** two more characters, their authoring session and their wiring (a new `/plot` when T
  formalises the December milestone). With them, a fourth lane makes the Measure's "absent lane" clause reachable.
- **The third lane itself:** T plots it; that plot (or T) turns CH1e and CH1f from `[blocked: …]` to `[ ]`.
- **If PR #944 is closed unmerged,** RW1a's row and brief still say "a carried relic unlocks its lane"; a `/plot RW1`
  amend is needed so RW1a and CH1b agree. D108 stands either way.
- **D104's text** is not edited here (PR #944 edits the same lines); D108 records the override.
- **The DEV preset picker** could gain the roster's characters later; not asked.
