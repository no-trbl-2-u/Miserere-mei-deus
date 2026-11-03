# Quickstart — Combat

> Initialize a Hazard-Pattern Combat encounter, play cards, and handle
> outcomes. Hazard-Pattern Combat is the only combat engine. For full
> API reference see [`combat.md`](./combat.md) § Hazard-Pattern Combat.

## Initialize an encounter

```typescript
import { createCharacter, createEnemy, initializeCombatEncounter, rollEncounterDice } from 'axiomancer-mechanics';

const player = createCharacter({ name: 'P', level: 1, baseStats: { body: 4, mind: 4, heart: 4 } });
const enemy = createEnemy({
  id: 'test-foe', name: 'Test Foe', description: 'A sparring partner.',
  level: 1, baseStats: { body: 3, mind: 3, heart: 3 },
  mapName: 'test-map', logic: 'random',
});

let state = initializeCombatEncounter(player, enemy);
// state.phase === 'reveal' — opening hand drawn, dice not yet rolled.
// Optional args: a curated deck (string[] of card ids) and a seed for
// deterministic runs: initializeCombatEncounter(player, enemy, deck, seed)

({ state } = rollEncounterDice(state)); // opens phase-play and starts turn 1
```

## Play a turn

Every engine verb returns a `CombatTransition` — `{ state, events }` — so any
UI client (CLI, mobile, automated tester) can drive combat without
re-implementing the math.

```typescript
import { getCard, firstLegalPoweringDie, playCombatCard, endTurn } from 'axiomancer-mechanics';

// 1. The round's four dice are already rolled (spec 33 — no draft). Each live
//    mana/special face may power ONE paid line of its colour (gold = any).
const entry = state.hand[0];
const die = firstLegalPoweringDie(state, getCard(entry.cardId)!);

// 2. Play cards from hand. `useBottom: true` powers the full effect with the
//    named die; `false` takes the free top action (no die).
let t = die
    ? playCombatCard(state, { uid: entry.uid }, true, die.id)
    : playCombatCard(state, { uid: entry.uid }, false);
state = t.state;
// t.events — typed CombatEvent[] stream for rendering

// 3. Close the turn (one unspent die banks to the Reserve).
({ state } = endTurn(state));
```

## Enemy threat phase and upkeep

```typescript
import { resolveThreatPhase, processBetweenPhases } from 'axiomancer-mechanics';

({ state } = resolveThreatPhase(state));    // the enemy's telegraphed threat fires
({ state } = processBetweenPhases(state));  // DoT ticks, effect durations, fresh hand
```

## Outcomes

When `state.phase === 'complete'`, `state.outcome` is one of:

| Outcome | Meaning |
|---------|---------|
| `victory` | Enemy HP reached 0 (DoT erosion + strikes) |
| `defeat` | Player HP reached 0 |

There is no in-combat retreat — once a fight is joined it resolves only by
winning or losing (`retreat` still exists as a dead `CombatOutcome` union
member for now; no code path can ever produce it).

```typescript
import { buildCombatSummary } from 'axiomancer-mechanics';

if (state.phase === 'complete') {
  const summary = buildCombatSummary(state);
  // summary.outcome + per-card attribution rows (DoT damage, strikes, phases)
}
```

## Simulate for balance evidence

```typescript
import { simulateHazardPatternCombat } from 'axiomancer-mechanics';

const stats = simulateHazardPatternCombat(player, enemy, 300);
// stats.winRate, stats.dotHpFraction, stats.avgActiveEffectsPerPhase, ...
```

## Deep-dive

- Full API surface: [`combat.md`](./combat.md) § Hazard-Pattern Combat API
- The dice / Conviction / Signature Skills: [`combat.md`](./combat.md) § Spec 26 / 26b + spec 33
- Deck building and presets: [`combat.md`](./combat.md) § Phase 169 — Curated Combat Loadout
- Playtest loop: [`playtest.md`](./playtest.md)
