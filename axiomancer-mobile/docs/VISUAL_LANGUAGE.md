# Visual language — The Woodcut Codex

> Written at the close of the V-sequence (Phase V8, 2026-08-31). The
> owner's brief that started this redesign (2026-08-08, full creative
> freedom on visual direction) and its ratification (2026-08-28, live
> continent-playtest: *"OMG! This art direction is amazing!"*) are
> recorded in `plan/phases/phase_V_visual_redesign_masterplan.md` — this
> doc is the finished system that brief produced, for anyone building a
> new screen or asset against it. `SVG_ASSET_SPEC.md` tracks the
> per-component placeholder → real-art checklist; `docs/asset-conventions.md`
> owns the raster ingest/provenance pipeline. This doc is the middle
> layer: the design language itself.

## The identity, in one line

*FromSoftware × Inscryption × illuminated manuscript.* Every screen is a
page of a chronicle: ink-on-parchment woodcut art, iron and wax
furniture, hairline rules, ✠ eyebrows, lowercase-roman in-world
numerals, dark-gothic type. Not a theme applied on top of the game —
the completion of the identity the game already half-owned since the
2026-05-23 design handoff.

## Color: tokens, never hex

Every screen reads color through `AXM.*` (from `usePalette()` /
`makeStyles()` in `theme/runtime`), never a baked hex literal. `AXM` is
a **frozen snapshot of the active theme**, resolved once at module-load
— see `theme/palette.ts` for the mechanism.

> **Phase 101 (2026-09-19) — the accents were retuned toward historical
> pigment.** The world plates are 19th-century wood engravings graded toward
> the void, carrying essentially zero chroma; against them the previous
> accents (a `#a6e22e` lime, a `#b81fae` magenta, a `#5ec5e8` cyan) read as UI
> stickers on top of a print. Every theme's hues were desaturated and shifted
> toward colours a hand-tinted plate would carry — iron-gall, oxblood, gold
> leaf, verdigris, red ochre, lapis, orpiment, murex — keeping each theme's
> identity and name. Contrast was measured before and after: the two
> `blood/bg` pairs that were only AA-large now clear full AA.
> `theme/__tests__/palette.test.ts` gained the contrast guard that had never
> existed. **The type system was reviewed in the same pass and
> deliberately left alone** — IM Fell English (a 17th-c English revival) and
> Pirata One sit inside the same printed-book world as the plates.

> **Correction (2026-09-20, burn-day audit row 3.10).** The paragraph above
> claimed "no pair regressed". It did not hold. 36 of the 60 readable-token
> pairs (6 accents against `bg` and `panelBg` across 5 themes) lost contrast
> in the Phase 101 retune. Nearly all of them stayed far above AA and are
> left as they are — the accents were meant to sit back. One token did not:
> `rust` fell below 4.5:1 against both `bg` and `panelBg` on ashen-gold (the
> default), coastal-verdant and ember-depths, and `rust` is read as text
> (error codes, crash labels, the friendship panel, difficulty badges).
> On coastal-verdant that was a clean crossing of AA, 5.07 -> 4.26; on
> ashen-gold and ember-depths the retune deepened a deficit that predated
> it. `rust` has been lifted back over the line on those three themes by
> raising lightness alone, holding hue and saturation, so red ochre stays
> red ochre and verdigris stays verdigris. The guard missed it because
> `READABLE_PAIRS` did not list `rust` and tested the other accents against
> `bg` only; it now asserts `rust/bg` and `rust/panelBg` on every theme.

The base identity is one dark-gothic palette; the *accents* are
theme-driven so the world can shift as the pilgrim moves between
regions without touching components. Five themes ship today
(`theme/palette.ts` `THEME_SPECS`), default `ashen-gold`:

```
ashen-gold        coastal-verdant     ember-depths
frost-marrow      plague-bloom
```

The 7 base hues every theme authors (a new theme needs only these —
translucent washes/dividers/overlays derive automatically via
`makePalette`):

```
AXM.bg        near-black background
AXM.parchment main text / inactive icon
AXM.blood     HP, danger, bleed
AXM.sulfur    mana, selected, active
AXM.rust      friendship, rust accents
AXM.bone      secondary text, inactive tabs, hints
AXM.ash       borders, disabled — NOT body/hint text (too low-contrast
              against `AXM.bg`; see Phase V8 critic-loop finding, the
              cutscene hint fix in `app/cutscene/index.tsx`)
```

All monochrome assets (icons, glyphs) render via `currentColor` /
a `color` prop so they inherit the token without separate colored
variants.

