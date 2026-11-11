# The Narrator: Chapter 1, every line

The ledger for the review page (`narrator-chapter1.ballot.html`, ballot id
`narrator-chapter1-2026-11-11`), opened 2026-11-11.

## Why

T, 2026-11-11: "determine every single \"content\" item in chapter 1 (except
for NPCs and cards), then write a piece of content for each in this voice
you've created for the narration ballot. Oscillate between all 3 voices."
Scope, T's answer: "Every content tag, BUT, if you decide an NPC will need to
speak, just put [NPC Content Needed]". Rotation, T's answer: "One take,
rotating, but do plain, x, plain, y, plain, z etc".

These are **drafts for T to approve**. Nothing here is in the game. The voice
is the round 5 target (`narrator-voice.md`): Cormac McCarthy writing Elden
Ring, in the register of Blood Meridian. His manner, never his sentences.
Round 5 is not voted, so the voice itself may still move.

## What was counted

Every `[content]` tag in the Chapter 1 sources, plus the six enemy
descriptions marked `DRAFT (Claude)` and two villages that show the shared
Anvil line. Left out: test fixtures, code comments, rules text, card text,
and labels that are plain buttons.

| Kind | Count |
|---|---|
| Prose lines, drafted | 113 |
| Names, drafted (no cruelty level) | 13 |
| Spoken lines, marked `[NPC Content Needed]` | 4 |

## The rotation

Every other line is **plain**. The lines between them alternate **cruel**
and **grief**: plain, cruel, plain, grief, and round again. On the five-stop
slider (`.claude/skills/narrate/SKILL.md`) plain is stop 1, cruel is stop 4
and grief is stop 5. Any line can be redrawn at another stop.

## Caps

No sentence runs past 40 words. Each surface has a word cap, given under its
heading, sized to the screen it sits on. The app's fit at those lengths is
not tested yet; the plot carries that check.

## Invented, not story until T rules it in

The reapers in the barley, the child who lights the harbour lamp, the shoes
on the bridge road, the dog at the fork, the wired pens, the watchmen with
their horns, the rope ends on the manor elms, the boots by the fire ring, the
keeper's tally, the walled-in tally at the watchtower, the village seated by
the road, the names cut at the cave mouth, the place left at the fire, the
two bowls, the people on the far bank, the key carried in the mouth. The
chapel cutscene and the cliff road dream lean on the prologue, which ruling
10 of the story overview keeps from the player at the start.

## The lines

### M: Map blurbs

