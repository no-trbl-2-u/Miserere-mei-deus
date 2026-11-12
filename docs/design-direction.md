# The design direction

What the screens of Miserere Mei, Deus should look like, and why. Written for
spec 156 (chunk 156.1) on 2026-11-06. Read it before any UI work, before the
colour ballot (156.6) and before the design audit (156.4).

## Why this page exists

A friend of T's said the screens look made with Claude design. They were, and
T does not want them to read that way (T, 2026-11-06). A second outside read
of one of T's pages named five tells. This page answers each of them by name,
sets the direction the audit checks against, and grounds it in the game's own
art, because T asked for that: "I want to lean into the art/style of our
portraits and enemies if you can extract information from the images to help."

Two things this page is not:

- **Not a UI change.** It directs; later chunks build.
- **Not new content.** It describes the art that exists and directs the
  interface around it. Words a player reads are T's (D88). New art (frames,
  textures, kit pieces) is T's too.

**How firm the evidence is.** Thin. The sources below are a skill file, a
cookbook, three blog posts, a tells list and a devlog. None of them is a
controlled test of what makes a screen read as generated; they are
practitioners' experience. The firmest are Anthropic's own frontend-design
skill and frontend-aesthetics cookbook, and the post by the designer who built
Claude Design. Treat every rule here as a direction to check against a real
screenshot, not as a proven law.

## The five tells, by name

An outside reviewer read one of T's pages and named these. Each row says
where it comes from in the code today and what replaces it.

| Tell | Where it is today | What replaces it |
|---|---|---|
| Near-black warm brown background | The default theme `ashen-gold` in `axiomancer-mobile/theme/palette.ts`: `bg #0b0a09`, `panelBg #15110c`, `dockBg #100c08` | The art's own grounds: the void black the portraits and enemies stand on, the neutral grey of the Doré plates, or the vellum page. None of the art sits on brown-black (see "What the art does"). |
| Muted gold accent on everything | `sulfur #dcb04a` on labels, borders, numbers and selected states | One accent per screen, on its one bold element (part 3), drawn from the hue of the figure the screen is about. Brass stays where T's kit put it, as a material, not as a text colour. |
| Gothic or blackletter titles | `FONTS.gothic`, Pirata One, about 181 uses | T's font ballot retires Pirata One. Titles go to Uncial Antiqua, an uncial (a rounded early-manuscript hand), set in mixed case and never tracked. |
| Condensed ALL-CAPS buttons | `FONTS.sans`, Bebas Neue, about 243 uses, nearly always capitals with 1 to 2 points of letter spacing | Buttons in Uncial Antiqua, title case, normal width, no added tracking. Hierarchy comes from size and the kit piece behind the word, not from capitals. |
| Tiny letter-spaced mono labels | `FONTS.mono`, JetBrains Mono, about 220 uses, mostly labels and numbers | Small labels in Marcellus SC (true small capitals, at 12 pt or larger); big numbers in Spectral, small counts in Grenze. Monospace stays only in debug. |

Counts are from spec 156's read of origin/main on 2026-11-06.

## The direction, in six parts

### 1. Hand-made surfaces over drawn rectangles

A painted frame, a texture or a kit piece reads as made. A coded box with a
1 px border and a radius reads as generated. Game developers told their UI
"looks AI" got the same advice: use real art (the itch.io devlog below).

