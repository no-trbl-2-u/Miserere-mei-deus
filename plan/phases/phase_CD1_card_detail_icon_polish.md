# Phase CD1 — Card detail and icon polish: keywords above the modal, the character-select relic icon

Phase ids: BUG1h-BUG1i (the 2026-10-31 bug batch; renamed from CD1a, CD1b at T's request).

## Sources

- T, playing the latest preview APK (main 8f876ec), 2026-10-31, two bug reports:
  - 5: "Suppliant ring icon is the old one on the character select screen".
  - 7: "In combat, in card detail, Keyword explanations should be above the card detail modal instead of
    inside and underneath." T's screenshot is the reward screen's card detail (BACK / CHOOSE THIS; the
    Merciful card "Hastened Reck…", MERCY keyword): inside a gold-bordered panel the card art, then its
    NO DIE / +DIE lines, then the keyword explanations ("MERCY — Heals the foe…", "EXILE — The card
    leaves combat…"); the empty dark space above the panel is where T's arrow points.
- `plan/phases/phase_IT2_item_icons_rest.md` § IT2b (#1221, item icons applied, inline glyphs gone) and
  IT1b (#989, the lane relic icons): the icon manifest and `ITEM_GLYPH_BY_ID` that character select
  never consulted.
- `plan/phases/phase_CH1_character_select.md` § CH1c (the select screen), CH1f, CH1i, CH1j.
- D88 (art is owner-only; nothing here makes art), D96 (the icon store).

## Outcome

The character-select screen draws the starting relic with the same icon the satchel shows (the
Suppliant's Ring is the engagement-ring icon, not a hand-drawn ring-and-gem), and every card detail
reads the same way: the keyword explanations in one ledger above the card detail, outside it, in the
space above (combat, rewards preview, deck and hazard deck alike), the card and its plays below.

Measure: `npm run verify -w axiomancer-mobile` is green; the character-select relic icon test and the
per-surface ledger-above-and-outside-the-panel tests below pass; each UI phase's PR carries before/after shots.

## What is already built, planned, new

- Already built, re-read 2026-10-31 for T's call 2 (the ledger must sit above and outside the detail, on
  every surface, not merely first inside a panel): combat (`CombatEncounterPanel.tsx:973-1004`) renders
  the ledger as the first child of an un-boxed stack floating on the dimmed backdrop; there is no
  bordered panel around the card, so the ledger is above the card and outside any frame (it shares the
  scroll column with the card, nothing wraps both). Deck (`DeckCardDetailOverlay.tsx:51-64`) is a
  full-screen scroll whose first block is the ledger and whose only framed element is the card below it,
  so the ledger is likewise above and outside the card's frame. Hazard (`HazardOverlays.tsx:258-280`) puts
  the ledger in its own top region, a sibling of the region holding the card. So all three already
  comply in effect; they change only to use the shared component, and a test pins "above and outside"
  on each. The rewards preview is the only surface that puts the ledger inside the panel. Also built:
  keyword-on-top layout in combat (`CombatEncounterPanel.tsx:973-1004`, styles
  `:1458-1465`) and in the deck screen (`DeckCardDetailOverlay.tsx:51-64`, keywords first) and the
  hazard deck (`HazardOverlays.tsx:258-280`); the item icon table (`item-glyphs.ts:26-40`, the
  Suppliant's Ring is `'relic-disarming-plea': 'relic-engagement-ring'` at `:36`) and `ItemGlyph`
  (`ItemCard.tsx:50-62`).
- Already planned: nothing covers either report.
- New: the shared keyword ledger, the rewards-preview reorder, the select screen reading the table.

## The causes (mechanisms read)

- **Report 5.** `app/character-select/index.tsx:46-62` defines `RelicMark`, a hand-drawn `<Svg>` ring with
  a gem, used at `:165` for every character. The presenter already carries the id
  (`state/presenters/character-select*.ts:81,110` `relicId`) but nothing resolves it:
  `getItemGlyph` / `ITEM_GLYPH_BY_ID` is never imported by the screen. CH1c (2026-10-26) shipped before
  IT1b/IT2b, and IT2b's sweep covered only `components/inventory/`, so this inline `<Svg>` outside that
  folder survived. No manifest or asset-path problem: the icon exists and the satchel draws it.
- **Report 7.** Four card details exist and share no component:
  1. combat: `CombatEncounterPanel.tsx:973-1100`, keywords ledger first (the T-approved shape);
  2. rewards: `CombatRewardsOverlay.tsx:200-256`, the odd one out: `previewPanel` (`:282`) holds the face,
     the NO DIE / +DIE lines (`:207-216`), the keyword block (`:217-226`, `previewKeywords` `:287`) and
     the flavor, with the keywords BELOW the face and INSIDE the bordered panel; centred in a full-screen
     overlay (`previewOverlay` `:281`), so the space above the panel is empty;
  3. deck: `DeckCardDetailOverlay.tsx` (mounted `app/(tabs)/deck/index.tsx:146`), keywords first;
  4. hazard deck: `HazardOverlays.tsx:262` `CardDetailOverlay`, keywords first.
  Village, cache and blacksmith show a card face (`app/village/index.tsx:176`, `app/cache/index.tsx:66`)
  but open no detail, and no other `CombatCardFace large` caller exists. Each of the four has its own
  keyword row markup and styles (combat `detailKeyword*`, rewards `previewKeyword*`, deck and hazard
  `keyword*`), so the look has drifted (type tags only in combat).

## Acceptance

- **A1** `app/character-select/index.tsx` draws the starting relic through the shared item glyph
  (`ItemGlyph` with `category="equipment" sub="Relic" itemId={relicId}`, given an optional `size` prop so
  the screen keeps its 44 pt mark and accents scale with it); `RelicMark` and the `react-native-svg`
  import it alone needs are deleted. The Suppliant's Ring shows `relic-engagement-ring`; a relic id with
  no table entry shows the same category-relic fallback as the satchel.
- **A2** A test pins that the select screen's relic icon comes from the same table as the satchel: for
  every id in `CHARACTER_ROSTER` and the two fixture relics, the icon name the select screen renders
  equals `getItemGlyph(relicId)` (and `ItemGlyph`'s own output for the same id), and the Suppliant's
  Ring resolves to `relic-engagement-ring`. A guard test fails if `app/character-select/` contains a
  `<Svg` (the rule IT2b applied to `components/inventory/`, widened to the one screen that escaped it).
- **A3** One shared component, `CardKeywordLedger` (under `components/card/`), renders a card's keyword
  list (name, definition, minor flag, and the type tag where the caller has one), taking the combat
  ledger's look (`CombatEncounterPanel.tsx:1458-1465`) as the single style. The combat detail, the
  rewards preview, the deck detail and the hazard-deck detail all render it; the four local keyword row
  markups and their styles are deleted.
- **A4** In the rewards preview the ledger is a sibling ABOVE the bordered panel, not inside it, in the
  space above the panel (T, 2026-10-31: keyword explanations sit above the card-detail modal in every
  card detail): from top to bottom the keyword ledger, then the panel (card face, NO DIE / +DIE lines, flavor, BACK / CHOOSE
  THIS). The ledger scrolls inside its own capped height so a card with many keywords never pushes the
  buttons off a small phone.
- **A5** Every card detail (combat, rewards preview, deck, hazard deck) renders the ledger above the
  card and outside the card's panel or frame: the ledger is never a descendant of the element that holds
  the card face, and precedes it in render order. Combat, deck and hazard already do this
  (`CombatEncounterPanel.tsx:988`, `DeckCardDetailOverlay.tsx:51`, `HazardOverlays.tsx:262`) and keep it
  through the shared component. One test per surface pins both facts, "ledger outside the panel" and
  "ledger precedes the card" (extends `CombatEncounterPanel.card-detail.test.ts`, `DeckScreen.test.tsx`,
  `HazardOverlays.test.tsx`, plus a new rewards-preview test).
- **A6** Before/after shots of the rewards preview, the combat card detail, the deck card detail, the
  hazard-deck card detail, all four at 360x640 as well as the default viewport (ledger and the BACK /
  CHOOSE THIS or close control all on screen), and the character-select screen (the Suppliant selected) are in the PR bodies
  (`skills/heads-down.md` §4).

## Decisions made upfront — DO NOT ASK

- **One layout everywhere** (`Confirmed by T (2026-10-31): yes, all four card details share one keyword
  ledger above the card`): the shared ledger is used by all four existing card details.
- **Report 7 applies to every card detail** (`Confirmed by T (2026-10-31): the rule is for card detail in
  general: combat, reward screens, deck screen, all card details`): in each, the keyword explanations sit
  above the card-detail modal or panel, outside it. The rewards preview is the surface that breaks the
  rule today; combat, deck and hazard already comply (re-read above) and are not redesigned, only moved
  onto the shared ledger and pinned by a test.
- **Above the panel, not a tooltip.** The ledger sits on the dimmed backdrop, outside the panel and not
  inside its border, exactly as combat floats it; the panel keeps the card's category colour border.
- **Village, cache and blacksmith get no new detail** here; a tap-to-inspect on a shop or cache offer is a
  new feature, named under Follow-ups.
- **No new art, no copy change.** Keyword definitions are the existing `detail.keywords` strings.
- **Item 5 is the screen, not the manifest.** The icon pipeline is correct; do not touch
  `extract-game-icons.mjs` or `game-icon-paths.ts`.

## Phases

### BUG1h — The character-select relic wears the satchel's icon · S · closes A1, A2 · requires nothing
Measure: the new `character-select.relic-icon.test.tsx` passes (select-screen icon equals
`getItemGlyph(relicId)` for the roster and fixtures; Suppliant = `relic-engagement-ring`; no `<Svg` under
`app/character-select/`), the PR shows the select screen before/after, and `npm run verify -w
axiomancer-mobile` is green.
- Scope: `axiomancer-mobile/app/character-select/index.tsx` (delete `RelicMark`, `:20,46-62,165`),
  `components/inventory/ItemCard.tsx` (`ItemGlyph` gains `size`, default 28, accents unchanged),
  the new test beside `app/__tests__/character-select.screen.test.tsx`.
- Consumers: other `ItemGlyph` callers (`EquipmentSlot`, `EquipmentDetailModal`, `item-reward`,
  `QuestGiverScene`) keep the default size.
- Save/schema: none.
- Tests: the new test; `character-select.screen.test.tsx` and `item-glyph-accents.test.tsx` still pass; the
  visual baseline for the select screen is re-stamped.
- Verify gate: `npm run verify -w axiomancer-mobile`; before/after shot of `/character-select`.

### BUG1i — Keyword explanations above and outside the card detail, in one shared ledger · M · closes A3, A4, A5, A6 · requires nothing
Measure: the four per-surface tests pass (on combat, rewards, deck and hazard the ledger renders outside
and above the card's panel or frame, and precedes the card in render order), the four local keyword row markups are gone, `npm run verify
-w axiomancer-mobile` is green, and the PR carries four before/after pairs.
- Scope: new `components/card/CardKeywordLedger.tsx` (props: `keywords: {name, def, minor?}[]`,
  optional `typeTagFor(index)`); `CombatEncounterPanel.tsx` (`:988-1004` and styles `:1458-1465`, the
  `keywordTypeTag`/`TAG_COLORS` helper `:268-289` moves with the ledger or stays passed in),
  `CombatRewardsOverlay.tsx` (`:200-256`, `:281-290`: overlay becomes a column, ledger then panel),
  combat, deck and hazard keep their ledger-first position and only swap in the shared component,
  `DeckCardDetailOverlay.tsx:51-64`, `HazardOverlays.tsx:258-280`.
- Consumers: the dev-menu card-detail views if any render these overlays; none else.
- Save/schema: none.
- Tests: ledger unit test (rows, minor flag, tag); per-surface tests (A5): ledger renders outside and
  above the panel on combat, rewards, deck and hazard; the existing
  `CombatEncounterPanel.card-detail`, `DeckScreen`, `HazardOverlays`, `fewer-taps.TQ1` suites stay green
  (testIDs `combat-reward-preview*`, `deck-card-detail-keywords` kept); visual baselines re-stamped.
- Verify gate: `npm run verify -w axiomancer-mobile`; before/after shots (rewards preview first), also
  checked at a 360x640 viewport on all four details (ledger capped and scrolling, the BACK / CHOOSE THIS
  buttons, the close control and the card all still on screen).

## Tests matrix

| Suite | Subject | New or changed |
|---|---|---|
| `app/__tests__/character-select.relic-icon.test.tsx` | A2 | new |
| `components/card/__tests__/CardKeywordLedger.test.tsx` | A3 | new |
| `components/combat/encounter/__tests__/CombatRewardsOverlay.preview-order.test.tsx` | A4, A5 | new (ledger outside and above the panel) |
| `CombatEncounterPanel.card-detail.test.ts`, `DeckScreen.test.tsx`, `HazardOverlays.test.tsx` | A5 | extended (ledger outside and above the card, per surface) |

## Verify gate

`npm run verify -w axiomancer-mobile` per phase, plus the UI before/after shots in the PR body.

## Commit body template

`CD1<a|b>: <title>` then the closed acceptance IDs and the shot links.

## DoD

A1 to A6, all ticked across the two phases.

## Follow-ups (out of scope)

- Tap-to-inspect on village shop and loot-cache card offers (no detail opens there today).
- Folding the four overlay shells (backdrop, close, flavor) into one component; only the keyword ledger
  is shared here.
