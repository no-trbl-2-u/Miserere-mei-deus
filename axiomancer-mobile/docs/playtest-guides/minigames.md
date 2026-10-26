# Minigames — `rest`, `gathering`, `loot-cache`, `blacksmith`

## 1. What these screens are for

Each kind starts its own session slice in `state/actions.ts` (`resolveCurrentMapEventAction`) and a gate pushes the route: `rest` → `beginRestAction` → `<RestGate>` → `/rest` (night-watch choice, `app/rest/index.tsx`); `loot-cache` → `beginLootCacheChoiceAction` (tier `rich` on northern-forest, else `modest`) → `<CacheGate>` → `/cache`; `blacksmith` → `beginBlacksmithAction` → `<BlacksmithGate>` → `/blacksmith` (hone/temper/swap dice faces on a budget). `gathering` is not a minigame any more (Phase 76): it is a paced event whose acknowledgement card is the generic `/event` shell (`state/presenters/event.engine.ts` `composeGathering`, 2026-09-21) and it saves on resolve.

## 2. Enter it directly

- Rest: `/exploration?fixture=apprentice-bw-rest` (`arrive` → `/rest`); `broke-l1-bw-rest` (0 shillings, 1 vitae, on bw-9, no `arrive` — the empty-wallet case). `/dev`: `debug-rest-button` (camp), `debug-rest-inn-button`, `debug-trigger-encounter-rest`. Seed: `__AXM_MINIGAME_SEEDS__.rest.seed` / `__AXM_REST_SEED__` (default 515151).
- Loot cache: `/exploration?fixture=apprentice-bw-cache` (`arrive` → `/cache`). `/dev`: `debug-cache-button` (modest), `debug-cache-rich-button`, `debug-trigger-encounter-treasure`. Seed: `__AXM_MINIGAME_SEEDS__.cache.seed` / `__AXM_CACHE_SEED__` (default 626262).
- Blacksmith: `/exploration?fixture=wanderer-bw-blacksmith` (`arrive` → `/blacksmith`, 180 shillings — the real-wallet case). `/dev`: `debug-anvil-budget-button` (the same witness variant on a fixed ×500 budget; `debug-blacksmith-button` was cut on 2026-10-16 as its strict subset). Seed: `__AXM_MINIGAME_SEEDS__.blacksmith.seed` / `__AXM_BLACKSMITH_SEED__`.
- Gathering: `/dev` → `debug-trigger-encounter-gather` (lands on `/event`). No registry fixture stands on a gather node.

## 3. Test IDs

| testID | what it is |
|---|---|
| `rest-inactive` | `/rest` with no session (pops back) |
| `rest-purse` | Shillings |
| `rest-choice-offers` / `rest-choice-intro` / `rest-choice-intro-one-way` | Offer list and intro copy |
| `rest-choice-offer-<id>` / `rest-choice-offer-<id>-reason` | One offer; disabled ones state why (e.g. deck at floor of 12) |
| `rest-cut-sheet` / `rest-cut-price` / `rest-cut-card-<key>` | THE CUT: pick a card to remove |
| `rest-outcome` / `rest-claim` | Outcome card; CLAIM returns to the map |
| `cache-inactive` | `/cache` with no session |
| `cache-choice-offers` / `cache-choice-intro` / `cache-choice-intro-one-way` | Offer list |
| `cache-choice-offer-<id>` | One offer |
| `cache-outcome` / `cache-claim` | Outcome; CLAIM |
| `blacksmith-inactive` | `/blacksmith` with no session |
| `blacksmith-scroll` | The scroll view |
| `blacksmith-intro` / `blacksmith-intro-body` / `blacksmith-begin` | Intro; BEGIN starts forging |
| `blacksmith-forging` / `blacksmith-budget` / `blacksmith-face-key` | Forging phase, remaining budget, face legend |
| `blacksmith-die-<color>` / `blacksmith-die-<color>-faces` | One die and its faces |
| `blacksmith-offer-<id>` / `blacksmith-offer-<id>-effect` / `blacksmith-offer-<id>-reason` | Hone/temper/swap offers (disabled ones carry a reason) |
| `blacksmith-swap-<id>` | Swap offer block |
| `blacksmith-leave` | Stop forging → outcome |
| `blacksmith-card` / `blacksmith-continue` | A card interlude; CONTINUE |
| `blacksmith-outcome` / `blacksmith-claim` | Outcome; CLAIM |
| `blacksmith-abandon` | Walk away without forging |
| `event-choice-<id>` / `event-skip` / `event-choice-back` / `event-empty` / `event-consequence-chips` | The `/event` shell used by gathering |