## Type

`theme/axm.ts` `FONTS` + `TYPE`. Blackletter/serif identity, **not**
theme-driven (only color shifts per-theme, never the type system):

```
FONTS.gothic  PirataOne        — display, h1, in-world headers
FONTS.serif   IMFellEnglish    — h2, body prose (dialogue, flavor text)
FONTS.sans    BebasNeue        — eyebrows, labels, UI chrome
FONTS.mono    JetBrainsMono    — codex header strips, hints, stat rows
```

## Furniture: the page-of-a-chronicle chrome

- **✠ eyebrow + hairline rule** — the standing header convention
  (small-caps or mono label prefixed with ✠, a 1px rule beneath).
  Audited into shared components in V3.
- **Iron/wax furniture** — rivets, seals, hairline borders in `AXM.ash`/
  `AXM.parchment` — the metal-and-wax-seal vocabulary from the original
  design handoff, kept consistent across SELF / SATCHEL / MEMOIR and
  modals (V3 consistency pass).

## Backgrounds: `ScreenBg`

`components/ScreenBg.tsx` is the one place a screen opts into a
backdrop plate. Two rules, deliberately separate knobs (see the
component's own comments — a prior critique pass caught two screens
dimming art two different ways):

1. **Dim, never blur** — the backdrop renders at `opacity: 0.2` so copy
   keeps contrast above it. The map (`MapCanvas`) set these numbers
   first; `ScreenBg` lifted them verbatim so the two surfaces don't
   drift.
2. **Vignette is a separate knob from the dim** — a thick inner border
   in `AXM.bg` keeps the plate from ending in a hard rectangle against
   panel chrome. Not a gradient — a border, so it costs nothing extra.

A screen with no `art` key keeps the flat `AXM.bg` ground it always
had — a dense table (inventory) is noise under a backdrop; opt-in, not
default.

## Iconography canon: `components/icons/`

One data-driven registry, one render path (`<AxmIcon name="..." />`),
shipped Phase V1. Geometry is curated from the owner-provided
game-icons.net library (`Potential Assets/icons-TBR`, CC BY 3.0 / CC0
per artist) through `scripts/extract-game-icons.mjs` into the generated
`game-icon-paths.ts` — **the app never reads the source library at
runtime**, and no component inlines a one-off `<Svg>` icon; every mark
goes through the registry so upgrading the art is a one-place change.

`ActionIcon` / `EffectGlyph` / the tab bar's `TabIcon` are thin adapters
over `AxmIcon` that keep their historical short keys (`'sword'`,
`'poison'`, …) mapped onto registry names (`action-sword`,
`effect-poison`). Callers never changed; only the art underneath did.

Registry coverage today: 18 `action-*` marks, 8 `effect-*` marks — see
`components/icons/icon-registry.ts` for the full list and each mark's
`<artist>/<icon>` attribution.

**Genuinely outstanding** (real gaps, not yet on the registry —
reconciled honestly in `SVG_ASSET_SPEC.md`'s checklist rather than
claimed done): `GlyphMind` (`components/StanceGlyph.tsx`) and the four
map node marker states (`components/NodeMark.tsx`) are still hand-coded
procedural SVG.

## Enemy art: the archetype figure system

