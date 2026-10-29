# Phase IT2 — The rest of the item icons: T's picks, then the inline glyphs die

## Sources

- T, in session, 2026-10-29. Asked why the deadline list was stuck, T said the item-icon picks were
  done; the repo showed PR #989 (2026-10-27, a hand PR) shipped T's six lane-relic picks but never
  ticked IT1b, and the rest of IT1b was never picked. T's ruling: *"Split it, then plot the potion
  icons"*.
- `plan/phases/phase_IT1_item_glyph_resolver.md` § IT1b — the original owner-led row: T picks from the
  2026-10-19 candidate sheet (23 candidates over 7 slots), then the mechanical apply. This brief carries
  what IT1b left open; IT1b is narrowed to #989's relics in the same commit.
- PR #989 — `ITEM_GLYPH_BY_ID` (six `relic-*` rows), `ITEM_GLYPH_ACCENTS`, `AxmIcon`'s `accents`, six
  `relic-*` icons in `scripts/extract-game-icons.mjs`'s manifest and `game-icon-paths.ts`.
- `axiomancer-mechanics/src/Items/consumable.library.ts`: `healing-potion`, `minor-healing-potion`,
  `greater-healing-potion` — all three draw one identical flask today.
- `axiomancer-mechanics/src/Items/relic.library.ts`: four relics with no table entry, all drawing the
  shared relic trinket — `relic-disarming-plea` ("Suppliant's Ring"), and the Defender's three
  (`relic-thornback-signet`, `relic-mirror-brooch`, `relic-carapace-belt`, phase DF1e, shipped
  2026-10-28, after #989).
- `axiomancer-mobile/components/inventory/ItemCard.tsx` `ItemGlyph`: five inline `<Svg>` blocks — the
  relic, consumable, material and quest category glyphs and the "Unknown item type" mark.
  `ItemGrid.tsx`: one more, the empty-bag drawing (`inventory-empty`).
- `axiomancer-mobile/components/icons/icon-registry.ts`: "never inline a new one-off `<Svg>` icon in a
  component".
- D88 (art is owner-only), D96 (`Potential Assets/` is a store; `extract-game-icons.mjs` reads the
  library root from `argv[2]` or `GAME_ICONS_LIBRARY`), D115 (all game art is open; publish it).

## Outcome

Every item in the game wears an icon T picked: the three potions read as three different potions, each
relic has its own mark, and the inventory's fallback glyphs come from the icon registry instead of
hand-drawn one-offs.

Measure: every id in the consumable and relic libraries resolves to its own `ITEM_GLYPH_BY_ID` entry (no
library item takes the fallback), `components/inventory/` contains no `<Svg`, and
`npm run verify -w axiomancer-mobile` is green.

## Acceptance

- **A1** T's picks are recorded in this brief's "T's picks" table: for each slot, one game-icons name
  (author/icon) and any colour accents in T's words. The slots: the three potions; the four relics with
  no icon (Suppliant's Ring and the Defender's three) `[T to confirm #1]`; the consumable, relic,
  material and quest category glyphs; the unknown-item mark and the empty-bag drawing
  `[T to confirm #2]`.
- **A2** Each picked icon is in `extract-game-icons.mjs`'s manifest and `game-icon-paths.ts` is
  regenerated from it (D96: the library root is passed in, never defaulted).
- **A3** `ITEM_GLYPH_BY_ID` gains a row for each of the seven items, and `ITEM_GLYPH_ACCENTS` one for
  each accent T asked for, through #989's accent mechanism (no new colour path, no hex literals).
- **A4** The category glyphs, the unknown-item mark and the empty-bag drawing draw registry icons; the
  inline `<Svg>` blocks they replace in `ItemCard.tsx` and `ItemGrid.tsx` are deleted, so
  `components/inventory/` contains no `<Svg`.
- **A5** IT1a's library-enumeration test is tightened from "falls back to today's glyph" to "every
  library id has its own table entry", so an item added later without an icon fails a test instead of
  silently wearing a category glyph. The three potions resolve to three distinct names.
- **A6** The inventory's visual baselines are re-stamped and the before/after is in the PR.

## Decisions made upfront — DO NOT ASK

- **Two phases: T's pick, then the apply.** IT1b was one owner-led row holding both, which is why a hand
  PR could ship half of it without anything noticing. The pick is T's (D88) and is a sitting, not a
  tick; the apply is mechanical and runs unattended once the table is filled.
- **The pick sitting renders candidates the way #989's did:** at the 28 px `ItemGlyph` draws, over the
  real `AXM.bg`, beside the item's name, two to four candidates per slot from the game-icons store
  (D96). The 2026-10-19 sheet is the starting point; slots it does not cover (the Defender's relics,
  the unknown mark, the bag) get fresh candidates.
- **Accents use #989's mechanism.** Named hues only (`blood`, `storm`, `ember`, `frost`, or a new named
  hue added to the same map), never a hex literal.
