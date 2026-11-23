# 188 — Every card ranked by its text; rewards weigh rarity

> Each card's rank comes from what its text says, by the complexity budget's own counts, so rarity means something. A normal fight's reward offers lean common; an elite's offers are rare.

## Why

### Sources

- **T, 2026-11-22 (attended, `/oversight` then `/plot`):** "cards just haven't been categorized by rarity yet", then "plot the card rarity ranking". Of 123 cards, 122 sit at rank 1 (Ash); one is rank 5. The complexity fence pins 64 Ash cards over the Ash band.
- **T's ballot, 2026-10-13 (`docs/card-spec.md` §3, §9):**
  - "Rank follows complexity: Ash/Tooth simple, Splinter/Rib conditional, Skull/Saint payoffs."
  - "Weight the reward roll: rarer ranks appear less often, nothing else."
  - The atlas bands are the lint's rule: Ash/Tooth 1 keyword and 0 conditions; Splinter/Rib 2 keywords and 1 condition; Skull/Saint unbudgeted.
- **T's answers, 2026-11-22:**
  - The rank within a pair goes by count.
  - Normal rewards draw common 60%, uncommon 30%, rare 10%.
  - Elites offer all three options as rare.
  - Upgrade limits and the sim's maturity gate stay as they are.

### What exists today

- `axiomancer-mechanics/src/Cards/types.ts`: `CardRank` 1-6 (Ash, Tooth, Splinter, Rib, Skull, Saint). `rankToRarity` maps 1-2 to common, 3-4 to uncommon, 5-6 to rare.
- `axiomancer-mechanics/src/Cards/card-rules.ts`:
  - `COMPLEXITY_BUDGET` and `checkComplexityBudget` count a card's keywords (atlas Card keywords, DEAL and GUARD free) and its conditions (`cardConditions`).
  - `card-rules.exemptions.json` pins today's 64 over-budget cards.
- Each library file (`Cards/library/*.cards.ts`) sets `rank` through its card factory, almost all 1.
- Rank already changes play in three places:
  - `rollEliteCardRewards` and `rollEliteUpgrade` (`Combat/combat.rewards.ts`) draw the best rarity band first.
  - `UPGRADE_LIMITS` (`Cards/card-upgrades.ts`): common 1, uncommon 2, rare 3.
  - `rankMaturityLevel` (`Combat/combat.stage-profiles.ts`) gates sim decks.
- `rollCombatCardRewards` (normal fights) ignores rarity. The card face prints the rank name.

### The small version first

The counts the budget lint already makes decide each rank, so no new judgement is authored per card. One chunk ranks the library and proves every rank matches its text. One chunk weighs the reward rolls.

## Design

### The rank rule (A1, A2)

