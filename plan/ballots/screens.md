# Seven Breakwater screens ballot (2026-11-10)

T's brief, 2026-11-10: one ballot with ten looks for each of the seven Breakwater screens that need a rework. After the vote each winner is plotted for the loop.

Ballot: `screens.ballot.html` (id `screens-2026-11-10`). Shots: `screens/S-0N<a-j>.webp`, rendered at 2x. A single screen is 390x844; a wide shot (796x844) holds two screens of the same look, each captioned at its foot. `S-07a` is four screens (796x1704).

| Slot | Screen | Route today | Cases the looks cover |
|---|---|---|---|
| S-01 | Travel | `app/travel` | the toll bridge to the Charcoal Wood, the cave shortcut, the shut way |
| S-02 | Cutscene | `app/cutscene` | run opening, clifftop chapel, old watchtower, high pass, chapter arrival |
| S-03 | Quest | `app/quest` | offer, in progress, turn in with reward, turned away; all four givers |
| S-04 | Loot cache | `app/cache` | the choice, and the outcome for each choice |
| S-05 | Fight reveal and boss title card | `app/combat-encounter` | a normal foe, an elite, the Chapter 1 boss |
| S-06 | Combat board | the combat board, opened from `app/combat-encounter` | mid-fight, a card staged, the first turn |
| S-07 | Ends of a fight and a run | combat overlays, death return, game over | victory, defeat panel, death return, Game Over |

## How the shots were made

- `S-01a`, `S-02a`, `S-05a`, `S-06a` are the app's own visual baselines (`axiomancer-mobile/screenshots/baseline/travel.png`, `cutscene.png`, `combat-encounter.png`, `combat-board.png`), unchanged.
- `S-03a`, `S-04a` and `S-07a` are today's screens redrawn from the code, because no baseline exists for them. `S-07a` holds the four moments: the reward draft and the summary panel (redrawn), the defeat panel, the death return and Game Over.
- `b` to `j` are static mockups in HTML at 390x844, drawn with the app's fonts (`theme/axm.ts`), the brass action button and the UI kit art, the game's maps, arenas, enemies and card art, and stand-ins from the image library.
- The two claude.ai artifact links in the brief (the screenshot gallery and the gap table) could not be read from this session (access denied). The faults each A shows are the ones the brief names.

## What the ballot holds fixed

- The rules. No look changes what a screen may do, what a fight costs or what a choice gives. Fight length is on hold and untouched.
- One card face everywhere (D91) and one button, the brass action plate (T, 2026-11-09).
- S-06: in every look no card name is clipped, the foe's intent shows a number, statuses are named, and the staged card never covers the foe.
- Every look is buildable in React Native: images, text, flex and absolute layout, opacity, rotation, linear gradients, borders. Nothing needs a web-only effect.
- No final copy. Every line invented for a mockup wears a dotted gold underline and is listed below. The Narrator voice is T's.

## The looks

Bold looks: S-01 g, h; S-02 f, g; S-03 f, g; S-04 f, g; S-05 f, g; S-06 e, f; S-07 e, g.

| Slot | A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|---|
| S-01 | Today's screen | Scene and cost | Two map plates | Here and there | The keeper speaks | The toll board | The threshold | Screen is the map | Crossing as a card | Letterbox band |
| S-02 | Today's screen | Picture and foot panel | Film still | Manuscript page | Three stacked panels | One sentence, huge | Unrolling strip | The teller | Place on the map | Scene card |
| S-03 | Today, redrawn | Village hub | Giver fills the top | The writ | The chain | Face to face | The quest card | Place and person | The terms | Where to go |
| S-04 | Today, redrawn | Chest and brass | Two tall tiles | The scales | Look into the chest | Drag to the pack | The trade ledger | One at a time | The finder | Picture first |
| S-05 | Today's screen | Arena and panel | Foe as a card | You versus it | Posted warning | Held boss plate | Out of the dark | The road | The reckoning | Spiked frame |
| S-06 | Today's screen | Repaired board | Hand as a tray | Three bands | Grid and rail | Table from above | Dice first | Intent banner | One card, large | First turn, taught |
| S-07 | Today, four moments | The spoils board | The fallen foe | The tally | The enormous number | The chapter closes | The stone | The memoir page | Step by step | Almost nothing |

