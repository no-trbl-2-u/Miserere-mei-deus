# Axiomancer Hazard Minigame — CDR-0006

> Mechanics-repo copy. This file is the source of truth for hazard-minigame design until implementation promotes any rule into code or specs. Mobile may present this system; mechanics owns the rules, dice lifecycle, card lifecycle, scoring, content set, and tuning targets. Design review contributed by Tobin.
>
> **Companion documents:**
> - [`docs/hazard-minigame-prd.md`](./hazard-minigame-prd.md) — Product requirements, user stories, success metrics, and out-of-scope list
> - [`docs/hazard-minigame-tdd.md`](./hazard-minigame-tdd.md) — Technical architecture, types, state machine, and integration points
> - [`docs/hazard-minigame-bdd.md`](./hazard-minigame-bdd.md) — Behavior-driven test scenarios (maps to hermetic e2e cases)
> - [`docs/hazard-minigame-api.md`](./hazard-minigame-api.md) — Consumer/export guide for mobile and other hosts
> - [`docs/encounters/hazard.md`](./encounters/hazard.md) — Current rules, deck, and hazard library
> - [`docs/hazard-playtest-2026-06-10-spec.md`](./hazard-playtest-2026-06-10-spec.md) — Playtest findings from the mobile/prototype pass

Date: 2026-06-10
Status: Accepted v0 doctrine
Owner: T / SomberSoft

## Decision

The first true Axiomancer event minigame candidate is the **Hazard minigame**. It should feel closer to **Mage Knight** than to War: a compact tactical puzzle where the player reads a dangerous situation, rolls imperfect mana, draws a hand of action cards, and assembles a solution under pressure.

The system must not become simple card-number comparison. The player should solve the turn through action effects, mana manipulation, card draw/filtering, persistent enchantments, risk, and consequence.

## Design Goals

- Make hazards feel like playable crises, not passive damage popups.
- Give the player visible tactical agency after a bad roll.
- Let danger tempt the player with harder routes and better rewards.
- Keep the round outcome legible: success marks (`O`) and failure marks (`X`).
- Keep early implementation small enough to prototype and tune.
- Support Axiomancer's board-game-like event direction: constrained, legible, punishing, rewarding, and testable.

## Core Loop

1. A map node triggers a hazard event.
2. The game draws/reveals a **Hazard card**.
3. The player draws **5 action cards** from their personal deck.
4. The player sees their hand and chooses **top route** or **bottom route**.
5. **4 colored mana dice** are rolled. dice are cast once at route selection and persist as board objects on both routes; neither Safe nor Risk auto-recasts between rounds.
6. The player uses action card effects and available mana to meet the round's hazard requirement.
7. Each round resolves as:
   - `O` = completed / success
   - `X` = failed
8. The minigame lasts **3–5 rounds**. Each subsequent round draws 5 new cards from the deck.
9. The last round is always somewhat harder.
10. Final score:

```text
successes O - failures X
```

11. Final score determines outcome, reward, and/or penalty.


## Expected Playthrough / UX Contract

The clickable prototype should model the intended player pass, not merely the engine state labels. A normal hazard round plays as follows:

1. The player enters a hazard from the map and sees the hazard card, scenario, round count, and the safe/top and risk/bottom routes. Route layout is a Mobile UX concern, but mechanics data must support **stacked full-width route presentation**: each route card is presented at full width, one above the other, showing at minimum the progress type(s), per-round threshold(s), reward, and failure penalty before commitment. Route data must carry enough information to populate this layout without additional lookups.
2. The player's 5-card hand appears at the bottom of the screen as compact card stock. It must fit without horizontal scrolling; slight overlap/stacking is acceptable. Card stock may carry a subtle color tint based on the single mana color its bottom action can consume.
3. Tapping a compact hand card opens the readable card view with full text and keyword explanations.
4. The player drags candidate cards into a play area that can hold up to 6 cards. Cards shrink when placed there. Tapping a staged card returns it to the hand.
5. The player drags a die onto a staged card to power that card's bottom action. Cards never require more than 1 mana to power up.
6. Progress meters preview the would-be result of the staged set before commitment. The preview must show current value, projected value, and threshold.
7. The player confirms the staged set with a **Play** button. Until Play is pressed, staged cards and dice assignment are reversible UI intent, not resolved engine truth.
8. The round resolves, the `O`/`X` ledger updates, played cards move to discard/enchantment zones as appropriate, remaining hand cards are discarded, and the next round draws a new set of 5.
9. Repeat until the hazard's 3-5 rounds are complete.
10. Completion shows a result modal: **Perfect** when all rounds succeeded, **Complete** when at least 1 round succeeded, and **Failure** when no rounds succeeded.
11. A rewards/consequences modal follows the result. It shows granted rewards, consequences, and 3 card-reward choices when applicable.

Reward and consequence rules for the prototype:

- **Perfect:** 1 guaranteed rare card appears among the 3 card choices; the player may also skip card reward via an `X` button in the modal's bottom-right corner. Perfect applies 0 consequences.
- **Complete / normal success:** the player must choose 1 of 3 offered cards. Rarity ranges from common to rare by RNG, except a one-round-only success has 0% rare chance. Consequences scale with rounds lost.
- **Failure / 0 successful rounds:** no success reward; apply maximum consequences for that hazard.
- Consequences can include dead cards added to the deck, maximum VITAE loss, minimum VITAE loss, loss of all current paradox/fallacy tokens, or other hazard-authored penalties.
- Rewards and consequences may share the same modal area, but every reward and consequence needs an icon plus tooltip/explainer copy.