- **`rankForCard(card, cardKeywords)`**, pure, in `card-rules.ts`, from the same counts `checkComplexityBudget` uses (k = keywords beyond DEAL and GUARD, c = conditions):
  - k = 0 and c = 0 → 1 Ash
  - k = 1 and c = 0 → 2 Tooth
  - k ≤ 2 and c ≤ 1, and k = 2 or c = 1 but not both → 3 Splinter
  - k = 2 and c = 1 → 4 Rib
  - beyond the Rib band → 5 Skull
  - 6 Saint is never derived: it is kept for a card T names by hand [T to confirm #1].
- The count reads the card's printed FREE and PAID lines, its Global trigger and its line requirements, as the lint does. Upgraded copies (`+`) keep their base card's rank.
- **The library.** Every non-Curse card in `Cards/library/*.cards.ts` takes its derived rank. Curses keep rank 1. The one rank-5 card keeps 5 if the rule gives 5, otherwise it gets a hand-pin with its reason.
- **The fence.** A test fails when a library card's `rank` differs from `rankForCard` (a hand-pinned exception list for Saint and any T override, empty to start). Every card now sits in its own band, so the complexity-budget pins in `card-rules.exemptions.json` go.
- Card faces, the deck screen and the rarity presenter show the new rank names with no code change (they read `rank`).

### The reward rolls (A3, A4)

- **Normal fights.** `rollCombatCardRewards` draws each offer's rarity first, by `CARD_REWARD_RARITY_WEIGHTS` (common 60, uncommon 30, rare 10), then a card of that rarity from the same pool it draws from today. That covers the lane slots and the rest of the pool.
  - An empty band falls to the next band down, then up. Offers stay distinct, and the dev override pool is unchanged.
- **Elites.** `rollEliteCardRewards` offers rare cards only. While fewer than three rares are available, the best band left fills the rest, as today.
  - `rollEliteUpgrade` is unchanged.
- **Measure, not grade (D57).** The PR reruns the measured report (`docs/reports/measured/latest.md`) and quotes the shifts. Rank changes upgrade limits and the elite draw. No number is a target.

### Decisions (proposed, T approves by merging)

- **D?rank-from-text** · 2026-11-22 · A card's rank is derived from its printed text by the complexity budget's counts (Ash none, Tooth one keyword, Splinter two keywords or one condition, Rib both, Skull beyond); Saint is hand-named. A test keeps library ranks equal to the rule. *Why:* T's ballot (2026-10-13) "rank follows complexity", applied 2026-11-22.
- **D?reward-rarity-weights** · 2026-11-22 · Normal card rewards draw rarity 60/30/10 (common/uncommon/rare); elite card rewards offer rares only, filling from the best band left. *Why:* T, 2026-11-22.

### Out of scope

- Rewording any card to fit a band; rank follows the text as it is.
- Upgrade limits and the sim maturity gate (kept, T 2026-11-22).
- Curse ranks.

## Acceptance

- **A1** `rankForCard` returns the band rank for each count combination above; unit tests cover every row and the upgraded-copy rule.
- **A2** Every non-Curse library card's `rank` equals `rankForCard` (or sits on the hand-pin list with a reason); the test fails on a mismatch. The complexity-budget pins are gone from `card-rules.exemptions.json`. The PR lists how many cards land at each rank, per lane.
- **A3** Over 10,000 seeded normal reward rolls, offers split about 60/30/10 across common/uncommon/rare where every band has cards. An empty band falls through. A test pins the weights and the fallback.
- **A4** An elite reward offers only rare cards when three or more are available, and fills from the best band left otherwise; tests cover both. The PR quotes the measured report's shifts.

## Open questions

- [T to confirm #1] Saint (rank 6): kept for cards you name by hand (default), or derived for the very top (e.g. 3+ keywords and 2+ conditions).

## Chunks

Measure: 4 open · 0 closed · next A5
- [ ] **188.1** Ranks derived from card text, applied to the library · M · closes A1, A2 · needs — · alias: RK1a
  - Mechanics: `rankForCard` in `card-rules.ts` with unit tests red first; every library file's ranks set from it; the rank-matches-text test in `Cards/e2e/card-rules.engine.test.ts`; the complexity-budget pins removed from `card-rules.exemptions.json`.
  - A content path (card library): T merges the PR by hand.
  - Check siblings: card face and deck screen snapshots, `docs/game-model.md`'s rank line, the Atlas snapshot, sims that read rank (`combat.stage-profiles.ts`).
  - Measure: `npm run verify -w axiomancer-mechanics`, mobile jest, the root `npm test`; the per-lane rank counts in the PR.
- [ ] **188.2** Reward rolls weigh rarity; elites offer rares · S · closes A3, A4 · needs 188.1 · alias: RK1b
  - Mechanics: `CARD_REWARD_RARITY_WEIGHTS` and the rarity-first draw in `rollCombatCardRewards`; `rollEliteCardRewards` rare-only with fallback; tests.
  - Measure: `npm run verify -w axiomancer-mechanics` and the root `npm test`; the measured report rerun, shifts quoted in the PR.
