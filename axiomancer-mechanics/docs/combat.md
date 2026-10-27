# Combat

The combat engine of Miserere Mei, Deus, as code. This page says where each
part of a fight lives and which function drives it. For what a rule means
and the numbers it uses, read [the game model](../../docs/game-model.md);
this page links it rather than restating it. Paths are under
`axiomancer-mechanics/src/`.

The engine is pure and deterministic: every driver takes a
`CombatEncounterState` and returns a `CombatTransition` (`{ state, events }`).
The mobile app, the combat CLI (`npm run combat`) and the simulator all call
the same functions. The public surface is re-exported through
`Combat/index.ts` and `src/index.ts`.

## Where the state lives

| What | Where |
| --- | --- |
| The fight state, `CombatEncounterState` | `Combat/combat.encounter.types.ts` |
| Phases (`CombatEncounterPhase`): `reveal`, `phase-play`, `mercy-choice`, `complete`, … | same file |
| Outcomes (`CombatOutcome`): `victory`, `mercy`, `defeat` | same file |
| The typed event stream (`CombatEvent`) the UI renders | same file |
| Dice (`CombatManaDie`, `CombatDieColor`) and die gear (`UpgradeableDieGear`) | same file |
| Enemy intent (`CombatThreatPhase`, `CombatThreatAction`, `CombatIntentType`) | same file |

The fields a reader needs first: `player` and `enemy` (deep clones; VITAE is
`health` / `maxHealth`), `hand`, `drawPile`, `discard`, `deck`, `dice` (this
turn's tray), `reserve` (banked dice), `floatingDice`, `conviction`, `guard`,
`momentumV2`, `threatPhases` and `currentPhaseIndex` (the enemy deck),
`round`, `turnTakenThisPhase`, `mercyChoiceActive`, `finalOutcome` and `log`.

## Starting a fight

`initializeCombatEncounter(player, enemy, playerDeck?, seed?, flags?)` in
`Combat/combat.engine.ts` clones both combatants, builds the deck
(`buildCombatDeck`, `Combat/combat.deck.ts`) unless one is passed, compiles
the enemy's deck into `threatPhases` (`getThreatSequence`,
`Combat/combat.threat.ts`), draws the opening hand of `COMBAT_HAND_SIZE`
(`drawCombatCards`), and reads the worn relics' signatures
(`getSignaturesForLoadout`, `Items/relic.library.ts`). The state opens in
`reveal` with no dice. `rollEncounterDice` moves it to `phase-play` and
rolls the first tray.

## The turn loop

One round is: roll the tray, play cards, end the turn, resolve the enemy's
threat, then the between-phases step. `resolveCombatPhase(state, plays)`
runs a whole round from a list of `CardPlay`s; the mobile app and the CLI
call the steps one by one.