## Hazard Cards

A hazard card represents a dangerous situation: traps, starvation, cliff edges, dangerous terrain, corruption, collapsing structures, hostile weather, and similar crises.

Each hazard card has a **safe route** and a **risk route**:

- **Safe route (top):** easier to clear, single-meter requirement, lower reward.
- **Risk route (bottom):** harder to clear, dual "BOTH REQUIRED" meters, better reward, greater temptation/risk.

**Top and bottom routes use different progress types** — the routes are not the same goal at different difficulty numbers. They represent genuinely different approaches to the crisis. A hazard that forces both routes to measure the same thing is a design failure.

The hazard card's target numbers and difficulty assumptions should be balanced around a **5-card action hand**.

Example hazard skeleton:

```text
Cracked Cliff Path
Scenario: The ledge breaks underfoot and a shrine-cache glints across the split.
Top: Find footing — Clear 5 Stability.
Bottom: Leap for the shrine cache — Clear 8 Escape; better reward, injury on failure.
Rounds: 3
Final round modifier: +2 target or added penalty.
```

## Progress Types

V0 uses exactly **four** progress types. No new types until these prove readable under pressure.

| Type | Meaning |
|---|---|
| Stability | Physical balance, structural navigation, composure under pressure |
| Escape | Getting out, bypassing, finding alternate paths, speed under threat |
| Supply | Resource management, provisioning, finding materials |
| Force | Physical power, confrontation, endurance against direct resistance |

**Focus is not a progress type.** Focus is a card mechanic that buffs the progress value of other cards — see Action Cards.

**Safe routes use a single meter. Risk routes always use dual meters (BOTH REQUIRED).** The player must satisfy both progress type thresholds in the same round to score O on a Risk route; meeting only one threshold is a round failure. Cards must clearly contribute to one meter or the other unless explicitly designated dual-contribution or utility. Single-meter play on a Risk route is a design error, not a design option.

Dual requirements are interesting precisely because the player may not have mana in both colors.

## Mana Dice

Each hazard uses **4 mana dice**, rolled after route choice and before round 1. They persist as board objects for the whole hazard path on both Safe and Risk; Risk is harder because it demands dual BOTH REQUIRED meters, not because it refreshes dice.

Die faces (6 faces; two are wild X):

- Red
- Blue
- Purple
- Gold
- X *(wild/blocked — appears twice on each die)*
- X

Rules:

- Safe route dice are persistent board objects: they do **not** automatically reroll or refresh between rounds unless card text or enchantments say so.
- Risk route dice are **not** automatically re-cast/rerolled between rounds. The same spent/available dice economy persists; cards and enchantments are the only normal way to manipulate the pool.
- Mana does **not** freely carry over by default.
- **X is blocked mana — it cannot be spent or used unless a card specifically enables interaction with X dice.**
- **Exhausted/temporary states are card-effect concerns, not a route refresh.** Base dice do not freely refresh between rounds unless card or enchantment text says so.
- **Spent dice persist on both Safe and Risk** unless an enchantment or card effect refreshes, re-casts, preserves, exhausts, discards, locks, or transforms them.
- Cards and enchantments may explicitly reroll, refresh, preserve, exhaust, discard, lock, or transform dice; those effects are the exception to the no-free-refresh law.
- Specific card text is permitted to override the Safe-route default dice law.

This makes dice load-bearing board objects: persistent across rounds on both routes, with Risk pressure coming from dual-meter requirements.

A die should be modeled with both color and state:

```ts
type HazardManaDie = {
  color: 'red' | 'blue' | 'purple' | 'gold' | 'x';
  state: 'available' | 'spent' | 'exhausted' | 'discarded' | 'locked' | 'preserved';
};
// Face distribution: red 1/6, blue 1/6, purple 1/6, gold 1/6, x 2/6.
// No route auto-refreshes or auto-recasts dice between rounds.
// Spent dice stay spent unless card/enchantment text changes them.
```

## Card Color System

Cards carry a primary color identity — **Red, Blue, Purple, or Gold** — that determines what mana they consume and signals their tactical role.

| Color | Mana | Progress bias | Notes |
|---|---|---|---|
| **Red** | Red | Commonly high in the first required meter (Type A); sometimes low in the second (Type B) | Force/physical archetypes |
| **Blue** | Blue | Commonly high in the second required meter (Type B); sometimes low in the first (Type A) | Escape/finesse archetypes |
| **Purple** | Purple | Mid-range in either meter; one Purple card may favor Type A, another may favor Type B | Situational, combo, X-interaction |
| **Gold** | Gold | Most powerful effects; can only be powered by Gold mana | Rare; enchantments, game-altering effects |

**Gold cards are the premium tier.** Gold appears once per 6 die faces (1/6 per die), making Gold mana genuinely scarce. Gold cards should feel like a payoff moment, not routine spending.

All four colors may include utility cards: draw, convert dice, reroll/refresh, exhaust, etc. Color identity is a signal, not a content restriction.

