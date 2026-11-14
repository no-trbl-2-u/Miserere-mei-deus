---
date: 2026-11-13
---
## Edit plan/README.md
~~~ old
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
~~~
~~~ new
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
- **177.?seven-foes** · NV1r: the seven other Chapter 1 foes' approved descriptions in the game, and the Tide-Gate renamed The Half-Taken (T, `/plot`, 2026-11-13)
~~~

## Add plan/177-nv1-narrator-voice.md
~~~ acceptance
- **A?seven-foes** The seven other Chapter 1 foes. Each of Net-Mender, Brine-Widow, The Cave Choir, The Tithe-Collector, The Lamplighter, The Wrecker and the Tide-Gate carries its approved description in `enemy.library.ts`, word for word from `plan/ballots/narrator-enemies.md` ("Approved, round 3" and "Approved, round 4"), and the Tide-Gate's player-facing name is The Half-Taken. A test pins each line and the new name.
~~~
~~~ chunks
- [ ] **177.?seven-foes** The seven other Chapter 1 foes' descriptions in the game, and the Tide-Gate renamed · S · closes A?seven-foes · needs — · alias: NV1r
  - The lines are T's verdicts of 2026-11-13 on rounds 3 and 4 of the enemy ballot (T: "Wait for round 4" then land all seven at once). `plan/ballots/narrator-enemies.md`: E-07 Net-Mender, E-09 The Cave Choir, E-11 The Lamplighter and E-12 The Wrecker under "Approved, round 3"; E-08 Brine-Widow, E-10 The Tithe-Collector and E-13 The Half-Taken under "Approved, round 4". Word for word; T's edits are already applied there.
  - `axiomancer-mechanics/src/Enemy/enemy.library.ts`: replace each of the seven `description` strings. The Tide-Gate's `name: 'The Tide-Gate'` becomes `name: 'The Half-Taken'`. Its `id` (`enemy-tide-gate`), `portraitAsset` (`tide-gate`), the slug `tide-gate` in `World/MapEvents/content.ts`, its moves (Spring Tide, The Gate Opens) and its TIDE mechanic stay as they are: only the player-facing name changes. Code comments that name the foe as the Tide-Gate may stay; any test that asserts the player-facing name changes with it (for example `Enemy/e2e/chapter1-keep-causeway.engine.test.ts`, which builds a foe named 'The Tide-Gate').
  - Do not touch the three `mercyLines` blocks marked `DRAFT (Claude)` or the Death Beholder's DRAFT phase line: they are not approved.
  - Extend `Enemy/e2e/enemy-descriptions.engine.test.ts` (which pins NV1h's six) with the seven new lines and the new name. Any prose test that pins an old line of these seven changes with it (`scripts/check-prose.test.mjs`). Code comments name the alias (NV1r), never a spec number (`scripts/check-comments.mjs`).
  - `enemy.library.ts` is a content path: T merges the PR by hand.
  - Measure: the enemy library tests, the keep causeway engine test and the prose and comment checks pass, and the pin test covers all thirteen Chapter 1 descriptions.
~~~
