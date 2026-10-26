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

## Outcome

Add a character select at run start, so each run opens as an archetype. Each character has a portrait, an equipped
starting relic, a stat spread, and two starting lanes other than the relic's. The reward pool is those two lanes
plus the lane of every worn relic, never grey, so late-run lane control differs from the start.

## Acceptance

- **A1** A character definition (engine) carries a portrait key, a starting relic id, base stats, two starting lane
  ids and a short playstyle line. A content test fails if a character's starting lanes include its relic's lane,
  or name an unregistered lane.
- **A2** Starting a run with a character equips its relic, applies its stats, and records its two starting lanes on
  the save; old saves load with no character and keep the D107 stopgap pool.
- **A3** The reward pool is the character's two starting lanes plus every worn relic's lane. Wearing an off-lane
  relic adds its lane; unwearing removes it; an unworn relic changes nothing; grey is never offered. An engine test
  covers each case.
- **A4** The character select screen: a two-row carousel of squares at the bottom (locked squares show a
  question-mark icon); above it the portrait and the starting relic as the two focal elements, then stats and a
  one-line playstyle. Starting lanes are never named on the screen. A screen test pins the layout's elements and
  the absence of lane names.
- **A5** The measured report gains a column: the lane mix of reward offers at run start and after three worn
  relics, per character.
- **A6** The first character (mid-November) is selectable; the other carousel squares are locked.
- **A7** T's first character is written down in this brief's "T's characters" table: the portrait (a gallery id or
  an image T supplies), the starting relic (an existing library relic or one T writes, with its lane), the stat
  spread, the two starting lanes and the playstyle line, each in T's words. (Split out of A6 so the authoring and
  the wiring are closed by different phases.)

Measure: the A3 engine test passes, and the A5 report column shows the late-run lane mix includes a lane absent at
run start.

## Phases

### CH1a — The character in the engine, and the save · M · closes A1, A2 · requires RW1a

Measure: `npm run verify -w axiomancer-mechanics` and `npm run verify -w axiomancer-mobile` green; the roster
content test, the validator's fixture cases and the new-run-with-character test pass; a current-version save with
no character loads unchanged.

