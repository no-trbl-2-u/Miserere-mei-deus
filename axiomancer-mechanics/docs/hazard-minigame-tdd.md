# Hazard Minigame — Technical Design Document

> Companion to [`docs/hazard-minigame.md`](./hazard-minigame.md) (CDR-0006 doctrine) and [`docs/hazard-minigame-prd.md`](./hazard-minigame-prd.md).
> This file describes the technical architecture, types, state machine, and integration points for the hazard minigame implementation.

---

## Module Location

The hazard minigame lives in `src/World/Hazard/`. It is consumed by the world map event resolver and is not part of the combat system. It has its own state, lifecycle, and resolution pipeline.

```
src/World/Hazard/
├── hazard.types.ts          # All types, enums, and interfaces
├── hazard.engine.ts         # Core round resolution and scoring logic
├── hazard.deck.ts           # Deck management (draw, discard, reshuffle, enchantment zone)
├── hazard.dice.ts           # Mana dice roll and state transitions
├── hazard.cards.ts          # Action card library (30 cards)
├── hazard.cards.library.ts  # Content: all 30 authored action cards
├── hazard.hazards.library.ts # Content: all 15 authored hazard cards
├── index.ts                 # Public barrel: re-exports needed by World and Game
└── e2e/
    └── hazard.engine.test.ts
```

---

## Core Types

```ts
// Progress types — exactly four in v0
type HazardProgressType = 'stability' | 'escape' | 'supply' | 'force';

// Mana die face — X is blocked by default. Die has two X faces; X appears 2/6 ≈ 33% per die.
// No Green or Yellow. Four named colors: Red, Blue, Purple, Gold.
type HazardDieColor = 'red' | 'blue' | 'purple' | 'gold' | 'x';

// Die state transitions:
//   available → spent (card bottom action cost)
//   available → exhausted (card effect: exhaust without spending)
//   available → preserved (enchantment: carries to next round as available)
//   Safe route: spent → available only through explicit card/enchantment refresh
//   Safe route: exhausted → available during between-rounds processing
//   Risk route: dice are not auto-recast between rounds; spent state persists unless card text changes it
//   available → locked (card effect: cannot be changed or spent this round)
type HazardDieState =
  | 'available'
  | 'spent'
  | 'exhausted'
  | 'discarded'
  | 'locked'
  | 'preserved';

type HazardManaDie = {
  id: string;              // unique per die per hazard ("die-0" through "die-3")
  color: HazardDieColor;
  state: HazardDieState;
  temporary: boolean;      // true = expires at end of round unless preserved
};

// Round mark
type HazardMark = 'O' | 'X';

// Card rarity
type HazardCardRarity = 'common' | 'uncommon' | 'rare';

// Card verb class
type HazardCardClass =
  | 'direct-progress'
  | 'focus'
  | 'mana-conversion'
  | 'mana-creation'
  | 'card-draw'
  | 'risk-sacrifice'
  | 'failure-mitigation'
  | 'synergy-combo'
  | 'x-die-interaction'
  | 'persistent-enchantment';

// A single action card in the library
type HazardActionCard = {
  id: string;
  name: string;
  rarity: HazardCardRarity;
  class: HazardCardClass;
  progressType?: HazardProgressType | 'any';  // primary tag for filtering/display
  topAction: HazardCardEffect;
  bottomAction: HazardCardEffect;
  bottomManaCost: HazardManaCost[];            // empty array = no mana cost
  isEnchant: boolean;                          // if true, moves to enchantment zone on bottom play
};

// Mana cost entry — valid colors: 'red' | 'blue' | 'purple' | 'gold' | 'any'. No 'green' or 'yellow'.
type HazardManaCost = {
  color: HazardDieColor | 'any';  // 'any' = spend any available non-X die
  count: number;
};

// Card effect — evaluated at resolution time
type HazardCardEffect = (state: HazardRoundState) => HazardRoundState;

// Hazard card route
type HazardRoute = {
  progressType: HazardProgressType | 'player-choice';  // 'player-choice' = H07 special
  roundThresholds: number[];  // index 0 = round 1, last entry = final round
  reward: HazardReward;
  failurePenalty?: HazardPenalty;        // applied each failed round
  finalRoundFailurePenalty?: HazardPenalty; // additional penalty on final round failure only
};

type HazardCard = {
  id: string;                   // "H01" through "H15"
  name: string;
  scenario: string;
  rounds: number;
  topRoute: HazardRoute;
  bottomRoute: HazardRoute;
};

type HazardReward = {
  vitae?: number;               // positive = recover, negative = lose
  supplyTokens?: number;
  items?: string[];             // item IDs
  mapBenefit?: HazardMapBenefit; // ⚑ future phase — not implemented in v0
};

type HazardPenalty = {
  vitae?: number;               // negative number = VITAE loss
  additionalX?: number;         // mark N extra X marks
  supplyTokens?: number;
  mapPenalty?: HazardMapPenalty; // ⚑ future phase — not implemented in v0
};

// ⚑ These types are defined now but not wired to world state in v0.
// Filed in PHASE_CANDIDATES.md under hazard world-state tracking (score 6.4).
type HazardMapBenefit = {
  kind: 'threshold-reduction' | 'auto-succeed' | 'hazard-cleared';
  targetNodeId?: string;
  progressType?: HazardProgressType;
  thresholdReduction?: number;
  autoSucceedBelow?: number;
};

type HazardMapPenalty = {
  kind: 'route-blocked';
  blockedNodeId?: string;
};
```

