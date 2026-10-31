# Blood Price: ChatGPT script

30 cards, 5 sheets of six. Run it as one ChatGPT chat, so the style stays the same from sheet to sheet. Rules and palette: [art-direction.md](art-direction.md).

## How to run it

1. Start a new chat. Attach the six images in `references/` and paste **Message 1**.
2. Paste each sheet message in turn. Save each image as `../card-images/blood-price/sheet-<n>.png` (sheet-1.png, sheet-2.png, ...).
3. If a sheet has the wrong number of tiles, text in it, a grey background, or no magenta gutters, reply "Redo this sheet: <what is wrong>" before moving on.

## Message 1

```
You are painting the card art for one lane of a dark fantasy deckbuilder for mobile. I am attaching six reference images. Five are card paintings in the approved house style (from another lane: match their rendering, line and finish, not their subjects or their colours); the sixth is the game's map, a Gustave Dore engraving.

The look: one action caught mid-motion, inked and lit in colour, alone on pure black. Take the line and the dense cross-hatching from the Dore engraving, and the rendering from the card paintings: heavy ink outlines and hatched shadows, a muted earthy figure, and one or two strong saturated accents where the light or the magic is. Think of a hand-coloured engraving. Never black and white only: colour is required.

This lane is the Blood Price: I pay in my own blood for power. Its accent colours are blood crimson and dried rust, with bone, tarnished gold, and a cold violet for contrast. Its motifs are open veins, scars, blades, chalices, cords, scales and bargains.

Rules for every painting:
1. Every card is an action, so every painting is a moment of that action being done: a strike landing, a wall rising, a wound opening. Not a portrait or a still life of an object. One actor (a person, a robed or armoured figure, or a hand) and what it does; no scene, no landscape, no crowd. A little flame, light, mist or thorn may spill around it.
2. Pure black background (#000000), edge to edge. No floor, no horizon, no grey vignette.
3. Keep the subject in the middle 70% of its tile, and the bottom 15% empty (rule 7).
4. No text, letters, numbers, letter-like runes, borders, frames or card chrome anywhere.
5. Same hand on every card: the same line weight, the same hatching, light from the top left.
6. Grim, not gory.
8. No animals or insects anywhere: no beasts, birds, insects, fish or reptiles, and none of their parts (feathers, claws, beaks, scales, quills, carapaces, sea or creature shells). Armour, shields and spikes are forged metal, wood or thorn; a "shell" is always forged armour. Wings are allowed (T, 2026-10-31).
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
Sheet 1 of 5 for the Blood Price. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a warrior cutting his own arm to drive a great overhead strike, blood trailing the blade.
2. Top middle: a bare torso crossed with thick old scars hardening like armour plates.
3. Top right: a wounded fighter with nowhere left to go, lashing out with a blade.
4. Bottom left: a pierced heart whose spilled blood flows back up into it.
5. Bottom middle: two figures' hands bound together by one bleeding cut across both palms.
6. Bottom right: a gaunt ghoul creditor wrenching a red glow out of a debtor's chest into its bowl.
```

| Tile | Card | Id |
|---|---|---|
| top left | Forfeit Strike | `bp-p-01a` |
| top middle | Scar Tissue | `bp-p-02a` |
| top right | Cornered | `bp-p-03a` |
| bottom left | Returned Twofold | `bp-p-04c` |
| bottom middle | Shared Wound | `bp-p-05b` |
| bottom right | Collect the Debt | `bp-p-06d` |

## Sheet 2

```
Sheet 2 of 5 for the Blood Price. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a fist smashing a stone tablet scored with bloody tally marks.
2. Top middle: two cut palms clasped and bound by a red cord.
3. Top right: a pair of scales tipping, a heart on one pan and gold coins on the other.
4. Bottom left: a hardened, calloused hand gripping a blade by its bare edge without bleeding.
5. Bottom middle: a robed figure bleeding from an opened vein into a basin.
6. Bottom right: a heart stuck with fine needles, tiny drops falling from each.
```