The "Type A / Type B" terminology refers to the two progress types on whichever Risk route the player has chosen. Red cards tend to serve one; Blue cards tend to serve the other. Purple cards sit between. The exact Stability/Escape/Supply/Force mapping depends on the specific hazard card.

> **Green and Yellow have been removed from the system.** Any card text or implementation referencing `spend 1 green`, `spend 1 yellow`, `create 1 yellow`, or `change 1 die to green` is outdated and must be remapped. See the Card Color Migration note at the end of the Action Cards section.

## Action Cards

Each round, the player draws **5 action cards** from their personal deck.

Each action card has:

- **Top action:** free to play.
- **Bottom action:** costs mana and is stronger, stranger, or more tactical.
- **Single-mana law:** no bottom action may require more than 1 mana to power up.

The action deck must include different tactical verbs. It must not be only direct progress.

### Action Card Verb Classes

1. **Direct progress**
   - Add typed progress toward clearing the hazard.
   - Example: `+3 Stability`, `+2 Force`, `+4 Supply`.

2. **Focus (buff)**
   - Add to any single progress value played this round.
   - Focus effects stack: each Focus card played before a progress card adds to its total.
   - Example: `Focus +3 — the next progress value produced this round gains +3`.

3. **Mana conversion**
   - Change one or more mana colors.
   - Example: `Change 1 mana to blue`.

4. **Mana creation**
   - Create new temporary mana.
   - Example: `Create 1 yellow`.

5. **Card draw / filtering**
   - Draw, discard, look ahead, replace, or play free top actions.
   - Example: `Draw 1 card, discard 1`.

6. **Risk / sacrifice**
   - Gain progress at a cost.
   - Example: `+5 Force; lose 1 VITAE if the round fails`.

7. **Failure mitigation**
   - Reduce or cancel consequences of failure.
   - Example: `If this round fails, ignore 1 damage`.

8. **Synergy / combo**
   - Reward previous plays, matching colors, tags, or board state.
   - Example: `+1 for each card already played this round`.

9. **X-die interaction**
   - Enable specific uses of otherwise-blocked X dice.
   - Without one of these cards, X dice cannot be spent or used.
   - Example top: `Reroll 1 X die.`
   - Example bottom: `Spend purple: reroll all X dice, then create 1 mana of your choice.`

10. **Persistent enchantments**
    - Effects that remain between rounds.
    - Example bottom: `Enchant. Between rounds, refresh 1 spent die of your choice.`

## Persistent Effects / Enchantments

Persistent cards are allowed and desirable.

They create a Mage Knight-like rhythm:

- Round 1: establish tools.
- Round 2: exploit or recover dice.
- Final round: cash in the board, spend the debt, or survive the punishment.

Potential persistent effects:

- Refresh one spent die between rounds.
- Preserve one die into the next round.
- Refresh one die of a specific color.
- Enable one X die per round to be treated as a chosen color.
- Reduce final-round difficulty.
- Add +1 to a specific progress type each round.

ENCHANT cards are removed from the draw deck when played and occupy a separate enchantment zone. They are not reshuffled into the discard.

## Outcome Scoring

Each round produces `O` or `X`.

Final score:

```text
score = count(O) - count(X)
```

Suggested 3-round reward ladder:

- `3 O / 0 X` → strong reward
- `2 O / 1 X` → normal reward
- `1 O / 2 X` → survive, minor/no reward, possible minor penalty
- `0 O / 3 X` → bad outcome, damage, or lost opportunity

For 4–5 round hazards, use the same principle but tune thresholds per hazard severity.

## Player Experience & Design Tensions

Round one is reconnaissance. The player looks at four dice and five cards and begins asking what kind of hand they were dealt. There is a feeling worth having here — not helplessness, not mastery, but *negotiation*. The dice say what is available. The cards say what might be done with that.

By round two, the mana economy shows its shape. An enchantment played in round one starts returning. A bad roll — three X and a red — becomes an interesting problem rather than a foregone conclusion. X-interaction cards are where clever play starts feeling like discovery rather than subtraction.

Round three is debt collection. Everything the player conserved or spent carelessly in the first two rounds comes to judgment.

The Safe/Risk route choice functions as the session's first commitment. The player who chooses the Risk route and fails has no one to blame but their own ambition.

**Where it breaks:**

**The dice run dry.** Without refresh cards, by round three there may be zero available mana. This is the intended pressure — but if the final round is simultaneously harder, the player can reach an unwinnable state through misfortune rather than mismanagement. Watch the top route carefully; top-route final rounds must be completable on top-action progress alone, with no mana. If any top-route final round requires mana to clear, its threshold is too high.

**Tag proliferation bleeds legibility.** More than four progress types in v0 turns rounds into bookkeeping. Four types only: Stability, Escape, Supply, Force. No more until the system proves readable.

**Homogeneous hands.** A player drawing four direct progress cards plays the same round every time: add numbers, check threshold. Enchantment and X-interaction cards break this flatness, but they must show up. Watch deck ratios. If flat rounds appear twice in a session, the direct progress share is too high.

**Risk route as tax, not temptation.** If the reward delta between Safe and Risk routes is not genuinely meaningful — not just larger numbers but things the player *wants* — the choice collapses into a difficulty toggle. Rewards on the Risk route must be worth the dual-meter pressure, or the design is lying to the player.

## Comparable Systems