Which case each look is drawn in:

- S-03: offer (b, d, g), in progress (e, h), turn in with reward (c, f), turned away (i, j). Givers: lighthouse keeper (b, h), gate warden (c, g), fishermen's elder (d, f, i), bridge-keeper (e, j).
- S-05: normal foe (b, d, e, g, i), elite (b, c, e, h, i, j), boss (c, d, f, h).
- S-07: victory (b to j; level-up in e and h; end of chapter in f, g, h, i), defeat panel (b VITAE 0, e turn-60 limit, h withdrew), death return (c, f, i), Game Over (d, g, j).

## Stand-in figures and pictures

From `Potential Assets/sorted-entity-library-base`, black ground removed where the figure sits over a picture. Art is T's (D88); these only hold the space.

| Role | Atlas entry | File | Look |
|---|---|---|---|
| Lighthouse keeper | TOR-0424 Hermit | `portraits/Hermit A.png` | S-03 b, h |
| The teller | TOR-0424 Hermit | `portraits/Hermit A.png` | S-02 h |
| The finder who holds the cache | TOR-0424 Hermit | `portraits/Hermit A.png` | S-04 i |
| Fishermen's elder | TOR-0702 Prophet | `portraits/Prophet.jpg` | S-03 d, f, i |
| Gate warden | TOR-0405 Guard A | `portraits/Guard A.jpg` | S-03 c, g |
| Bridge-keeper | TOR-0843 Sword Master A | `portraits/Sword Master A.png` | S-03 e, j |

Game art standing in for something else:

- S-01e: the village host (`keepers/host.webp`) stands in for the bridge-keeper.
- S-05 c, d, i and S-06 b to j: the cleric with a shield (`mc-p-02b`) is the player portrait. S-07 c, f, i: `portraits/elf-fighter-d.webp` is the player's figure.
- S-01 d, g, i, j: the Charcoal Wood combat arena stands in for the bridge-side scene.
- S-02 c, e, g: the game's dim landscape engravings (the Eldena ruin, the moonlit coast, the Riesengebirge, the northern sea) stand in for chapter arrival scenes.
- S-03a's portrait is the real in-game one (Biwa Priest).

## Images to generate

One list, merged across looks. Sizes are at 2x. A dashed gold box in a shot marks where each sits.

| # | Subject | Mood | Orientation | Size | Screen and looks | Where it sits |
|---|---|---|---|---|---|---|
| 1 | The toll bridge into the Charcoal Wood: the bar, the toll-house, smoke in the trees beyond | dusk, engraved | portrait | 780x1100 | S-01 b, d, g, i, j | the destination picture; d and j crop a wide band, g shows it through the arch (keep the bar in the middle third) |
| 2 | The sea cave mouth from the harbour path, tide low | grey dusk, engraved | portrait | 780x880 | S-01 b, j | b: top two thirds behind the title. j crops a 780x460 band, so keep the mouth in the middle |
| 3 | The cove seen out of the cave mouth, a boat on the shingle | quiet, grey light | portrait | 600x840 | S-01 g | inside the arch |
| 4 | The Breakwater's near bank, looking at the bridge | dusk, engraved | landscape | 780x520 | S-01 d | top band, the place you leave |
| 5 | The bridge-keeper, full figure on a clear ground | worn, watchful | portrait | 600x1300 | S-01 e (and S-03 e, j as the giver) | left half, full height |
| 6 | The windmill on the headland, sails lashed down, sea below | dusk, stormy | landscape | 1560x1000 | S-02 b, f, h | the run opening's scene picture |
| 7 | The clifftop chapel, small, above the sea | grey, windswept | landscape | 1560x1000 | S-02 d (any S-02 winner) | the chapel cutscene's picture |
| 8 | The old watchtower on a ridge over the coast | cold, lonely | landscape | 1560x1000 | S-02 j (any S-02 winner) | the watchtower cutscene's picture |
| 9 | The high pass between two peaks, the road climbing | snow light, bleak | landscape | 1560x1000 | S-02 i (any S-02 winner) | the high pass cutscene's picture |
| 10 | The keep gate, barred from the inside, seen from the causeway | dim, dusk, engraved | landscape | 780x600 | S-03 h | top of the screen, behind the eyebrow |
| 11 | The open cache from above, empty and lined | dark, warm, lit from above | portrait | 724x1040 | S-04 e (optional; a gradient holds it today) | behind the card and the goods, inside the rim |
| 12 | The Breakwater map on one plate, the road's places marked | engraved, sepia | portrait | 780x700 | S-07 f | top half |
| 13 | A weathered stone slab, carved texture, no words | grey, cold | portrait | 700x1100 | S-07 g | behind the inscription |

