---
date: 2026-11-13
---
## Edit plan/README.md
~~~ old
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
~~~
~~~ new
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
- **177.8** · NV1h: the six approved Chapter 1 enemy descriptions, and the Saint Beneath's journal, in the game (T, `/plot asap`, 2026-11-13)
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
- [ ] **177.8** Enemy descriptions in the game · S · closes A8 · needs 177.3 · alias: NV1h
  - `axiomancer-mechanics/src/Enemy/enemy.library.ts`: the six descriptions, each `DRAFT (Claude)` comment removed with it. The Saint Beneath's description and journal are among them since T's word of 2026-11-12 ("Adjust the saint beneath's entry to fit the new story"): both land as the ledger's E-01, and `Enemy/e2e/saint-beneath.engine.test.ts`, which asserts the old journal word for word, changes with them.
  - Measure: the verdicts test passes for this surface; the enemy library tests pass.
~~~
~~~ new
- [ ] **177.8** Enemy descriptions in the game · S · closes A8 · needs — · alias: NV1h
  - The lines are T's verdict of 2026-11-13 on the enemy ballot, not 177.3: `plan/ballots/narrator-enemies.md`, section "Approved", word for word (T, `/plot asap`, 2026-11-13: "plot the other 6 we just did and let's start piloting them"). 177.3 keeps every other surface.
  - `axiomancer-mechanics/src/Enemy/enemy.library.ts`: the six descriptions (The Saint Beneath E-01, Saltwick Swarm E-02, The Wreckmaster E-03, Quay-Crab E-04, Bilge-Stalker E-05, Coralback E-06), each description's `DRAFT (Claude)` comment removed with it. The three `mercyLines` blocks marked `DRAFT (Claude)` (Quay-Crab, Bilge-Stalker, Coralback) and the Death Beholder's phase line are not approved and keep their comments.
  - The Saint Beneath's journal lands as J-01, which is the ledger `plan/ballots/narrator-chapter1.md` E-01 journal word for word; its description is E-01 of `narrator-enemies.md`, which replaces the portrait line (T's verdict of 2026-11-13 supersedes the 2026-11-12 "keep my description" note in Design). `Enemy/e2e/saint-beneath.engine.test.ts`, which asserts the old journal word for word, changes with it.
  - The seven other Chapter 1 foes (Net-Mender, Brine-Widow, Cave Choir, Tithe-Collector, Lamplighter, Wrecker, Tide-Gate) are not in this chunk: their round 3 is on a ballot, and a later plot adds them.
  - Measure: the enemy library tests and the Saint Beneath engine test pass, and a test pins each of the six descriptions to its Approved line (the verdicts test of A9 is 177.4's and may not exist yet).
~~~
