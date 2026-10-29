# DevLog — the public face

The design system for the public development log of *Miserere Mei, Deus*.
Written 2026-09-20 against `axiomancer-mobile/docs/VISUAL_LANGUAGE.md` ("The
Woodcut Codex") and `axiomancer-mobile/theme/palette.ts`. It is the same world
as the game, seen through a browser: a page of a chronicle, not a dev-blog
theme with the game's colours dropped in.

**Status: built.** The system below is implemented by
`scripts/build-devlog-public.mjs` and its shell, `devlog-public-shell.mjs`.
Build it with `npm run site:public` and open `dist/devlog-public/index.html`.
Section 11 records what the build changed about this design, and why.

Prototypes: `devlog/design/` — the before/after component in every state and
shape (`prototype-components.html`) and the landing hero in three scroll
treatments (`prototype-hero.html`). Every page type's prototype is the build
itself, running on the real fifty-four entries.

---

## 1. Colour — tokens, never hex

Every colour on the site is a CSS custom property named exactly as the app's
token is named in `palette.ts`, so a token change in the app has an obvious
counterpart here. No component carries a hex literal.

```
--bg --parchment --blood --sulfur --rust --heal --bone --ash
--panelBg --deepBg --selectFill
--divider --parchmentDim        (derived, as makePalette derives them)
```

All five shipped themes are present; `ashen-gold` is the default. The switcher
in the header rewrites `data-theme` on `:root` — no reload, unlike the app,
because the web has no `StyleSheet.create` snapshot problem. First visit
respects `prefers-color-scheme` in CSS alone (all five themes are dark; a light
preference gets `frost-marrow`, the palest, rather than an invented sixth
palette).

The token stylesheet is not hand-written: `scripts/devlog-tokens.mjs` reads
`palette.ts` at build time and emits it, derived tokens included. A palette
change in the app is a rebuild here, never a re-typing.

### Measured contrast — every readable pair, all five themes

Computed from the committed token values with the WCAG 2.1 relative-luminance
formula, by the same code the CI gate runs
(`node scripts/devlog-tokens.mjs --table`). `bg` and `panelBg` are the only two
grounds text sits on.

| theme | token | vs `bg` | vs `panelBg` |
|---|---|---|---|
| ashen-gold | parchment | 15.13 | 14.38 |
| ashen-gold | bone | 6.49 | 6.17 |
| ashen-gold | sulfur | 9.75 | 9.26 |
| ashen-gold | blood | 5.39 | 5.12 |
| ashen-gold | rust | 4.89 | 4.64 |
| ashen-gold | heal | 7.44 | 7.07 |
| ashen-gold | parchmentDim (composited) | 6.66 | 6.58 |
| coastal-verdant | parchment | 15.77 | 14.70 |
| coastal-verdant | bone | 6.55 | 6.11 |
| coastal-verdant | sulfur | 8.47 | 7.90 |
| coastal-verdant | blood | 6.68 | 6.23 |
| coastal-verdant | rust | 4.97 | 4.64 |
| coastal-verdant | heal | 8.36 | 7.80 |
| coastal-verdant | parchmentDim (composited) | 6.95 | 6.75 |
| ember-depths | parchment | 14.91 | 14.14 |
| ember-depths | bone | 6.69 | 6.35 |
| ember-depths | sulfur | 8.40 | 7.97 |
| ember-depths | blood | 5.73 | 5.43 |
| ember-depths | rust | 4.86 | 4.61 |
| ember-depths | heal | 8.30 | 7.87 |
| ember-depths | parchmentDim (composited) | 6.51 | 6.42 |
| frost-marrow | parchment | 15.89 | 14.96 |
| frost-marrow | bone | 6.35 | 5.98 |
| frost-marrow | sulfur | 8.71 | 8.20 |
| frost-marrow | blood | 5.73 | 5.39 |
| frost-marrow | rust | 5.19 | 4.89 |
| frost-marrow | heal | 8.61 | 8.11 |
| frost-marrow | parchmentDim (composited) | 6.97 | 6.81 |
| plague-bloom | parchment | 15.62 | 14.66 |
| plague-bloom | bone | 6.73 | 6.31 |
| plague-bloom | sulfur | 10.65 | 10.00 |
| plague-bloom | blood | 5.72 | 5.37 |
| plague-bloom | rust | 5.23 | 4.90 |
| plague-bloom | heal | 8.55 | 8.02 |
| plague-bloom | parchmentDim (composited) | 6.88 | 6.69 |

**Every pair clears AA (4.5:1), including the `rust` pairs the burn-day audit's
row 3.10 caught below the line.** The site ships the corrected `rust` values
(ashen-gold `#c36431`, coastal-verdant `#478b83`, ember-depths `#cd5a2a`); an
earlier draft of the prototype carried a lightened `#cf7440` and was corrected
to the committed token — the discipline is the point.

`ash` measures 1.74-1.94 against both grounds on every theme and is therefore
**borders and disabled furniture only, never text** — the same rule the app
carries from the Phase V8 critic-loop finding. `scripts/devlog-tokens.test.mjs`
asserts it stays that dim, so nobody can satisfy the gate by promoting `ash`
into the readable set.

Body prose renders at `--parchmentDim` (`parchment` at 0.65). **Composited
against `bg` that is 6.66:1 on ashen-gold** — an earlier draft of this document
claimed 9.2:1, which was wrong, and the corrected figure is measured by the
same code as every other row in the table. The dimmed register is a real token,
not an accessibility hole, at either number; the point of writing it down is
that it is now checked rather than asserted.

The stance palette is the one family of colours that is NOT a theme token: the
dice palette (`STANCE_COLORS` in the combat presenter — body RED `#d6543f`,
mind BLUE `#4f7fd6`, heart PURPLE `#9a5fd0`, wild GOLD `#d9b44a`). It is
identity, it is not theme-driven in the app either, and the build reads it from
the presenter rather than reproducing a guess. It is used for FRAMES only, and
every stance clears the 3:1 meaningful-non-text floor against the plate ground
on all five themes (measured: 4.68-10.22).

Gate: a pair that cannot be measured is a pair that does not ship.
`scripts/devlog-tokens.test.mjs` asserts all six readable tokens against both
grounds on all five themes, plus the composited prose register — the gap row
3.10 was found in.

---

## 2. Type

The app's type system is identity and is **not** theme-driven. The web uses the
same four families, all open-licence and all self-hostable (SIL OFL 1.1 for
Pirata One, IM Fell English and Bebas Neue; OFL for JetBrains Mono). Nothing
new is licensed for the site.

| role | family | app equivalent |
|---|---|---|
| display, post titles, card names | Pirata One | `FONTS.gothic` |
| body prose, ledes, descriptions | IM Fell English | `FONTS.serif` |
| eyebrows, labels, keywords, buttons | Bebas Neue | `FONTS.sans` |
| dates, commits, captions, stat rows | JetBrains Mono | `FONTS.mono` |

Scale (fluid; the app's fixed sizes are the floor, not the ceiling — a browser
is not a 375pt phone):

```
hero title    clamp(46px, 11vw, 110px)  Pirata One
post title    clamp(34px, 7vw, 60px)    Pirata One
section head  clamp(25px, 4vw, 34px)    Pirata One
lede          clamp(18px, 2.3vw, 21px)  IM Fell English
body          17px / 1.6                IM Fell English
secondary     15-16px / 1.6             IM Fell English, --parchmentDim
eyebrow       11px, .28em tracking      Bebas Neue, --sulfur
label         12-13px, .14-.20em        Bebas Neue
mono          11-12.5px                 JetBrains Mono, --bone
```

Measure is capped at 56-62ch on every prose block. Dates are set as lowercase
roman numerals (`xxix · viii · mmxxvi`) with the machine-readable date in a
`<time datetime>` attribute for the feed and for search.

The build serves the four families from Google Fonts with `display=swap` and a
full local fallback stack behind each. Self-hosting them (a subset in-repo) is
the better end state and is filed as a follow-up: it removes a third-party
request from a public page. Until then the page is correct with the CDN blocked
— the fallback stack is a design decision, not a safety net.

---

## 3. Spacing and measure

The app's `SPACING` scale (4 / 8 / 16 / 24 / 32) carries over unchanged as the
rhythm; the web adds two larger steps for page-level bands (54, 90). Column
widths: 700px (about), 760px (post, landing), 880px (index),
1080px (catalog grid and the header). Everything is fluid below those caps —
there are no fixed pixel widths on text containers.

---

## 4. The chronicle chrome, and how it degrades at 375px

- **Dagger eyebrow + hairline rule** — the standing header convention, lifted
  verbatim from the app's `EventCodexHeader` pattern: a Bebas label prefixed
  with the dagger in `--sulfur`, a 1px `--divider` rule beneath it. Used once
  per page band. It costs one line of height and never degrades.
- **The two-token mono strip** — `ENTRY LIV` left in `--blood`, the roman date
  right in `--bone`, a rule under both. The post header. At 375px the two
  tokens stay on one line; they are both short by construction.
- **Hairline-framed plates** — every image sits in a 1px `--ash` frame with a
  `--deepBg` mat, exactly as the card face frames its art. The newer capture in
  a pair is framed in `--sulfur` instead. This is the whole labelling system at
  a glance.
- **Panels** — `--panelBg` ground, 1px `--ash` border, no radius above 4px.
- **Torn edges (`TornPanel`) are deliberately not ported.** The app's jagged
  SVG mask is seeded per-instance and costs a path per panel; on a page with
  twenty panels it buys texture nobody asked for and breaks text selection at
  the edges. The hairline rule carries the same "hand-cut page" reading for
  nothing. Recorded as a call, not an oversight.
- **At 375px**: the header nav wraps to a second row (it is flex with gap, not
  a scroller — a scroller hides items) and the theme label drops to
  assistive-technology only so the header never takes three rows; the catalog
  grid falls to one column at 168px minimum; before/after pairs stack
  before-then-after; the post's marginalia panels are collapsed by default at
  every width.

---

## 5. Iconography

No new marks are drawn for this site. The app's canon (`components/icons/`,
game-icons.net geometry, CC BY 3.0 / CC0 per artist) transfers as-is for any
mark the site needs.