Rows 1 and 2 are the two images the deadline act "Find two travel images" already asks for. Rows 7 to 9 are needed whichever S-02 look wins. The four quest givers need T's own figures whichever S-03 look wins; the stand-ins above hold their places.

## Invented lines

Placeholders, not copy. Each is underlined in dotted gold in its shot.

- S-01. Cost lines: "No toll. No road leads back." / "No toll is charged. No road leads back." / "Costs nothing. The way back stays open." / "The cove lies only this way." / "Nothing is spent. The bar stays down." Prompts: "The sea cave runs under the cliff, down to a cove." (the game's line is a `[content]` placeholder) and, in e, "The bar is up. Across the bridge, the road runs into a wood full of smoke." (the game's line says the toll-house has no keeper, which a keeper cannot say). Labels: THE BRIDGE-KEEPER, A NOTICE POSTED, CROSSING COSTS, STAYING KEEPS and the board's rows (f), HOLD TO MOVE (g), YOU ARE HERE (h), CROSSING and the card's rules text (i). The purse figure 34 is a sample.
- S-02. The three node lines are the game's `[content]` placeholders with the tag dropped ("Clifftop chapel.", "Old watchtower.", "High pass."). The run opening line in h is the game's placeholder line. "page 1 of 1" (d).
- S-03. Names, asks, lock lines and rewards are the game's. Invented: "Next:" (c), "PAYS" and "and the Keep key" (d), "Turn it in here when the sea keep falls." (e), the row labels ASK, PAYS, WHY NOT YET (i).
- S-04. "Added to your deck: 12 to 13 cards", "Deck 12 to 13", "Purse 15 to 21", "2 potions and 6 shillings", "YOUR PACK", "Signed", the short TAKE label (j), and the potions' condensed wording. The deck and purse counts are samples.
- S-05. "A foe keeps these back. You learn each when it first lands." / "You learn a hidden move when it first lands." / "No reward. You may try again." / "No reward. The road stays shut." / "There is no withdrawing from a boss." / "The road to Fishermen's camp stays shut until this fight is won." / "Sea keep is where the road ends." The notice's heading and rows (e), the glosses under the tier word (i). Move texts in c are the game's, shortened. The player's level 3 is a sample.
- S-06. "Your Guard 5 blocks 5, so 7 lands." / "Quay-Crab will strike for 12" / "Heart, Body, Mind in a row" / "Costs 4, you have 3." / every drag hint / the die glosses ("Pays a card's big number.", "Pays, and gives you ◆2.", "Dead. Pays nothing.") / the free and paid shorthand under each card / the four coaching labels (j) / ON THE FOE, ON YOU, THE LINE, STAGING LANE.
- S-07. Every XP, level, shillings, fights and turn figure is a sample. Cause lines: "Your VITAE reached 0." / "THE TURN LIMIT RAN OUT" and "The foe still stood at 92. Turn 60 passed, so the fight is lost." / "DEFEAT - YOU WITHDREW" and "You left the fight. A withdrawal counts as a defeat." Cost lines: "You go back to the road you came by, at 1 VITAE." / "The place you fell is open again; you can try it again." / "A second fall while hurt ends the run." / "Your deck, your shillings and your level are kept." Headings and labels: THE FIGHT PAID, THE RUN, CLOSED, THE CHAPTER IS CLOSED, FELLED BY, YOU FELL, KEPT, THE ROAD. The memoir's sentences (h). The death return and Game Over lines are the game's `[content]` placeholders with the tag dropped.

