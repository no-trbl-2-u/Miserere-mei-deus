# Phase IT1 — Items get their own glyphs: the resolver, then T's picks

## Sources

- The `/plot` request from T, 2026-10-19 (attended), after an item-art survey. T's framing was that
  items "are only using SVGs"; the survey found the sharper problem underneath, below.
- `axiomancer-mobile/components/inventory/ItemCard.tsx` — `ItemGlyph({ category, sub })` switches on
  `InventoryCategory` and the equipment sub-type **only**. Weapons and armour already resolve through
  `ActionIcon kind="sword"/"shield"`; consumable, material, quest and trinket/accessory are hand-rolled
  inline `<Svg><Path>` elements in the component body. `ItemGrid.tsx` carries one more at line 19.
- `axiomancer-mechanics/src/Items/consumable.library.ts` (`healing-potion`, `minor-healing-potion`,
  `greater-healing-potion`) and `relic.library.ts` (`relic-disarming-plea` "Suppliant's Ring",
  `relic-bleeding-signet` "Bleeding Signet"). Five items, no `icon` field on any of them.
- `axiomancer-mobile/components/icons/icon-registry.ts` — `AxmIconName` (= `GameIconName`),
  `AXM_ICON_NAMES`, and the `isAxmIconName` type guard. Its own doc comment is the second source for
  this phase: "never inline a new one-off `<Svg>` icon in a component."
- `axiomancer-mobile/assets/images/cards/index.ts` — `getCardArt(cardId)` over
  `CARD_ART_BY_ID: Record<string, number>` with a `?? FALLBACK_CARD_ART`. The pattern to follow, with
  one improvement noted under Decisions.
- `axiomancer-mobile/components/ActionIcon.tsx` — `if (!isAxmIconName(name)) return null`. The failure
  mode to **avoid**: an unknown name renders nothing, silently.
- **D88 / bearings "Content per surface": art is owner-only.** Choosing which icon a given item wears is
  therefore not loop work. It is row IT1b.
- **D96** (`AGENTS.md` standing rule 9): `Potential Assets/` is a store, never a source. The icon library
  lives there; `extract-game-icons.mjs` takes its root as `argv[2]` or `GAME_ICONS_LIBRARY` with no
  default, and writes the checked-in `game-icon-paths.ts`. Adding an icon to the registry is an existing
  documented operation, not new machinery this phase invents.

## Outcome

An item's glyph is a property of the item, not of its category. The resolver and its fallback land
first and change no pixel, so T can fill the table one item at a time without a build ever being red or
a half-finished look shipping.

Measure: `npm run verify -w axiomancer-mobile` passes; a test asserts that every id in the consumable
and relic libraries resolves to the glyph it draws today while the table is empty.

## Acceptance

- **A1** A resolver keyed on item id returns the icon an item should wear, and falls back to the
  **current** category glyph for any id with no entry. Signature and home mirror `getCardArt`:
  one table, one lookup, one documented fallback.
- **A2** The table's value type is `AxmIconName`, not `string`, so an entry naming an icon that is not in
  `GAME_ICON_PATHS` is a **compile error**. A test also asserts every table value satisfies
  `isAxmIconName`, so the invariant survives a `satisfies` being dropped.
- **A3** No silent disappearance. Unlike `ActionIcon`, an unresolvable entry never renders nothing: the
  fallback path is taken and a test proves it for a deliberately bogus entry (via the test's own fixture
  table, not by shipping a bogus row).
- **A4** With the table empty, **every** id in `getConsumableById`'s and `getRelicById`'s libraries
  renders exactly the glyph it renders today. The test enumerates the libraries rather than listing five
  ids by hand, so a sixth item added later is covered without editing the test.
- **A5** `components/inventory/__tests__/ItemCard.test.tsx` (37 cases) and `InventoryTabs.test.tsx` pass
  unchanged in intent. This phase adds a resolution step; it changes no glyph, size, colour or layout.
- **A6** The three potions and two relics are reachable in the dev inventory so T can see the fallback
  holding, and the brief's own claim — that all three potions currently draw one identical flask — is
  recorded as a before-shot in the phase's PR.

Measure: `npm run verify -w axiomancer-mobile` green; the A4 enumeration test present and passing.

## Scope

- `axiomancer-mobile/components/inventory/`: `ItemCard.tsx`'s `ItemGlyph` gains the id-keyed path; the
  table and resolver live wherever the repo's own convention puts a registry of this kind (beside
  `icon-registry.ts`, or in `assets/images/` as cards do — the builder picks one and says why).
