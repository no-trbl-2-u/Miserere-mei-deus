---
date: 2026-11-04
---
## Edit plan/README.md
~~~ old
| 99 | Guard the traps:
~~~
~~~ new
| 151 | Elite and spare rewards give only what you don't own | [151-mr5-owned-rolls.md](151-mr5-owned-rolls.md) | planned | 1 left |
| 99 | Guard the traps:
~~~

## Edit plan/149-tl2-pilot-fix-ups.md
~~~ old
and a quest and an elite drop of the same item each keep their offer.
~~~
~~~ new
and an item waiting on the reward screen survives an app close.
~~~

## Edit plan/149-tl2-pilot-fix-ups.md
~~~ old
**Rewards.** `carriedCovers` counts per source as well as per id, with tests that fail on today's code.
~~~
~~~ new
**Rewards.** `carriedCovers` counts per source as well as per id, with tests that fail on today's code. **A5, corrected (T, 2026-11-04: "Reword A5 only"):** it left this spec when 149.5 settled, reading "each reach the item reward screen once, through an app close". The close half was wrong, as #1379 found. A5 reads: an item waiting on the reward screen survives an app close, once, in the saved satchel; only the ceremony is missed, since the queue is not saved. Saved games don't change. Its other half goes under spec 151: an elite's drop rolls around a same-fight quest's item, so the two no longer make two offers or two copies.
~~~

## Decisions
- **D?roll-around-quest** · 2026-11-04 · (proposed) Elite relic and lane-piece rolls and Spare rolls never give an item the player carries, wears, or will be paid by a quest in that same fight: the roll picks another item or drops nothing. The quest always pays, and the player holds one copy. This takes back 149.5's second copy for elite drops; payouts from quests alone are untouched, and an app close keeps a waiting item and misses only its screen. *Why:* T, 2026-11-04: "Elites and spare rewards should only give you relic's, weapons, and armor you don't currently own", "Roll around the quest", "Reword A5 only".