**Mage Knight** is the explicit model. Siege puzzles, top/bottom card actions, mana dice, persistent effects built in early rounds to cash in late. The planning *before* the action is the game.

**Arkham Horror: The Card Game** for the chaos bag's relationship to bad outcomes. X dice should carry some of that character: not pure RNG inconvenience, but a sense that the world is antagonistic. X-interaction cards give the player a relationship with bad fate rather than a passive receipt of it.

**Gloomhaven** for exhaustion as a meaningful resource. Burning good cards early to build position vs. conserving for later. A player who spends mana carelessly in round one should feel it in round three.

**Spirit Island** for constraint-puzzle solving. A good hazard round should feel like assembling a precise combination under pressure — not "did I reach the number" but "did I find the line."

**Slay the Spire** for deck composition as identity. The deck-building dimension means that even within the hazard's three rounds, certain card combinations reward recognition. The player should occasionally feel that they *built something* — over both the hazard and the campaign — not just played cards.

## Card Deck & Rarity System

The action card pool is not a flat 30-card hazard deck. Cards are unlocked through hazard rewards and exploration. The player builds and refines their deck as the campaign progresses.

### Rarity Tiers

- **Common:** Bread-and-butter cards. Players start with multiple copies of these. Staples include draw cards, basic progress cards, and Focus buff cards.
- **Uncommon:** Stronger or more situational effects. Earned through hazard completion and exploration.
- **Rare:** Powerful, often game-altering effects. Enchantments and X-to-O converters sit here.

### Starter Deck

The starting deck is built primarily from Common cards, with multiple copies of:
- Draw / card filtering cards
- Basic single-type progress cards
- Focus buff cards

### Dev Mode

A dev menu must exist that allows adding any card directly to the active hand. This is required for efficient prototyping and tuning of individual cards before full deck-building balance is established.

### Card Lifecycle

- At hazard start: shuffle the player's personal deck.
- Each round: draw 5 cards from the deck.
- Played cards go to a shared hazard discard pile.
- If the deck empties mid-round, shuffle the discard and continue.
- ENCHANT cards are placed in the enchantment zone and do not return to the discard or deck.

## First Prototype Scope

Recommended v0 content set:

- 30 action cards across Common / Uncommon / Rare tiers (see section below)
- 15 hazard cards
- 3 rounds by default; 4–5 round variants for select hazards
- 4 mana dice
- 5-card hand per round
- Top/bottom hazard route, chosen after card draw and before dice roll
- Success / failure marks
- Final score / reward table
- Dev mode hand-injection for rapid card testing

## Design Decisions

The following questions were raised during v0 design and resolved.

**Q1 — Dice lifecycle.** *(Updated 2026-06-10.)*
Safe route rolls all four dice once, after route choice and before round 1. They persist as board objects for the Safe hazard path unless cards or enchantments explicitly refresh, preserve, reroll, or transform them.

Risk route does **not** re-cast dice between rounds. The dual "BOTH REQUIRED" meters are the risk premium; spent dice from a resolved Risk round still tax the shared hazard pool until a card/enchantment changes them.

**Q2 — Action card lifecycle.**
Players draw from their personal deck — the 30 cards represent the full content pool, not a flat per-hazard deck. Shuffle the personal deck at hazard start. Draw 5 each round. Played cards go to the hazard discard. If the deck empties, shuffle the discard and continue. ENCHANT cards occupy the enchantment zone and are not reshuffled. Draw and filtering effects are meaningful because the deck is finite and has history.

**Q3 — Progress types in v0.**
Four types only: **Stability, Escape, Supply, Force.** Focus is not a hazard progress type — it is a card buff mechanic that amplifies other progress cards. Dual-type requirements (e.g., 5 Stability + 4 Force in one round) are permitted on bottom routes and final rounds.

**Q4 — Risk route timing.**
The player chooses Safe or Risk route after drawing their opening hand but before the dice are rolled. They know their cards; they do not yet know their mana. This preserves the identity commitment of the choice while giving the player one layer of tactical information.

## Test Protocol

Prototype scope: all 30 action cards, 10 hazard cards (before adding the 5 longer hazards), 3-round default, 4 mana dice, 5-card hand.

**Session 1.** Play top route on all hazards. Measure: how often does a competent player clear all three rounds? Target 70–80% success. Higher — raise thresholds. Lower — reduce.

**Session 2.** Play bottom route on all hazards. Target 40–60% success. If the choice never creates tension, the reward delta is too small or the threshold is too low.

**Session 3.** Mix routes. Measure: does mana exhaustion produce a genuine crisis in round three? Does the final round feel different from rounds one and two, or are all rounds identical?

**Session 4.** Stress-test X dice. Force at least two X dice in the starting roll. Measure: do X-interaction cards change the calculus? Does exploiting X feel like cleverness or merely reduced misfortune?

Watch for flat rounds — a player who plays numbers without assembling solutions. If it happens twice in a session, the direct progress ratio is too high and the deck needs rebalancing.

---

## Action Cards (30)

Each card has a **top action** (free) and a **bottom action** (costs mana; stronger, stranger, or more tactical). Spending mana marks an available die as spent. Temporary dice expire at end of round unless a card says otherwise. ENCHANT cards are removed from the draw deck when played and occupy the enchantment zone until the hazard ends.

**Rarity key:** C = Common · U = Uncommon · R = Rare

---

### Direct Progress (6)

---

