# 162 — Six foes get moves of their own

> The Saint Beneath plays a copy of the Death Beholder's deck, and five recast foes copy a benched foe's moves. T voted on a ballot of replacements. This spec gives all six the moves T picked, adds two new words (SHOCK and UNBROKEN), and renames UNDERTOW to SEIZED. The Death Beholder keeps its own deck.

## Why

### Sources

- **T, 2026-11-08:** "instead of reskinning the beholder, let's create a whole new moveset for the saint beneath enemy and then replace the death beholder. This way the beholder can keep it's moveset and we can get something more specific to the saint beneath."
- **T's ballot verdict, 2026-11-08** (`plan/card-ledger/enemy-movesets.md`, verbatim there), 26 of 81 kept.
- **T's answers in the same session (AskUserQuestion, 2026-11-08):**
  1. The word for "if held": **UNBROKEN**.
  2. The Saint and Wreckmaster picks tagged for later phases: **all from phase 1**, and Communion adds a BARNACLE when you hold no Curses.
  3. T's notes on Swell and Tithe of the Drowned **replace the whole move**.
  4. UNDERTOW: "Use SEIZED just make sure the card names are thematic. And since it's seized, it doesn't have to be exclusively one color die either".
- **T on SHOCK, verbatim:** "SHOCK is a new status effect Keyword (will be added to future lanes as well). It's effect is: Every DEAL does x more damage where x is equal to SHOCK. (lasts 3 turns, every new placement of SHOCK just refreshes it to 3 and adds to the intensity). (This is my wording but I'm sure you can make the wording more consistent)"

### What exists today (read 2026-11-08, at 199591007)

- **Moves:** `axiomancer-mechanics/src/Enemy/enemy.library.ts`. A `phases` foe holds one entry per phase, each with `moves` and, past the first, a `danger`. `Enemy/enemy-phases.ts` sets the lines: normal 30%; elite 60%, 30%; boss 75%, 50%, 25%. Numbers are authored at level 2 (normal, boss) or 3 (elite) and scale.
- **The Saint Beneath** has `stages` and an `ENEMY_DECKS` entry (`Combat/combat.enemy-decks.ts`) copied from the Death Beholder (EN3a). No boss-tier foe plays `phases` yet.
- **The copies:** Saltwick Swarm plays the Green Jelly's moves, Quay-Crab the Crane-Hook's, Coralback the Lamprey-Knot's, Bilge-Stalker the Wreck-Picker's, the Wreckmaster the Toll-Keeper's.
- **Words:** `Enemy/enemy-keywords.ts` lists the enemy keywords and `Combat/combat.enemy-words.ts` resolves them. UNDERTOW is the field `undertow`, which already takes one die, a pair or `'random'`. HELD already names held cards (Spit It Out), which is why the new word is not "held".
- **Riders:** `EnemyMoveRider` in `Enemy/types.ts`, resolved in `Combat/combat.enemy-riders.ts`.

## Design

### The new words