Where the site needs a mark the registry does not have, it uses type, not a new
drawing: the dagger for the eyebrow, the lozenge for the free-effect pip, the
arrows on the wipe handle, `+`/`-` on the panel disclosures. A hand-drawn
one-off SVG here would repeat exactly the duplication Phase V1 killed in the
app.

Attribution for every published mark and plate renders on the About page and
travels with the asset — a licence that requires attribution and does not get
it is a licence violated, and the catalog publishes art publicly. See §10.

---

## 6. Motion

Motion is used in exactly two places.

1. **The landing hero** — a parallax drift: the Doré plate behind travels
   slower than the holed overlay sheet in front, so the world moves inside the
   holes as you scroll. Driven by one passive scroll listener writing two
   transforms; no library, no observer per element. Two alternates were built
   and rejected as primary (`devlog/design/prototype-hero.html`): the bloom,
   which depends entirely on the overlay's edge quality and reads as a filter
   effect at small sizes, and the lift, which is calmer but says "a page
   turned" rather than "there is a world behind this".
2. **The tap-to-swap before/after** — a 160ms opacity cross-fade, so the eye
   can tell a swap happened rather than wondering if it mis-tapped.

`prefers-reduced-motion: reduce` removes every transform. The hero becomes a
cross-fade from the holed sheet to the plate over the same scroll distance; the
swap becomes instant. **The title never rides the animation** — it is legible
at every scroll position in every motion setting, which is why the reduced
answer is a downgrade in spectacle only, never in information.