The one line under a node's name on the map. Cap 18 words. Source: `axiomancer-mobile/state/exploration-maps/breakwater.layout.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| M-01 | bw-w2 The Gallows Crossroads | plain | Four roads and a gallows older than any of them. No crow will light there. |
| M-02 | bw-w3 The Field Road | cruel | Barley no hand has cut in three years. The reapers are in it still. |
| M-03 | bw-w4 The West Cliff Road | plain | The road keeps to the lip of the cliff. Below, the sea works at the stone. |
| M-04 | bw-w5 The Keep Causeway | grief | A captain stands the causeway calling in a boat that is not coming. |
| M-05 | bw-k1 The Keep Gate | plain | Iron doors gone green and barred from within. Something behind them breathes with the tide. |
| M-06 | bw-k2 The Sea Keep | cruel | The town built it over him, and sends down such as it can spare. |
| M-07 | bw-h1 The Quay End | plain | The last stones of the quay. A man sits there mending and does not look up. |
| M-08 | bw-h3 The Harbour Light Pier | grief | The lamp is lit each dusk by a child who believes it brings them home. |
| M-09 | bw-h5 The Moored Ship | plain | A ship at her moorings with no crew and a lit galley. The ropes are new. |
| M-10 | bw-h6 The Sea Cave Mouth | cruel | The cave takes the tide twice daily, and whatever the town leaves at its mouth. |
| M-11 | bw-h7 The Long Pier | plain | Half a mile of black planking into the fog. Someone waits at the end of it. |
| M-12 | bw-h8 The Pier End | grief | A dinner pail on the last plank, packed by someone and fetched by no one. |
| M-13 | bw-c0 The Cave Face | plain | Wet stone sheer above the cove. The cave behind you sounds like a throat. |
| M-14 | bw-c2 The Fishermen's Camp | cruel | Three men at a driftwood fire. There were four in the boat. |
| M-15 | bw-t1 The Harbour Steps | plain | Steps cut by a people who built for something with a longer stride. |
| M-16 | bw-t2 The Bridge Approach | grief | Shoes set out in pairs along the road, the small ones foremost. No one says whose. |
| M-17 | bw-t3 The Town Gate | plain | A gate with no leaf in it, and a toll booth manned by habit alone. |
| M-18 | bw-t5 The Back Lanes | cruel | Lanes too narrow to turn in. The town does its collecting here, by night. |
| M-19 | bw-t6 The Upper Town | plain | Tall shuttered houses above the smoke. Every sill carries a dish of salt. |
| M-20 | bw-b2 The Far Bank | grief | The far bank. You will not look back, and you know what that is called. |
| M-21 | bw-l1 The Cliff Crossroads | plain | Three ways part on the bare headland under a wind that has never stopped. |
| M-22 | bw-l3 The Cliff Road | cruel | Cairns line the cliff road, one to each keeper. The newest are small. |
| M-23 | bw-l4 The Lighthouse Path | plain | A stair of slick rock up the last of the cliff. A light walks it. |
| M-24 | bw-d2 The Boat Sheds | grief | Four hulls tarred and readied each spring by a father with no sons left. |
| M-25 | bw-d3 The Hamlet Rise | plain | Bent grass above the hamlet, and a path trodden by nothing with feet. |
| M-26 | bw-d4 The Tower Switchbacks | cruel | The path doubles up the scarp. The fallen were left where they lay, for markers. |
| M-27 | bw-d5 The Old Watchtower | plain | A tower raised to watch the sea for something. No one recalls if it came. |
| M-28 | bw-m1 The South Fork | grief | A dog waits at the fork beside a bundle. It has waited two winters. |
| M-29 | bw-m2 The River Meadow | plain | Deep grass by the slow river, and not one beast in all of it grazing. |
| M-30 | bw-m3 The Riverbank | cruel | Where the river turns it gives back what the town put in upstream. |
| M-31 | bw-m4 The Manor Road | plain | A straight road between dead elms to a wall with glass along its top. |
| M-32 | bw-p1 The Foothills | grief | Stone pens on the slope, the gates wired shut from without. The flock was left in. |
| M-33 | bw-p3 The High Pass | plain | The pass, and beyond it a country the colour of ash. |

### A: Arrival lines