- **SHOCK n.** Every DEAL against a SHOCKED target does n more, per hit. It lasts 3 turns; a new SHOCK resets the turns to 3 and adds to n. Built to work on either side, since T will give it to lanes later. In this spec only foes place it, on the player. [T to confirm #2]
- **UNBROKEN.** A clause on a move that raises WARD: it pays out at the start of the foe's next turn if any of that WARD is left. Broken WARD pays nothing.
- **SEIZED** replaces UNDERTOW as the word the player reads, everywhere. The effect is unchanged: the named die, dice or a random die sit out your next roll. Nothing ties it to one colour of die. Move names stay thematic to the foe: Hear Me, Grip, and the existing Hoist, Gull-call, Undertow (the Tide-Gate's move name, not the word) and Toll for the Drowned.

### The Saint Beneath (boss, four phases)

The `phases` model, `vitae: 320` kept. Attack, defend and status are available from phase 1, and each Danger opens its phase. The copied `ENEMY_DECKS` entry and the copied `stages` go. Its journal entry stays as is (T's to rewrite).

| Slot | Name | Text |
|---|---|---|
| Attack | Communion | 2 damage per Curse in your hand, deck and discard. With none, a BARNACLE Curse goes into your hand instead. |
| Defend | The Faithful Gather | MEND 10 and it SCOURs one status off itself. |
| Status | Hear Me | SEIZED: your heart and mind dice sit out your next roll. |
| Danger 75% | Swell | 2 BARNACLE, then TANGLE 1 per card in your hand. |
| Danger 50% | Tithe of the Drowned | 2 BARNACLE, then 3 damage per card in your hand. |
| Danger 25% | Pull Under | 16 damage. If you are under half VITAE: 24 damage, and it MENDs 12. |

Swell and the Tithe count the hand after the two Curses land.

### The Wreckmaster (elite, three phases)

Attack, defend and status are available from phase 1.

| Slot | Name | Text |
|---|---|---|
| Attack | Sabre and Pistol | 7 damage, +4 if you played 3+ cards this turn. |
| Defend | Riposte | WARD 10. UNBROKEN: DEAL 4 twice. |
| Status | Press-Ganged | Steals one banked die. With none banked: TANGLE 2. |
| Danger 60% | Reload Under Fire | TANGLE 3 and 2 BARNACLE. |
| Danger 30% | Take the Colours | Takes up to 4 Conviction, WARD 4 per Conviction taken. BARNACLE 1. |

### The four normals (two phases, the Danger at 30%; attacks stay in phase 2)

| Foe | Slot | Name | Text |
|---|---|---|---|
| Saltwick Swarm | Attack | Many Stings | DEAL 1 five times. |
| | Defend | Drift Apart | WARD 8. UNBROKEN: SHOCK 1. |
| | Status | Static Bloom [T to confirm #1] | SHOCK 2. |
| | Danger | The Whole Bloom | DEAL 2, once per card in your discard. No minimum. |
| Quay-Crab | Attack | Pincer | 7 damage. Your GUARD counts half against it. |
| | Defend | Shell Up | WARD 10. UNBROKEN: BARNACLE 1. |
| | Status | Grip | SEIZED: your body die sits out your next roll. |
| | Danger | Clamp Down | 10 damage. If you are under half VITAE: 16 damage, and it MENDs 4. |
| Coralback | Attack | Coral Spur | 6 damage. If it gets through your GUARD: BARNACLE. |
| | Defend | Crown Down | WARD 15. The next status you put on it lasts 1 turn longer. |
| | Status | Polyp | A BARNACLE Curse goes into your hand. |
| | Danger | Coral Grows Over | 3 damage per Curse in your hand, deck and discard. With none, a BARNACLE Curse goes into your hand instead. |
| Bilge-Stalker | Attack | Quick Claws | 3 damage, 2 hits. Each hit that gets through steals 1 Conviction. |
| | Defend | Into the Dark | WARD 8. If you do not hit it this turn, its next attack gains +3. |
| | Status | Stagnant | BRINE 2. |
| | Danger | Drag Under | Next turn you can play at most 2 cards. |

### Decisions made upfront (do not ask)

- Every chunk changes a rule or a move, so every PR carries `review:rules-change` and T reads it (D119).
- The numbers are T's picks from first drafts. No retune here. SHOCK stacks with multi-hit moves (SHOCK 2 makes Many Stings 15, and adds 2 to every hit of The Whole Bloom): that is the design, and the sim reports it.
- The benched foes (Green Jelly excepted, which still fights) keep their moves. Nothing is deleted.

### Out of scope

- How a foe's attack is shown on screen (T's idea: hide the UI, make the screen look like a card, print the effect). T plots that separately.
- SHOCK on cards (future lanes).
- The Saint's journal entry and any foe's final-blow lines (authored content, D88).

## Acceptance

- **A1** Every word the player reads as UNDERTOW now reads SEIZED, with its gloss and glyph; the effect and each move's dice are unchanged; a move named Undertow keeps that name.
- **A2** SHOCK n adds n to each DEAL hit against the target; it lasts 3 turns; a new SHOCK resets the turns to 3 and adds to n; it shows on the status row and has a gloss.
- **A3** UNBROKEN pays out at the start of the foe's next turn when any of that move's WARD is left, and pays nothing when it was broken; it has a gloss.
- **A4** The Saint Beneath fights with exactly the six moves above in four phases, each Danger opening its phase at 75%, 50% and 25%; it has no enemy deck and no copied stages; Communion and the Curse counts behave as written, with no Curses included.
- **A5** The Death Beholder's deck, stages and fights are unchanged.
- **A6** The Wreckmaster, Saltwick Swarm, Quay-Crab, Coralback and Bilge-Stalker play exactly the moves above, each Danger at its line, and share no move with any other foe.
- **A7** The other animated foes' moves are unchanged.

## Open questions

1. Saltwick Swarm's SHOCK 2 move had no name on the ballot. Default: **Static Bloom**. Or: Lit Nerves; or a name of T's. [T to confirm #1]
2. SHOCK as written lands on the target and makes every DEAL against it worse. Default: that reading, so a foe's SHOCK makes each of its hits on you hit harder. Or: SHOCK on you makes your own DEALs stronger. [T to confirm #2]

## Chunks

Measure: 7 open · 0 closed · next A8

- [ ] **162.1** SEIZED replaces UNDERTOW · S · closes A1 · needs — · alias: MV1a
- [ ] **162.2** SHOCK and UNBROKEN join the rules · M · closes A2, A3 · needs — · alias: MV1b
- [ ] **162.3** The Saint Beneath's own moves · M · closes A4, A5 · needs 162.1 · alias: MV1c
- [ ] **162.4** Five recast foes get their own moves · M · closes A6, A7 · needs 162.1, 162.2 · alias: MV1d

### 162.1 (MV1a) — SEIZED replaces UNDERTOW · S · closes A1 · requires —

- The word and its gloss in `Enemy/enemy-keywords.ts`, every move text and Danger line that prints it, `axiomancer-mobile/components/combat/glyphShapes.ts`, the presenter in `state/presenters/combat-encounter.engine.ts`, and `docs/game-model.md`. The engine field may keep its name. Keep the capitalised word from coming back (`check-lexicon` if it fits, leaving the move name "Undertow" alone).
- Tests: the gloss and glyph read SEIZED; the moves' dice are unchanged.
- Measure: the mechanics and mobile gates, run piecewise with a worker cap. Label `review:rules-change`.

### 162.2 (MV1b) — SHOCK and UNBROKEN join the rules · M · closes A2, A3 · requires —

- SHOCK: a status that works on either side, added per DEAL hit, with T's 3-turn refresh and stacking. A `shock` field on `EnemyMove` and an entry in `ENEMY_KEYWORDS`. Show it on the status row with its gloss.
- UNBROKEN: a clause on a WARD move holding what it pays out (hits, a status, Curses). Resolved at the start of the foe's next turn, just before WARD ends, and only if WARD remains. Say in the PR how a partly broken WARD resolves (any left pays).
- Tests: SHOCK per hit, the reset and the stacking; UNBROKEN with WARD whole, partly broken and gone. Fixtures, since no foe plays them until 162.4.
- Measure: the mechanics and mobile gates, run piecewise with a worker cap; `npm run verify -w backend` if a contract type changes. Label `review:rules-change`.

### 162.3 (MV1c) — The Saint Beneath's own moves · M · closes A4, A5 · requires 162.1

- `SaintBeneath` moves to `phases` with the six moves, keeping `vitae: 320`. Remove its `ENEMY_DECKS` entry and its `stages`. Boss-tier `phases` is new, so check escalation (`escalationApplies`) and the reveal's threat list for a boss with no deck.
- New rider work: a Curse-count hit that adds a BARNACLE when there are none; Swell's TANGLE per card in hand, and both Dangers counting the hand after their 2 BARNACLE.
- Update the pinned tests: `revamp-roster`, `chapter1-recast`, and anything naming the Saint's deck.
- Tests: each move's text and effect, the three phase lines, and the Beholder's deck untouched.
- Measure: the mechanics and mobile gates, run piecewise with a worker cap; one browser fight against the Saint through all four phases, shots in the PR body. Label `review:rules-change`.

### 162.4 (MV1d) — Five recast foes get their own moves · M · closes A6, A7 · requires 162.1, 162.2

- New moves per the tables; the five foes point at them instead of the benched foes' moves. Rider work: Take the Colours (a capped Conviction take, WARD per point taken, then a BARNACLE, with no dice), Coral Grows Over reusing the Curse-count rule from 162.3, The Whole Bloom with no minimum (`hits-per-discard` at `per: 1`, `min: 0`), Press-Ganged's TANGLE 2.
- Phase 2 and later keep each foe's attack, as the other normals and elites do.
- Tests: each foe's moves and Danger lines; no foe shares a move with another among these five; the other foes' moves unchanged.
- Measure: the mechanics and mobile gates, run piecewise with a worker cap; the Act 1 sim report for the Breakwater before and after, in the PR body. Label `review:rules-change`.