---

## Minigame State

```ts
// Top-level hazard minigame session
type HazardMinigameState = {
  phase: HazardPhase;
  hazardCard: HazardCard;
  chosenRoute: 'top' | 'bottom' | null;
  playerChoiceProgressType: HazardProgressType | null; // H07 player-choice mechanic
  mana: HazardManaDie[];              // 4 dice; both routes persist; no auto-recast between rounds
  deck: string[];                     // card IDs in draw order
  hand: string[];                     // current hand (up to 5)
  discard: string[];                  // played / discarded cards
  enchantmentZone: string[];          // active ENCHANT cards
  rounds: HazardRoundResult[];        // completed rounds
  currentRound: HazardRoundState | null;
  finalScore: number | null;          // null until hazard ends
};

type HazardPhase =
  | 'reveal'           // hazard card shown, no action yet
  | 'draw'             // player draws opening hand
  | 'route-select'     // player chooses top or bottom
  | 'dice-roll'        // dice rolled
  | 'round-play'       // player plays cards
  | 'round-resolve'    // round marked O or X, penalties applied
  | 'between-rounds'   // enchantment effects fire, dice refresh if applicable
  | 'complete';        // hazard over, score computed

type HazardRoundState = {
  round: number;                          // 1-indexed
  progress: Record<HazardProgressType, number>;
  focusBuffer: number;                    // accumulated Focus buff for next progress card
  cardsPlayed: string[];                  // card IDs played this round
  manaCopy: HazardManaDie[];              // snapshot at round start for undo/debug
};

type HazardRoundResult = {
  round: number;
  mark: HazardMark;
  progressAchieved: Record<HazardProgressType, number>;
  thresholdRequired: Record<HazardProgressType, number>;
  penaltiesApplied: HazardPenalty[];
};
```

---

## State Machine

```
[reveal]
    │ player sees hazard card
    ▼
[draw]
    │ draw 5 cards from deck
    ▼
[route-select]
    │ player picks top / bottom
    ▼
[dice-roll]
    │ roll 4 dice (both routes persist; no auto-recast between rounds)
    ▼
[round-play]  ◄──────────────────────────────────────────────────────┐
    │ player plays cards, spends mana                                │
    │                                                                │
    ▼                                                                │
[round-resolve]                                                      │
    │ compare progress to threshold → mark O or X                   │
    │ apply per-round penalties if X                                 │
    │                                                                │
    ├── more rounds remaining ──► [between-rounds]                  │
    │                                    │ enchantment effects fire  │
    │                                    │ temporary dice expire     │
    │                                    │ draw 5 new cards          │
    │                                    └──────────────────────────►│
    │
    └── final round resolved ──► [complete]
                                    │
                                    ▼
                              compute score
                              apply final reward / penalty
                              return to map
```