## Open for the plot

What the code says today, where a look shows more than the game can.

- **S-01 travel.** The bridge charges nothing; a quest gate (`bw-b1`) locks it. No travel node leads back from the Charcoal Wood, so "No road leads back" is a reading of the map, for T to confirm. The cave shortcut (`bw-h6` to `bw-c0`) is free and open both ways. Every cost line is new copy; the screen has no cost field today.
- **S-02 cutscene.** The node lines are `[content]` placeholders. Look f needs the presenter to split a beat into sentences. Every look needs a picture per scene, which the cutscene content does not carry yet.
- **S-03 quest.** Each step pays +40 XP and an item (Ruby Signet; Siphoning Blade and the Keep key; Mirror Brooch; Scavenger's Coat). Today's offer does not show the pay; showing it before ACCEPT is a presentation change. In progress and turned away offer only LEAVE.
- **S-04 loot cache.** The card and the goods are both rolled before the choice (`beginLootCacheChoiceAction`, `rollCombatCardRewards`, `rollCacheReward`), so the screen can show them. They are blank today on purpose: a doctrine comment says the screen states what you do, never what you get. Any look but A overturns that, and `CacheChoiceOfferVM` needs card and goods fields. Only the cave cache (`cw-6`) has action lines. The card pool is the three grey cards.
- **S-05 fight reveal.** DANGER is the count of the foe's hidden phase-opening moves (`revealDangers`). WITHDRAW is `fleeEncounter`: no reward, the node stays unspent, you may come back. Bosses have no WITHDRAW. The elite and normal VITAE figures are plausible, not read from a run. Look f prints the boss's name where today's card prints the place.
- **S-06 combat board.** Four d6 (Body, Mind, Heart, and the wild Gold; faces BOON, MANA, MISS); BOON gives 2 Conviction; a Momentum chain earns a SURGE ghost die; the signature comes from the signet and is paid in Conviction. A foe on a phase telegraph shows no intent number at all, so "strikes for 12" needs a rule for those foes. The staged card is drawn as one of the five. Die faces are drawn in CSS; the kit has no die art.
- **S-07 ends.** After a win the game shows `CombatRewardsOverlay` (three cards, TAKE NOTHING or TAKE CARD, UPGRADE INSTEAD after an elite), then `CombatSummaryModal` (damage rows, shillings, best card, CONTINUE). There is no XP line, level-ups are silent (the `LevelUpModal` waits on the Character tab) and no screen marks the end of a chapter. No session has yet won a fight by playing, so the victory half of `S-07a` is read from the code, not seen running. The defeat panel cannot name its cause: the code ends a fight past turn 60 as a plain defeat. Death rule (`Game/death.ts`): the first death returns you to the previous node at 1 VITAE, dying; a second death while dying ends the run; the codex is kept.
- **Withdraw, S-05 against S-07.** The fight reveal's WITHDRAW leaves before the fight starts and is not a defeat. No retreat exists inside a fight (`retreat` is dead code). So S-07h's "you withdrew" defeat describes something the game cannot do today: it needs a ruling (add a retreat from inside a fight, or drop that cause) before S-07 is plotted.
- **Shared surfaces.** S-05 and S-06 are two halves of one fight surface, and S-07's victory and defeat are overlays on it. One spec may carry more than one of them.

## Verdict

Decided 2026-11-10 by T, pasted from the ballot. Verbatim:

```
BALLOT: seven Breakwater screens, ten looks each (screens-2026-11-10)
answered 7 of 7
S-01 Travel: KEEP S-01b (Scene and cost) | note: Only text is the "Move" and "Stay", Move to the Cave Face? and the flavor text underneath
S-02 Cutscene: KEEP S-02h (The teller) | note: No continue or bottom skip. Taps continue the story. Text should be inside the vellum scroll thing and the image of the teller should be on top of the vellum card.
S-03 Quest: KEEP S-03g (The quest card) | note: Get rid of "A Quest" and Step 4 of 4
S-04 Loot cache: KEEP S-04j (Picture first) | note: Don't show the actual reward. Only Take a/the ___ and the flavor text. Reward should be hidden until the selection is made. Furthermore, goods? Show goods as you have it  Show Card? We replace the gold with a different image and the card will go right above move on.
S-05 Fight reveal and boss title card: KEEP S-05f (Held boss plate) | note: F for bosses, G for everything else. Do what you can do that there's not such a clear cutoff at the bottom.
S-06 Combat board: KEEP S-06a (Today's screen)
S-07 Ends of a fight and a run: KEEP S-07c (The fallen foe) | note: Don't rotate the enemy after they fell, and none of that "The page turned itself" nonsense. Only mention how much experience is needed to level and if they leveled up.
```

No slot asked for a mix of two looks, so there is no second round. Each settled shot below is the winning look with T's note applied; it is the Source of that screen's plot.

| Slot | Settled shot | Read as |
|---|---|---|
| S-01 | `screens/S-01-settled.webp` | S-01b. The only words are the question ("Move to The Cave Face?"), the scene line under it, and two plain buttons, MOVE and STAY. No eyebrow, no purse, no cost line, no YES/NO. Both cases drawn. |
| S-02 | `screens/S-02-settled.webp` | S-02h. No CONTINUE and no bottom SKIP: a tap anywhere moves the story on. The line sits inside a vellum panel (the kit's `modal-panel-vellum`), dark ink on vellum; the teller stands over the panel's top edge, in front of it. The top SKIP and the "2 of 2" count stay. |
| S-03 | `screens/S-03-settled.webp` | S-03g with the "A QUEST" eyebrow and the "STEP 4 OF 4" count removed; the four beads still show the step. |
| S-04 | `screens/S-04-settled.webp` | S-04j. The choice shows only TAKE A CARD and TAKE THE GOODS, each with its flavour line; the reward is hidden until the player takes one. Goods taken: today's goods outcome, as drawn. Card taken: a different picture replaces the gold (image needed), and the card face sits just above MOVE ON. |
| S-05 | `screens/S-05-settled.webp` | S-05f for the boss, S-05g for every other foe (normal and elite). Both grounds now fade out instead of stopping hard at the foot, and G's foe is cut out of its black box. |
| S-06 | `screens/S-06a.webp` | Today's combat board stays. No rework, no plot. |
| S-07 | `screens/S-07-settled.webp` | S-07c. The fallen foe stays upright, greyed. The ledger line ("the page turned itself") is gone: the panel says either the new level ("LEVEL 2") or how much XP the next level needs ("30 XP to level 2"). Victory drawn both ways, then the death return as drawn. |

Images the winners still need (rows of "Images to generate" above, plus one new):

- S-01: rows 1 and 2 (the bridge, the cave mouth).
- S-02: rows 6 to 9, and one picture each for the chapter arrival; the teller figure per scene is T's.
- S-03: the four givers' figures (T's own; stand-ins hold the places).
- S-04: **new row 14**: the runes cut into the cave wall, lit by one lantern; grey dusk, engraved; landscape, 780x540; the picture band at the top of the card outcome, in place of the gold.
- S-05 and S-07: none new; the foes' own art carries them.

Closed 2026-11-10. Plotted one screen per plot PR (T: "Plot each one separately"), S-06 excepted.
