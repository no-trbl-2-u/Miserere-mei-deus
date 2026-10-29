# Narrative — `village` (with shop), `cutscene`, `narration`, `interaction`

## 1. What these screens are for

Paced (narrative-choice) events sit in the event slice and `<EventGate>` (`components/EventGate.tsx`) pushes one route per kind (`state/presenters/event.engine.ts` `selectPacedEventRoute`): `interaction` and `narration` → `/dialogue` (an NPC tree, `app/dialogue/index.tsx`; `narration` is the same screen with a tree and no NPC), `village` → `/village` (merchants + buy/sell shop, `app/village/index.tsx`), `cutscene` → `/cutscene` (authored lines, `app/cutscene/index.tsx`), anything else → `/event`. Every screen's only exits are a choice or `actions.dismissEvent()`; each pops itself when the event clears.

## 2. Enter it directly

- `/dev` sections start closed; `dev-section-<key>-toggle` opens one (dialogue chips under STORY, `dev-section-story-toggle`; the quick triggers under ENCOUNTERS, `dev-section-encounters-toggle`).
- Dialogue: `/exploration?fixture=apprentice-staged-dialogue` (`arrive` → `/dialogue`, the fixture NPC staged on the Breakwater's bw-2). `/dev`: `debug-dialogue-<map>-<npc-slug>` opens any staged tree.
- Village: `/exploration?fixture=wanderer-staged-village` (`arrive` → `/village`, 240 shillings). `/dev`: `debug-trigger-encounter-village` (synthetic two-merchant village); `debug-currency-large-grant` (under RUN & DIAGNOSTICS, `dev-section-run`) first if you want to buy.
- Cutscene: `/exploration?fixture=wanderer-staged-cutscene` (`arrive` → `/cutscene`, a placeholder cutscene staged on bw-2). `/dev`: `debug-trigger-encounter-cutscene`. Map start nodes also fire their own omen on landing (`fresh-start`).
- Narration: no dedicated fixture or dev trigger; reached by walking onto a narration node (see `DebugWorldTravel`'s `debug-travel-node-<id>` chips, which fire the node's authored event).
- No seed globals apply; `__AXM_JUICE_INSTANT__` does not affect the cutscene fade (it is RN `Animated`, honours reduced motion).

## 3. Test IDs

| testID | what it is |
|---|---|
| `dialogue-inactive` | `/dialogue` with no event (pops back) |
| `dialogue-scroll` | Scroll view |
| `dialogue-nameplate` | Speaker name |
| `dialogue-speech` | Current line |
| `dialogue-choice-<id>` | A choice; first tap arms it, second confirms |
| `dialogue-choice-<id>-confirmed` | The armed state marker |
| `dialogue-choice-<id>-consequences` | Consequence chips under a choice |
| `dialogue-leave` | LEAVE — dismiss the event |
| `village-inactive` | `/village` with no event |
| `village-scroll` | Scroll view |
| `village-merchant-<name>` | Merchant card |
| `village-purse` | Shillings and VITAE |
| `village-note` | What the last counter did, or why it refused |
| `village-rest` | Tap to rest for shillings (disabled when refused) |
| `village-rest-price` / `village-rest-effect` / `village-rest-refusal` | Rest counter copy |
| `village-card-<cardId>` | A card on the card shop's counter |
| `village-card-<cardId>-buy` | Tap to buy (disabled when refused) |
| `village-card-<cardId>-price` / `village-card-<cardId>-refusal` | Card price (SOLD once bought) and refusal |
| `village-remove` | Tap to open card removal (disabled when refused) |
| `village-remove-card-<cardId>` | Tap to remove that card |
| `village-remove-cancel` | Tap to close removal |
| `village-anvil` | Tap to open the Anvil |
| `village-leave` | LEAVE |
| `cutscene-inactive` | `/cutscene` with no event |
| `cutscene-plate` | The fading plate |
| `cutscene-line-<index>` | The current line |
| `cutscene-advance` | Tap anywhere to advance (last line dismisses) |
| `cutscene-skip` | SKIP |
| `event-prelude-header` / `event-strife-sash` / `event-choice-<id>` / `event-skip` / `event-choice-back` / `event-empty` | The `/event` fallback shell |

## 4. A correct play, step by step

- Dialogue: read `dialogue-speech`; tap `dialogue-choice-<id>` twice (arm, confirm) until no choices remain; `dialogue-leave`. Map returns.
- Village: tap `village-rest` (purse drops, VITAE rises); tap a `village-card-<cardId>-buy` (it reads SOLD); tap `village-remove` then a `village-remove-card-<cardId>`; `village-leave`.
- Cutscene: tap `cutscene-advance` once per line (or `cutscene-skip`). Map returns.
- `/event`: `event-choice-<id>` if present, else `event-skip`.

## 5. Looks stuck but isn't

- A dialogue choice tapped once only highlights (`*-confirmed`): it needs a second tap within the confirm window (`confirmTimerRef` in `app/dialogue/index.tsx`).
- Cutscene lines fade (`Animated.timing`); tapping during the fade is accepted but the next line still fades in. Reduced-motion collapses it to 0.
- A village counter not responding: it is `disabled` with its reason under it (`village-rest-refusal`, `village-card-<cardId>-refusal`, `village-remove-refusal`): a short purse, rested this visit, or sold this visit.
- `*-inactive` flashes while the screen pops back after LEAVE/last line.
- An omen stacking twice on a deep link was fixed (EventGate latch); a single push is expected.
- Start-node omen on `fresh-start` fires on landing — not a stray event.

## 6. Actually stuck

- `/dialogue` with `dialogue-speech` and neither a `dialogue-choice-*` nor `dialogue-leave` reachable.
- `dialogue-leave` / `village-leave` / last `cutscene-advance` pressed, `action/dismissEvent` logged, and the route stays.
- `*-inactive` persisting with no map behind it, or `/event` with `event-empty` and no `event-choice-back`.
- A choice confirmed and `game/dialogue:applied` never logged.
Record: route, fixture/trigger, nameplate/village name, the choice ids shown, last 20 `action`+`game` lines, screenshot. `globalThis.__AXM_SKIP_EVENT__()` only after that, and file it.

## 7. Read the log

`__AXM_LOG__.tail(40, { domains: ['action', 'game', 'nav'] })`:
- `action/resolveCurrentMapEvent`, `action/pickEventChoice`, `action/dismissEvent`, `action/restAtVillage`, `action/buyVillageCard`, `action/removeVillageCard` (debug level).
- `game/dialogue:applied` after a confirmed choice;  `game/world:processed` when the node is consumed.
- `nav/route-changed` `/dialogue` `/village` `/cutscene` `/event` and back to `/exploration`.