| Tile | Card | Id |
|---|---|---|
| top left | Full Tally | `bp-p-07b` |
| top middle | Binding Vow | `bp-p-08d` |
| top right | Uneven Trade | `bp-p-09b` |
| bottom left | Callus | `bp-p-10c` |
| bottom middle | Bloodletting | `bp-e-01n` |
| bottom right | Pinpricks | `bp-e-02d` |

## Sheet 3

```
Sheet 3 of 5 for the Blood Price. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a single drop of blood falling from a fingertip into a chalice.
2. Top middle: a pale figure whose wound is closing, bandages falling away.
3. Top right: a forearm with an open vein, the blood stretching out like a chain.
4. Bottom left: a double-edged sword cutting its wielder's hand as it swings.
5. Bottom middle: a gambler pushing a beating heart onto a table of dice.
6. Bottom right: two crossed blades, each spattered with the other wielder's blood.
```

| Tile | Card | Id |
|---|---|---|
| top left | Slow Drip | `bp-e-03d` |
| top middle | Remission | `bp-e-04c` |
| top right | Open Vein | `bp-e-05n` |
| bottom left | Double-Edged | `bp-e-06b` |
| bottom middle | Raised Stakes | `bp-e-07b` |
| bottom right | Blood for Blood | `bp-e-08n` |

## Sheet 4

```
Sheet 4 of 5 for the Blood Price. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a rolled scroll sealed with a blood-red wax seal, a dripping steel pen beside it, no writing visible.
2. Top middle: a horned merchant devil offering a dagger with one hand and an open palm with the other.
3. Top right: a hand pressed to a foe's chest, a red stream drawn up into the arm.
4. Bottom left: a gaunt hand pulling a red glow out of a wounded foe and back into itself.
5. Bottom middle: an emaciated ghoul lunging to sink its teeth into a foe's arm.
6. Bottom right: a glass tube carrying blood from one arm to another.
```

| Tile | Card | Id |
|---|---|---|
| top left | Crimson Pact | `bp-e-09n` |
| top middle | Name Your Price | `bp-e-10d` |
| top right | Siphon | `bp-m-01d` |
| bottom left | Reclaim | `bp-m-02b` |
| bottom middle | Gorge | `bp-m-03d` |
| bottom right | Transfusion | `bp-m-04n` |

## Sheet 5

```
Sheet 5 of 5 for the Blood Price. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before.

1. Top left: a bloodied knight standing with eyes closed, both hands on the sword pommel.
2. Top middle: a dying warrior on one knee refusing to fall, one hand raised.
3. Top right: a glowing red brand on a foe's skin, drops of blood rising from it.
4. Bottom left: a goblet catching every drop that runs off a blade.
5. Bottom middle: an overflowing heart whose excess hardens into a crimson shield.
6. Bottom right: an arrow pulled from a wound and hurled back.
```

| Tile | Card | Id |
|---|---|---|
| top left | Grim Resolve | `bp-m-05b` |
| top middle | Not Yet | `bp-m-06c` |
| top right | Feeding Mark | `bp-m-07a` |
| bottom left | Nothing Wasted | `bp-m-08d` |
| bottom middle | Brimming | `bp-m-09a` |
| bottom right | Repaid in Kind | `bp-m-10a` |

## Source character and alternating composition — T, 2026-10-30

Use T's provided pale adult woman: straight shoulder-length ash-blonde hair, dark eyes, solemn expression, long dark plum/black gown and flowing dark violet mantle. Translate her likeness into the established engraved house style. Occasionally include a small one-handed hand scythe, where it suits the action; not a full-sized reaper scythe and not on every card.

Alternate WITHOUT / WITH / WITHOUT / WITH / WITHOUT / WITH in reading order. Odd tiles omit her, including her hands and clothing; anonymous humanoid actors or targets and symbolic spell effects can carry those actions. Even tiles use her as the main acting character. Keep all new sheets as previews until T approves saving.


## Transfusion art correction — T, 2026-10-30

Sheet 4 bottom right uses a magical transfer of vitality: a crimson spectral ribbon flowing between the lead woman's open palm and another person's separate hand. No literal blood transfusion imagery: no tubes, needles, medical equipment or physical connections between arms. This overrides the original glass-tube brief.