The line on a fight's reveal. An elite node draws one of several foes, so its line names none. Cap 32 words. Source: `axiomancer-mechanics/src/World/MapEvents/arrival-lines.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| A-01 | bw-w2 Gallows crossroads (Quay-Crab) | cruel | Something comes up out of the ditch beneath the hanged, slow and plated, its mouthparts working yet on what it was given. |
| A-02 | bw-w3 Field road (Coralback) | plain | The barley parts before you and a pale thing comes sidelong through it, crowned in coral like the king of some drowned country. |
| A-03 | bw-w5 Keep causeway (elite) | grief | The causeway runs out wet and narrow to the keep. What holds it was a man once and was loved, and none of that will stay its hand. |
| A-04 | bw-k2 Sea keep (the Saint Beneath) | plain | The last stair ends in black water. Beneath it a face broad as a church door lies looking up, and the mouth of it opens. |
| A-05 | bw-h1 Quay end (Net-Mender) | cruel | The mender has run short of cord. He looks you over as a man looks over a hide, for the length in it. |
| A-06 | bw-h2 Crane quay (Quay-Crab) | plain | The mud beneath the cranes heaves and sheds itself and stands up on jointed legs, streaming. |
| A-07 | bw-h3 Harbour light pier (Net-Mender) | grief | He is mending by the harbour lamp. He holds a knot to the light and it is wrong, and he begins again, and he does not weep. |
| A-08 | bw-h7 Long pier (Brine-Widow) | plain | She turns at the pier's end in her stiff black veil. She has waited long, and you are not him, and it does not matter. |
| A-09 | bw-c1 Sea cave (elite) | cruel | The cave closes over you like a mouth. What keeps this place has been fed here before, and it knows the sound of feet. |
| A-10 | bw-t1 Harbour steps (Coralback) | plain | On the worn steps a thing sits sunning its crown of stolen coral. It raises one claw as if to bid you kneel. |
| A-11 | bw-t2 Bridge approach (Bilge-Stalker) | grief | It comes low along the bridge road past the little shoes, and it steps around them. It has learned that much. |
| A-12 | bw-t3 Town gate (Brine-Widow) | plain | A woman in black stands in the gate where the toll was taken. Her fist is closed on something white. |
| A-13 | bw-t6 Upper town (Coralback) | cruel | It has come up from the harbour to the tall houses for the salt on their sills, and for what sleeps behind them. |
| A-14 | bw-l1 Cliff crossroads (Bilge-Stalker) | plain | A green shape stands upright in the crossroads grass, finned along the spine, bright eyed and entirely still. |
| A-15 | bw-l4 Lighthouse path (elite) | grief | A light swings on the path above. Whoever carries it has called ships onto these rocks, and one of them carried his own. |
| A-16 | bw-d1 Fishing hamlet (Net-Mender) | plain | Between the drying racks a drowned man sits with a net across his knees, and the hamlet has let him sit. |
| A-17 | bw-d3 Hamlet rise (Bilge-Stalker) | cruel | It has been at the hamlet's edge by night. The grass is pressed flat where it lay watching the doors. |
| A-18 | bw-m1 South fork (Quay-Crab) | plain | Under the signpost the road mud stirs. A claw comes out of it the size of a spade, and then the rest. |

### H: Hazards

The line that opens a hazard node. Cap 45 words. Source: `axiomancer-mechanics/src/World/MapEvents/content.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| H-01 | bw-h4 The wreck | grief | The wreck lies open to the tide. In her hold the sea turns over what the pilgrims carried, a child's shoe, a psalter, a comb. Mind the hull. It is the last thing in that harbour that was never sold. |
| H-02 | bw-t5 Back lanes | plain | The lanes close in until the eaves meet overhead and the daylight goes. Doors stand on either hand with no handles to the street. Something has gone before you and marked the turnings in tallow. |
| H-03 | bw-d4 Tower switchbacks | cruel | The switchbacks climb the scarp in a score of turnings. At each the watch once set a man with a horn. They were never relieved. They are there yet, and the horns are full of rain. |
| H-04 | bw-m2 River meadow | plain | The meadow lies green and windless by the river. Under the grass the ground is soft as a bed, and it has kept the shape of everything that ever lay down in it. |
| H-05 | bw-m4 Manor road | grief | The manor road runs straight between the elms. From each a rope end hangs, cut short. The tenants were brought here at rent day, and their children walk this road to their work and do not look up. |
| H-06 | bw-p1 Foothills | plain | The foothills rise in broken shelves of slate. Old walls cross them going nowhere, raised by a people who fenced the mountain against something and then were gone. |

### R: Rests and dreams

A rest node's line, and the dream shown while the night passes. Cap 45 words. Source: `axiomancer-mechanics/src/World/MapEvents/content.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| R-01 | bw-w4 West cliff road, rest | cruel | A hollow under the cliff road, out of the wind. Others have camped here. Their fire ring is cold, and their boots stand beside it in a row. |
| R-02 | bw-h5 Moored ship, rest | plain | The moored ship lies quiet at her ropes. There is a berth below with the blanket turned back, and a lamp, and no hand aboard to say who lit it. |
| R-03 | bw-l3 Cliff road, rest | grief | A keeper's hut stands by the cliff road with the door off. On the wall within some hand has scored the days, hundreds of them, and after the last a single word. Sorry. |
| R-04 | bw-w4 West cliff road, dream | plain | You dream the road goes on along the cliff with no sea beneath it, only a white depth, and far down in it something vast turns over once in its sleep. |
| R-05 | bw-h5 Moored ship, dream | cruel | You dream the ship is under way. The crew stand to their stations and none of them has a face, and the captain asks you kindly which of them you would have put over the side. |
| R-06 | bw-l3 Cliff road, dream | plain | You dream of a window that gives on the sea and on nothing else. A woman stands at it with her back to you. The curtain moves. You wake before she turns. |

