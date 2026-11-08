# Combat screen

This doc describes what the mobile combat screen renders and how it drives
the engine. The rules of a fight live in
[`docs/game-model.md`](../../docs/game-model.md) (§ Dice, § A fight,
§ Relics and The Open Hand); the engine side, with its files and functions, in
[`axiomancer-mechanics/docs/combat.md`](../../axiomancer-mechanics/docs/combat.md).

## Entry points

Combat is a card-and-dice surface hosted by
[`<CombatEncounterPanel>`](../components/combat/encounter/CombatEncounterPanel.tsx),
mounted from two places:

- [`app/combat-encounter/index.tsx`](../app/combat-encounter/index.tsx) —
  the live fight's route. `<CombatGate>` engages every map and labyrinth
  encounter and pushes it; it feeds the panel the staged foe and the real
  player and sets `persistOutcome={true}`.

## Data flow

```text
CombatEncounterState (pure, from axiomancer-mechanics)
        │  held in <CombatEncounterPanel>'s local React state
        │  advanced by calling engine transition functions directly
        │  (initializeCombatEncounter, rollEncounterDice, playCombatCard,
        │   endTurn, resolveThreatPhase, playSignatureSkill, …)
        ▼
buildCombatViewModel(state)  ──►  CombatViewModel
  (state/presenters/combat-encounter.engine.ts)
        ▼
<CombatBoard>  (components/combat/encounter/CombatBoard.tsx)
```

There is no separate "action layer" module: the panel calls the
`@mechanics` transition functions directly and re-renders from the returned `CombatEncounterState`. The
presenter (`buildCombatViewModel`) is the only translation step, and owns
the engine → view-model mapping; the board owns all UI/interaction.

`persistOutcome` (live play only) hand-rolls the economy write-back the
engine intentionally omits (it has no economy layer): final HP →
`player.health`, `enemy.xpReward` → experience (+ level-ups),
`fightWage(enemy.level)` → shillings, plus the deckbuilder reward card.

## Phases

The engine's `CombatEncounterState.phase` (`CombatEncounterPhase` in
`axiomancer-mechanics`) drives the loop:

| Phase | Meaning |
|---|---|
| `reveal` | Enemy + opening hand visible, before dice are rolled. |
| `dice-roll` | Player rolls stance dice (`rollEncounterDice`). |
| `phase-play` | Player plays cards (`playCombatCard` with the chosen die; `endTurn` banks one unspent die). |
| `phase-resolve` | Effect kinds compared, enemy threat action fires, phase graded Clear/Overwhelmed (`resolveThreatPhase`). |
| `between-phases` | DoT ticks, durations tick, hand draws back to 5. |
| `complete` | Combat over, `finalOutcome` determined. |

## Turn flow

Per turn, inside `phase-play`: **reveal → roll the four
fixed-colour dice (each shows a special, mana or miss face) → drag any live
die onto a staged card of its colour (WILD powers any) to POWER it → END
PHASE to bank one unspent die and resolve the threat phase.**

The drag-to-power interaction (`CombatBoard.tsx`):

1. Drag a card UP into the play region to **stage** it (drag to the scrap
   zone to discard instead).
2. Drag a **die** onto the staged card to power it — this only *selects*
   the die; it isn't committed yet, and can be re-dragged to a different
   card.
3. Read the card's live keyword line (the projected hit).
4. Tap **APPLY** (the ribbon fused to the staged card) to commit.

A die powers only the card it was dropped (or tapped) onto. A die a
refresh rider hands back stays live in the tray for another card via an
explicit re-drop — it never auto-attaches to the next staged card.

## Board layout

`CombatBoard` is a full-bleed battlefield with floating chrome, not a
scrolling panel stack:

| Region | Renders |
|---|---|
| Battlefield + top HUD | `CombatCombatantPane` — enemy pane, player pane, intent telegraph, effect chips. |
| Play region | Invisible drop target; dashed affordance shows only while a card drag is live. |
| Signature rune column | Left edge — Conviction chip + circular signature runes. |
| Dice row | Free-floating gem dice above the hand. |
| Hand fan | Edge-to-edge arc of playable cards. |
| Corner medallions | Player portrait (tap → pilgrim modal) and the END PHASE button. |
| Bottom rail | HP and the deck/discard counts. No phase-ledger marks and no phase/round/turn line: the board prints no phase count. |

There is no scrolling battle log; state changes read from the board itself
plus transient FX (`CombatFx`).

## View-model

`CombatViewModel` (`state/presenters/combat-encounter.engine.ts`) is the
single frozen object the board renders — `phase`, `enemy`, `player`,
`dice`, `hand`, `conviction`, `signatures`, `resonance`, `dieGear` and
`diceRolled`. See the file's own interfaces
(`CombatEnemyPaneVM`, `CombatPlayerPaneVM`, `CombatCardVM`, `CombatDieVM`,
…) for the full per-region shape — they're the source of truth, not this
doc.

## Tests

| What | Where |
|---|---|
| Route — the live `/combat-encounter` route hands the staged foe to the panel and leaves on every exit | [`state/e2e/combat-route.screen.test.tsx`](../state/e2e/combat-route.screen.test.tsx) |
| Multi-stage board interaction (drag/END PHASE guards) | [`components/combat/encounter/__tests__/CombatBoard.multistage.test.tsx`](../components/combat/encounter/__tests__/CombatBoard.multistage.test.tsx) |

`npm test` must pass twice in a row and `npx tsc --noEmit` must be clean
before declaring a combat change done. See [`docs/testing.md`](./testing.md).
