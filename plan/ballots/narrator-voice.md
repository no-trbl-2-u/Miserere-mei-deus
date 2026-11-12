# The Narrator: how far into McCarthy

The ledger for the voice ballot (`narrator-voice.ballot.html`, ballot id
`narrator-voice-2026-11-08`), opened 2026-11-08.

## Why

T, 2026-11-08: Claude generates the game's writing and T approves all of it.
Player-facing text has three voices:

- **The Narrator:** narration, map text, enemy journals, flavor. One locked
  voice, "like Cormac McCarthy wrote it".
- **The Rulebook:** cards and rules. A fixed glossary, no style.
- **The People:** NPC quotes. Changes per speaker.

These voices do not write the story. The story is T's, with a dedicated agent
later. If an enemy is not in the story, it gets no journal entry yet.

This ballot sets how far the Narrator goes. Its picks start the calibration
set the Narrator is drafted against; rejections and T's reasons are kept too.

## What the samples may use

Only facts already in the game or the story overview, plus small physical
detail (rain, a lamp). The writing borrows his manner and never his sentences
(`plan/north-star-mork-borg.md` Q-4: "calibrate freely, quote never").

Tense is held still so it does not skew the vote: places and flavor are
present tense, journals and memories past.

## The key

The ballot page hides this so T judges the words. **Long** is run-on sentences
joined by "and". **Stripped** is short plain sentences and fragments. **Mixed**
is short sentences with one long one.

| Slot | a | b | c |
|---|---|---|---|
| N-01 Breakwater | mixed | long | stripped |
| N-02 Charcoal Wood | stripped | mixed | long |
| N-03 Gallows Crossroads | long | stripped | mixed |
| N-04 Rope bridge toll | mixed | stripped | long |
| N-05 Opening | stripped | long | mixed |
| J-01 Saint Beneath | mixed | long (T's confirmed text, spec 162) | stripped |
| J-02 The last hut | long | mixed | stripped |
| F-01 Keep key | stripped | long | mixed |
| F-02 A Plain Blow | mixed | stripped | long |
| F-03 Death line | long | mixed | stripped |

## Rules that must change after the vote

- `axiomancer-mechanics/docs/narrative/ANTI_IMITATION.md` bans writing in a
  named author's style.
- `axiomancer-mechanics/docs/narrative/DELIVERY_REGISTER.md` MB-1 caps
  narration at 20 words, and `scripts/check-prose.mjs` enforces it.

## Round 2, withdrawn

T, on round 1: "I love this, buuuut I want darker. I want a corpse hanging
from those gallows. I want the player to be afraid."

Round 2 tested three kinds of fear but drifted into modern horror. T asked for
the target directly: "Imagine if Cormac McCarthy wrote Elder ring". It was
withdrawn unvoted.

## Round 3, withdrawn

Eight places in the tone T chose (T, 2026-11-09), each offered plain, bloody
and immoral. Withdrawn unvoted when T set the three takes for round 4.

## Round 4: our quests, our enemies

T, 2026-11-09: "Stick to Cormac McCarthy writes elden Ring but based on our
quests and enemies. Out of the three proposals each do: 1) Stick to just the
ancient, looming fear closer to Elden Ring 2) Find the middle ground between
the writing and prose of Blood meridian but the imagination of Elden Ring 3)
Stick to Cormac McCarthy writes Elden Ring but with maximum immorality. Keep
the gore purposeful though and the write around it instead of describing it
outright"

Round 4 (`narrator-voice-4.ballot.html`, ballot id
`narrator-voice-4-2026-11-09`). The feel only: no place, character, name or
sentence is taken from either work. Details the samples add (the priest, the
list, the false fires) are not story until T rules them in.

| Slot | a | b | c |
|---|---|---|---|
| P-01 Gallows Crossroads | 3 immoral | 1 ancient | 2 middle |
| Q-01 The capsized boat | 2 middle | 3 immoral | 1 ancient |
| Q-02 The lighthouse | 1 ancient | 3 immoral | 2 middle |
| Q-03 The keep key | 3 immoral | 2 middle | 1 ancient |
| Q-04 The sea keep | 2 middle | 1 ancient | 3 immoral |
| E-01 The Saint Beneath | 3 immoral | 2 middle | 1 ancient |
| E-02 The Wreckmaster | 1 ancient | 3 immoral | 2 middle |
| E-03 Quay-Crab | 2 middle | 1 ancient | 3 immoral |
| E-04 Saltwick Swarm | 3 immoral | 1 ancient | 2 middle |

## Round 5: plain, cruel, grief

T, 2026-11-10: the Narrator covers "enemy journals, quests, story
encounters, narration, anything but cards and NPCs". The three takes:
"Cormac McCarthy writes elden Ring but with our story, enemies, quests, and
locations (with plenty of extra imagination)"; "The same except turn the
cruelty up to 11"; "Same as both except make me cry the scene is so cruel and
violent or self loathing or hatred or just any of the many many negative
emotions to match." And: "Try to avoid having the run on sentences go on for
too long."

