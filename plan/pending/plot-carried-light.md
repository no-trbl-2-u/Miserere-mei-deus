---
date: 2026-11-12
---
## Edit plan/README.md
~~~ old
- **178.3** · SS1c: the Breakwater's cutscene nodes become a fight and two caches, their scenes in slots (T, `/plot`, 2026-11-12)
~~~
~~~ new
- **178.3** · SS1c: the Breakwater's cutscene nodes become a fight and two caches, their scenes in slots (T, `/plot`, 2026-11-12)
- **177.?speech** · NV1k: the voice rules take the Keeper and the people who speak (T, `/plot`, 2026-11-12)
~~~

## Edit plan/README.md
~~~ old
- **177.3** · attended: T reviews the Chapter 1 drafts, after the Act 1 story is written (NV1c) · since: 2026-11-11 · until: T's word · max_age: 30d
~~~
~~~ new
- **177.3** · attended: T reviews the Chapter 1 lines still to be drafted from the new story; the scenes and the quest lines are approved (NV1c) · since: 2026-11-11 · until: T's word · max_age: 30d
~~~

## Edit plan/README.md
~~~ old
- **177.9** · waits on T's Act 1 story (NV1i) · since: 2026-11-11 · until: T's word · max_age: 30d
~~~
~~~ new
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
  - Waits on the redrawn ledger and review page (the first set was withdrawn on 2026-11-12, before any verdict). T ticks and notes on the review page, presses Generate and pastes the sheet; the session writes the verdict under `## Verdicts` in `plan/ballots/narrator-chapter1.md`, redraws any line T asks for at another stop, and repeats until T is done.
~~~
~~~ new
  - T approved the 22 scenes, the quest names and lines, the four refusals and the two gate lines on 2026-11-12; they are in `plan/ballots/narrator-chapter1.md` and need no further review. What is left for this chunk is every other Chapter 1 surface, none of it drafted from the new story yet: the map blurbs, the arrival lines, the hazard, rest, dream, travel, village and loot lines, the screen copy and the enemy descriptions. They are drafted with `/narrate` from `axiomancer-mechanics/content/story/story-overview.md` once 177.?speech has amended the voice rules, added to that ledger, and reviewed by T there (a review page is redrawn only if T asks for one); the session writes each verdict under `## Verdicts`.
~~~

## Edit plan/177-nv1-narrator-voice.md
~~~ old
  - Waits on T's Act 1 story (T, 2026-11-11: "let's actually write the ACT 1 story together"). The three cutscene drafts in the ledger (`bw-l2`, `bw-d5`, `bw-p3`) and the windmill's opening were written before the story and are redrawn from it, then approved by T. Since spec 178 (T, 2026-11-12) there are no cutscene nodes: each scene sits in a node's scene slot and plays before that node's own event, so the story may place a scene on any node, and the three drafts' nodes are now a fight and two loot caches that keep their old scene until this chunk rewrites or moves it.
