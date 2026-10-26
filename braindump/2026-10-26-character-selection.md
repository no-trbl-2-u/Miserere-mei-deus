# Character selection — 2026-10-26

## Surface question
"Part of the deadlines, I want Character selection. The player will be able to select from a series of
characters. Each character has: a unique portrait, a starting relic (starts equipped), a starting stat
allocation, two specific starting lanes DIFFERENT from their relic's lane. This overrides the decision where
'when a relic is acquired, it unlocks the lane for the random card rewards'."

## Better question surfaced
The reward pool holds one lane from the first fight to the last, so endgame lane control is the same as
starting lane control, and every run starts the same. The question is how a run can open with an identity
(two lanes and a relic) and then let the player reshape the pool by what they wear, so a late-run build
offers different cards than the opening did.

## Path taken this session
1. Opened on diverge: the mechanism was fully specified (portrait, relic, stats, two lanes), with no problem
   stated and no alternative.
2. t2: T named the itch (endgame lane control equals starting control; runs start the same) and the bending
   rule (equip and unequip relics to control the pool). The state flipped to converge. GOAL narrowed to add
   the growing pool.
3. t3: the pool rule fixed (starting lanes + worn relics; unworn relics do nothing). T asked for detail on the
   unbuilt RW1a and LR1a rows, which encode the carry-to-unlock rule this replaces.