**1. Steady Hand**
Rarity: C | Class: Direct Progress | Type: Stability
*Top:* +3 Stability.
*Bottom (spend 1 any):* +3 Stability, +2 Force.

---

**2. Force Through**
Rarity: C | Class: Direct Progress | Type: Force
*Top:* +2 Force.
*Bottom (spend 1 red):* +5 Force.

---

**3. Iron Rations**
Rarity: C | Class: Direct Progress | Type: Supply
*Top:* +2 Supply.
*Bottom (spend 1 yellow):* +5 Supply.

---

**4. Scout the Way**
Rarity: C | Class: Direct Progress | Type: Escape
*Top:* +2 Escape.
*Bottom (spend 1 green):* +4 Escape; draw 1 card.

---

**5. Clear Mind**
Rarity: C | Class: Focus
*Top:* Focus +2 — the next progress value produced this round gains +2.
*Bottom (spend 1 blue):* Focus +5 — the next progress value produced this round gains +5.

---

**6. Gut It Through**
Rarity: U | Class: Direct Progress | Type: Any
*Top:* +1 to any progress type.
*Bottom (spend 1 red):* +5 to any progress type.

---

### Mana Conversion (3)

---

**7. Redirect**
Rarity: C | Class: Mana Conversion
*Top:* Change 1 available die to red.
*Bottom (spend 1 any):* Change up to 2 available dice to any colors (may differ).

---

**8. Reflow**
Rarity: U | Class: Mana Conversion
*Top:* Change 1 available die to blue.
*Bottom (spend 1 blue):* Change all dice of one color to any single other color.

---

**9. Temper**
Rarity: U | Class: Mana Conversion
*Top:* Change 1 available die to green.
*Bottom (spend 1 green):* Change 1 spent or exhausted die to any color; it cannot be spent this round.

---

### Mana Creation (3)

---

**10. Find the Vein**
Rarity: C | Class: Mana Creation
*Top:* Create 1 yellow die (temporary; expires end of round).
*Bottom (spend 1 yellow):* Create 2 yellow dice (temporary).

---

**11. Draw on Darkness**
Rarity: U | Class: Mana Creation
*Top:* Create 1 red die (temporary).
*Bottom (spend 1 purple):* Create 1 die of any color (not X); it persists into the next round as available.

---

**12. Well of Focus**
Rarity: U | Class: Mana Creation
*Top:* Create 1 blue die (temporary).
*Bottom (spend 1 blue):* Create 2 blue dice (temporary).

---

### Card Draw / Filtering (3)

---

**13. Eyes Forward**
Rarity: C | Class: Card Draw / Filtering
*Top:* Look at the top 3 cards of the action deck; keep 1 in hand, discard the rest.
*Bottom (spend 1 blue):* Draw 2 cards; discard 1 card from hand.

---

**14. Discard and Press**
Rarity: C | Class: Card Draw / Filtering
*Top:* Discard 1 card from hand; draw 1 card.
*Bottom (spend 1 any):* Discard up to 3 cards from hand; draw that many cards.

---

**15. Rapid Assessment**
Rarity: U | Class: Card Draw / Filtering
*Top:* Reveal the top card of the action deck; play its top action for free, then discard it.
*Bottom (spend 1 green):* Reveal the top 2 cards of the action deck; play one top action for free; discard both.

---

### Risk / Sacrifice (3)

---

**16. Desperate Surge**
Rarity: U | Class: Risk / Sacrifice | Type: Force
*Top:* +3 Force.
*Bottom (spend 1 red):* +7 Force; if this round fails, lose 1 VITAE.

---

**17. Abandon Caution**
Rarity: U | Class: Risk / Sacrifice | Type: Any
*Top:* +2 to any progress type.
*Bottom (spend 1 any):* +5 to any progress type; lose 1 VITAE if this round fails.

---

**18. Last Reserve**
Rarity: R | Class: Risk / Sacrifice | Type: Escape
*Top:* Discard 1 card from hand; +4 Escape.
*Bottom (no mana cost):* Discard 2 cards from hand; +9 Escape; if this round fails, mark 1 additional X.

---

### Failure Mitigation (3)

---

**19. Brace**
Rarity: C | Class: Failure Mitigation
*Top:* If this round fails, ignore 1 VITAE loss from the failure.
*Bottom (spend 1 yellow):* If this round fails, mark X but ignore all VITAE loss from this round.

---

**20. Retreat to Safety**
Rarity: U | Class: Failure Mitigation
*Top:* If this round fails, reduce any single failure penalty by 1 step.
*Bottom (spend 1 yellow):* At end of hazard scoring, convert 1 X mark to O. Discard this card after use.

---

**21. Hold the Line**
Rarity: R | Class: Failure Mitigation | Type: Stability
*Top:* +1 Stability.
*Bottom (spend 1 yellow):* If this round would resolve as X, resolve it as O instead; lose 1 VITAE.

---

### Synergy / Combo (3)

---

**22. Momentum**
Rarity: U | Class: Synergy / Combo | Type: Any
*Top:* +1 to any progress type.
*Bottom (spend 1 any):* +1 to any progress type per card already played this round (minimum +2).

---

**23. Pattern Lock**
Rarity: U | Class: Synergy / Combo | Type: Stability
*Top:* +2 Stability.
*Bottom (spend 1 blue):* +2 Stability per matched pair of available unspent dice sharing a color (minimum +2 Stability).

