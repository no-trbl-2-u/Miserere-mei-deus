# Hazard Minigame — Product Requirements Document

> Companion to [`docs/hazard-minigame.md`](./hazard-minigame.md) (CDR-0006 doctrine).
> The doctrine file owns rules, cards, and tuning targets. This file owns the *what* and *why* from a product perspective.

---

## Overview

The Hazard Minigame is a tactical card-and-dice puzzle triggered when the player traverses a hazard node on the world map. It replaces the current passive damage/effect `ResolvedEvent.kind === 'hazard'` surface with a playable multi-round crisis that rewards preparation, clever card play, and risk calibration.

It is closer in feel to a **Mage Knight siege puzzle** than to a stat-check or dice roll. The player reads a dangerous situation, rolls imperfect mana, draws a hand of action cards, and assembles a solution under pressure.

---

## Problem Statement

Currently, hazard events in Axiomancer are passive damage popups. The player has no tactical agency — they either survive or they don't based on stats. This violates the core design doctrine that the player should solve problems through skill, preparation, and resource management, not through stat accumulation.

---

## Users

**Primary:** Players navigating the world map who encounter hazard nodes.

**Secondary:** Designers authoring hazard and action card content.

**Tertiary:** Developers testing card and dice interactions during prototyping.

---

## User Stories

### Player-facing

1. **As a player,** I want to see what crisis I'm facing before committing to how I'll approach it, so I can make a meaningful route choice.

2. **As a player,** I want my opening hand of cards to influence my route choice, so that draw-based variance creates real decisions rather than luck.

3. **As a player,** I want mana dice to feel like resources I manage over multiple rounds, not random numbers I roll fresh each turn.

4. **As a player,** I want X dice to create interesting problems I can solve with the right cards, not just dead mana I'm stuck with.

5. **As a player,** I want to feel like I "built something" within a hazard — setting up tools in round 1 to cash them in at round 3.

6. **As a player,** I want the risk route to genuinely tempt me with a meaningful reward — not just be a harder dual-meter version of the safe route — so the choice has real stakes.

7. **As a player,** I want to feel that a bad outcome was due to my choices or bad luck I could account for — not an unfair random state I couldn't recover from.

### Designer-facing

8. **As a designer,** I want to author hazard cards with different progress type requirements per route, so top and bottom routes feel like distinct tactical challenges.

9. **As a designer,** I want to author action cards with top/bottom actions, rarity tiers, and verb class metadata, so they can be balanced and tuned independently.

10. **As a designer,** I want access to a dev mode hand-injection tool so I can test specific card combinations without grinding to unlock them.

11. **As a designer,** I want cards to carry a color identity (Red, Blue, Purple, Gold) so their mana cost, tactical role, and progress-type bias are legible at a glance.

---

## Functional Requirements

### FR-01 — Hazard Reveal
- The system reveals a hazard card when the player enters a hazard node.
- The hazard card displays: scenario text, top route (progress type + threshold per round), bottom route (progress type + threshold per round), rounds count, and final round modifier.

### FR-02 — Card Draw
- Before route selection, the player draws 5 action cards from their personal deck.
- The player sees their full opening hand before committing to a route.

### FR-03 — Route Selection
- After card draw and before dice roll, the player selects **safe route (top)** or **risk route (bottom)**.
- The choice is binding for the entire hazard.
- Safe route uses a single progress meter per round.
- Risk route uses dual meters ("BOTH REQUIRED"): both progress type thresholds must be met in the same round to score O.
- Exception: H07 (Crumbling Aqueduct) allows progress type selection at reveal; this is a card-specific mechanic, not a general rule.

### FR-04 — Mana Dice Roll
- After route selection, 4 mana dice are rolled.
- Results: Red, Blue, Purple, Gold, or X. Each die has two X faces (2/6 ≈ 33% per die). There is no Green or Yellow.
- Dice are persistent board objects for the hazard path on both Safe and Risk; Risk does not auto-recast between rounds.
- Safe route: spent dice do not automatically refresh or reroll between rounds; exhausted dice reset to available.
- Risk route: no automatic re-cast/reroll between rounds; the dual "BOTH REQUIRED" meters are the compensation-worthy difficulty, and spent dice persist unless card/enchantment text changes them.
- Card and enchantment effects may refresh, reroll, preserve, or transform dice; these effects are explicit exceptions to the no-auto-refresh baseline.

