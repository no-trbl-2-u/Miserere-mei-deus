# Elementalist: ChatGPT script

30 cards, 5 sheets of six. Run it as one ChatGPT chat, so the style stays the same from sheet to sheet. Rules and palette: [art-direction.md](art-direction.md).

## How to run it

1. Start a new chat. Attach the six images in `references/` and paste **Message 1**.
2. Paste each sheet message in turn. Save each image as `../card-images/elementalist/sheet-<n>.png` (sheet-1.png, sheet-2.png, ...).
3. If a sheet has the wrong number of tiles, text in it, a grey background, or no magenta gutters, reply "Redo this sheet: <what is wrong>" before moving on.

## Message 1

```
You are painting the card art for one lane of a dark fantasy deckbuilder for mobile. I am attaching six reference images. Five are card paintings in the approved house style (from another lane: match their rendering, line and finish, not their subjects or their colours); the sixth is the game's map, a Gustave Dore engraving.

The look: one action caught mid-motion, inked and lit in colour, alone on pure black. Take the line and the dense cross-hatching from the Dore engraving, and the rendering from the card paintings: heavy ink outlines and hatched shadows, a muted earthy figure, and one or two strong saturated accents where the light or the magic is. Think of a hand-coloured engraving. Never black and white only: colour is required.

This lane is the Elementalist: fire, ice and storm stacked on the foe. Its accent colours are ember orange for fire, glacier cyan for ice, electric violet for storm. Its motifs are flame, frost, lightning, and steam where fire meets ice.

Rules for every painting:
1. Every card is an action, so every painting is a moment of that action being done: a strike landing, a wall rising, a wound opening. Not a portrait or a still life of an object. One actor (a person, a robed or armoured figure, or a hand) and what it does; no scene, no landscape, no crowd. A little flame, light, mist or thorn may spill around it.
2. Pure black background (#000000), edge to edge. No floor, no horizon, no grey vignette.
3. Keep the subject in the middle 70% of its tile, and the bottom 15% empty (rule 7).
4. No text, letters, numbers, letter-like runes, borders, frames or card chrome anywhere.
5. Same hand on every card: the same line weight, the same hatching, light from the top left.
6. Grim, not gory.
8. No animals or insects anywhere: no beasts, birds, insects, fish or reptiles, and none of their parts (wings, feathers, claws, beaks, scales, quills, carapaces, sea or creature shells). Armour, shields and spikes are forged metal, wood or thorn; a "shell" is always forged armour.
7. Framing: draw each painting as a smaller isolated subject fully contained in its own tile. The subject and every effect fit inside the central 70% of the tile's width and height, with generous pure black padding on all sides and a completely empty black bottom 15%. No weapon, spike, hand, cape, blood, bramble or effect touches a tile edge or gutter. Keep the grid; recompose the artwork inside each tile rather than shrinking the sheet or adding a frame.

Every image I ask for is one sheet of six cards:
- a 1536 x 1024 landscape image;
- a grid of 3 columns and 2 rows of equal square tiles;
- the tiles separated by solid flat magenta (#FF00FF) gutters about 16 px wide, with the same magenta border round the whole image;
- magenta appears nowhere except the gutters and border;
- each tile is one card, painted to the rules above, with its own black background.

Reply "ready" and wait. I will send the sheets one at a time.
```

## Sheet 1

```
Sheet 1 of 5 for the Elementalist. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a mage striking a foe already wreathed in flame, the fire flaring at the blow.
2. Top middle: a sorcerer at the heart of a firestorm that burns both him and his foe.
3. Top right: a wall of packed ice and snow rising out of a blizzard.
4. Bottom left: a frozen foe shattering into ice shards under a blow.
5. Bottom middle: lightning striking the same lone figure twice.
6. Bottom right: a storm-cloaked mage beneath a crackling shield of wind.
```

| Tile | Card | Id |
|---|---|---|
| top left | Strike the Burning | `el-p-01b` |
| top middle | Burn Together | `el-p-02b` |
| top right | Raise the Drift | `el-p-03a` |
| bottom left | Shatter the Frost | `el-p-04a` |
| bottom middle | Call Lightning Twice | `el-p-05b` |
| bottom right | Ride the Gale | `el-p-06b` |

## Sheet 2