## 4. A correct play, step by step

- Rest: on `rest-choice-offers` tap an enabled `rest-choice-offer-<id>` (if you chose THE CUT, pick a `rest-cut-card-<key>`); `rest-outcome` → `rest-claim`. A new game hands over no relic, so no `/item-reward` stacks on the start rest; a relic reward elsewhere still opens `/item-reward` over the map — `item-reward-equip` or `item-reward-confirm` to reach it.
- Cache: tap a `cache-choice-offer-<id>`; `cache-outcome` → `cache-claim`.
- Blacksmith: `blacksmith-begin`; tap one enabled `blacksmith-offer-<id>` (watch `blacksmith-budget`); if `blacksmith-card` appears, `blacksmith-continue`; `blacksmith-leave`; `blacksmith-outcome` → `blacksmith-claim`.
- Gathering: on `/event` read the card, tap an `event-choice-<id>` if any, else `event-skip`.

## 5. Looks stuck but isn't

- A greyed offer is `disabled` + `aria-disabled` with its reason in `*-reason` (rest's THE CUT at the 12-card floor; blacksmith offers over budget or with nothing to hone). Pick another.
- `*-inactive` for a frame after CLAIM while the gate pops the route is normal.
- One-way note (`*-intro-one-way`): there is no back button by design; the only exits are an offer or (blacksmith) `blacksmith-abandon`.
- Blacksmith `blacksmith-card` interlude blocks the forge until `blacksmith-continue`.
- `/event` for gathering has no choices on many cards — `event-skip` is the correct exit, not a bug.

## 6. Actually stuck

- Offers list empty (`*-choice-offers` with zero `*-choice-offer-*`) or every offer disabled with no `blacksmith-abandon`.
- CLAIM pressed, `action/claim*` logged, and the route does not return to `/exploration`.
- `*-inactive` persisting with no map behind it.
- `/event` with `event-empty` and no `event-choice-back`.
Record: kind, fixture/trigger, offer ids visible, purse, last 20 `action` lines, screenshot. Then `globalThis.__AXM_SKIP_EVENT__()` if you must — filed as a finding.

## 7. Read the log

`__AXM_LOG__.tail(40, { domains: ['action', 'game', 'nav'] })` (debug for `action`):
- rest: `action/beginRest`, `action/chooseRestChoiceOffer`, `action/pickRestChoiceCut`, `action/claimRestOutcome`.
- cache: `action/beginLootCacheChoice`, `action/chooseLootCacheChoiceOffer`, `action/claimLootCacheChoiceOutcome`.
- blacksmith: `action/beginBlacksmith`, `action/startBlacksmithForging`, `action/honeBlacksmith`, `action/temperBlacksmith`, `action/swapBlacksmith`, `action/continueBlacksmithCard`, `action/leaveBlacksmith`, `action/claimBlacksmithOutcome`, `action/abandonBlacksmith`.
- gathering: `action/resolveCurrentMapEvent`, `action/pickEventChoice`, `action/dismissEvent`, `game/inventory:changed`, `game/game:saved`.
- `nav/route-changed` to `/rest` `/cache` `/blacksmith` `/event` and back.
