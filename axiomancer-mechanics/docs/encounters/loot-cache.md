# Loot Cache Encounter ("The Reliquary") — Mechanics Source of Truth

> Derived from `src/World/LootCacheChoice/` as of 2026-08-26.
> Phase 63 — Live. Replaces the Phase 137 "Pick Pool" live dice-pool
> lockpicking minigame (see `docs/adr/ADR-0008-loot-cache-pick-pool.md`,
> now HISTORICAL, for the retired design). T's ruling, 2026-08-15: *"Card
> reward, item reward, or sacrifice reward."*

---

## What it is

A one-shot, irreversible choice triggered by Cache map nodes — no dice, no
risk, no way for the cache to hurt the player. The player picks exactly one
of three offers:

- **Card** — one reward card, granted straight to the deck (same pool /
  rarity weighting as a post-combat card reward).
- **Item** — a tier-scaled consumable haul (`rollCacheReward`, unchanged
  from the retired engine) plus the node's authored currency, and at
  `EQUIPMENT_DROP_TUNING.cache` one lane weapon or armor the player does not carry.
- **Sacrifice** — nothing to the player; the choice is simply consumed.
  (It used to tick a per-map goodwill tally, `GameState.mapGoodwill`, spent
  on village rewards; the goodwill system was purged in THE REVAMP R3b and
  save v29 drops the tally.)

## Core loop

1. Cache node triggers. `resolveLootCache` grants the authored payload's
   items/currency directly onto `state.player` — a decoy, immediately
   undone by the mobile host (same shape `resolveRest`'s passive heal has).
2. The host rolls the `card` candidate (`rollCombatCardRewards(player, rng,
   1)[0]`) and the `item` candidates (`rollCacheReward(...)`, tier derived
   from the current map) and opens a `LootCacheChoiceSession` in the
   `offer` phase.
3. The player commits ONE offer — `chooseLootCacheChoiceOffer` seals the
   outcome straight to the `outcome` phase. No sub-picks: the card/item
   candidates were already rolled in step 2.
4. `claimLootCacheChoiceOutcome` → `done`. The host applies the ledger:
   `card` appends the rolled card id to the deck; `item` appends the
   rolled items + currency to the inventory; `sacrifice` grants nothing.

## Engine contract

`src/World/LootCacheChoice/` never reads `GameState` — the host
(`axiomancer-mobile/state/cache/store-actions.ts`) is responsible for
rolling both candidates before creating the session and for applying the
sealed outcome at claim. See `lootcachechoice.types.ts` for the full
session/outcome shape.

## What's NOT here anymore

The dice-pool "Pick Pool" mechanic — layers, jams, Insight charges, trap
bites — is retired entirely along with `World/LootCache/`, its CLI driver
(`npm run loot-cache`), and the `loot-cache-tuning` skill/workflow. The
cache can no longer bite VITAE or spoil loot; every visit ends in a grant
(card or item) or nothing at all (sacrifice).