---

**24. Chain Work**
Rarity: U | Class: Synergy / Combo | Type: Any
*Top:* +2 to any progress type.
*Bottom (spend 1 any):* +2 to the same progress type as the last card played this round. If no card has been played yet, +3 to any type instead.

---

### X-Die Interaction (3)

---

**25. Scavenge Fate**
Rarity: U | Class: X-Die Interaction
*Top:* Reroll 1 X die.
*Bottom (spend 1 purple):* Reroll all X dice; for each that remains X after the reroll, create 1 purple die (temporary).

---

**26. Curse Work**
Rarity: U | Class: X-Die Interaction | Type: Force
*Top:* Treat 1 X die as purple for the rest of this round.
*Bottom (spend 1 purple):* Treat all X dice as purple for the rest of this round; +2 Force.

---

**27. Bitter Harvest**
Rarity: U | Class: X-Die Interaction | Type: Force
*Top:* Exhaust 1 X die; +3 Force.
*Bottom (spend 1 red):* Exhaust up to 2 X dice; +4 Force per exhausted die.

---

### Persistent Enchantments (3)

---

**28. The Watcher's Lamp**
Rarity: R | Class: Persistent Enchantment
*Top:* Draw 1 card.
*Bottom (spend 1 blue):* ENCHANT. Between rounds, refresh 1 spent die of your choice (it returns to available, color unchanged).

---

**29. Iron Discipline**
Rarity: R | Class: Persistent Enchantment | Type: Stability
*Top:* +1 Stability.
*Bottom (spend 1 yellow):* ENCHANT. Between rounds, preserve 1 available die of your choice (it carries into the next round still available, color and state unchanged).

---

**30. Marked Ground**
Rarity: R | Class: Persistent Enchantment
*Top:* +1 to any progress type.
*Bottom (spend 1 purple):* ENCHANT. Once per round, the first X die you would spend counts as any color of your choice instead. Remove this enchantment after the hazard ends.

---

### Card Color Migration Required

The 30 cards above were authored under the old 6-color system (Red, Green, Blue, Yellow, Purple, X). The pool must be remapped to the 4-color system (Red, Blue, Purple, Gold) before implementation. Green and Yellow no longer exist.

Cards whose mana costs or die-creation text must be remapped:

| Card | Old color reference | Migration decision required |
|---|---|---|
| #3 Iron Rations | `spend 1 yellow` | Remap to Gold or Purple |
| #4 Scout the Way | `spend 1 green` | Remap to Blue |
| #7 Redirect | `Change 1 die to red` (top stays; bottom `spend 1 any` stays) | No green/yellow present — no change |
| #8 Reflow | `Change 1 die to blue` stays; `spend 1 blue` stays | Update "any single other color" list to new 4 colors |
| #9 Temper | `Change 1 die to green`; `spend 1 green` | Remap both to Blue |
| #10 Find the Vein | `Create 1 yellow die`; `spend 1 yellow` | Remap to Gold |
| #11 Draw on Darkness | `Create 1 die of any color (not X)` | Update parenthetical to new color list |
| #15 Rapid Assessment | `spend 1 green` | Remap to Blue |
| #19 Brace | `spend 1 yellow` | Remap to Gold or Purple |
| #20 Retreat to Safety | `spend 1 yellow` | Remap to Gold or Purple |
| #21 Hold the Line | `spend 1 yellow` | Remap to Gold or Purple |
| #29 Iron Discipline | `spend 1 yellow` (Rare ENCHANT) | Remap to Gold |

Remapping decisions must be approved by T before they are applied to implementation files. Do not guess; flag the card and await direction.

---

## Hazard Cards (15)

**Route selection:** chosen after the player draws their opening hand, before dice are rolled.
**Final round:** listed separately per card; always harder.
**Progress types:** Stability, Escape, Supply, Force.
**Safe route (top):** single-meter requirement per round.
**Risk route (bottom):** dual "BOTH REQUIRED" meters; both progress type thresholds must be met in the same round to resolve O.
**Routes use different progress types.**

> **Migration note:** Several existing hazard cards (H01, H02, H04, H06, H07, H12) have single-type bottom routes. These must be updated to dual-meter Risk routes before the Risk route rule is fully enforced. Treat them as draft content requiring redesign; do not use them as reference for what a valid Risk route looks like.

---

**H01 — Cracked Cliff Path**
*The ledge fails underfoot. A shrine cache glints across the split.*
Rounds: 3

Top (Stability): Rounds 1–2: clear 6. Round 3: clear 8.
Reward: minor supplies, safe advance. Failure: no extra penalty.

Bottom (Escape): Rounds 1–2: clear 9. Round 3: clear 11.
Reward: shrine cache (rare item + 1 VITAE recovered). Failure any round: lose 1 VITAE.

---

**H02 — The Starving Road**
*Three days without resupply. The others watch your pack.*
Rounds: 4

Top (Supply): Rounds 1–3: clear 5. Round 4: clear 7.
Reward: +2 Supply tokens. Failure: no extra penalty.

Bottom (Escape): Rounds 1–3: clear 8. Round 4: clear 10.
Reward: +4 Supply tokens + 1 VITAE recovered. Failure any round: mark 1 additional X.

---