In this game the hand-made surfaces already exist: T's Brass Gothic and
Vellum & Ink kit (`axiomancer-mobile/assets/images/experience/`, placed by
specs 152 to 155 per T's kit-mixer picks). Where a container is needed and no
kit piece is on record for that place, prefer no container: let the content
stand on the ground the way a portrait stands on black.

### 2. The ban list

The published AI-design tells, as they show up in this game:

- monospace for anything but debug;
- tracked-out condensed capitals as the default label;
- one radius and one hairline border on every panel;
- translucent accent washes instead of a painted ground (`sulfurSubtle`,
  `bloodSubtle` and their kin);
- centred stacks of identical cards;
- every button styled as primary;
- thin generic icons over every heading;
- text that sounds like a product ("Build faster").

Plus the five tells above, which overlap with it. A screen may break one of
these on purpose, once, and say why in its PR.

### 3. Be bold in one place

Each screen has one element that is its memorable thing, and the rest stays
quiet. Anthropic's frontend-design skill: "Spend your boldness in one place."
The accent colour, the largest type and any motion belong to that element.
Everything else uses the ground and the ink.

The art already works this way: every portrait and enemy is one figure, alone
and centred on black, in one dominant hue (see below). A screen should read
the same: one figure, and quiet around it.

### 4. Each screen has an emotional job

One line of what the player should feel there, such as "judged" or
"tempted". The research found no proof that mood words beat a specific visual
brief, so the job never travels alone: it always comes with concrete
constraints (the ground, the bold thing, the type roles, what is left out),
and it is checked against a screenshot, not trusted as a prompt word.

The audit (156.4) drafts a job per screen for T to confirm. This page does not
write them.

### 5. The manuscript, not the app

Margins, drop capitals, rubrication (a key word set in the accent, as a
scribe set headings in red), uneven edges and overlap, over grids of tiles.
Reference real manuscripts and printed books, not other apps. The vellum kit
pieces, with their torn edges and inked leaf corners, are already this; the
type ballot's picks (an uncial, a calligraphic italic, an old-style book face)
are too.

### 6. The method

- **Critique before you redesign.** Render the screen at 390×844 and fill a
  table, without changing anything yet:

  | Where | Why it reads as AI | Fix |
  |---|---|---|

  Then fix the top three only.
- **Many directions, then remix.** For a screen that needs more, mock several
  distinct directions, each from a different named reference (a manuscript, a
  printed book, a game, one of the game's own paintings), and let T remix. The
  Claude Design blog's advice, as the plot session summed it up: "ask for ten
  options, then remix". 153.7's three-direction
  Deck page is the house shape for this.
- **Brief with specifics.** The frontend-aesthetics cookbook's point: a model
  left to itself converges on the same safe look, so name the typeface, the
  ground, the reference and what to avoid. This page is that brief.

## What the art does

The files read for this section, all under `axiomancer-mobile/assets/images/`
unless named otherwise. Colours were sampled from the pixels (median-cut over
the opaque pixels of each image; ink and light are the mean of the darkest and
lightest 5%). Hexes are rounded samples, not the painters' intent.

- **Portraits:** all 15 in `portraits/` (air-elemental-lord, altair-man-d,
  bard, biwa-houshi-1, dwarf-lordess, dwarf-princess, elf-fighter-d,
  elf-mage-dark, fairy, gignos-cleric-a, gignos-male, haniel-e, kunoichi-c,
  master-thief, paladin-cursed-b).
- **Enemies:** all 23 stills in `enemies/`, plus `enemies/anim/wrecker/wrecker-00.webp`.
- **Cards:** `cards/df-e-01c.webp`, `cards/bp-e-01n.webp` and the first
  Merciful and Elementalist card in `cards/`.
- **Plates:** `title/lion-in-the-wood.webp`, `maps/act1-coast.webp`,
  `maps/act1-forest.webp`, `maps/the-pit.webp`,
  `combat/arena-breakwater-kuste-bei-mondschein.webp`,
  `combat/arena-lantern-deep-pandemonium.webp`, and the `provenance.json`
  beside each set.
- **Kit:** `experience/` menu-panel-dark, menu-panel-vellum,
  modal-panel-vellum, action-button-idle, action-button-vellum, end-turn-idle,
  character-portrait-frame, divider-ornate-brass, divider-ornate-ink,
  corner-brass-left, corner-ink-left, item-card-vellum, filter-tab-vellum,
  filter-tab-dark-selected, combat-intent-oxblood, nav-dock-dark.
- **The written direction:**
  `art-department/masters/cards/prompts/art-direction.md` (with its two
  "Superseded" banners), `art-department/masters/cards/defender/sheet-1-prompt.txt`,
  `art-department/masters/cards/blood-price/sheet-5-prompt.txt`,
  `art-department/masters/cards/merciful/sheet-1-prompt.txt`, and
  `art-department/README.md`.

### The look of record

The card art direction was rewritten twice. Since T's sheets of 2026-10-30
evening, the look of record is the app's own character-portrait style:
"Japanese fantasy RPG illustration, fine ink contours, cel-shaded colour
planes; "NOT Dore engraving"" (the first banner of `art-direction.md`). The
Merciful prompt spells it out: "delicate dark ink contours, angular economical
cel shaded color planes, subtle hand drawn texture, pale warm ivory and muted
gold". The Defender prompt: "fine delicate outlines, pale parchment/ivory
surfaces, restrained washed watercolour colour fills, thin etched ornamental
armour detailing, flat graphic shapes mixed with subtle illustrative shading,
angular elegant silhouettes, slightly rough textured hand-painted edges".
What still holds from the older page: black ground, no text in the art, a
centred subject with room around it.

The Blood Price sheet 5 prompt still asks for "hand-coloured engraving, dense
cross-hatching, heavy ink outlines", so the card set is not wholly one style;
the portraits are.

### The portraits

| Quality | What they do | Seen in |
|---|---|---|
| Line | A fine, even ink contour around every shape, and a few interior lines for folds and plate edges. No cross-hatching. The ink is near black but leans toward the figure's hue: `#110402` on the orange dwarf-lordess, `#04030B` on the violet elf-fighter-d, a soft brown `#392D1E` on the pale gignos-cleric-a. | all 15; ink sampled from the four named |
| Colour | Flat cel planes, two to four values per hue, no gradients. Each figure is **one dominant hue plus ivory plus ink**: violet `#816DB7` and ivory on gignos-cleric-a, orange `#D37932` and pale gold on dwarf-lordess, lapis `#566EC6` and white on elf-mage-dark, jade `#48907B`/`#65D3A5` on bard, ochre `#DEBE61` on biwa-houshi-1, periwinkle `#7E72BA` on elf-fighter-d. Some are almost colourless: paladin-cursed-b is bone grey (`#878473` to `#DDDCCE`, saturation under 20%), master-thief slate `#686676`. | all 15 |
| The light | The lightest value is a warm ivory, not white: `#FEF8E2` (gignos-cleric-a), `#FDF8E4` (dwarf-lordess), `#FEF9DB` (dwarf-princess). Cool figures go cool: `#F2F2F8` (haniel-e). Light is flat and frontal; there is little modelling and no cast shadow. Ivory is a material (vestment, plate, skin), not a lighting effect. | ivory sampled from the four named |
| Glow | Where there is magic it is a contained halo or trail on the black: the blue trail round elf-mage-dark, the cyan orbs round biwa-houshi-1, the speckled amber dust round fairy and the speckle round bard. | those four |
| Texture | Slightly rough hand-painted edges and a fine speckle in the glows; the fills themselves are clean. | close view of gignos-cleric-a |
| Ornament | Flat graphic emblems on cloth and metal, drawn not rendered: the fleur and cross on the cleric's shield and tabard, the rosette on elf-fighter-d's shield, the crest on paladin-cursed-b's shield. | those three |
| Composition | One full-length figure, centred, alone on pure black, generous empty space round it, an angular readable silhouette. No ground, no horizon, no scene. | all 15 |
| Mood | Calm, solemn, poised. Figures stand or move with restraint; faces are composed. | all 15 |

### The enemies

The same family, pushed darker and harder.

| Quality | What they do | Seen in |
|---|---|---|
| Line | Heavier contour than the portraits and visible dry-brush streaks and hatching inside the shapes (the robe of tithe-collector, the plate of toll-keeper, the hide of bilge-stalker). gallows-crow is the exception: a white-line engraving on black, no colour at all (`#FFFFFF` only). | tithe-collector, toll-keeper, bilge-stalker, gallows-crow |
| Colour | Still one dominant hue per figure, and more saturated than the portraits: curfew-ringer flame `#F07A1A`/`#FA3E32` (saturation above 85%), saltwick-swarm cyan `#0FC1F6`/`#47F8FB`, float-eye orpiment `#FFC701`, green-jelly `#44AC18`/`#87F465`. The calmer ones sit in earths and iron: tithe-collector vermilion-rust `#DC6C4B`/`#A8462A`/`#76391F`, toll-keeper's umber plate `#5E4334`, crane-hook iron `#2C3236`/`#545B5F`, quay-crab `#4C6B61`, wreckmaster violet-iron `#2E2A3B`/`#5A5564`. The coast's sea creatures share a verdigris and ultramarine family: wrecker `#4B9487`/`#84DEDE`, tide-gate `#1B6F52`/`#70C592`, saint-beneath `#5ECFB2`, cave-choir `#4E64B6`/`#283479`, net-mender `#4C91C1`. | all 23 stills |
| The light | Bone and ivory as the lightest value again (`#ECCEA5` on tithe-collector, `#CFCA9E` on wreckmaster), or the hue itself at full strength where the foe glows (saltwick-swarm, float-eye). | samples named |
| Glow | Strong coronas: the orange ring round death-beholder, the yellow ring of float-eye, the cyan smoke round wrecker's dark boatman silhouette (its whole hue is the smoke) and the speckled blue haze round net-mender. | those four |
| Ornament | Flat bands on cloth: the zigzag key border down tithe-collector's stole, the gold frogging on wreckmaster's coat. | those two |
| Composition | One figure, centred, on black, as the portraits. | all 23 |
| Mood | Menace with a grin: grotesque faces (lamprey-knot, death-beholder, the human face on saint-beneath), hooded threat (curfew-ringer, tithe-collector). Grim, not gory, as `art-direction.md` asks. | named |

### The cards

The card tiles looked at follow the portrait family (one action, centred on
`#000000`, a single hue plus ivory: the gold gauntlet of `df-e-01c`, the
blood-red of `bp-e-01n`, the pale gold jar of the first Merciful card, the
fire ring and lapis figure of the first Elementalist card). The metal on them
(the Blood Price bowl, the gauntlet) is more rendered and glossier than on the
portraits, and close to the kit's brass.

### The Doré plates

| Plate | What it is | Colour |
|---|---|---|
| `title/lion-in-the-wood.webp` | Doré's Inferno, Canto I: dense cross-hatched forest, one slit of sky at the top | neutral greys, `#010101` to `#282828`; 88% of pixels darker than a quarter of full brightness |
| `combat/arena-*.webp` | public-domain paintings (Friedrich, Böcklin, John Martin, Doré and others), graded "grayscale, brightness 0.62 / contrast 1.08 toward the void" (their `provenance.json`) | neutral greys, `#040404` to `#3A3A3A` in the two sampled; no chroma at all |
| `maps/the-pit.webp` and the other Doré map plates | Doré engravings | neutral greys `#191919` to `#737373` |
| `maps/act1-*.webp` | machine-generated "in the manner of Gustave Doré; not a Doré plate", tinted to one parchment ramp (black 28,20,12 / mid 168,150,122 / white 246,234,212, i.e. `#1C140C` / `#A8967A` / `#F6EAD4`) | warm sepia: `#574A39`, `#AA9B83`, `#C8BAA1`, `#E1D3BB` sampled from act1-coast |

The plates are line and tone with no colour. The UI shows the backdrops
dimmed (`ScreenBg`), so on a phone they read as a dark grey texture behind the
screen, and the Act 1 maps as a pale sepia page.

### The kit (Brass Gothic, Vellum & Ink)

T's own pieces (`experience/provenance.json`: owner-supplied, T).

| Piece | What it is | Colour |
|---|---|---|
| Brass (menu-panel-dark, action-button-idle, corner-brass-left, character-portrait-frame, divider-ornate-brass, nav-dock-dark) | Rendered metal: bevels, specular highlights, Gothic pinnacles and quatrefoils, round a dark leather-like fill | fill `#2E2A24`, `#1E1B16`; brass `#7D5D33` to `#B7945D`, highlight `#E5C88E` |
| Vellum (menu-panel-vellum, modal-panel-vellum, action-button-vellum, item-card-vellum, filter-tab-vellum) | Painted parchment with torn, deckled edges, a ruled inner border and inked leaf corners | `#DABE94`, `#CEAF82`, `#E3CBA5`; edge `#9E815B` |
| Ink (corner-ink-left, divider-ornate-ink) | Drawn ink ornament: leaves and a thin rule | `#44392F` to `#695D4F` |
| Oxblood (combat-intent-oxblood) | A dark disc in a red-clay ring | ring `#B4604A`, `#65372C` |

### Where they agree, and where they clash

**They agree on:**

- **The ground is black, or the page.** Every portrait, enemy and card tile
  stands on pure black (`#000000`; the card rules require it). The Doré
  plates are neutral grey. The maps and the vellum are a warm page. **No piece
  of art sits on a warm brown-black.** The `ashen-gold` ground is the UI's
  own invention, and it is the first tell.
- **Ivory is the light.** The portraits' ivory (`#FEF8E2`), the map ramp's
  white (`#F6EAD4`) and the vellum (`#E3CBA5`, darker) are one family of warm
  paper and bone.
- **Ink is a line, not a box.** The portraits' contour, the vellum's inked
  leaf corners and ruled border, and the engraving line all draw edges by hand.
- **One subject, room round it.** Figures, card actions and the title plate's
  lone pilgrim are single subjects in a lot of dark.

**They clash on:**

- **Brass is rendered; the figures are flat.** The kit's brass has bevels and
  specular light, like a 3D render; the portraits are flat cel planes with a
  contour. Brass beside a portrait reads as two different hands.
- **Brass is gold, and gold is the second tell.** The art uses gold as one
  figure's hue (dwarf-lordess, biwa-houshi-1, gignos-male, float-eye), not as
  the frame round everything. Brass on every panel puts gold on everything
  again.
- **Hatching versus planes.** The Doré plates and the old engraved card
  direction are dense cross-hatching; the portraits forbid it. The two meet
  only because the plates are dimmed into a backdrop. A UI element drawn in
  hatching would side with the plates against the figures.
- **Colour versus none.** The figures are saturated single hues; the plates
  have no chroma. That contrast is good: it is why a figure pops off the
  backdrop. The UI should not fill the gap with a third colour of its own.

## From the art to the interface

### Grounds

- Use the art's grounds, not a tinted near-black: the void (`#000000` or a
  lift of a figure's ink, never a lift toward brown), the dimmed plate behind
  it, or the ivory and vellum page.
- A painted ground (a plate, a vellum piece) beats a flat fill. A flat fill
  beats a translucent wash. No accent-tinted washes.

### Panels

- **A panel is a figure on the void.** Shape it by its silhouette and the
  ground round it, not by a border. If it needs a container, use the kit
  piece T placed there.
- Where a coded shape is unavoidable, follow the figures: angular, a cut
  corner or a flat band, a solid fill. Not one radius and one hairline on
  every panel. Vary them; a screen should not be a stack of like boxes.
- Leave room. The art's subjects keep 15 to 35% empty black round them (the
  card prompts ask for "central 60 to 70%"); screens can afford the same.

### Line

- One contour weight, a real line (about the portraits' weight at phone
  scale, heavier than a hairline), in an ink that leans toward the screen's
  hue rather than grey or gold. Draw it only where a shape must part from
  the void, as the portraits do.
- No hatching in coded UI. Hatching belongs to the plates.

### Colour

- **One hue per screen, the way each figure has one hue.** The screen's
  accent comes from its subject: the fight from the foe's own hue, Self from
  the hero's. This is a direction for 156.6 and 156.7 to test, not a built
  feature.
- Two to four values of that hue, flat. No gradients on UI surfaces.
- Ivory for text and light. Ink for lines. The accent only on the bold thing
  and the controls that need it.
- Danger stays a red, the one colour every screen may carry besides its own.

### Ornament

- Use the art's flat emblems as the model: a quatrefoil, a fleur, a key or
  zigzag band along an edge (gignos-cleric-a's shield, tithe-collector's
  stole). One ornament per screen, on or beside the bold thing.
- Ornament is drawn (kit pieces, inked corners), never a generic icon set.
  No thin line icon over every heading.

### Type

T's ballot picks (`plan/ballots/fonts.md`, voted 2026-11-06), with how to
set each so it does not fall back into the tells. Spec 156.2 builds the roles;
this is how to use them.

| Role | Face | Set it like this |
|---|---|---|
| title (screen titles, place names) | Uncial Antiqua | Mixed case, no tracking. Large; the screen's title may be its bold thing. An uncial is a rounded manuscript hand, not blackletter. |
| eyebrow (small labels above titles) | Marcellus SC | True small capitals, 12 pt or more, at most a little tracking. Replaces the mono and Bebas eyebrows. |
| sectionHead | MedievalSharp | Mixed case, no tracking. |
| narration (omens) | Eagle Lake | Sentence case, generous line height, with margins. A drop capital may open a long omen (part 5). |
| spoken (dialogue line) | Eagle Lake | As narration. |
| rules | Rosarivo | Sentence case, book-like line length. |
| button | Uncial Antiqua | Title case, no tracking, normal width. Only the screen's one primary action looks primary. |
| chip (chips, tabs, tags) | Uncial Antiqua | Title case, small, no tracking. |
| mapName | Uncial Antiqua | Mixed case. |
| bigNumber | Spectral | Old-style or lining by context; never monospace. |
| count (small counts, stats) | Grenze | Proportional figures; no tracking. |
| cardName | Uncial Antiqua | Mixed case. |
| cardRules | Rosarivo | Sentence case. |
| foeName | Uncial Antiqua | Mixed case. |
| entry (quest and ledger) | Fondamento | Sentence case; a ledger entry may be rubricated (its key word in the accent). |

Uncial Antiqua carries six places. That is T's call and it is a strong
identity, but one display face everywhere is its own tell. Keep it varied by
size and by what sits behind it, and keep body text in the book faces.

Letter spacing: none of T's picks is a condensed capital face, so the 1 to 2
point tracking goes everywhere (spec 156, "Letter spacing follows the face").

### Motion

- The enemies move as rigged paintings: one painting moved by affine
  transforms, a held pose that shifts (`art-department/README.md`,
  `tools/rig-spritesheet.py`). UI motion should match: few moves, deliberate,
  a cut or a short settle, like a paper puppet. Not soft fades and springs on
  everything.
- Motion goes to the bold thing. A screen with nothing moving is fine.

## Colour: starting points for the ballot (156.6)

The colour ballot offers whole palettes (a ground, an ink, one accent, a
danger red), each from a named reference, none of them the warm near-black
with gold, plus today's as "now". These are starting points drawn from the
game's own art; 156.6 may replace or add others from manuscripts, woodcuts,
frescoes or printed books. Every hex below was sampled from the file named,
except where a ground says "lift": that is the sampled ink brightened a
little so it is not pure black.

Contrast is against the ground (WCAG ratio; 4.5 is AA for body text).

| Palette | Reference | Ground | Ink | Accent | Danger | Contrast (ink / accent / danger) | Brass |
|---|---|---|---|---|---|---|---|
| Vestment | `portraits/gignos-cleric-a.webp`, `portraits/elf-fighter-d.webp` | `#07060A` (lift of elf-fighter-d's ink `#04030B`) | `#FEF8E2` (cleric's ivory) | `#816DB7` (cleric's violet) | `#FA3E32` (curfew-ringer) | 19.0 / 4.6 / 5.6 | Fewer places; it agrees with the cleric's ochre emblem |
| Rubric | `maps/act1-coast.webp` ramp, `portraits/elf-mage-dark.webp`, `enemies/death-beholder.webp`; an illuminated page: iron-gall ink, lapis, red | `#E1D3BB` (act1-coast page) | `#1C140C` (the map ramp's black) | `#303E6D` (elf-mage-dark's lapis) | `#A4341D` (death-beholder) | 12.3 / 7.0 / 4.6 | Toned toward ink; the vellum kit is native here |
| Verdigris | `enemies/wrecker.webp`, `enemies/tide-gate.webp`, `enemies/brine-widow.webp`: the coast | `#081012` (lift of wrecker-00's ink `#101C1E`, darkened) | `#F1F4FB` (brine-widow's light) | `#4B9487` (wrecker) | `#FA3E32` (curfew-ringer) | 17.4 / 5.4 / 5.3 | Toned toward the green of old brass |
| Choir | `enemies/cave-choir.webp`, `portraits/elf-mage-dark.webp` | `#000000` (the void the art stands on) | `#D2E8EF` (cave-choir's light) | `#7993DD` (cave-choir) | `#DC6C4B` (tithe-collector) | 16.5 / 7.0 / 6.3 | Fewer places |
| Plate | `title/lion-in-the-wood.webp`, the graded arenas, `enemies/saint-beneath.webp`: a grey engraving with one hand-tinted colour | `#151515` (title plate) | `#DDDCCE` (paladin-cursed-b's bone) | `#5ECFB2` (saint-beneath's spectral green) | `#DC6C4B` (tithe-collector) | 13.2 / 9.6 / 5.5 | Kept as the one bold metal, or toned grey |
| Now (Ashen Gold) | today's default, `theme/palette.ts` | `#0b0a09` | `#ece0c8` | `#dcb04a` | `#e05a45` | 15.1 / 9.8 / 5.4 | As placed |

Notes for the ballot builder:

- The accent and the danger red must differ in hue, not only in lightness.
  The Vestment, Verdigris and Choir pairs are far apart; check each on a real
  screen.
- Rubric is the only light-ground palette. It is the "manuscript, not the
  app" palette in its plainest form, and it changes the most; the vellum kit
  pieces already sit on it.
- "One hue per screen, from the subject" (above) can be tried as a variant of
  any dark palette: the fight takes the foe's hue as the accent. If 156.6
  shows it, label it as a variant, not a sixth palette.

## Checklist for a UI change

Before a UI PR asks for review, against its own 390×844 screenshot:

1. What is this screen's one bold thing? Does the accent go only there?
2. Is any of the five named tells on it? Any item of the ban list?
3. Is the ground the void, the dimmed plate or the page, not a brown-black
   fill or a wash?
4. Does every word go through a type role, set as the table above says?
5. Is every container a kit piece, or no container? Any coded box: why?
6. The critique table (`Where | Why it reads as AI | Fix`), top three fixed.

## Sources

- Anthropic, frontend-design skill:
  https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md
  ("Spend your boldness in one place"; committing to a clear aesthetic
  direction; avoiding generic default fonts and palettes).
- Anthropic, the frontend-aesthetics cookbook:
  https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics
  (models converge on a safe default look unless the brief names type,
  colour, references and what to avoid).
- Anthropic, "Improving frontend design through skills":
  https://claude.com/blog/improving-frontend-design-through-skills
- Anthropic, the Claude Design designer's post:
  https://claude.com/blog/how-the-product-designer-who-built-claude-design-uses-it-to-explore-ideas-before-building-them
  (explore many directions, then remix, before building).
- Adrian Krebs, "Design slop":
  https://www.adriankrebs.ch/blog/design-slop/
- 925 Studios, AI slop design tells:
  https://www.925studios.co/blog/ai-slop-design-tells
- itch.io devlog, using AI as a consultant for UI:
  https://itch.io/devlog/717434/using-ai-as-a-consultant-for-ui.amp
  (game developers told their UI looks AI-made: use real art).
- The game's own art and its records, listed under "What the art does".
- T's font verdict: `plan/ballots/fonts.md`. Spec:
  `plan/156-ty1-type-and-design-audit.md`.

Evidence across these is thin: no controlled comparisons, mostly
practitioners' experience. The art sampling is this page's own, from the
files named.