- `axiomancer-mobile/components/inventory/__tests__/`: the A2–A4 tests.
- Not touched by IT1a: every existing glyph's geometry, the inline `<Svg>` elements, the icon registry's
  contents, `game-icon-paths.ts`, any colour, size or layout value. **No art.**

## Consumers to update

- `axiomancer-mobile/docs/asset-conventions.md` or the nearest icon doc: that an item glyph is chosen by
  id and where the table is.
- `components/icons/icon-registry.ts`'s doc comment, if the inline-SVG prohibition should now name the
  item table as the sanctioned route.

## Save / schema contracts

None. The table maps an existing id to an existing icon name; nothing is persisted and no save reads it.

## Decisions made upfront — DO NOT ASK

- **The table starts empty and the fallback is today's glyph.** This is what makes IT1a shippable on its
  own: it is a pure refactor with a new seam, provable by A4, and it cannot look half-finished because
  nothing changes. The alternative — resolver and icons in one phase — would make every item's
  appearance hostage to one art review.
- **Typed better than `getCardArt`.** `CARD_ART_BY_ID` is `Record<string, number>`, so a typo in a card
  id is silent. The item table types its values as `AxmIconName` (A2). Do not copy the looser typing for
  symmetry's sake; copy the shape, improve the types.
- **Never `return null` on a bad name.** `ActionIcon` does, and an icon that silently vanishes is worse
  than a wrong icon because nobody files it. A3 pins the opposite.
- **The inline-SVG drain is NOT in IT1a.** Replacing a hand-drawn flask with a registry icon changes
  what the player sees, which is an art call (D88). It is IT1b, below, and it is also where those inline
  elements die — once a category's icon is chosen, its inline `<Path>` block is dead code.
- **Enumerate the libraries in the test, don't list ids.** Five items today; the test should still be
  honest at fifteen.
- **Slot: asap.** T asked now, it blocks no open row, and it is the thing that makes T's icon picks
  applyable at all — picking icons with no resolver to hold them would strand the choice.

## Tests matrix

- `components/inventory/__tests__/`: the id-keyed hit, the fallback for every library id (A4), the bogus
  entry taking the fallback (A3), every table value satisfying `isAxmIconName` (A2).
- No change to the 37 existing `ItemCard` cases or to `InventoryTabs` (A5).

## Verify gate

`npm run verify -w axiomancer-mobile`.

## Commit body template

```
items: glyphs resolve by item id, with today's glyph as the fallback

ItemGlyph keyed on category alone, so all three healing potions drew one
identical flask and both relics drew one identical trinket. The resolver
is keyed on item id and falls back to the current category glyph, so an
empty table changes no pixel — filling it is what changes the look, and
that is T's call (D88). The table's values are typed AxmIconName, so a
bad entry is a compile error rather than the silent null ActionIcon
returns.
```

## DoD

A1–A6 ticked.

## Phases

### IT1a — The resolver and its fallback (Size: M)

Closes A1, A2, A3, A4, A5, A6. Requires nothing. Attended: no.

Ordinary code. The id-keyed resolver, the typed table, the fallback to today's category glyph, and the
tests that prove no pixel moved. Ships with the table empty.

Measure: `npm run verify -w axiomancer-mobile` green, and the A4 enumeration test shows every library id
falling back.

### IT1b — T's icon picks, and the inline glyphs die (Size: S) — owner-led

Closes nothing on its own; it fills the table IT1a built. Requires IT1a. Attended: yes.

T picks from the candidate sheet built 2026-10-19 (23 candidates over 7 slots: the three potions, the
two relics, and the material and quest category glyphs, each rendered at the 28px `ItemGlyph` actually
draws, over the real `AXM.bg`). Once the picks are recorded, the rest is mechanical: add any chosen icon
to the manifest in `extract-game-icons.mjs`, regenerate `game-icon-paths.ts`, fill the table, and delete
the inline `<Svg>` blocks in `ItemCard.tsx` and `ItemGrid.tsx` that the picks make dead.

Not loop work until T's picks exist, because every line of it is a consequence of an art choice (D88).

Measure: each of the five items draws a distinct glyph; no inline one-off `<Svg>` remains under
`components/inventory/`; `npm run verify -w axiomancer-mobile` green.

## Follow-ups (not in this phase)

- **Items have no art beyond glyphs.** Cards get painted plates via `getCardArt`; items get a 28px
  monochrome mark. Whether an item deserves a plate in its detail modal is a separate design question
  this phase does not raise.
- **`ActionIcon`'s silent `return null`** is a live hazard for every caller, not just items. Worth its
  own small phase: fail loudly, or render a documented placeholder.
- **`CARD_ART_BY_ID`'s loose typing** has the same defect this phase avoids. Tightening it is a
  one-line change plus whatever it reveals, and is not bundled here.
