---
date: 2026-11-23
---
## Add plan/177-nv1-narrator-voice.md
~~~ acceptance
- **A?saint-phase-lines** Saint Beneath phase lines. When the boss crosses 75%, 50% and 25% VITAE and its DANGER phase opens, the fight shows a stage title and line in the float and the log (`‡ TITLE ‡ line`), once per phase. The lines are the random draws P-01b, P-02a and P-03b from the open ballot `plan/ballots/narrator-chapter1-5` (ledger, "In the game meanwhile", T 2026-11-23) until T's verdicts replace them.
~~~
~~~ chunks
- [ ] **177.?saint-phase-lines** Saint Beneath phase lines in the fight · S · closes A?saint-phase-lines · needs — · alias: NV1s
  - Mechanics: `EnemyPhase` (`axiomancer-mechanics/src/Enemy/types.ts`) gains an optional `entry?: { name: string; text: string }`. Where `combat.engine.ts` pushes `enemy-phase-entered` (a foe with HP phases moving to a higher phase), it also pushes the existing `stage-entered` event with that phase's `entry` when it has one. No new event kind, no change to how HP-phase foes move or to the `stages` path they skip.
  - Content: the Saint Beneath's phases 2 to 4 in `enemy.library.ts` take P-01b (THE SEA REMEMBERS HIM), P-02a (THE ROWS STIR) and P-03b (WHAT HE BOUGHT), word for word from `plan/ballots/narrator-chapter1-5.ballot.html`, each with a comment naming the slot and the open ballot.
  - Mobile: none expected. The presenter already renders `stage-entered` as the float and log line (`combat-encounter.engine.ts`); check the boss pane shows it.
  - Measure: an engine test drives the Saint Beneath under 75%, 50% and 25% and sees one `stage-entered` per phase with the drawn lines, in order; a phase with no `entry` emits none; the mechanics and mobile suites pass; a phone-width screenshot of the boss float with the longest line is in the PR.
~~~