### FR-05 — Round Play
- Each round the player may play any number of cards from hand.
- **Top actions** are free.
- **Bottom actions** require spending mana: marking one available die as spent per mana cost.
- Cards resolve in play order.
- Focus buff cards add to the next progress value produced in the same round.

### FR-06 — Round Resolution
- At end of each round, compare total progress accumulated against the round's threshold.
- Meeting or exceeding the threshold → mark `O`.
- **Risk route dual-meter rounds:** both progress type thresholds must be met. Meeting only one is a round failure.
- Failing to meet the threshold → mark `X`. Apply any per-round failure penalties listed on the hazard card.
- Draw 5 new cards at the start of the next round.

### FR-07 — Final Round
- The final round uses an elevated threshold (as specified per hazard card).
- Final round failure may carry additional penalties beyond earlier rounds.

### FR-08 — Scoring
- After all rounds, compute `score = count(O) - count(X)`.
- Map score to the hazard card's reward/penalty table.
- Apply outcomes to game state (VITAE, items, Supply tokens).

### FR-09 — Card Deck System
- Each player has a personal action card deck.
- The deck starts with Common staples (draw cards, basic progress cards, Focus buff cards) at multiple copies.
- Cards are unlocked through hazard rewards and exploration.
- At hazard start: shuffle the personal deck.
- Each round: draw 5 from the deck. Played cards go to the hazard discard pile.
- If the deck empties mid-round, shuffle the discard and continue drawing.
- ENCHANT cards occupy an enchantment zone and are not reshuffled.

### FR-10 — X Die Behavior
- X dice are blocked mana by default — they cannot be spent or used.
- Cards in the X-die interaction class specifically enable interaction with X dice (reroll, treat as a color, exhaust for progress).
- No interaction with X dice is possible without such a card.

### FR-11 — Persistent Enchantments
- ENCHANT cards, when played via bottom action, move to an enchantment zone.
- They remain active between rounds until the hazard ends or the card says otherwise.
- They are not reshuffled into the deck.

### FR-12 — Persistent Map Benefits (⚑ future phase)
- H08, H12, and H15 specify persistent map benefits that modify future hazards or block/clear map routes.
- These require world-state tracking not yet implemented (see `plan/PHASE_CANDIDATES.md`).
- Until the world-state system ships, these outcomes are replaced with equivalent one-time VITAE/item grants.

### FR-13 — Dev Mode
- A dev menu must allow adding any action card directly to the active hand.
- This bypasses the normal deck draw and does not affect the deck state.
- Dev mode is only available outside production builds.

---

## Non-Functional Requirements

### NFR-01 — Legibility
All round outcomes must be visually clear. `O` and `X` marks must be distinct at a glance. Progress accumulation must be visible to the player as they play cards.

### NFR-02 — Testability
The hazard engine must be exercisable via hermetic e2e tests with stubbed RNG (following the existing `mockFixedRng` / `mockSequentialRng` patterns). Every card effect and round resolution path must be coverable without manual intervention.

### NFR-03 — Deck Integrity
The card deck must maintain consistent state across rounds. No card should appear in the draw pile and the discard pile simultaneously. ENCHANT cards must not reappear in the draw pool.

### NFR-04 — Performance
Round resolution must be synchronous and complete within one animation frame on target mobile hardware. No async card resolution paths.

---

## Success Metrics

| Metric | Target |
|---|---|
| Top route clear rate (sessions 1–2) | 70–80% |
| Bottom route clear rate (sessions 1–2) | 40–60% |
| Final round mana crisis rate | > 50% of runs enter round 3 with ≤ 1 available die |
| Flat round rate (player plays numbers only, no assembly) | < 2 per session |
| X-die interaction card appearance rate against 2+ X dice | > 40% |

---

## Out of Scope (v0)

- Persistent map benefit implementation (world-state tracking — future phase)
- Deck acquisition UI (where/how players unlock cards)
- Card crafting, trading, or duplication
- Multiplayer or shared deck mechanics
- Hazard card procedural generation
- Mid-hazard difficulty scaling based on alignment or faction state