`components/event/enemy-art/` resolves an enemy id to one of ten
drawing archetypes (`state/presenters/enemy-art.ts`
`resolveEnemyArchetype` — keyword-matched over the enemy id, with an
explicit override map for names that don't imply their shape):

```
vermin  crustacean  spirit  beast  avian
flora   zealot      eldritch  tyrant  generic
```

Every roster enemy has a bespoke 1:1 painting
(`assets/images/enemies/`, `assets/images/portraits/`) for its actual
in-fight art. The archetype figures (`components/event/enemy-art/figures.tsx`)
are the **silhouette fallback** — used by `EnemyIllustration` (the
full `CreatureScene` version) for synthetic/unauthored enemies and the
dev-only `/devart` gallery, drawing from one figure set
(`GenericFigure`, `TyrantFigure`, …). The compact `EnemyPortrait` HUD
avatar that shared it had no caller and was removed (TRIM THE FAT T3,
2026-09-25). The pre-archetype placeholder scenes (`EncounterIllustration`,
`BossIllustration`) that predated this system and had drifted out of
sync with it are retired.

## Decorative procedural art

Not everything is acquired art, by design — `Splatter`
(`components/Splatter.tsx`, ink-splatter accent) renders one of four
acquired public-domain plates via `tintColor` (Phase V7); the map's
compass rose / hatch-and-vignette backdrop (V2) stays procedural SVG
because its job is infinite, seed-varied texture, not a specific
illustrated subject — acquiring "art" for a seeded pattern would be a
category error.

## Naming: one concept, one word — the player-facing lexicon

Phase 80 (2026-09-15) closed the "one concept, one word" candidate the
2026-09-12 UI fresh-eyes swarm raised for five clusters (`plan/PHASE_CANDIDATES.md`,
[score 6.5]). The swarm's own three-lens panel refuted every cluster taken
screen-by-screen — no single screen shows two senses of the same word at
once — which is a fair verdict on each screen alone and the exact argument
*for* a written lexicon: cross-screen drift is real even when no one screen
is caught in the act. This table is that lexicon; extend it in place rather
than re-litigating a cluster from scratch.

| Concept | Canonical word | Notes / deliberate exceptions |
|---|---|---|
| The coin readout (a box/label showing the player's spendable total) | **PURSE** | Was split three ways: `blacksmith`/`rest`/`village` already said PURSE; the inventory screen alone said `WALLET` in its eyebrow chrome and `SHILLING` in the box label a few pixels below it — two words for money on the *same* header block. Both now say PURSE (phase 80). The currency *unit* stays **SHILLINGS** everywhere (unchanged, never competed with PURSE — a purse is a container, a shilling is what's in it). |
| The momentum chain (the combat-board meter that grants a gold die on a streak) | **MOMENTUM** | The mechanics engine's own internal term is `surge` (`combat.objective.ts`), which is why mobile copy keeps drifting back to "Surge" even after a fix — `CombatTutorialPrimer.tsx` was corrected once (FE-054) but its near-duplicate twin in `combat-tutorial-steps.ts`'s in-board coach script wasn't; fixed to match (phase 80). The live board's own celebratory banner ("✦ MOMENTUM SURGE") is a deliberate bridge between the UI name and the engine name and is not a bug. |
| A run's two separate card pools (the combat deck built at rest/cache; the hazard deck built during the hazard minigame) | **"deck" unqualified = combat deck. The hazard pool is always spelled out as "HAZARD DECK."** | The two systems reused the identical phrases "ADD A CARD TO YOUR DECK" and "THIN THE DECK" for different decks on different screens a player visits in the same run. The hazard screens (`RewardsOverlay`, `HazardRemoveGrid`, the hazard-deck screen's CTA) now say HAZARD DECK explicitly; the combat-side screens (rest/cache/`CombatRewardsOverlay`) keep the unqualified, default-sense "deck" (phase 80). |
| The nav tab vs. the screen it opens (e.g. `THE LEDGER` tab → `THE BOOK OF DEEDS` header; `SATCHEL` tab → `INVENTORY` title) | **Deliberately allowed to differ.** | An evocative one-word tab name and a plainer screen title are an established pattern here, not drift — swarm C-159/160/164 refuted this exact pairing on that basis and this pass agrees. Don't "fix" a tab/screen name mismatch on sight; check whether it's this pattern first. |
| `SEALED` — three genuinely different systems (an inventory category, a locked map path, a no-retreat combat lock) | **Left as three words for three concepts — not a bug.** | The swarm's panel found the senses never co-occur on one screen; this pass agrees and found no new same-screen collision to fix. If a future screen ever shows two SEALED senses together, that screen needs a qualifier, not a global rename. |



1. **Color**: `AXM.*` tokens only, via `usePalette()`/`makeStyles()`.
   Never a hex literal in a component (a repo-wide hard rule, not just
   a style preference).
2. **Icons/glyphs**: check `components/icons/icon-registry.ts` first.
   If the mark exists, use `<AxmIcon name="..." />`. If it doesn't,
   extend the registry (`scripts/extract-game-icons.mjs`) rather than
   inlining a new `<Svg>` — the whole point of V1 was killing verbatim
   duplicates.
3. **Backgrounds**: opt into `ScreenBg`'s `art` prop only if the screen
   benefits from atmosphere over content (event/narrative screens, not
   dense data tables).
4. **New illustration**: follow `docs/asset-conventions.md`'s ingest
   contract (WebP, `assets/images/<category>/`, registry `require()`,
   `provenance.json` in the same commit). Check `SVG_ASSET_SPEC.md`
   first — the component you're about to draw a placeholder for may
   already have a resolved row.
5. **Headers**: reuse the ✠-eyebrow + hairline convention rather than
   inventing a new header treatment per screen.