The holed sheet itself is generated (`assets/hero-sheet.svg`, drawn by the
build from a fixed hole layout) rather than a bitmap: the prototype's overlay
was a placeholder of unknown provenance, and this site does not publish art it
cannot account for. A hand-cut sheet can replace it by dropping a licensed file
in its place.

---

## 7. The before/after component

This is the reason the site exists, so it is specified in full. Every state
below is demonstrated in `devlog/design/prototype-components.html`.

### The primary: the labelled pair

Two plates side by side, each with its own caption chip — `BEFORE · 11 AUG` in
`--bone` with a bone pip, `AFTER · 29 AUG` in `--sulfur` with a sulfur pip and
a sulfur frame. Below 560px the grid falls to one column, before first.

Chosen over the alternatives on four counts:

- **It answers "which is new?" before any interaction.** The slider and the
  toggle both require the reader to act before they know what they are looking
  at. For a stranger's first fifteen seconds that is fatal.
- **It works with no script, and it prints.** The pair is two children of a
  grid. Nothing about it is an enhancement.
- **It is one thumb-free read.** A drag rail on a phone puts a thumb over the
  interesting part of the image at exactly the moment of comparison.
- **It survives three aspect ratios without a layout break** (below).

A date on a chip is printed **only where the pipeline can prove it**. The
capture manifest (`devlog/assets/<date>/manifest.json`) records the ref the
older plate came from; without it the older chip carries no date at all. A
guessed date on a piece of evidence is worse than no date.