### S: Cutscenes, travel and villages

Story encounters and the lines that move you between places. Cap 110 words for a cutscene, 45 otherwise. Source: `axiomancer-mechanics/src/World/MapEvents/content.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| S-01 | bw-l2 Clifftop chapel, cutscene | grief | A man kneels in the chapel and he is not at prayer. He is practising. He says, I was too drunk to stand. He says, the child would not hold still. Then he says it over with the words set in another order, as a man turns a coin to find the better face. None of the ways will serve. The flags are worn in two hollows where his knees are. When he lifts his head you see that he has your coat and your hands, and the bottle at his side is the one you carry. |
| S-02 | bw-d5 Old watchtower, cutscene | plain | The watchtower stands roofless on its crag. It was raised to watch the sea for something, and a beacon basket hangs there yet, never lit. Whoever kept this watch scored the wall with a tally of nights that runs down to the floor and stops. The sea is empty. It has the look of a thing waiting to be otherwise. |
| S-03 | bw-p3 High pass, cutscene | cruel | From the pass the coast lies below you, small. Beyond the mountains the land goes on grey under no weather, and smoke stands in it straight as columns. The Covenant has been through that country. At the roadside they have left the people of the last village seated in rows as if at a lesson, and the birds are not yet done. |
| S-04 | bw-w1 Windmill, the quest line of the opening cutscene | plain | A fishing boat went over off the harbour in a dead calm, and her crew have not come home. Find them. |
| S-05 | bw-h6 Sea cave mouth, travel prompt | grief | The sea cave runs down under the cliff to a cove. Names are cut in the rock at its mouth, with dates, by those who waited here on the boats. The last is cut small, and low, and badly. |
| S-06 | bw-c0 Cave face, travel prompt | plain | The cave runs back up under the cliff toward the harbour, black and breathing. |
| S-07 | bw-t4 Harbour town, village line (untagged gap: it shows the shared Anvil line today) | cruel | The harbour town. Warm windows and smoke, and a welcome for any man with shillings. They hanged a household at the crossroads this month, and the tavern is full. |
| S-08 | bw-m5 Walled manor, village line (untagged gap: it shows the shared Anvil line today) | plain | The walled manor. A bell rings in the yard and no one is at service. Behind the glass along the wall there is a forge, and a bed to be had at a price. |

### L: Loot cache actions

What you do to earn each side of a cache, never what you get. Cap 30 words. Source: `axiomancer-mechanics/src/World/MapEvents/content.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| L-01 | bw-h8 Pier end, take a card | grief | Cut the purse from the net. A name is stitched inside it in a mother's careful hand. |
| L-02 | bw-h8 Pier end, take the goods | plain | Wade under the planking and feel along the piles for whatever else the tide has hung there. |
| L-03 | bw-d2 Boat sheds, take a card | cruel | Break the hasp with a stone. The box was nailed shut from within, and you need not ask by what. |
| L-04 | bw-d2 Boat sheds, take the goods | plain | Drag the box up the shingle to the light and work the swollen lid off with your knife. |
| L-05 | bw-m3 Riverbank, take a card | grief | Gather the coins from the rocks. They were someone's whole saving, counted out here the night before the river. |
| L-06 | bw-m3 Riverbank, take the goods | plain | Turn the cracked jar over and reach into it to the shoulder. |

### Q: Quest nodes