**Roll the tray.** `startTurn` rolls the four dice
(`rollUpgradeableDice`, `UPGRADEABLE_DIE_COLORS`, `DEFAULT_DIE_GEAR`,
`activeDieGear` in `Combat/combat.upgradeable-dice.ts`) and adds any
floating dice. It caps the table at `UPGRADEABLE_TABLE_CEILING`, turning
overflow into Conviction. A second roll in the same phase is refused with a
`turn-law-blocked` event (`turnTakenThisPhase`). Rules:
[Dice](../../docs/game-model.md#dice).

**Play a card.** `playCombatCard(state, { uid }, useBottom, dieId?)`:

- `useBottom = false` plays the FREE line (`playTopAction`): the card's
  `free` rider, no die.
- `useBottom = true` plays the PAID line (`playBottomAction`) with the named
  die from the tray, the reserve or the floating dice. No die, a miss face
  or a die that fails the Color Law (`dieSatisfiesColorLaw`) fizzles with an
  `effect-fizzled` event and spends nothing. `firstLegalPoweringDie` finds a
  legal die for callers that do not name one.
- A legal die adds nothing of its own: DEAL (via `scalePlayerHit`), GUARD
  and status turns land as printed, whatever colour paid. Banked pips add
  `PIP_GUARD_BONUS` or `PIP_INTENSITY_BONUS`.
- Player stats scale the printed numbers through `scaleFor` and
  `scaleEffectIntensity` (`Combat/stat-scaling.ts`). `scaleCardForStats` is
  the display copy the hand prints.
- After a PAID play, `applyBoonAndMomentumV2` fires a special face's
  Conviction (`SPECIAL_CONVICTION_DEFAULT`) and advances momentum
  (`advanceMomentumV2`, `MOMENTUM_CHAIN_ORDER`, `MOMENTUM_SURGE_LENGTH`); a
  completed chain adds a temporary gold die.

Rules: [Cards](../../docs/game-model.md#cards) and
[Dice](../../docs/game-model.md#dice).

**Scrap.** `discardCombatCard(state, uid)` discards a hand card for
Conviction, paying only up to `SCRAP_CONVICTION_CAP_PER_TURN` per turn.
Conviction never passes `CONVICTION_CAP`.

**The signature.** `playSignatureSkill(state, id)` spends that signature's
own `cost` in Conviction (`SignatureSkill.cost`; there is no single price).
`signatureCastBlock` (`Combat/combat.signature.ts`) names why a cast is
refused, and the UI prints the same string. `SIGNATURE_SKILLS` holds The Open
Hand (`sig-disarming-plea`, ◆4, the Suppliant's Ring), which opens the mercy
choice (see the ending below), and Blood Price's three: Crimson Return
(`sig-crimson-circlet`, ◆5), Ruby Tithe (`sig-ruby-signet`, ◆3) and Open
Vein (`sig-bleeding-signet`, ◆4), and the Elementalist's three: Eye of the
Storm (`sig-elementalist-signet`, ◆6), Kindle the Gale (`sig-elementalist-brooch`,
◆4) and Thaw into Thunder (`sig-elementalist-belt`, ◆3). A worn relic's stat lines and signature are
read from the relic library by id; its Heart, Body and Mind lines join the
fighter's stats for the fight (`statsWithWorn`).

**End the turn.** `endTurn` banks one unspent tray die into `reserve`
(best face first, up to `RESERVE_MAX`) and clears the tray.

**The enemy acts.** `resolveThreatPhase` fires the telegraphed action of
`threatPhases[currentPhaseIndex]` unless a control status stops it
(`canAct`, `Combat/effect-modifiers.ts`). The hit is scaled by the
escalation clock (`THREAT_ESCALATION_PER_ROUND`, `THREAT_ESCALATION_GRACE`,
`THREAT_ESCALATION_MAX`, `THREAT_ESCALATION_BOSS_MULT`) and soaked by GUARD
first (`soakFlatHit`). GUARD then resets to 0. `projectIncomingThreat` and
`projectCombatOutcome` give the UI the same numbers before the player acts.

**Between phases.** `processBetweenPhases` ticks statuses on both sides
(`processRoundStartEffects`, `processRoundEndEffects`,
`Combat/effects.ts`), enters a boss stage when the foe's VITAE or the round
reaches that stage's mark (`Enemy.stages`), ripens reserve dice (`ripenReserve`,
`RESERVE_PIP_CAP`, `Combat/combat.dice.ts`), advances the enemy deck,
refills the hand to `COMBAT_HAND_SIZE` (unplayed cards stay), clears the
tray and re-arms `turnTakenThisPhase`.

Rules: [A fight](../../docs/game-model.md#a-fight).

## The enemy deck

Each foe plays an ordered deck of enemy cards, one per threat phase.

- The cards: `ENEMY_CARD_LIBRARY` in `Combat/combat.enemy-cards.ts`. Each
  carries a `damageWeight` and an `actionText`; none applies a status.
- The decks: `ENEMY_DECKS` in `Combat/combat.enemy-decks.ts`, a flat list
  or a tiered deck (`TieredEnemyDeck`) whose tier 2 and 3 cards unlock at
  `TIER2_DEFAULT_ROUND` and `TIER3_DEFAULT_ROUND`. `compileEnemyDeck` turns
  a deck into threat steps; `combat.threat-sequences.ts` collects them.
- `getThreatSequence(enemy)` in `Combat/combat.threat.ts` produces the
  `threatPhases`: scaled damage (`threatDamageBudget`) and the intent
  (`deriveIntentType`) the telegraph shows. The last phase repeats.

Rules: [The foes](../../docs/game-model.md#the-foes).

## Statuses

Statuses are `ActiveEffect`s on a combatant's `effects`, defined in
`Effects/buffs.library.json` and `Effects/debuffs.library.json` and looked
up with `lookupEffect` (`Effects/effects.library.ts`). `applyEffect` and
`removeEffect` (`Effects/index.ts`) add and remove them;
`resolveEffectApplication` (`Combat/resist.ts`) decides whether one lands.

The one status a live card applies is VULNERABLE (`debuff_vulnerable`, from
A Plain Word). `getDamageTakenMultiplier` (`Combat/effects.ts`) turns it into
the foe's incoming-damage multiplier, which the PAID hit reads and
`processBetweenPhases` applies to damage over time. The debuff library
holds other entries that no live card or enemy card applies.

## How a fight ends

`finalOutcome` is set and `phase` becomes `complete` through `endCombat`:

- **Victory:** the foe's VITAE reaches 0 (`isDefeated`, `Combat/health.ts`),
  checked after every play (`checkImmediateOutcome`) and after the threat
  and between-phases steps.
- **Defeat:** the player's VITAE reaches 0, or the round passes
  `MAX_PHASES` (a private constant in `combat.engine.ts`).
- **Mercy:** The Open Hand casts only on a foe with a `friendshipReward`
  under its `befriendabilityConfig.hpGate` (`isEnemyBefriendable`,
  `befriendHpGateOpen`, `Enemy/befriend.ts`). It sets `phase` to `mercy-choice`, and
  `selectMercyChoice(state, 'spare' | 'exploit')` ends the fight as `mercy`
  or strikes the foe and lets the fight go on if it survives.

`buildCombatSummary` (`Combat/combat.attribution.ts`) turns the finished
state into a `CombatSummary`. Rules:
[Befriend and mercy](../../docs/game-model.md#befriend-and-mercy).

## Simulation and tools

- `simulateHazardPatternCombat` in `Combat/combat.encounter.sim.ts` runs
  seeded fights with a bot policy (`Combat/combat.sim-policies.ts`).
- `npm run combat`, `npm run combat-sim` and `npm run combat-playtest`
  drive the engine from the terminal; see [cli.md](./cli.md).
- Tests sit next to the code and under `Combat/e2e/`; see
  [testing.md](./testing.md).