### The alternates, and where each earns its place

- **Tap to swap** — same frame, both states, one hit target (the whole plate,
  never under 44px). Better than the pair for a *small* difference, because the
  eye compares in place instead of across a gutter. Keyboard: it is a real
  `<button>`, so space and enter work; `aria-pressed` carries the state and the
  visible label changes with it. Reserved for single-element changes (a
  relabelled box, a moved medallion).
- **The wipe** — a dragged rule, pointer events with capture, arrow keys at 5%
  steps plus Home/End, `role="slider"` with a live `aria-valuenow`. It is the
  most satisfying and the least honest: half of each image at all times, and
  nothing at all for a reader who never drags. Reserved for pairs that differ
  everywhere at once (a whole-screen retheme), never as the default.

Both alternates are built by upgrading a rendered pair in place, so the pair is
what a scriptless reader gets and the upgrade cannot lose information.

### The third image — the diff

**The pixelmatch highlight is never shown to the public reader.** It is a build
artifact: a magenta noise field that reads as corruption to anyone who has not
seen one before, and on the captures in this tree most of its area is
whole-page text reflow rather than the change being described. It stays
internal, where it does its real job — the 2% significance gate that decides
whether a pair is worth publishing at all. The public page shows the two real
plates and a sentence.

### Aspect ratios — one component, three shapes

| shape | ratio | layout |
|---|---|---|
| phone screen capture | 9:19.5 | side by side; the two tall plates fit a 760px column at ~150px each |
| card plate | 3:4 | side by side, tighter grid; the pair reads as two cards on a table |
| arena / map plate | 16:9 | **stacked**, before over after, so a wide image keeps its width |

The rule is one line: `grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))`
for shapes taller than 1:1, an explicit stack for shapes wider than 4:3. The
image box is always reserved at the capture's own ratio.

### A fourth shape: the rules-text pair

An affliction's before/after is its rules text and its carriers. A picture of a
sentence is an invented picture, so the component has a text mode: the two
readings side by side, the newer one in `--parchment` inside a `--sulfur`
frame, the older dimmed. Same labels, same reading order, no image.

### Loading, and no-JS

- **Loading**: the box is reserved at the capture's ratio and filled with a 45
  degree hatch in `--panelBg`/`--deepBg` — no spinner, no skeleton shimmer. The
  page does not move when the plate arrives, and the hatch is the same texture
  vocabulary as the woodcut ground.
- **No JS**: the pair is the base state. The swap renders as a labelled pair;
  the wipe renders as a labelled pair. Nothing that carries meaning is behind a
  script.

### Alt text — the rule the pipeline implements

Per image, never per pair:

```
The <screen> screen <before|after> the change: <one visible difference, plain words>.
```

The difference clause is taken from the work item's own `**What:**` line,
trimmed to its first clause and lower-cased unless it opens on a keyword. It is
never generated freshly (no model call runs in the nightly), never "a
screenshot of the app", and never identical between the two images of a pair.
**A pair whose work item has no usable what-line does not publish an image** —
it publishes the sentence saying no capture exists. Missing evidence is stated,
never faked. `scripts/build-devlog-public.test.mjs` asserts every image on
every page carries alt text, and that the two halves of a pair never share it.

---

## 8. Page types

