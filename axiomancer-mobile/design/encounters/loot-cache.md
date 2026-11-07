# Loot Cache Encounter ("The Reliquary") — Mobile UX Source of Truth

> Derived from `app/cache/index.tsx`, `state/presenters/cache.engine.ts`,
> `state/presenters/cache.copy.ts`, and `state/cache/store-actions.ts` as of
> 2026-08-26 (Phase 63 — retired the Pick Pool dice-pool redesign).
>
> Mechanics rules (engine, session machine) live in the mechanics repo:
> - `docs/encounters/loot-cache.md` — rules source of truth
> - `axiomancer-mechanics/src/World/LootCacheChoice/` — the engine

---

## Screen entry

**Route:** `app/cache/index.tsx`
**Gate:** `CacheGate` in the root layout watches `vm.active`
(`selectHasActiveCache`). Navigation fires when a Loot Cache session is created;
the screen auto-exits when the session clears.

No swipe-back gesture (`gestureEnabled: false`) — same back-out-proof
contract as `/rest`, since the map node consumes on entry, before any
choice is made.

---

## Session phases

The presenter (`selectCacheVM`) maps the engine's 3-phase machine straight
onto the screen — no sub-flows, no picker sheets:

| Engine phase | Screen state |
|---|---|
| `offer` | The title, the cache's flavour line, and two offer buttons: TAKE A CARD / TAKE THE GOODS |
| `outcome` | Outcome panel with the settled grant (none for sacrifice) + a claim button |
| `done` | *(auto-exit)* |

---

## Offer buttons

Shown at the `offer` phase. Both are always enabled — nothing here can
be unaffordable or capped, unlike `RestChoice`'s `cut`. Tapping one commits
straight to `outcome` (the card/item candidates were already rolled when the
session opened).

Each button carries an **action line**: what you do on the adventure to earn
that side, never what you get. The line is the cache node's own data
(`LootCachePayload.actions`), not copy, and it reaches the screen through the
session. A cache whose lines T has not written yet shows `[content]` on both.
Nothing on this screen names a reward: no card face, no goods chips, no
eyebrow and no "node is spent" line.

| Offer | testID | Action line testID | Label |
|---|---|---|---|
| `card` | `cache-choice-offer-card` | `cache-choice-action-card` | TAKE A CARD |
| `item` | `cache-choice-offer-item` | `cache-choice-action-item` | TAKE THE GOODS |

The labels live in `state/presenters/cache.copy.ts`
(`CACHE_CHOICE_OFFER_LABEL`); the action lines live with the node, in
`axiomancer-mechanics/src/World/MapEvents/content.ts`.

---

## Outcome panel

Shown at `outcome` phase (`testID="cache-outcome"`). Renders
`CacheChoiceOutcomeVM`:

- `label` — the chosen offer's display name
- `cardName` — set iff `card` was chosen; rendered as a `+ CARD NAME` chip
- `itemNames` / `currency` — set iff `item` was chosen; one `+ ITEM NAME`
  chip per item, plus a `+N SHILLINGS` chip if currency > 0

CTA (`cache-claim`) → `claimLootCacheChoiceOutcome()`.

---

## Presenter — CacheChoiceVM

Entry: `selectCacheVM({ cache })` in
`state/presenters/cache.engine.ts`.

```typescript
CacheChoiceOfferVM {
  id                           // 'card' | 'item'
  label                        // TAKE A CARD / TAKE THE GOODS
  action                       // the node's action line, or '[content]'
}

CacheChoiceOutcomeVM {
  chosen                        // LootCacheChoiceOfferId
  label
  cardName                      // string | null — set iff chosen === 'card'
  itemNames                     // readonly string[] — non-empty iff chosen === 'item'
  currency                      // >0 iff chosen === 'item'
}

CacheChoiceVM {
  active, phase
  offers                        // readonly CacheChoiceOfferVM[] — always both
  outcome                       // CacheChoiceOutcomeVM | null
  description                   // the authored MapEvent one-liner, or null
}
```

---

## Store actions

`state/cache/store-actions.ts`:

```
beginLootCacheChoiceAction(currency?, description?, actions?, tier?, seed?)  ← called by resolveCurrentMapEvent; rolls both candidates, seeds session
chooseLootCacheChoiceOfferAction(offer)                            ← offer -> outcome
claimLootCacheChoiceOutcomeAction()                                ← apply the grant (if any), clear session, persist
```

**State restoration:** the engine's `resolveMapEvent` applies the authored
item/currency grant to `result.state` as a decoy (same shape `resolveRest`'s
passive heal has). Mobile reverts this pre-event player state and re-applies
only what the chosen offer authorizes at claim.

**Card/item candidates are rolled once, at `beginLootCacheChoiceAction`
time** — not re-rolled per offer tap. The `card` candidate rolls via
`Math.random` (same as the post-combat card-reward draft); the `item`
candidates roll via `rollCacheReward` seeded off the resolved cache seed
(`resolveMinigameSeed('cache', ...)`, `__AXM_CACHE_SEED__` dev override) —
so hermetic tests can still pin the item roll, even though the card roll is
not part of the seed-replay contract.

---

## Removed concepts (Phase 63 — Pick Pool retired)

The following no longer exist anywhere in mobile cache code — if you see a
reference to one, it's stale:

- The entire dice-pool session: `intro` / `delving` / `picking` / `card`
  phases, `CacheLayerVM`, `CachePickVM`, `CacheCardVM`, layer stack,
  dice tray (`components/cache/CacheDie.tsx`), progress meter
  (`CacheProgressMeter.tsx`).
- The guided first-delve tutorial: `CACHE_TUTORIAL_FLAG`,
  `CACHE_TUTORIAL_SEED/TIER/CURRENCY`, `CacheTutorialCoach`,
  `tutorial-steps.ts`, the DEBUG · TUTORIAL button. Three labeled offer
  buttons need no coach.
- Opaque item refs (`CacheItemRef`, the `stash` lookup table on
  `MobileCacheSlice`) — the new engine deals in real `Item`s directly.
- `LootCacheOutcomeTier` (`emptied` / `prudent` / `stung`) and
  `CACHE_TIER_LABELS` — there is no tiered outcome anymore, only which
  offer was chosen.

---

## ADR references

- **ADR-0001** — engine truth boundary: mobile presenter is mapping only; never recomputes rules.
- **ADR-0003** — mobile does not invent mechanics; file issue if the engine is missing something.
- **ADR-0008** (mechanics repo) — now HISTORICAL; documents the retired Pick Pool design this phase replaced.