**H03 — River in Flood**
*The ford churns red-brown. Something turns in the current that is not a log.*
Rounds: 3

Top (Escape): Rounds 1–2: clear 6. Round 3: clear 8.
Reward: safe crossing. Failure: no extra penalty.

Bottom (Dual — Escape + Force): Rounds 1–2: clear 5 Escape + 5 Force. Round 3: clear 7 Escape + 7 Force.
Reward: salvage from the current + safe crossing. Final round failure: lose 1 VITAE.

---

**H04 — Fever Night**
*Something in the water or the air. By midnight you are burning.*
Rounds: 4

Top (Force): Rounds 1–3: clear 5. Round 4: clear 7.
Reward: retain full VITAE; minor reagent. Failure: no extra penalty.

Bottom (Supply): Rounds 1–3: clear 8. Round 4: clear 11.
Reward: 1 VITAE recovered + rare reagent. Failure any round: lose 1 VITAE.

---

**H05 — Ash Fields**
*The ash comes to the knee in places. Nothing marks the safe way from the buried way.*
Rounds: 3

Top (Stability): Rounds 1–2: clear 5. Round 3: clear 7.
Reward: advance; minor supply find. Failure: no extra penalty.

Bottom (Dual — Stability + Force): Rounds 1–2: clear 5 Stability + 4 Force. Round 3: clear 7 Stability + 5 Force.
Reward: map fragment + advance. Failure any round: mark 1 additional X.

---

**H06 — The Blocked Pass**
*Three armed men. They are not asking.*
Rounds: 3

Top (Escape): Rounds 1–2: clear 6. Round 3: clear 9.
Reward: pass without incident. Failure: no extra penalty.

Bottom (Force): Rounds 1–2: clear 10. Round 3: clear 13.
Reward: take their supplies + rare item. Failure any round: lose 1 VITAE.

---

**H07 — Crumbling Aqueduct**
*The structure is older than the war. It moves when the wind moves.*
Rounds: 3

Top (Stability): Rounds 1–2: clear 6. Round 3: clear 8.
Reward: safe crossing. Failure: no extra penalty.