What you see on reaching a quest node, and the line shown when it will not deal with you yet. Narration, not speech. Cap 45 words. Source: `axiomancer-mechanics/src/World/MapEvents/content.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| Q-01 | bw-c2 Fishermen's camp, description | cruel | The fishermen sit round a driftwood fire and feed it with the strakes of their own boat. There is a place left at the fire, and none of them will sit near it. |
| Q-02 | bw-c2 Fishermen's camp, locked line | plain | The fishermen do not know you. They keep to their fire and their silence, like men who have agreed upon a story. |
| Q-03 | bw-l5 Lighthouse, description | grief | The lighthouse door stands open. On the table within are two bowls, set out as they are set out every night, and one of them has never once been used. |
| Q-04 | bw-l5 Lighthouse, locked line | plain | The keeper turns you back down the path. No word was sent ahead of you, and he opens to none unsent. |
| Q-05 | bw-k1 Keep gate, description | cruel | The keep gate, barred from within. The bar is on the wrong side for a gate meant to keep men out, and the scratches in the iron are at the height of a man's hands. |
| Q-06 | bw-k1 Keep gate, locked line | plain | The keep gate does not open to strangers. It scarce opens to those it knows. |
| Q-07 | bw-b1 River bridge, description | grief | The river bridge. The far bank lies a stone's throw off, and people stand upon it who have stood there for days looking back at this one, waiting on someone. |
| Q-08 | bw-b1 River bridge, locked line | plain | The bar is down across the bridge, and it will not be lifted while the sea keep stands. |

### C: Quest chain

The quest log's text for the four steps, the key, and the two gate reasons. Cap 45 words. Source: `axiomancer-mechanics/src/World/breakwater-chapter.questline.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| C-01 | Step 1 the capsized boat, description | cruel | Four went out and the boat came back without them. Go through the sea cave and find the fishermen, and count them. |
| C-02 | Step 1, objective | plain | Find the fishermen at their camp beyond the sea cave. |
| C-03 | Step 2 the lighthouse, description | grief | Climb to the lighthouse. The keeper lights it nightly for one who will not come, and he has the key. |
| C-04 | Step 2, objective | plain | Reach the lighthouse on the last of the cliff. |
| C-05 | Step 3 the keep key, description | cruel | Carry the key down to the keep gate. It has opened that door for a great many, and it was never once wanted to let them out. |
| C-06 | Step 3, objective | plain | Bring the keep key to the gate. |
| C-07 | Step 4 the sea keep, description | grief | Go down to what the town calls a saint and end it. He was a man once and he asked for help, and you are the first who came. Then cross the bridge. |
| C-08 | Step 4, objective | plain | Kill the Saint Beneath. |
| C-09 | The keep key, item description | cruel | An iron key, black and cold past reason. The last man to bear it bore it in his mouth, that they not take it from his hands. |
| C-10 | Keep gate, gate reason (breakwater-chapter.ts) | plain | The keep gate is barred, and it wants a key. |
| C-11 | River bridge, gate reason (breakwater-chapter.ts) | grief | The bridge will not have you while the keep stands. Those waiting on the far bank have learned as much. |

### U: Screens

Narration on the app's own screens: defeat, withdrawing, coming back from death, game over, the quest screen, the village counters. Cap 40 words. Source: `axiomancer-mobile/`.

| Id | Where | Take | Draft |
|---|---|---|---|
| U-01 | Defeat summary, cause: VITAE (combat-summary.copy.ts) | plain | Your VITAE is spent. You go down in that place as others have before you. |
| U-02 | Defeat summary, cause: turn limit (combat-summary.copy.ts) | cruel | The turns ran out. It let you tire as a cat lets a thing tire, and then it was done with waiting. |
| U-03 | Withdraw, second line (reveal.copy.ts) | plain | No reward. The road is held yet, and you may come at it again. |
| U-04 | Death return, headline (death-return.copy.ts) | grief | You come back to the road with a thread of breath in you. You did not earn it. Others were owed it more and did not come back. |
| U-05 | Death return, what is kept (death-return.copy.ts) | plain | What you carried is yours yet. Only the breath is spent. |
| U-06 | Game over (game-over.copy.ts) | cruel | This one is finished. The road does not grieve. Another walks it already who will learn what you learned and die of something else. |
| U-07 | Quest screen, giver fallback (quest.copy.ts) | plain | There is work here for the willing, and no shortage of it. |
| U-08 | Quest screen, locked line (quest.copy.ts) | grief | Not yet. There is work you swore to and have not done, and you of all men know what such a promise is worth. |
| U-09 | Village, paid rest line (village.copy.ts) | plain | A room above the tavern with a door that bolts, and the noise of the living coming up through the boards. |
| U-10 | Village, card shop line (village.copy.ts) | cruel | Five cards laid out on the counter, the same five whenever you come. Those who last held them have no further use for them. |
| U-11 | Village, weapons and armor line (village.copy.ts) | plain | Arms and harness laid out on the counter, such as you do not already carry. |

