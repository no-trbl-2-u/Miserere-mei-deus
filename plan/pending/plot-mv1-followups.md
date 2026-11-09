---
date: 2026-11-08
---

## Edit plan/162-mv1-enemy-movesets.md
~~~ old
- **UNBROKEN.** A clause on a move that raises WARD: it pays out at the start of the foe's next turn if any of that WARD is left. Broken WARD pays nothing.
~~~
~~~ new
- **UNBROKEN.** A clause on a move that raises WARD. If any of that WARD is left when your turn ends, the clause pays at the start of your next turn, whether or not the foe got to act in between. Broken WARD pays nothing. A later move may name its own moment in its text, as "On <enemy name>'s next <action>: <effect>"; no move does yet (T, 2026-11-08).
~~~

## Add plan/162-mv1-enemy-movesets.md
~~~ acceptance
- **A?unbrokentime** A live UNBROKEN clause pays at the start of the player's next turn, DEAL payouts included. It pays when the foe lost its turn to a status such as petrify, and pays nothing if the WARD was broken. Its gloss and chip say so.
- **A?saintlevel** The Saint Beneath fights at level 8 at the Sea Keep (`bw-k2`), at its full 320 VITAE.
~~~
~~~ section Sources
- **T's end-gate answers (2026-11-08, after `/pilot 162`), verbatim:** on UNBROKEN when the foe loses its turn, "It would depend on the payout. But typically, pays anyway. It shouldn't be on their next turn, but rather on their next <trigger> ie. DEAL (or in the future, GUARD, etc.). Also, sometimes, is just at the start of the player's turn.", then on how the payout is timed, "Every payout at your turn start unless explicitly stated \"On <enemy name> 's next <action> <effect>\"". On the Saint's level: "The saint beneath should be a level 8 enemy. The player should be level 8-10 when they reach him".
~~~
~~~ chunks
- [ ] **162.?timing** UNBROKEN pays at the start of your next turn · S · closes A?unbrokentime · needs — · alias: MV1e
  - Today the clause is read at the start of the foe's turn, while its WARD still stands (`planRiderTurn` in `Combat/combat.enemy-riders.ts`, `Combat/combat.enemy-words.ts`, `combat.enemy-words.resolve.ts`), and a denied foe fires nothing. Keep the check that some WARD survived the player's turn, then hold the clause and pay it at the start of the player's next turn, including when the foe's turn was denied. Say in the PR how hits land at that moment (GUARD and SHOCK should still meet them).
  - The gloss (`Enemy/enemy-keywords.ts`) and the chip caption (`combat-encounter.engine.ts`) stop saying "at its next turn" where they do. No move text changes. The "On <enemy name>'s next <action>" form is not built; no move uses it.
  - Tests: pays at the start of the player's turn for a DEAL, a SHOCK and a BARNACLE payout; WARD broken pays nothing; a petrified foe still pays. Replace the tests pinning the foe-turn timing.
  - Measure: the mechanics and mobile gates, run piecewise with a worker cap. Label `review:rules-change`.
- [ ] **162.?level** The Saint Beneath fights at level 8 · S · closes A?saintlevel · needs — · alias: MV1f
  - `BW_DOOR_LEVEL` to 8 in `World/MapEvents/content.ts`, used only by the Saint's `boss` case. Update `breakwater.engine.test.ts` and any pin of the old 129 VITAE. No move's numbers change.
  - Measure: the mechanics and mobile gates, run piecewise with a worker cap; the Act 1 sim in the PR body before and after, saying what level the player reaches the Saint at and how often they win. T's target is level 8-10 on arrival. Report it; do not retune. Label `review:rules-change`.
~~~

## Edit plan/README.md
~~~ old
**Held** (waits on a person's word; never picked until the
~~~
~~~ new
- **162.?timing** · MV1e: UNBROKEN pays at the start of your next turn (T's end gate, `/plot`, 2026-11-08)
- **162.?level** · MV1f: the Saint Beneath fights at level 8 (T's end gate, `/plot`, 2026-11-08)

**Held** (waits on a person's word; never picked until the
~~~