| page | what it does | the one thing it must not lose |
|---|---|---|
| Landing | full-height plate + title, nothing else above the fold; then what the game is, then the newest entry with a live pair | a stranger understands within one screen and wants to scroll |
| Post index | chronological, filterable by the five categories, each row a date, title, one-line summary, category chips and a thumbnail; paginated at twenty | enough of each post to choose one |
| Post | roman-numeral header, lede, work-item cards (what / why / pair / commits), marginalia | the **why** is the headline field, never the commits |
| Catalog | cards, foes, afflictions; card plates drawn as the game draws them | browsable enough to get interested, not a data dump |
| About | what the game is, how an entry is made, what is withheld, licences | the licence attributions render here |

### The panels — the ruling

The entries carry four panels written for an internal reader. Decided:

- **`While you were out`** -> published, collapsed, retitled *The night's watch
  — what ran while nobody looked*. It is the most human thing in the entry:
  proof the work happened on a schedule.
- **`Tuning proposals`** -> published, collapsed, retitled *The measure — did
  the fighting change?* The measured baseline and its stamp ride along with any
  number, per the repo's "measured truth" rule.
- **`Queues now`** -> published, collapsed, retitled *What is still
  unfinished*. It is the honest counterweight to a page that otherwise only
  shows wins.
- **`Needs you`** -> **held back.** It is correspondence between the maintainer
  and his tooling — permission grants, rulings, open threads. It is addressed
  to one person and reads as such. The player-facing half of it (the boss that
  can flatten a new pilgrim, the silent map tap) is promoted by `/digest` into
  *What is still unfinished*, so nothing about the game's real state is hidden;
  only the correspondence is. A line at the foot of every post says so plainly.

Any other panel publishes under its own title, collapsed. Panels are public by
default — an entry's panels describe the day's work, and the site exists to
publish the day's work — and the build names any panel it did not recognise so
a new internal panel is noticed the night it appears, not a month later.

---

## 9. Payload budget

Weight is a design constraint with a number attached. A page's weight is its
HTML, the shared CSS and script, the four font families, and every image the
page references — the whole page a reader who scrolls all of it pays for. The
build measures it and `--strict` refuses to publish a page that blows it.

