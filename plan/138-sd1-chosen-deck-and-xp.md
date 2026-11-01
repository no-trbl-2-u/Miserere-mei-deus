# 138 — The Chosen's ten-card deck from all three of its lanes, and a fifth less XP per kill

> Every foe pays 20% less XP, so a full Chapter 1 clear no longer carries the player into the high teens. The Chosen opens every run with ten cards: seven grey (Blow 3, Ward 2, Word 2) plus Rose Wrap, Siphon and Draw the Fever, one card from each of its two starting lanes and one from its relic's lane, so the first fights last about six turns instead of eighteen.

## Why

### Sources

- `/plot asap` from T, 2026-11-01, attended, at the end of a sim session in chat. T's words:
  - "Lessen exp gained by enemies. While it IS supposed to be easier to level up early game and then slow to a
    crawl later, that's just way too fast. Maybe cut it by 20%."
  - "Pick whichever deck (The 7 + 3) got ~6 rounds with the starting gear for the first 1-3 enemies. IDEALLY, no
    EXILE cards, and maybe include 1 global if possible. I'll tune everything else after we get settled in ;)"
  - Earlier in the same session: "the deck should be 10 cards", then "do the same sim, but with 1 card from each
    lane (yes including their starting relic lane)".
  - "Once this is plotted, you have my permission to merge it. After that, run "/pilot" on the resulting rows."
- The cards are T's pick from the session's sims (D88, D99: content from T's word): **Rose Wrap** (`df-e-09c`,
  Defender, a Global: lose 3 VITAE, THORNS 3, each turn), **Siphon** (`bp-m-01d`, Blood Price: FREE HEAL 3, PAID
  LEECH 4) and **Draw the Fever** (`mc-e-07b`, Merciful: FREE DEAL 2 LEECH 1, PAID DEAL 4 LEECH 2). None EXILEs.