Round 5 (`narrator-voice-5.ballot.html`, ballot id
`narrator-voice-5-2026-11-10`). Twelve slots, 36 samples. Round 4 is not
withdrawn; T has not ruled on it.

- **The target.** Cormac McCarthy writing Elden Ring, in the register of
  Blood Meridian: archaic and biblical diction, clauses chained with "and",
  similes that open on "like some", a landscape that does not care, violence
  told flat. His manner and never his sentences (Q-4: "calibrate freely,
  quote never").
- **Redrawn the same day.** The first draft of this round was plain short
  sentences. T, 2026-11-10: "I don't see anywhere in the PR about the voice
  being in the style of Cormac McCarthy. I'm looking for blood meridian level
  prose". All 36 samples were rewritten; the scenes and the key did not move.
- **Sentence length.** No sentence runs past 40 words.
- **Sources.** Enemies follow their portraits' draft descriptions in
  `enemy.library.ts`; quests follow `breakwater-chapter.questline.ts`; S-01
  uses story-overview rulings 13 to 15 (the Covenant, the forbidden
  prophecy); S-02 uses prologue steps 9 to 11.
- **The feel only.** No place, character, name or sentence is taken from
  either work.
- **Invented, not story until T rules it in:** the boy with the bowl, the
  three-armed gallows, the pilgrim ship, the girl at the windmill, the
  keeper's wife, the lots drawn at the lighthouse, the town sending people
  down to the Saint, the Saint's wife, the Wreckmaster's son and his nailed
  hatches, the Brine-Widow's boy, the Net-Mender's daughter and partner, the
  Cave Choir's priest, the chapel priest and the Covenant's notices, the
  serjeant, the bottle.
- **The assault stays off-screen** (story-overview, prologue step 9). The
  child's death is named and never shown.

The key. **Plain** is the voice as it stands. **Cruel** is the same with the
cruelty all the way up. **Grief** is the same again, written to hurt.

| Slot | a | b | c |
|---|---|---|---|
| P-01 Gallows Crossroads | 3 grief | 1 plain | 2 cruel |
| P-02 The wreck | 2 cruel | 3 grief | 1 plain |
| Q-01 The capsized boat | 1 plain | 2 cruel | 3 grief |
| Q-02 The lighthouse | 3 grief | 2 cruel | 1 plain |
| Q-03 The sea keep | 2 cruel | 1 plain | 3 grief |
| E-01 The Saint Beneath | 1 plain | 3 grief | 2 cruel |
| E-02 The Wreckmaster | 2 cruel | 3 grief | 1 plain |
| E-03 Brine-Widow | 3 grief | 1 plain | 2 cruel |
| E-04 Net-Mender | 1 plain | 2 cruel | 3 grief |
| E-05 The Cave Choir | 2 cruel | 1 plain | 3 grief |
| S-01 The clifftop chapel | 1 plain | 3 grief | 2 cruel |
| S-02 Memory: the window | 3 grief | 2 cruel | 1 plain |

## The cruelty slider

T, 2026-11-11: "create the narration voice that essentially will have a
slider on cruelty. So that when I ask for a specific proposal for a piece of
new content, I'm asked \"How cruel?\"" T chose five stops with grief on top.

The skill is `.claude/skills/narrate/SKILL.md` (`/narrate`). It asks "How
cruel?" before drafting, unless the request already names a stop. The page
`narrator-slider.html` shows one scene at all five.

| Stop | Name | What it means | Round 5 take |
|---|---|---|---|
| 1 | Plain | The world is old and does not care. Nobody is hurt on the page. | plain |
| 2 | Hard | Loss and harm, done by weather, hunger or time. No one chose it. | none |
| 3 | Cruel | Someone chose it, for gain or ease. One cruel fact, told flat. | none |
| 4 | Cruelty at 11 | Shared, habitual, enjoyed or administered. | cruel |
| 5 | Grief | It lands on someone the reader cares for, or is the subject's own doing. | grief |

Stops 2 and 3 were not on any ballot. Their samples in the skill are Claude's
and not yet T's.

## Verdicts

### Round 1 (T, 2026-11-08)

Locked, with T's edits. Both end on a long sentence, whichever shape they
started in.

**N-01 the Breakwater** (b, long):

> The wall comes down out of the hills and goes out into the sea and stops and
> the sea comes over it regardless. Behind it the piers stand black and
> dripping on their legs and the boats lie chained at them and under the
> lighthouse the wreck of some older thing lies canted in the shingle where
> the tides have corroded its ribs for the world to see.

**N-02 the Charcoal Wood** (a, stripped):

> Clearings cut in rings. Clamps smoking under sod. The burners are black to
> the eyes and they do not look up. Caves lie in the south where many have
> entered only to exit as a shadow of who they once were.

Everything else is redrawn in round 4.

### Round 4

Not voted yet.

### Round 5

Not voted yet.
