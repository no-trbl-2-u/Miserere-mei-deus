---
date: 2026-11-02
---
## Edit plan/137-cf1-card-face-grammar.md
~~~ old
says GLOBAL and nothing about its duration; and the glossary teaches the three rules the short lines lean on.
~~~
~~~ new
says GLOBAL and nothing about its duration, which the opened card's NO DIE / +DIE rows state (T, 2026-11-01); and the
glossary holds the three rules the short lines lean on, with no opened card printing them.
~~~

## Edit plan/137-cf1-card-face-grammar.md
~~~ old
- A Global prints GLOBAL in the FREE pill's place, no FREE line and no duration on the face; the large face says
  "3 turns played FREE, the whole combat PAID" (T, t10).
~~~
~~~ new
- A Global prints GLOBAL in the FREE pill's place, no FREE line and no duration on any face, small or large; the
  duration lives in the opened card's NO DIE / +DIE rows ("In play 3 turns", "In play for the rest of combat"), and
  the large face's line "3 turns played FREE, the whole combat PAID" is gone (T, 2026-11-01, superseding t10).
~~~

## Add plan/137-cf1-card-face-grammar.md
~~~ section Design
### The opened card carries no extras (T, 2026-11-01, after 137.3)

T looked at an opened Global (Rose Wrap) on the preview APK and scribbled out three things, then said: "get rid of
this stuff. In all places for all cards." They are gone from every opened card (the combat detail, the reward preview
and the deck detail):

- **The duration line inside the large face** ("3 turns played FREE, the whole combat PAID", under the PAID line of a
  Global). Where the older text above says the large face states the duration (the Global decision, 137.3's notes,
  A7), the duration is now stated only by the opened card's NO DIE / +DIE rows.
- **The grey meta strip under the card** (`HEART · ASH · COMMON · GLOBAL`, with the rarity pip row after it). The
  large face still prints the rarity word, and the deck detail keeps its rarity mark.
- **The system notes under the NO DIE / +DIE rows** (GLOBAL, READING A LINE, CONVICTION and the other terms the
  card's text triggered). Where A5 and 137.2's notes say the glossary teaches the reading rules, the rules stay in
  `SYSTEM_GLOSSARY` (the board glossary and the keyword atlas read it), but no opened card prints them. A player now
  learns "steps resolve left to right", "debuffs land on the foe" and the rest nowhere on a card; whether they
  return, and where, is T's call (the Measure's blind read leaned on them).

Only the rendering goes: card text, `run` bodies and the keyword panel above the card do not change.
~~~
~~~ acceptance
- **A?openbare** An opened card (combat detail, reward preview, deck detail) shows no Global duration line on its face,
  no meta strip (stance, rank, rarity, type) under it and no system notes under its NO DIE / +DIE rows, for any card;
  the rarity word, the PAID line, the FREE pill or GLOBAL plate, the NO DIE / +DIE rows and the keyword panel stay.
  Render tests fail on the old build and pass now.
~~~
~~~ chunks
- [ ] **137.?openbare** The opened card drops the duration line, the meta strip and the system notes · S · closes A?openbare · needs — · alias: CF1h
  - Removes `combat-card-face-duration` from `CombatCardFace`'s large branch, the meta strip and pip row from the
    combat detail, the meta line from the deck detail, and the system-notes block with its `systemTerms` plumbing.
    `SYSTEM_GLOSSARY` stays (the board glossary and the atlas read it).
~~~