---

## Engine Functions

### `initializeHazard(hazardCard, playerDeck): HazardMinigameState`
- Shuffle `playerDeck`.
- Set `phase: 'reveal'`, `chosenRoute: null`, `mana: []`, `deck: shuffledDeck`.

### `drawOpeningHand(state): HazardMinigameState`
- Draw 5 cards from `state.deck` into `state.hand`.
- Advance `phase` to `'route-select'`.

### `selectRoute(state, route, playerChoiceType?): HazardMinigameState`
- Set `chosenRoute` ('top' = safe route; 'bottom' = risk route), advance `phase` to `'dice-roll'`.
- For H07 player-choice bottom: set `playerChoiceProgressType`.

### `rollDice(state, rng): HazardMinigameState`
- Roll 4 dice using `rng`. Create `HazardManaDie[]`.
- Die face distribution: Red (1/6), Blue (1/6), Purple (1/6), Gold (1/6), X (2/6). No Green or Yellow.
- Advance `phase` to `'round-play'`.
- Initialize `currentRound` with `round: 1`, zeroed progress, empty `cardsPlayed`.

### `playCard(state, cardId, useBottom): HazardMinigameState`
- If `useBottom`: validate mana cost; mark matching dice as `'spent'`; apply bottom action.
- If `!useBottom`: apply top action.
- Add `cardId` to `currentRound.cardsPlayed`.
- Remove `cardId` from `hand`.
- If card `isEnchant` and played bottom: move to `enchantmentZone`.
- Otherwise: move to `discard`.

### `resolveRound(state): HazardMinigameState`
- Compare `currentRound.progress` against `getThresholdForRound(state)`.
- For risk route (bottom): both progress type thresholds must be met. Meeting only one is a round failure.
- For safe route (top): single threshold must be met.
- Determine `mark: 'O' | 'X'`.
- If `X`: apply per-round `failurePenalty` from the chosen route.
- If final round and `X`: additionally apply `finalRoundFailurePenalty`.
- Push `HazardRoundResult` to `state.rounds`.
- If more rounds: advance to `'between-rounds'`.
- If final round: compute `finalScore`, advance to `'complete'`.

### `processBetweenRounds(state): HazardMinigameState`
- Fire each ENCHANT card's between-rounds effect on `state.mana`.
- Expire temporary dice (set `state: 'discarded'`).
- Safe route: preserved dice carry `state: 'available'` into next round; `'exhausted'` dice reset to `'available'`; `'spent'` dice remain spent unless card/enchantment text refreshes them.
- Risk route: do not re-cast base dice before the next round; spent states persist. Temporary dice still expire unless explicitly preserved by accepted card text.
- Draw 5 new cards into `state.hand`.
- Initialize new `HazardRoundState`.
- Advance `phase` to `'round-play'`.

### `computeFinalScore(state): number`
- `count(O) - count(X)` across all `state.rounds`.

### `getThresholdForRound(state): Record<HazardProgressType, number>`
- Read from the chosen route's `roundThresholds`.
- For `'player-choice'` routes: use `state.playerChoiceProgressType`.
- Return a `Record<HazardProgressType, number>` with 0 for unneeded types.

---

## Deck Management

```ts
// hazard.deck.ts

function drawCards(deck: string[], count: number, discard: string[]): {
  drawn: string[];
  remainingDeck: string[];
  remainingDiscard: string[];
}
// If deck.length < count: reshuffle discard into deck first, then draw.

function shuffleDeck(deck: string[], rng: () => number): string[]
// Uses Fisher-Yates. Always takes rng to be deterministic in tests.
```

---

## Mana Validation