- **The Defender's three relics are in** `[T to confirm #1]`: they shipped after #989 and draw the
  shared trinket, so leaving them out would keep the inventory half-iconed.
- **The unknown-item mark and the empty bag are in** `[T to confirm #2]`: the registry's own rule
  forbids inline one-offs, and IT1b's Measure asked for an `<Svg>`-free `components/inventory/`.
- **Slot: asap.** It is a T act already overdue in `plan/deadlines.md` (2026-10-27), and the MVP demo
  names real item icons.

## T's picks

Filled in IT2a's sitting. One row per slot.

| Slot | Item id or glyph | Icon (author/icon) | Accents (T's words) |
|---|---|---|---|
| Potion | `healing-potion` | | |
| Potion | `minor-healing-potion` | | |
| Potion | `greater-healing-potion` | | |
| Relic | `relic-disarming-plea` (Suppliant's Ring) | | |
| Relic | `relic-thornback-signet` | | |
| Relic | `relic-mirror-brooch` | | |
| Relic | `relic-carapace-belt` | | |
| Category | consumable | | |
| Category | relic | | |
| Category | material | | |
| Category | quest | | |
| Mark | unknown item | | |
| Drawing | empty bag | | |

## Save / schema contracts

None. Ids map to icon names; nothing is persisted.

## DoD

A1–A6 ticked.

## Follow-ups (not in this phase)

- **A row a hand PR ships stays open.** #989 shipped IT1b's relic half without ticking the row, so the
  deadline Item it fed stayed overdue for two days. Whether a non-`loop:pr` PR naming a phase in its
  body should be flagged when its row stays open is a separate question.

## Phases

### IT2a — T picks the rest of the item icons (Size: S) — attended

Closes A1. Requires nothing. Attended: yes (art is owner-only, D88).

The session renders the candidates (see Decisions) and T picks one per slot, with accents if wanted.
The session writes the picks into the "T's picks" table above and ticks the row. No code.

Measure: every row of the "T's picks" table has an icon name.

### IT2b — The picks applied, the inline glyphs gone (Size: M)

Closes A2, A3, A4, A5, A6. Requires IT2a. Attended: no.

Scope: `axiomancer-mobile/scripts/extract-game-icons.mjs` (manifest), `components/icons/game-icon-paths.ts`
(regenerated), `components/icons/item-glyphs.ts` (table and accents), `components/icons/icon-registry.ts`
(labels), `components/inventory/ItemCard.tsx` and `ItemGrid.tsx` (inline `<Svg>` blocks deleted), their
tests, and the inventory visual baselines. Not touched: the six lane relics' icons and accents from #989,
any mechanics file.

Tests: the tightened enumeration test (A5); the category, unknown and empty-bag paths draw registry
icons; the existing `ItemCard`, `ItemGlyph.by-id` and `item-glyph-accents` suites pass.

Verify gate: `npm run verify -w axiomancer-mobile`, then `npm run verify:visual` for the inventory routes.

Measure: `grep -r "<Svg" axiomancer-mobile/components/inventory` returns nothing, and the A5 test passes
with every library id on its own entry.