- Scope: new `axiomancer-mechanics/src/Character/roster.ts`: `CharacterDefinition` (`id`, `name`, `portraitKey`,
  `startingRelicId`, `baseStats`, `startingLaneIds: readonly [string, string]`, `playstyle`), `CHARACTER_ROSTER`
  (empty in this phase; T's content lands in CH1f), `getCharacterDefinition(id)`, and
  `characterProblems(def, lanes?, relics?)` returning every broken rule (relic not in the library, relic with no
  registered lane, a starting lane equal to the relic's lane, a starting lane not registered, the two starting
  lanes equal, `grey` named as a lane, stats not totalling the fresh-run budget). `Character/types.ts`:
  `characterId?: string` and `startingLaneIds?: string[]` on `Character`. `Game/game.reducer.ts`:
  `createNewGameState({ startMap?, characterId? })`; with a character it applies the stats (and the max VITAE they
  give), equips the starting relic through the existing equip path (it takes the first relic position) and
  records `characterId` and `startingLaneIds`; with an unknown id it throws. Exports from `Character/index.ts` and
  `src/index.ts`. Mobile: `startNewGameAction` gains an optional `characterId` passed through; no screen change.
- Consumers: `startNewGameAction`, the CLI's new-game path if it builds a state (it passes no character), the
  catalog exporter if the typecheck names it.
- Save / schema: two optional, additive fields on the saved player; no `game.migrate.ts` hop unless the builder
  finds a reader that rejects unknown fields (then the next free version, after EQ2a's v39 if that has landed).
  A save with no `characterId` is a run with no character.
- Tests matrix: new `Character/e2e/character-roster.engine.test.ts` (A1: the real roster passes
  `characterProblems`; fixture definitions, fixture lanes and fixture relics hit each broken rule once); new
  `Game/e2e/new-run-character.engine.test.ts` (A2: a fixture character's run has its relic worn, its stats and max
  VITAE, its two lanes and its id on the player; a fresh run with no character is today's run; an unknown id
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
  button, then the carousel: two rows of squares at the very bottom, a selectable square showing the character's
  portrait cropped to the square, a locked square a question-mark icon. Tapping a selectable square shows that
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
  stats, the two starting lanes and the playstyle line. The session records them below and in
  `plan/revamp/relics.md` if the relic is new. Nothing is built.
- The row is `[blocked: T to plot a third lane …]`: a character needs its relic's lane plus two others, and two
  lanes exist. The plot that registers a third lane (or T) turns the row to `[ ]`.

### CH1f — The first character, selectable · M · closes A6 · requires CH1b, CH1c, CH1d, CH1e · blocked until a third lane is registered

Measure: on the web build, NEW GAME after the slot pick opens the select screen with T's character selectable and
the other squares locked; the regenerated report's "Reward lanes by character" row for that character is read
against the Measure above.

- Scope: T's character from CH1e into `CHARACTER_ROSTER`; its relic into `relicLibrary` with its `laneId` if T
  wrote a new one (content T authored, D88); its portrait key in `PLAYER_PORTRAITS` if T supplied a new image;
  `PlayerPortraitImage` reads the character's portrait for a run with a character. `npm run measured:truth`
  regenerated.
- Consumers: the SELF screen bust, the combat medallion, the pilgrim inspect modal (all via `PlayerPortraitImage`).
- Save / schema: none.
- Tests matrix: the roster content test (A1) now covers a real character; a screen test with the real roster (one
  selectable square, the rest locked); a store test that confirming T's character starts a run with its relic worn
  and its lanes recorded; the portrait test for a character run.
- Verify gate: `npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, root `npm test`.

## T's characters

Filled in CH1e. Empty until then.

| Character | Portrait | Starting relic (lane) | HEART / BODY / MIND | Starting lanes | Playstyle |
|---|---|---|---|---|---|

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
- No migration hop expected; an old save is a run with no character and keeps the D107 stopgap pool.

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
  roster is empty. CH1b keeps whatever RW1a ships. `[T to confirm #1]`
- **One attended authoring phase per milestone.** CH1e authors the November character; the December roster gets
  one attended phase for both characters, plotted with it. `[T to confirm #2]`
- **The Measure stays as written, and it cannot pass until a fourth lane exists.** With three lanes, a character's
  start already holds all three (two starting lanes plus the relic's), so no late lane can be absent at the start.
  The report column also prints each lane's share at start and late, so the shift toward worn lanes shows from the
  first character; the "absent lane" clause is met once the December roster brings a fourth lane. `[T to confirm #3]`
- **A character run shows the character's portrait, and the SELF screen bust stops cycling for it.** Old saves and
  runs with no character keep the tap-to-cycle gallery. `[T to confirm #4]`
- **A character changes no cards: every character starts with the grey deck** (Blow 5 / Ward 3 / Word 2). The
  character is its relic, stats and lanes. `[T to confirm #5]`
- **A character's stats total the fresh-run budget of 15 points**, as every level-1 preset does; the content test
  enforces it, so no character starts stronger than another. `[T to confirm #6]`
- **The carousel is two rows of four squares**: roster characters first, the rest locked. Three characters in
  December still leave five locked squares. `[T to confirm #7]`
- **No date is set: the six rows go under Unscheduled.** No MVP Item covers characters, and the MVP milestone does
  not name them; T's Nov 16 target for one character is recorded in the reason line, and the rows wait on a third
  lane T has not plotted. Adding a Nov 16 Item is T's to do. `[T to confirm #8]`

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

(CH1b closes A3; CH1c A4; CH1d A5; CH1e A7; CH1f A6.)

## DoD

A1-A7 ticked across CH1a-CH1f; the Measure met.

## Follow-ups (out of scope)

- **The December roster:** two more characters, their authoring session and their wiring (a new `/plot` when T
  formalises the December milestone). With them, a fourth lane makes the Measure's "absent lane" clause reachable.
- **The third lane itself:** T plots it; that plot (or T) turns CH1e and CH1f from `[blocked: …]` to `[ ]`.
- **If PR #944 is closed unmerged,** RW1a's row and brief still say "a carried relic unlocks its lane"; a `/plot RW1`
  amend is needed so RW1a and CH1b agree. D108 stands either way.
- **D104's text** is not edited here (PR #944 edits the same lines); D108 records the override.
- **The DEV preset picker** could gain the roster's characters later; not asked.
