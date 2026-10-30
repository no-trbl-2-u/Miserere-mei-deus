# Defender: ChatGPT script

30 cards, 5 sheets of six. Run it as one ChatGPT chat, so the style stays the same from sheet to sheet. Rules and palette: [art-direction.md](art-direction.md).

## How to run it

1. Start a new chat. Attach the six images in `references/` and paste **Message 1**.
2. Paste each sheet message in turn. Save each image as `../card-images/defender/sheet-<n>.png` (sheet-1.png, sheet-2.png, ...).
3. If a sheet has the wrong number of tiles, text in it, a grey background, or no magenta gutters, reply "Redo this sheet: <what is wrong>" before moving on.

## Message 1

```
You are painting the card art for one lane of a dark fantasy deckbuilder for mobile. I am attaching six reference images. Five are card paintings in the approved house style (from another lane: match their rendering, line and finish, not their subjects or their colours); the sixth is the game's map, a Gustave Dore engraving.

The look: one action caught mid-motion, inked and lit in colour, alone on pure black. Take the line and the dense cross-hatching from the Dore engraving, and the rendering from the card paintings: heavy ink outlines and hatched shadows, a muted earthy figure, and one or two strong saturated accents where the light or the magic is. Think of a hand-coloured engraving. Never black and white only: colour is required.

This lane is the Defender: thorns and iron: the wall that bites back. Its accent colours are iron grey, bark brown and thorn green. Any cloak, cape, scarf or banner is a deep muted midnight navy (about #101827, highlights about #253247), never red and never bright cobalt or electric blue. Red appears only where a wound, a hit or blood is. Its motifs are shields, plate armour, brambles, thorns, iron spikes and mirrored metal.

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
Sheet 1 of 5 for the Defender. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before. Cloaks and banners deep midnight navy, never red or bright blue.

1. Top left: a hulking brute in armour studded with iron spikes swinging a spiked mace.
2. Top middle: a knight slamming a heavy iron tower shield forward, sparks flying off its rim.
3. Top right: a warhammer striking a breastplate, cracks spidering across the metal.
4. Bottom left: a mirror-polished buckler ringed with barbs, an enemy blade reflected and turned back on itself.
5. Bottom middle: a rampart of black brambles grown thick as a fortress wall.
6. Bottom right: thorns sprouting from a warrior's bleeding forearm, fed by the blood.
```

| Tile | Card | Id |
|---|---|---|
| top left | Bristling Blow | `df-p-01a` |
| top middle | Shield Bash | `df-p-02b` |
| top right | Cracking Swing | `df-p-03c` |
| bottom left | Mirror Barb | `df-p-04a` |
| bottom middle | Thornwall | `df-p-05c` |
| bottom right | Spite Growth | `df-p-06c` |

## Sheet 2

```
Sheet 2 of 5 for the Defender. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before. Cloaks and banners deep midnight navy, never red or bright blue.

1. Top left: a figure tearing off a shell of plate armour that bursts apart into a storm of thorns.
2. Top middle: a domed iron shield bristling with spikes, braced against a blow.
3. Top right: a duellist turning a blade aside and countering in the same motion.
4. Bottom left: a knight pulling on armour woven entirely from living bramble.
5. Bottom middle: a gauntleted forearm raised in guard, the vambrace studded with iron nails.
6. Bottom right: a palisade of sharpened stakes wrapped in barbed vine.
```

| Tile | Card | Id |
|---|---|---|
| top left | Shed the Shell | `df-p-07c` |
| top middle | Spiked Shell | `df-p-08b` |
| top right | Riposte | `df-p-09b` |
| bottom left | Don the Brambles | `df-p-10b` |
| bottom middle | Studded Guard | `df-e-01c` |
| bottom right | Barbed Wall | `df-e-02b` |

## Sheet 3

```
Sheet 3 of 5 for the Defender. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before. Cloaks and banners deep midnight navy, never red or bright blue.

1. Top left: a hooded warrior in mirror-bright plate armour, an enemy blow glancing off and flying back the way it came.
2. Top middle: a hedge-knight lunging out from behind a thorn-wrapped shield.
3. Top right: briars erupting from cracked earth in a rising wave.
4. Bottom left: a broken stone idol swallowed by monstrous thorny growth.
5. Bottom middle: a whip of thorned vine cracking through the air.
6. Bottom right: a round shield of spiral-forged steel polished to a mirror, raised to catch a blow.
```

| Tile | Card | Id |
|---|---|---|
| top left | Turn the Blow | `df-e-03b` |
| top middle | Hedge Strike | `df-e-04a` |
| top right | Briar Surge | `df-e-05c` |
| bottom left | Overgrowth | `df-e-06c` |
| bottom middle | Thorn Lash | `df-e-07c` |
| bottom right | Polished Shell | `df-e-08b` |

## Sheet 4

```
Sheet 4 of 5 for the Defender. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before. Cloaks and banners deep midnight navy, never red or bright blue.

1. Top left: a pale figure wrapped in a red rose vine, blood beading where the thorns bite.
2. Top middle: a hunched gatherer carrying a basket of thistles and nettles.
3. Top right: a soldier crouched low behind a round shield, braced for impact.
4. Bottom left: two hands sealing a cracked iron shield with glowing molten metal.
5. Bottom middle: a chisel and hammer splitting an armour plate.
6. Bottom right: a knight dropping into a crouch beneath a great domed iron shield, drawing everything in under it.
```

| Tile | Card | Id |
|---|---|---|
| top left | Rose Wrap | `df-e-09c` |
| top middle | Gather Thistles | `df-e-10c` |
| top right | Hunker Down | `df-m-01b` |
| bottom left | Mend the Shell | `df-m-02b` |
| bottom middle | Crack the Armour | `df-m-03b` |
| bottom right | Draw In | `df-m-04b` |

## Sheet 5

```
Sheet 5 of 5 for the Defender. One 1536 x 1024 image, 3 columns x 2 rows of square tiles, solid magenta (#FF00FF) gutters and border, each tile on pure black, no text anywhere, the same style as the sheets before. Cloaks and banners deep midnight navy, never red or bright blue.

1. Top left: a monk in a spiked iron mantle, fists clenched, the spikes raised in resolve.
2. Top middle: a knight in heavy riveted plate standing unmoved as blows glance off.
3. Top right: a scavenger digging through a heap of broken armour and relics.
4. Bottom left: a scrawny scavenger jabbing with a spear tipped in stinging nettle.
5. Bottom middle: a spike-armoured brute wrenching iron barbs from his pauldrons and hurling them in a volley.
6. Bottom right: a gauntleted hand brushing glossy red-and-black lacquer across a breastplate until it gleams like enamel.
```

| Tile | Card | Id |
|---|---|---|
| top left | Prickly Resolve | `df-m-05c` |
| top middle | Steady Shell | `df-m-06b` |
| top right | Rummage | `df-m-07c` |
| bottom left | Nettle Poke | `df-m-08c` |
| bottom middle | Loose the Barbs | `df-m-09a` |
| bottom right | Lacquer the Plate | `df-m-10n` |