Bottom (Player's Choice): After the opening hand is drawn and before dice roll, choose Stability or Escape for the entire hazard. Rounds 1–2: clear 9 of chosen type. Round 3: clear 12.
Reward: rare salvage from the structure. Final round failure: lose 1 VITAE.

---

**H08 — The Poisoned Spring**
*It tastes wrong but there is nothing else for three days.*
Rounds: 3

Top (Force): Rounds 1–2: clear 5. Round 3: clear 7.
Reward: partial resupply. Failure: no extra penalty.

Bottom (Dual — Force + Supply): Rounds 1–2: clear 5 Force + 4 Supply. Round 3: clear 7 Force + 6 Supply.
Reward: purify the source (⚑ persistent map benefit — next Supply hazard: all thresholds –2; *requires world-state tracking — future phase*) + partial resupply. Failure any round: lose 1 VITAE.

---

**H09 — Night Ambush**
*Four of them in the dark. They knew you were coming.*
Rounds: 4

Top (Escape): Rounds 1–3: clear 6. Round 4: clear 8.
Reward: escape without loss. Failure: no extra penalty.

Bottom (Dual — Escape + Force): Rounds 1–3: clear 5 Escape + 5 Force. Round 4: clear 7 Escape + 7 Force.
Reward: defeat ambushers; take their supplies + map clue. Failure any round: lose 1 VITAE.

---

**H10 — Structural Collapse**
*The ceiling lets go in sections. The way out is narrowing.*
Rounds: 3

Top (Escape): Rounds 1–2: clear 7. Round 3: clear 10.
Reward: escape. Failure: no extra penalty.

Bottom (Dual — Stability + Escape): Rounds 1–2: clear 5 Stability + 5 Escape. Round 3: clear 7 Stability + 7 Escape.
Reward: retrieve hidden cache before the structure falls + escape. Final round failure: lose 2 VITAE.

---

**H11 — Cold Crossing**
*The water is black under ice that does not look trustworthy.*
Rounds: 4

Top (Stability): Rounds 1–3: clear 5. Round 4: clear 7.
Reward: cross without hardship. Failure: no extra penalty.

Bottom (Dual — Stability + Supply): Rounds 1–3: clear 7 Stability + 4 Supply. Round 4: clear 10 Stability + 5 Supply.
Reward: +2 VITAE recovered + supply bonus. Failure any round: mark 1 additional X.

---

**H12 — The Riddled Bridge**
*The mechanism is old but someone was maintaining it. That someone is gone.*
Rounds: 3

Top (Stability): Rounds 1–2: clear 6. Round 3: clear 8.
Reward: cross safely. Failure: no extra penalty.

Bottom (Force): Rounds 1–2: clear 9. Round 3: clear 12.
Reward: leave bridge functional (⚑ persistent map benefit: future crossings auto-succeed Stability checks of 6 or less; *requires world-state tracking — future phase*) + rare tool. Final round failure: bridge collapses, lose 1 VITAE, route blocked (⚑ alternate path required on map; *requires world-state tracking — future phase*).

---

**H13 — Corpse Road**
*The dead line the old trade road. They have been here longer than the new maps.*
Rounds: 3

Top (Force): Rounds 1–2: clear 5. Round 3: clear 7.
Reward: pass without cost. Failure: no extra penalty.

Bottom (Dual — Force + Escape): Rounds 1–2: clear 5 Force + 4 Escape. Round 3: clear 7 Force + 6 Escape.
Reward: find valuables among the dead. Failure any round: mark 1 additional X. Final round failure: additionally lose 1 VITAE.

---

**H14 — The Buried Pass**
*The avalanche came through last winter. Something valuable was on the road before it did.*
Rounds: 5

Top (Dual — Stability + Supply): Rounds 1–4: clear 5 Stability + 3 Supply. Round 5: clear 7 Stability + 5 Supply.
Reward: pass; moderate reward cache. Failure any round: lose 1 Supply token.

Bottom (Dual — Stability + Force): Rounds 1–4: clear 7 Stability + 5 Force. Round 5: clear 10 Stability + 7 Force.
Reward: find what was buried (major item + 2 VITAE recovered). Failure any round: lose 1 Supply token. Final round failure: additionally lose 1 VITAE.

---

**H15 — The Dark Narrows**
*The passage is a hand's width wider than a man. Whatever was here before you found it comfortable.*
Rounds: 3

Top (Escape): Rounds 1–2: clear 7. Round 3: clear 10.
Reward: through. Failure: no extra penalty.

Bottom (Dual — Escape + Force): Rounds 1–2: clear 5 Escape + 6 Force. Round 3: clear 7 Escape + 9 Force.
Reward: clear the narrows permanently (⚑ persistent map benefit: hazard removed for future passes; *requires world-state tracking — future phase*) + rare salvage. Failure any round: lose 1 VITAE. Final round failure: additionally mark 1 additional X.

---

## Balance Notes for First Prototype

### Dice Economy

Starting roll of 4 dice: expected ~1.3 X dice (2-in-6 per die). Expected colored available dice: ~2.7.

With two X faces per die, X frequency is roughly double the old 6-color system (was ~0.7 expected X; now ~1.3). X-interaction cards and between-round dice recast effects are more important than ever. A starting roll with 2 X dice is now a realistic baseline expectation, not an edge case.

Without any refresh effects, and assuming 2 dice spent per round, the player enters round 3 with fewer than 1 available die on average. This is the intended cliff — but it means The Watcher's Lamp and Iron Discipline are not convenience cards; they are survival cards. If neither appears, the Safe route must remain completable on top-action progress alone (no mana required). Verify this in Session 1.

On the Risk route, the dual-meter requirement is the difficulty engine. Hazard card authors and card designers must account for persistent dice attrition: Risk routes should offer better rewards, but should not assume free between-round dice refresh.

### Threshold Calibration

5-card hand baseline (top actions only, no mana spending):

- Expected ~2 direct progress cards drawn per round: avg +2–3 each = +4–6 raw progress
- Focus buff cards stacking on a progress card: +2–3 additional
- Other incidental contributions: +0–1
- Reliable floor without mana: ~5–7 progress per round

With 1 mana-enabled bottom action: +5 additional = ~10–12 per round
With 2 bottom actions: ~14–16 per round (requires 2 available dice)

This validates the threshold targets:
- Top routes at 5–7 per round: clearable on top actions alone — correct
- Bottom routes at 8–11 per round: require at least 1 mana-enabled bottom action — correct
- Final round +2 to +3: requires at least 1 available die entering the final round — this is the design

### X-Die Interaction Rate

Three X-interaction cards in 30: ~43% probability of at least one appearing in a 5-card draw. With the new die distribution (2 X faces, expected 1.3 X dice per opening roll), a hand without an X-interaction card against 2 or more X dice is now a common failure mode, not an edge case. The rate of 43% is borderline; watch this closely in Session 4.

Against 2+ X dice showing, this rate may feel too low to deliver the recovery fantasy. Two options:

**(a)** Increase X-interaction cards from 3 to 5 (cut 2 direct progress cards from 6 to 4).

**(b)** Add a hazard rule: *If 2 or more dice show X at the start of a round, the player may look at the top 2 cards of the action deck and add 1 to their hand before drawing their 5.*

Option (b) is cleaner in v0 — it targets the specific failure condition without changing deck ratios.

### Synergy / Combo Floor

Pattern Lock (card 23) has a minimum of +2 Stability — adequate floor. Without it, the card would be unplayable in ~30% of board states.

Momentum: floor of +2 on bottom — adequate.
Chain Work: +3 when played first — adequate.

### Persistent Map Benefits — Future Phase

H08, H12, and H15 include persistent map benefits that modify future hazards or block map routes. These require world-state tracking that does not exist yet. They are marked with ⚑ in the hazard descriptions. Until the world-state system ships, these rewards should either be skipped or replaced with equivalent one-time item/VITAE grants.

See `plan/PHASE_CANDIDATES.md` — a high-priority candidate for hazard world-state tracking has been filed.

### First Prototype Session Sequence

Session 1 and 2 (top and bottom route baselines):
H01, H02, H04, H05, H06, H07, H10, H12, H13, H15 — covers solo-type and dual-type requirements, 3-round and 4-round structures, VITAE consequences, and persistent map benefits.

Session 3 (stress test):
Add H03, H09, H11, H14 — 4-round and 5-round structures, compounding dual-type requirements.

Do not prototype all 15 at once. Tune the first ten before the longer hazards prove whether the mana economy holds over five rounds.