```ts
// hazard.dice.ts

function canAffordCost(
  dice: HazardManaDie[],
  cost: HazardManaCost[]
): boolean
// Returns true if enough available non-X dice exist to satisfy each cost entry.
// 'any' costs match any available die except X.
// Valid specific colors: 'red', 'blue', 'purple', 'gold'. 'green' and 'yellow' are not valid costs.
// Does not mutate dice.

function spendMana(
  dice: HazardManaDie[],
  cost: HazardManaCost[]
): HazardManaDie[]
// Returns new dice array with matching available dice marked 'spent'.
// Throws if cost cannot be satisfied.

function canInteractWithX(card: HazardActionCard): boolean
// Returns true if card.class === 'x-die-interaction'.
// Used to guard X-die targeting in UI and engine.
```

---

## Integration Points

### MapEvents → Hazard
`src/World/MapEvents/resolver.ts` currently handles `kind: 'hazard'` with a simple effect/damage surface. The hazard minigame replaces this path:

```ts
// Before (current):
case 'hazard': return applyHazardEffects(event, state);

// After (target):
case 'hazard': return launchHazardMinigame(event.hazardCardId, state);
```

The minigame is async from the UI perspective (the player interacts with it), but the engine resolves a `HazardMinigameResult` synchronously per round. The store dispatches round-by-round.

### GameState
The active `HazardMinigameState` is stored in `GameState.activeHazard?: HazardMinigameState`. It is cleared when the hazard reaches `'complete'`.

### Deck Persistence
The player's card deck is stored in `GameState.hazardDeck: string[]` (ordered card IDs). It persists across hazards and is grown as cards are unlocked.

### World-State Tracking (⚑ future phase)
When the world-state phase ships, the hazard engine will need to:
- Emit `HazardMapBenefit` and `HazardMapPenalty` events on resolution.
- The world reducer will apply these to `MapState.nodeModifiers`.
- The threshold resolution in `getThresholdForRound` will read active modifiers for the current node.

---

## RNG Contract

All randomness (deck shuffle, dice roll) must flow through the repo's existing `rng: () => number` parameter pattern. Never call `Math.random()` directly in the hazard engine.

In tests, use `mockFixedRng` / `mockSequentialRng` from `src/test-utils/rng.ts` to produce deterministic dice and deck order.

---

## Hermetic E2E Test Coverage

`src/World/Hazard/e2e/hazard.engine.test.ts` must cover at minimum:

- Hazard start through `'complete'` for a top-route win (3 O)
- Hazard start through `'complete'` for a full loss (3 X)
- Mana spending: valid cost deducts available dice; invalid cost throws
- X die: cannot be spent; X-interaction card enables interaction
- ENCHANT card: moves to enchantment zone; fires between-rounds; not reshuffled
- Deck empty: triggers discard reshuffle before next draw
- Focus buff: stacks on next progress card's value
- `mark 1 additional X` penalty: score reflects the additional mark
- Dual-type round: both types must be met to score O
- Final round: uses elevated threshold; final-round penalty applies only on X

---

## Open Technical Questions

1. **Store shape:** Should `GameState.activeHazard` be `HazardMinigameState | null`, or should the hazard live in a separate Zustand slice? Recommend: same pattern as combat — a dedicated `hazardReducer` + store slice.

2. **Card effect type:** `(state: HazardRoundState) => HazardRoundState` is pure and synchronous. This works for all 30 v0 cards. Confirm no card requires async resolution before locking the type.

3. **Unlock mechanism:** `GameState.hazardDeck` grows as cards are unlocked. What action dispatches the unlock? Recommend: a `UNLOCK_HAZARD_CARD` action mirroring the `UNLOCK_CODEX_ENTRY` pattern from Phase 73.

4. **Dev mode injection:** Dev hand injection should add a card to `hand` without touching `deck` or `discard`. Should it be gated by a `__DEV__` flag or a store action? Recommend: store action `DEV_INJECT_HAZARD_CARD` that is a no-op in production builds.