```
Sheet 2 of 5 for the Elementalist. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a burning blade plunged into ice, steam bursting from the cut.
2. Top middle: a thundersnow vortex, snow and lightning spiralling together.
3. Top right: a mage whose own body burns, hurling that fire through a storm.
4. Bottom left: a mage clenching a fist around three bright strands of flame, frost and lightning, binding them into one.
5. Bottom middle: a mage drawing a ring of fire up around himself like a shield.
6. Bottom right: a fresh wound bursting into flame.
```

| Tile | Card | Id |
|---|---|---|
| top left | Sear the Frozen | `el-p-07a` |
| top middle | Stir the Thundersnow | `el-p-08b` |
| top right | Hurl Your Fire | `el-p-09a` |
| bottom left | Bind the Three | `el-p-10b` |
| bottom middle | Wreathe in Flame | `el-e-01b` |
| bottom right | Ignite the Wound | `el-e-02c` |

## Sheet 3

```
Sheet 3 of 5 for the Elementalist. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a frost witch exhaling a blizzard.
2. Top middle: a warrior encased to the shoulders in clear ice.
3. Top right: a mage on a stone tower drawing storm clouds down around it with raised arms.
4. Bottom left: a lightning rod on a spire drawing ever-larger bolts.
5. Bottom middle: a scholar's pages whipped into the air by charged wind.
6. Bottom right: a cauldron of fire and ice erupting in a column of steam.
```

| Tile | Card | Id |
|---|---|---|
| top left | Breathe Winter | `el-e-03b` |
| top middle | Encase in Ice | `el-e-04c` |
| top right | Gather the Storm | `el-e-05b` |
| bottom left | Draw the Lightning | `el-e-06a` |
| bottom middle | Scatter the Pages | `el-e-07b` |
| bottom right | Boil to Steam | `el-e-08c` |

## Sheet 4

```
Sheet 4 of 5 for the Elementalist. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: hail falling out of a thundercloud.
2. Top middle: an alchemist holding flame in one hand and frost in the other, swapping them.
3. Top right: a figure plunging burning hands into a basin of water.
4. Bottom left: a healer pressing glowing snow onto a burn.
5. Bottom middle: a scholar breaking open a tome sealed in ice, frost pouring from its pages.
6. Bottom right: two hands weaving fire, ice and lightning together into one spiralling orb.
```

| Tile | Card | Id |
|---|---|---|
| top left | Bring the Hail | `el-e-09b` |
| top middle | Trade Elements | `el-e-10c` |
| top right | Douse the Flames | `el-m-01a` |
| bottom left | Cool the Burn | `el-m-02a` |
| bottom middle | Study in Frost | `el-m-03a` |
| bottom right | Weave the Three | `el-m-04a` |

## Sheet 5

```
Sheet 5 of 5 for the Elementalist. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a mystic with three elemental runes of fire, ice and lightning floating round her.
2. Top middle: a warrior bracing behind a heavy shield as frost creeps over it.
3. Top right: a foe pinned by lightning, its armour glowing hot.
4. Bottom left: a wanderer leaning into a gale as an iron weathervane spins above him.
5. Bottom middle: a fire-eater spitting his own flames at an enemy.
6. Bottom right: a kneeling wanderer tipping his face up to drink storm rain, renewed by it.
```

| Tile | Card | Id |
|---|---|---|
| top left | Read the Elements | `el-m-05c` |
| top middle | Brace in Rime | `el-m-06a` |
| top right | Pin with Lightning | `el-m-07b` |
| bottom left | Turn with the Wind | `el-m-08c` |
| bottom middle | Spit Fire | `el-m-09c` |
| bottom right | Drink the Rain | `el-m-10n` |

## Names

These names are new: in the game the Elementalist cards are still placeholders ("Elementalist P-01" and so on). They become these action names in the PR that adds the art; see art-direction.md, "Names are actions".

## Source character and alternating composition — T, 2026-10-30

The source caster is a very elderly, deeply wrinkled, bald Black woman with many gold earrings, a gold septum ring, a slender gold circlet and subtle chin tattoos. Mostly solemn and focused; occasional quiet joy, never manic grinning. Practical charcoal clothes with gold bangles. Distinct anonymous foes are not her.

Alternate source-character presence in reading order across the lane: WITHOUT, WITH, WITHOUT, WITH, WITHOUT, WITH. Thus tiles 1/3/5 omit her entirely (including her hands), while tiles 2/4/6 may show her casting. Without-caster paintings still show the card action through its effect and any needed anonymous foe. Each sheet has six tiles so the pattern restarts without her at top left.