| page | budget | what keeps it there |
|---|---|---|
| Landing | **900 KB** | one plate (~300 KB WebP) + one generated overlay + exactly one before/after pair, lazy below the hero. No post list. |
| Post index | **400 KB** | one thumbnail per row, derived at 320px and lazy — never the full capture. Twenty rows per page, then paginate; fifty-four entries never load at once. |
| Post | **1.4 MB** | every pair after the first is lazy; captures are served at 2x the rendered box and no larger. A post with more than six pairs is a post that needed two entries. |
| Catalog | **1.1 MB** | art is 1:1 and small (the app's own art is 8-40 KB WebP); the grid is lazy below the fold; filtering is client-side over already-loaded plates, never a refetch. |
| About | **200 KB** | text and rules only. |

Fonts: four families, one weight each, `display=swap` — ~120 KB total, cached
across every page and counted against every page's budget. This is the single
largest fixed cost on the site and it buys the identity, so it is spent once
and never grown.

The rule that actually holds the line: **the index never loads a full capture,
and no page loads a pair the reader has not scrolled to.** A year of posts is
hundreds of pairs; the only design that survives that is one where the number
of images on screen is bounded by the viewport, not by the archive.

One more rule the build discovered: **never re-encode an image that is already
inside its box.** The plates are dense engravings already published as WebP; a
"derivative" at the same width came back 16% heavier than the source. Where
that happens the build ships the file the game ships.

---

## 10. Licences — what the catalog may and may not publish

**The art licence question is closed (T, 2026-10-29, D115):** "The images we
use for everything are open source." Every image the game and the DevLog use is
open source, and the public catalog publishes all of it. Nobody re-opens that.
The build still gates every image on the per-directory `provenance.json`
records (`scripts/devlog-art-licence.mjs`), so a third-party file that arrives
later must record its own licence:

| directory | licence on record | published |
|---|---|---|
| `maps/` | public domain; the Act 1 plates owner-generated | yes |
| `combat/`, `splatter/` | public domain | yes |
| `enemies/`, `cards/`, `portraits/`, `treasure/` | `open source (T, 2026-10-29, D115)`; torio free material (the Blood Price art, the Act 1 boss and elite) | yes |

The gate has three `open` forms and nothing broader: the exact D115 string, the
torio free-material grant and the owner-generated record. A card plate whose
record names no licence (an empty licence, `UNRESOLVED`, or one the gate does
not recognise) publishes its frame, its name and its ledger, and says in the
frame the painting would fill that the painting is withheld, no licence on
record.

An attribution licence publishes only where the provenance names the artist,
and the attribution renders on the About page. `acquire-art.mjs` refuses
attribution licences outright "until the build has an attribution surface" —
this site is that surface, which is why CC BY art may publish here and may not
be acquired there.

---

## 11. What the build changed about this design, and why

Every item is a decision made while implementing, recorded here rather than
left for a reader to spot:

1. **The stance mapping was wrong in the prototype.** It coloured a card's
   frame by philosophical aspect as body -> `blood`, mind -> `sulfur`, heart ->
   `rust`. The shipped mapping is the dice palette (§1). The build reads
   `STANCE_COLORS` from the combat presenter, as residue item 7 required.
2. **`parchmentDim` measures 6.66:1 on ashen-gold, not 9.2:1.** The earlier
   figure was wrong. The table now carries the composited number for every
   theme and the gate asserts it.
3. **The card renderer emits SVG, not PNG.** The nightly runs unattended with
   no browser and no model call; SVG is deterministic, ~2 KB, scales to any
   box, and carries the card's whole printed text in `<title>`/`<desc>` for a
   screen reader. It renders the card's printed TEXT in the shipped face's
   layout — not its typography and not its art — and the site captions it as
   such. A renderer that flatters the card is worse than no renderer.
4. **The hero's holed sheet is generated** (§6), because the prototype's
   overlay had no provenance.
5. **The marginalia are `<details>`, not scripted disclosures**, so they open
   with JavaScript off.
6. **The entry grammar gained three fields**, shared by both sites:
   `**Evidence:** <kind> <id> — <caption>` for a non-screen pair,
   `**No capture:** <sentence>` for a change with no picture, and an optional
   title on the date heading (`# 2026-09-20 — A public log, at last`). Two
   latent bugs in the shared grammar were fixed at the same time: a headline
   and a field value now run on across wrapped lines instead of truncating at
   the first, and a bracketed heading in the older vocabulary (`[docs]`,
   `[combat]`, `[mobile]`) renders as the work item it is rather than falling
   through to the panel branch.
7. **A page's budget counts every image it references**, not just what paints
   first (§9), because that is the number that regresses.

### Residue — what is provided, and what is still open

The build session's own list, honestly split.

**Provided by the build:**

1. Derived tokens in the emitted stylesheet (`devlog-tokens.mjs`).
2. Per-image alt text to the §7 rule, with the missing-what-line refusal.
3. A 320px WebP thumbnail derivative for the index.
4. A machine date (`<time datetime>`) beside every rendered numeral, and an
   Atom feed built from it.
5. Category counts per entry, derived from the parse.
6. The affliction glyph and colour, from the catalog export.
7. The real stance mapping, read from the combat presenter.
8. A paginated index past twenty entries.
9. A contrast gate in `npm test` over the emitted token sheet, covering all six
   readable tokens against both grounds on all five themes.

**Still open, named rather than dropped:**

- **Self-hosted fonts.** The site loads four families from a third party. A
  subset in-repo removes that request. (§2)
- **Keyword carriers in the rules pair.** An affliction's pair carries its
  rules text; "which cards carry it" is not in the export yet.
- **Measured-balance evidence.** A tuning change's before/after is the measured
  delta, and the baseline's stamp must ride with any number. The panel is
  published and authored; deriving the delta automatically from
  `deck-matrix-baseline.json` is not built.
- **Equipment.** Cards, foes and afflictions have pipelines; the signet relics
  and consumables are not in the catalog export.
- **A hand-cut hero sheet**, to replace the generated one.
- **Art that is still withheld.** None today: the licence question is closed
  (D115) and the catalog shows every painting. A new third-party file with no
  licence on record is withheld and its plate says so.