~~~
~~~ new
  - T's Act 1 story is ruled (`axiomancer-mechanics/content/story/story-overview.md`, The Carried Light) and its 22 Chapter 1 scenes are approved, word for word, in `plan/ballots/narrator-chapter1.md` (S-01 to S-22; T, 2026-11-12). This chunk puts exactly those panels in the game and writes none. Each scene sits in the scene slot of the node the ledger names and plays before that node's own event (spec 178); the windmill's scene (S-01) keeps the `giveQuestStep` effect. People speak inside the Keeper's telling, so no `[NPC Content Needed]` marker is left in a scene. [T to confirm #1] A scene with no picture of its own shows the picture of the nearest scene that has one (windmill headland, clifftop chapel, old watchtower, high pass) until T supplies art. If `scripts/narrator-verdicts.test.mjs` does not exist yet (177.4 writes it), this chunk writes it for the scene surface.
~~~

## Add plan/177-nv1-narrator-voice.md
~~~ acceptance
- **A?speech** The voice rules match the story T ruled. `axiomancer-mechanics/docs/narrative/NARRATOR.md` and `.claude/skills/narrate/SKILL.md` say that the Narrator is the Keeper, who may say "I" and addresses the player as "you" in the present tense; that a person named on the story overview's cast sheet speaks inside his telling, set off by a comma and with no quotation marks, in the voice the cast sheet gives; that the story is the overview as it stands; and that many pieces at once rotate through the stops 1, 2, 1, 3, 1, 4, 1, 5. Neither file names the withdrawn prologue or a rule the overview no longer holds.
- **A?old** No line of the story T removed is left in Chapters 2 to 4. The map descriptions, the three arrival scenes, the sealed-door lines, and the rest, hazard and loot lines of the Charcoal Wood, the Beacon Crags and the Lantern Deep, in the engine and in the three mobile layout files, each read `[content] <place>.`; no code comment names a file deleted on 2026-11-12.
~~~
~~~ chunks
- [ ] **177.?speech** The voice rules take the Keeper and the people who speak · S · closes A?speech · needs — · alias: NV1k
  - Source: the story overview's rulings 5, 11 and 12 (T, 2026-11-12), and the approved ledger `plan/ballots/narrator-chapter1.md`, which is the worked example of all three.
  - `axiomancer-mechanics/docs/narrative/NARRATOR.md`: the scope table (speech by a cast member is written, inside the narration; `[NPC Content Needed]` stays only for a speaker with no cast entry), rule 4 (speech is set off with a comma, as "Ann Greave says, ..."), rule 7 and the stops section (drop the prologue; keep "a child's death is named, never shown"), rule 8 (the Keeper's first person, present tense), and the rotation. The five stops and their word caps do not change.
  - `.claude/skills/narrate/SKILL.md`: sections 2, 3, 6 and 7 to match, and the ledger path. Section 4's five samples are T's approved calibration and stay as written.
  - `scripts/check-prose.mjs` and its test only if a rule there now contradicts the above; say in the PR which rule, or that none did.
  - No game string changes in this chunk.
  - Measure: `node scripts/check-prose.mjs` and the root `npm test` pass; the two files agree with each other and with the overview's rulings 5, 11 and 12.
- [ ] **177.?old** The removed story's lines leave Chapters 2 to 4 · S · closes A?old · needs 178.4 · alias: NV1l
  - T ruled the old story removed on 2026-11-12; PR #1629 took it out of the docs and the plan and left the code for after spec 178. [T to confirm #2] These lines become placeholders now, although Chapters 2 to 4's maps are due to be redesigned.
  - Engine, `axiomancer-mechanics/src/World/`: the four maps' `description` strings; `cwArrival`, `bcArrival`, `ldArrival`, `ldVaultDoor` and `ldDeepStair` in `MapEvents/content.ts`; `CW_CAMP_NODES`, `CW_HAZARD_NODES`, `CW_LOOT_NODES`, `cwStairCave`, the `BC_*` and `LD_*` tables beside them. Symbols and shapes stay; only the text changes.
  - Mobile: the node descriptions in `charcoal-wood.layout.ts`, `beacon-crags.layout.ts` and `lantern-deep.layout.ts`. Node labels (place names) stay.
  - Tests that assert the old text change with it: `World/e2e/lantern-deep.engine.test.ts` (the two sealed-door lines), `state/exploration-maps/__tests__/node-blurb-event.test.ts`, `state/presenters/__tests__/cache.engine.test.ts`. No test is skipped or deleted.
  - Comments naming `braindump/2026-10-28-breakwater-chapter-1-map.md` or `plan/revamp/breakwater-vision.md` (in `breakwater-chapter.ts`, `breakwater-chapter.test.ts`, `MapEvents/content.ts`, `e2e/map-traversal.engine.test.ts`, `breakwater.layout.ts`) point at `plan/116-bw1-breakwater-rebuild.md`. The Breakwater's own lines are not this chunk's: 177.4 to 177.9 and 116.5 own them.
  - Measure: `grep` finds none of the old lines in the three maps' sources; `node scripts/check-prose.mjs`, both packages' verify and the root `npm test` pass.
~~~
~~~ questions
- [T to confirm #1] Pictures for the 18 scenes that have none: each shows the nearest existing scene picture until T supplies art (177.9).
- [T to confirm #2] Chapters 2 to 4's old lines become placeholders now, before those maps are redesigned (177.?old).
- [T to confirm #3] The Saint Beneath's description and journal stay as T wrote them, although the story now makes him the lord who bought the harbour's lamp (overview, ruling 9); a redraw is a `/narrate` sitting T asks for.
- [T to confirm #4] XP and reward for each quest step keep the engine's present numbers until T sets them in 116.4.
~~~