### E: Enemy descriptions

The six Chapter 1 foes whose description is marked DRAFT for T to rewrite. Cap 45 words. Source: `axiomancer-mechanics/src/Enemy/enemy.library.ts`.

| Id | Where | Take | Draft |
|---|---|---|---|
| E-01 | The Saint Beneath | grief | A great fish with an old man's face grown into the fore of it. The eyes are shut. They were shut for him, that he need not see the windows, and he has prayed to be answered ever since. |
| E-02 | Saltwick Swarm | plain | Five lit jellies adrift as one body, the largest broad as a cartwheel and the least no bigger than a thumb. Nothing among them commands. They sting alike. |
| E-03 | The Wreckmaster | cruel | A drowned captain in a good coat, sabre out and pistol up. He put his ship on the rocks with her hatches nailed, and he is short of crew yet. |
| E-04 | Quay-Crab | plain | A dark green crab the size of a dog, one claw grown monstrous from a life of holding fast to things that wished to leave. |
| E-05 | Bilge-Stalker | grief | A green thing that learned to stand. It was something's young once, left below decks when the ship was quit, and it has not forgiven the light. |
| E-06 | Coralback | plain | A pale crab under a crown of coral it did not grow. The colours are a warning, and the warning is honest. |

### N: Names

Names carry no cruelty level.

| Id | What | Today | Draft |
|---|---|---|---|
| N-01 | Questline name | `[content] Chapter 1` | The Breakwater |
| N-02 | Step 1 name | `[content] Chapter 1: the capsized boat` | The Capsized Boat |
| N-03 | Step 2 name | `[content] Chapter 1: the lighthouse` | The Light on the Cliff |
| N-04 | Step 3 name | `[content] Chapter 1: the keep key` | The Black Key |
| N-05 | Step 4 name | `[content] Chapter 1: the sea keep` | The Saint Beneath |
| N-06 | Keep key, item name | `[content] Keep key` | The Keep Key |
| N-07 | bw-c2 giver name | `[content] The fishermen elder` | The Eldest at the Fire |
| N-08 | bw-l5 giver name | `[content] The lighthouse keeper` | The Keeper of the Light |
| N-09 | bw-k1 giver name | `[content] The gate warden` | The Warden of the Gate |
| N-10 | bw-b1 giver name | `[content] The bridge-keeper` | The Bridgeward |
| N-11 | Reward eyebrow, quest (relic-source.copy.ts) | `QUEST REWARD: <QUEST>` | EARNED: <QUEST> |
| N-12 | Reward eyebrow, spared foe (relic-source.copy.ts) | `SPARED: <FOE>` | LEFT BY THE SPARED: <FOE> |
| N-13 | Reward eyebrow, elite drop (relic-source.copy.ts) | `DROPPED BY <ELITE>` | TAKEN FROM <ELITE> |

### Spoken lines

Someone speaks these, so they belong to the People voice, not the Narrator.

| Where | Today | Draft |
|---|---|---|
| Village host line (village.copy.ts, VILLAGE_HOST_LINE) | `[content] Roofs and smoke, and shillings welcome. What will it be?` | [NPC Content Needed] |
| Innkeeper line (village.copy.ts, VILLAGE_INNKEEPER_LINE) | `[content] A bed, a bowl, and a door that bolts. Pay up front.` | [NPC Content Needed] |
| Shopkeeper line (village.copy.ts, VILLAGE_SHOPKEEPER_LINE) | `[content] Look all you like. Touching is extra.` | [NPC Content Needed] |
| Blacksmith line (blacksmith.copy.ts, BLACKSMITH_SMITH_LINE) | `[content] Set them on the anvil.` | [NPC Content Needed] |

## Verdicts

Not reviewed yet.