4. t4: T chose to amend RW1a and LR1a now by a separate plot (PR #944, D107), and ruled that grey is never a
   reward.
5. t5: the measure (both an engine test and a report column) and the select screen's look.
Parked: none.

## Raw material read
- `plan/2026-09-25-refactor-strategy.decisions.md:1035` D104: a lane unlocks when one of its relics is carried,
  worn or not. Amended by D107 (PR #944) to worn relics only, grey never offered.
- `plan/steps/01_build_plan.md`: RW1a and LR1a are open and unbuilt; amended by #944.
- `axiomancer-mechanics/src/Character/presets.ts:123`: three presets (apprentice, wanderer, sage) that differ only
  by stats and items. No relic and no lanes. This is the nearest carrier for a character definition.
- `axiomancer-mobile/components/art/PlayerPortraitImage.tsx`: the portrait component. Portrait flavour today comes
  from `playerArchetype` (the dominant stat).
- SG1 (#928, shipped): a fresh run starts with no relic; the Suppliant's Ring is kept for a future lane.
- Lanes registered: blood-price, elementalist. The grey office is the starter, not a lane (T, t2).
- `plan/deadlines.md`: the MVP is Nov 16; T is formalising a December milestone.

## Measured
| Finding | Data |
|---|---|
| Lane mix of reward offers, start vs late run | Not measurable before build: no character lanes exist, and RW1a (the pool rule) is unbuilt. The report column this pitch adds is the first measurement. |

## Prior art consulted
- **Slay the Spire — per-character card pools, the Prismatic Shard relic:** each character draws from its own
  colour; the Shard opens every colour's cards. Memory read, not a KB citation: the Shard is remembered as a
  favourite "break the class" moment.
- **Monster Train — primary and allied clan:** two clans chosen at the start define the card pool. Memory read:
  praised as the main source of its replay variety.
- **Hades — weapon aspects and god boons:** the aspect fixes a starting identity, and boons from different gods
  bend it. Memory read: widely praised. Its identity is softer than a lane.
All three put the identity in the opening choice and the bending in mid-run pickups.

## Rulings (T, this session)
- Each character has a unique portrait, a starting relic (equipped), a starting stat allocation, and two starting
  lanes different from the relic's lane (t1).
- This overrides D104's carry-to-unlock rule (t1).
- Bending the archetype means equipping and unequipping relics to control the reward pool (t2).
- Grey starter cards are not a lane (t2), and are never offered as rewards (t4).
- Blocked until T plots at least one more lane, because a character needs its relic's lane plus two others (t2).
- Roster: one character for the mid-November deadline, three for December (t2).
- The reward pool is the character's two starting lanes plus the lane of every worn relic. Worn relics weight
  rewards toward their lane (D100 slots). Unequipping removes the lane. A carried, unworn relic does nothing (t3).
- RW1a and LR1a are amended now, separately (t4; PR #944, D107).
- Measure: both an engine pool test and a start-vs-late column in the measured report (t5).
- The select screen (t5) looks like a fighting-game character select:
  - a two-row carousel of squares at the very bottom, with locked squares shown as a question-mark icon;
  - above it, the character's information: stats, starting relic and playstyle;
  - the starting lanes are not named, only the playstyle;
  - not wordy and not cluttered, with the portrait and the starting relic as the two main focuses.

## Directions considered
### Option A — The pool is starting lanes plus worn relics (chosen) *(inspired by Monster Train's two clans, Slay the Spire's Prismatic Shard)*
The two lanes are always in; each worn relic adds its lane and weights toward it.
**Trade-off:** the starting identity never fully leaves the pool.
**Telltale failure mode:** late-run offers look like run-start offers, because players wear their starting
relic all run and the pool never shifts.
### Option B — Starting lanes always, relics only weight them
Rejected at t3: it caps bending.
### Option C — Worn relics only, starting lanes as a base until three relics are worn
Rejected at t3: maximum bending, but the starting identity can vanish.

## What proves it (not T, not the agent)
An engine test pins the pool rule. The measured report gains a column comparing the lane mix of offers at run
start and after three worn relics: a pass shows the late mix includes a lane absent at the start.

## Handoff to /plot
Task: Add a character select at run start, so each run opens as an archetype. Each character has a portrait,
an equipped starting relic, a stat spread, and two starting lanes other than the relic's. The reward pool is
those two lanes plus the lane of every worn relic, never grey, so late-run lane control differs from the start.
Source: this file
Acceptance:
- A1 A character definition (engine) carries a portrait key, a starting relic id, base stats, two starting lane
  ids and a short playstyle line. A content test fails if a character's starting lanes include its relic's lane,
  or name an unregistered lane.
- A2 Starting a run with a character equips its relic, applies its stats, and records its two starting lanes on
  the save; old saves load with no character and keep the D107 stopgap pool.
- A3 The reward pool is the character's two starting lanes plus every worn relic's lane. Wearing an off-lane relic
  adds its lane; unwearing removes it; an unworn relic changes nothing; grey is never offered. An engine test
  covers each case.
- A4 The character select screen: a two-row carousel of squares at the bottom (locked squares show a
  question-mark icon); above it the portrait and the starting relic as the two focal elements, then stats and a
  one-line playstyle. Starting lanes are never named on the screen. A screen test pins the layout's elements and
  the absence of lane names.
- A5 The measured report gains a column: the lane mix of reward offers at run start and after three worn relics,
  per character.
- A6 The first character (mid-November) is selectable; the other carousel squares are locked.
Measure: the A3 engine test passes, and the A5 report column shows the late-run lane mix includes a lane absent
at run start.
Decisions made upfront: every ruling above, one line each, as listed.
Out of scope: the December roster's two further characters; the third lane itself (T plots it first).
To confirm:
- The empty-pool fallback before character selection exists (grey, or no card reward) is decided on PR #944,
  not here. [T to confirm]
- Each character's content (portrait art, which relic, stats, the playstyle line) is T's, authored in an
  attended phase before the loop builds A6. Default: one attended authoring phase per milestone. [T to confirm]
Suggested slot: anytime, blocked on T plotting a third lane. The first character targets the mid-November
deadline; the plot names the third-lane dependency in `Requires`.

## Exit extras (game-design lens)
- **Player fantasy:** "I chose who I am, and what I wear decides who I become."
- **Telltale failure mode:** the late-run lane mix matches the start, because no worn relic ever changes the pool.
  The A5 column shows it first.
- **Content boundary:** portraits, the relics' content, the stat spreads and the playstyle lines are T's. The
  pitch plans the engine, the save and the screen around them.
