# Card art direction

> **Superseded look (T, 2026-10-30 evening).** T's final sheets for all four lanes moved to the app's own
> character-portrait style (Japanese fantasy RPG illustration, fine ink contours, cel-shaded colour planes; "NOT Dore
> engraving"). The look of record is the `sheet-<n>-prompt.txt` files T saved beside the masters in `../<lane>/`. The rest
> of this page still holds: black ground, no text, centred subject, magenta gutters, no animals, action names.

> **Superseded in part (T, 2026-10-31).** The Defender and Merciful sheets this page calls "the house paintings"
> were deleted with Phases CA1 and CA2; T has new sheets for all four lanes, in the same format (1536 x 1024, 3 x 2,
> magenta gutters, five per lane, a manifest), and **the names changed**: the "Names are actions" table below is no
> longer the source of card names. The next card-art `/plot` replaces both from T's new sheets and names.

Miserere Mei, Deus is a dark fantasy deckbuilder for mobile. This page is the look every lane card shares. All four
lanes (Blood Price, Defender, Elementalist, Merciful) are painted to it, Blood Price included, so the whole library
reads as one game (T, 2026-10-30).

## The look in one line

**One action caught mid-motion, inked and lit in colour, alone on pure black.** Engraving line, painted colour.

## Where it comes from

- **The house paintings (approved, T, 2026-10-30).** The first Defender sheets: one subject, centred, on flat black;
  heavy ink outlines and hatched shadows; muted metal and earth with saturated accents. References:
  `references/house-*.png`. The old torio Blood Price paintings that shipped first are kept in
  `references/old-blood-price/` for comparison only; do not attach them.
- **The map and title plate (shipped).** Gustave Doré engravings: dense cross-hatching, deep blacks, dramatic light.
  Reference: `references/dore-map-coast.png`.

The cards take Doré's line and hatching and torio's colour. **Never black and white only** (T, 2026-10-30:
"I just DO NOT want the card art to be exclusively black and white. Colors allowed!"). Think of a hand-coloured
engraving: the linework is ink, the light and the magic are colour.

## Rules for every card

1. **One action.** Every card is something you do, so every painting is the moment it is done: a strike landing,
   a wall rising, a wound opening, a hand letting go. One actor (a person, a robed or armoured figure, or a hand)
   and the thing it does. Never a portrait or a still life of an object. No scene, no crowd, no landscape
   behind it. A little effect (flame, light, thorns, mist) may spill around it.
2. **Pure black background** (#000000), edge to edge. No vignette to grey, no floor, no horizon.
3. **Centred, with room.** Keep the subject inside the middle 70% of the tile. The game crops the painting to fit
   its card window, so edges may be lost.
4. **Bottom strip clear.** Leave the bottom 15% completely empty pure black: Spells and Globals print a small
   label there. Shrink or recompose the artwork inside its tile; do not shrink the sheet or add another frame.
5. **No text, letters, numbers, runes that read as letters, borders, frames or card chrome.** The game draws the
   name, numbers and icons on its own card face.
6. **Colour is the light.** Each painting has one or two saturated accents (the lane's palette, below); the rest
   stays ink black, bone, rust and dark earth.
7. **Same hand, same weight.** Line thickness, hatching density and lighting direction (top-left key light) stay
   the same across every card of a lane.
8. **Grim, not gory.** Wounds and blood are fine and in keeping; no gore close-ups.
9. **No animals or insects, anywhere** (T, 2026-10-30): no beasts, birds, insects, fish or reptiles, and none of
   their parts (wings, feathers, claws, beaks, scales, quills, carapaces, sea or creature shells). Armour, shields and spikes are
   forged metal, wood or thorn; the Defender's "shell" is always forged armour. This covers card names and every word of a card's painting brief. Humanoid
   foes (ghouls, devils, demons) are people, not animals, and stay.

## Names are actions (T, 2026-10-30)

A card is something the player does, so its name is a verb phrase and its painting is that action happening.
T: "rename the card itself so that the card is a verb instead of a noun. Some type of action." Cards whose
painting or name was a creature or an animal part were renamed first; the names change in the game later, in the PR that adds the art.
Card ids do not change.

| Lane | Id | Was | Now | The painting or name was |
|---|---|---|---|---|
| Defender | `df-e-03b` | Mirrorhide | Turn the Blow | a scaled beast |
| Defender | `df-m-04b` | Turtle Up | Draw In | a tortoise |
| Defender | `df-p-10b` | Bramble Carapace | Don the Brambles | a carapace |
| Defender | `df-m-10n` | Lacquered Shell | Lacquer the Plate | a beetle shell |
| Defender | `df-m-09a` | Loose Spine | Loose the Barbs | a spine-backed creature |
| Blood Price | `bp-p-06d` | What Is Owed | Collect the Debt | a ghoul creditor |
| Blood Price | `bp-m-01d` | Siphon | Siphon | name kept (already an action); painting was a leech-like creature |
| Blood Price | `bp-m-03d` | Famished | Gorge | an emaciated ghoul |
| Merciful | `mc-p-06c` | Shelter of Grace | Spread the Mantle | a dove's wings |
| Merciful | `mc-p-10c` | Morning Absolution | Absolve at Dawn | a hunched beast |
| Merciful | `mc-m-09c` | Remembered Kindness | Call Back a Kindness | a dove |

**The Elementalist cards are named for the first time** (they were "Elementalist <slot>" placeholders):
`el-p-01b` Strike the Burning, `el-p-02b` Burn Together, `el-p-03a` Raise the Drift, `el-p-04a` Shatter the Frost, `el-p-05b` Call Lightning Twice, `el-p-06b` Ride the Gale, `el-p-07a` Sear the Frozen, `el-p-08b` Stir the Thundersnow, `el-p-09a` Hurl Your Fire, `el-p-10b` Bind the Three, `el-e-01b` Wreathe in Flame, `el-e-02c` Ignite the Wound, `el-e-03b` Breathe Winter, `el-e-04c` Encase in Ice, `el-e-05b` Gather the Storm, `el-e-06a` Draw the Lightning, `el-e-07b` Scatter the Pages, `el-e-08c` Boil to Steam, `el-e-09b` Bring the Hail, `el-e-10c` Trade Elements, `el-m-01a` Douse the Flames, `el-m-02a` Cool the Burn, `el-m-03a` Study in Frost, `el-m-04a` Weave the Three, `el-m-05c` Read the Elements, `el-m-06a` Brace in Rime, `el-m-07b` Pin with Lightning, `el-m-08c` Turn with the Wind, `el-m-09c` Spit Fire, `el-m-10n` Drink the Rain.

Names marked "kept" were already actions; only their painting changes. Blood Price's "What Is Owed" becomes
"Collect the Debt", which frees "What Is Owed" again: the Merciful's P-04a shipped as "What Grace Owes" only
because that name was taken.

## The die colour is not the art colour

A card's red, blue or purple is only which die pays for it (D110). Do not tint a card's painting by its die colour.
Each lane has its own palette instead.

## Lane palettes

| Lane | Fantasy | Accents | Motifs |
|---|---|---|---|
| Blood Price | I pay in my own blood for power | blood crimson, dried rust, bone, tarnished gold, a cold violet for contrast | open veins, scars, blades, chalices, cords, scales, bargains |
| Defender | Thorns and iron: the wall that bites back | iron grey, bark brown, thorn green; cloaks and banners deep midnight navy (see below); red only where a wound or a hit is | shields, plate armour, brambles, thorns, iron spikes, mirrored metal |
| Elementalist | Fire, ice and storm stacked on the foe | ember orange (INFERNO), glacier cyan (BLIZZARD), electric violet (STORM) | flame, frost, lightning, steam where two meet |
| Merciful | Healing as a weapon: grace that burns | radiant gold, dawn white, soft rose, a cold blue for contrast | sun, halo, open hands, candles, light that sears |

## Sheets

ChatGPT paints six cards per image: a **1536 x 1024 landscape image, a 3 x 2 grid of six square tiles**, divided
by **solid magenta (#FF00FF) gutters about 16 px wide**, with the same magenta border round the outside. Magenta
appears nowhere in the art, so a script can find the gutters exactly. Each tile comes out around 490 px square;
the game shows cards at up to 640 px.

Results go to `../card-images/<lane>/sheet-<n>.png`, in the order the lane's prompt lists them.

## Framing prompt — approved test, 2026-10-30

T approved Defender sheet 1's second pass as the visual target. The first pass filled the tiles and clipped
subjects; the second kept the inkwork and colour while reducing the subjects and adding black breathing room.
Use this wording in every lane's generation prompt, in addition to the rules above:

> Redraw/recompose each painting as a smaller isolated subject fully contained in its own tile. Each subject
> and every effect must fit inside the central 70% of its tile's width and height. Leave generous completely
> pure black padding on all sides, especially a completely empty black bottom 15% of every tile. No weapon,
> spike, hand, cape, blood, bramble or effect touches any tile edge or gutter. Do not merely shrink the whole
> sheet or add another frame: maintain the grid and shrink/recompose the artwork inside each tile. Preserve
> the hand-coloured engraving style, dense cross-hatching, heavy ink outlines, lane palette and top-left light.

The approved sheet is `../card-images/defender/sheet-1.png`. It is the visual reference for breathing room;
the percentages above are prompt targets, not a claim of pixel-exact compliance in that sheet. T also accepted
the cracked breastplate depicted as an armoured torso in that run.

## Defender cloak continuity — approved 2026-10-30

The recurring armoured character wears deep muted navy cloth, never bright cobalt or electric blue.
Use near-black midnight navy (base about #101827, restrained highlights about #253247), with black ink
shadows. Keep blood, wounds and droplets red so they stand out. This cloth colour is a deliberate exception
to the lane's main palette. Preserve it on later sheets and revisions.

New sheets stay previews in the generator's output directory until T signs off. Copy approved sheets into
card-images only after approval; approval may explicitly cover a batch of revisions.