- Decisions it amends: CH1g's character deck rule (`Character/roster.ts` `characterProblems`: two starting lane
  cards, one per starting lane, none from the relic's lane, no Spell, Global or Curse) and the CH1 session's ruling
  "two starting lanes DIFFERENT from their relic's lane" (`braindump/2026-10-26-character-selection.md`). The two
  starting **lanes** stay as they are (still not the relic's lane); only the **cards** change.

### Measured (the session's sims, not a gate; D57)

Run in chat on 2026-11-01 with throwaway scripts over `Combat/combat.pacing.sim.ts` (the human-like driver), live
foe VITAE (x2), 100-300 seeded fights a cell. The grey weapon and armor (EQ3f, unbuilt) were modelled as GUARD 2 and
2 damage to the foe each turn.

| Deck (10 cards) | Float-Eye L2 | Gallows Crow L2 | Float-Eye L2 (third fight) |
|---|---|---|---|
| Today: Blow 3 / Ward 3 / Word 2 + Hedge Strike + Scar Tissue, no gear | 18.1 | 14.5 | — |
| This spec: Blow 3 / Ward 2 / Word 2 + Rose Wrap + Siphon + Draw the Fever, grey gear | 6.2 | 5.9 | 6.2-6.4 |

Mercy on or off gives the same first-fight numbers for this deck. A full Chapter 1 clear with mercy off (all 22
fights, both foes of each elite pair, so more fights than a real route) reaches level 17.9 at the door with today's
XP and 16.8 with 20% less. The rest of the curve is T's to tune once the deck has been played ("I'll tune
everything else after we get settled in").

## Design

### The XP cut (138.1)

`DEFAULT_XP_BY_DIFFICULTY` (`axiomancer-mechanics/src/Enemy/index.ts:98`) is the one XP table: `createEnemy`
defaults every foe's `xpReward` from it, `scaleEnemyToLevel` (`World/encounter.ts:123-125`) re-derives it at the
node's level, and `sourceAtTier` (`World/encounter-tier.ts:35`) re-derives it at a tier. No library foe sets its own
`xpReward`. Each value drops by 20%:

| Difficulty | Today | After |
|---|---|---|
| simple | 10 | 8 |
| normal | 20 | 16 |
| elite | 50 | 40 |
| boss | 200 | 160 |
| unique | 500 | 400 |

The level curve itself (`Character/experience.ts`) does not change. A mercy still pays no XP
(`Game/game.reducer.ts:337`). Tests that pin a derived XP number move with it (for example `World/encounter.test.ts`
expects 80 for a level-4 normal; it becomes 64). `docs/game-model.md` states the new table wherever it names XP per
kill.

### The Chosen's deck (138.2)

- `CHARACTER_GREY_DECK` becomes seven cards: Blow 3, Ward 2, Word 2.
- `CharacterDefinition.startingCardIds` becomes three cards: one from each of the two starting lanes and one from
  the starting relic's lane (`relicLaneId`), in any order. `characterDeck` stays grey then lane cards, ten in all.
- `characterProblems` changes with it:
  - `cards-not-one-per-lane` now means "not exactly one card from each of the two starting lanes and the relic's
    lane"; the message says so.
  - `card-in-relic-lane` is retired (the relic's lane now must have its card).
  - `card-forbidden-type` forbids Spells and Curses only; a Global may start (T asked for one).
  - Every other rule stands, including `lane-is-relic-lane` for the two starting lanes.
- The Chosen's row: `startingCardIds: ['df-e-09c', 'bp-m-01d', 'mc-e-07b']`. Its lanes, relic, stats, portrait and
  playstyle do not change.
- `MIN_DECK_SIZE` in `Game/run-sim/run-policy.archetypes.ts` reads the grey deck plus the lane cards, so it stays ten
  once it counts three lane cards.
- Saves: a run's deck is written into `knownCards` when the run starts, so a run already in progress keeps its old
  deck; only new runs get the new one. No version change.
- Fixtures in tests that build a `CharacterDefinition` (`character-roster.engine.test.ts`,
  `new-run-character.engine.test.ts`, `combat.reward-lanes.test.ts`, `character-pool.engine.test.ts`, and the mobile
  `character-select` and `menu-store-actions` tests) take a third card from a relic-lane fixture.
- Docs: `docs/game-model.md` and `axiomancer-mechanics/docs/` wherever they describe a character's starting deck.

## Acceptance

- **A1** `DEFAULT_XP_BY_DIFFICULTY` is simple 8, normal 16, elite 40, boss 160, unique 400. An engine test pins the
  table and one derived value: a normal foe scaled to level 4 pays 64 XP. A mercy still pays 0 XP.
- **A2** `CHARACTER_GREY_DECK` is Blow 3, Ward 2, Word 2 (seven cards), and the Chosen's `characterDeck` is exactly
  those seven plus `df-e-09c`, `bp-m-01d` and `mc-e-07b`, ten cards. An engine test pins the ids and the counts, and
  a new run as the Chosen deals that deck into `knownCards`.
- **A3** `characterProblems` accepts a character whose three starting cards are one from each starting lane and one
  from the relic's lane, Globals allowed; it reports `cards-not-one-per-lane` when the relic's lane has no card, when
  a lane has two, or when there are not three cards; it reports `card-forbidden-type` for a Spell or a Curse and not
  for a Global; `card-in-relic-lane` no longer exists. The live roster has no problems.

## Open questions

- None. T set every number and card in the session; the rest of the curve is tuned later by T's word.

## Chunks

Measure: 3 open · 0 closed · next A4

- [ ] **138.1** A fifth less XP per kill · S · closes A1 · needs — · alias: XP1a
- [ ] **138.2** The Chosen's ten-card deck from all three of its lanes · M · closes A2, A3 · needs — · alias: SD1a

### 138.1 (XP1a) — A fifth less XP per kill · S · closes A1 · requires —

Measure: the A1 engine test passes; `npm run act1-progression -w axiomancer-mechanics` prints each fight's XP at the
new values.

- Scope: `Enemy/index.ts` (`DEFAULT_XP_BY_DIFFICULTY`), tests that pin a derived XP number, `docs/game-model.md`.
- Consumers: every XP grant reads the table through `xpReward`; the aftermath screen shows the granted number.
- Save / schema: none.
- Tests matrix: the A1 test beside the existing enemy or encounter tests; update the pinned numbers it moves.
- Verify gate: both workspaces.

### 138.2 (SD1a) — The Chosen's ten-card deck from all three of its lanes · M · closes A2, A3 · requires —

Measure: the A2 and A3 engine tests pass; `characterProblems` on the live roster returns `[]`.

- Scope: `Character/roster.ts` (`CHARACTER_GREY_DECK`, `CharacterDefinition.startingCardIds` as a three-tuple, the
  Chosen's row, `characterProblems` and its docs), `Game/run-sim/run-policy.archetypes.ts` (`MIN_DECK_SIZE`), the
  test fixtures listed in Design, docs.
- Consumers: `createNewRunPlayer` (`Game/game.reducer.ts`) deals `characterDeck`; the mobile character select reads
  the definition but names no cards.
- Save / schema: none (new runs only).
- Tests matrix: `Character/e2e/character-roster.engine.test.ts` (A2, A3), `Game/e2e/new-run-character.engine.test.ts`
  (A2), the mobile fixtures.
- Verify gate: both workspaces.
