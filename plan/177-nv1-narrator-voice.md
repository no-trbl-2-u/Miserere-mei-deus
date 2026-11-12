# 177 — The Narrator's voice, and Chapter 1's unwritten lines in it

> Narration in the game (places, fights' arrival lines, hazards, rests, dreams, cutscenes, travel, screens, enemy descriptions) is written in one locked voice with its own rules and its own lint, and every Chapter 1 line T approves from the drafts replaces its `[content]` placeholder.

## Why

### Sources

- **T, 2026-11-08** (`plan/ballots/narrator-voice.md`): player-facing text has three voices. The Narrator ("like Cormac McCarthy wrote it") covers narration, map text, enemy journals and flavor; the Rulebook covers cards and rules; the People covers NPC lines.
- **T, 2026-11-10:** the Narrator is for "enemy journals, quests, story encounters, narration, anything but cards and NPCs", and "I'm looking for blood meridian level prose".
- **T, 2026-11-11:** "determine every single \"content\" item in chapter 1 (except for NPCs and cards), then write a piece of content for each in this voice ... Then plot all the rows in order to add these content items." Scope: "Every content tag, BUT, if you decide an NPC will need to speak, just put [NPC Content Needed]".
- **T, 2026-11-11, on the rules the voice breaks:** "Yes, plot them first", and for how: "Narrator exemption" (the rules stay for cards, rules text and NPC lines; the Narrator's surfaces get their own).
- **The drafts:** withdrawn unvoted on 2026-11-12 (T: the story is rewritten from scratch). The ledger `plan/ballots/narrator-chapter1.md` (113 prose lines, 13 names) and its review page were deleted; both are redrawn from the new Act 1 story.

### What exists today

- **Placeholders.** Chapter 1 carries about 100 `[content]` strings. The drafts' ledger lists each with its source file.
- **Rules that forbid the voice.** `axiomancer-mechanics/docs/narrative/ANTI_IMITATION.md` bans a named author's style, chained "and" clauses, biblical narration and archaic inversion. `DELIVERY_REGISTER.md` MB-1 caps a narration sentence at 20 words and MB-2 forbids a narrator who sympathizes. `scripts/check-prose.mjs` enforces MB-1 and bans faux-archaic words on 15 listed files.
- **Files the lint does not read.** `World/MapEvents/arrival-lines.ts`, `World/breakwater-chapter.questline.ts`, `World/Continents/Coastal-Village/breakwater-chapter.ts`, the mobile `breakwater.layout.ts` and the mobile copy files the drafts touch are not in its list.
- **Already planned, not replanned here.** Spec 116 owns the quest chain: 116.4 (BW1d) is T writing the chain's lines and 116.5 (BW1e) puts them in the game. The drafts' Quest nodes, Quest chain and Names sections are options for BW1d. This spec adds only a note to 116 (see the pending file).
- **Where the ledgers are.** `plan/ballots/` arrives on `main` with PR #1617 (the one ballots folder), and the drafts' ledger and review page with the PR stacked on it. Until both merge, the `plan/ballots/narrator-*` paths this spec names are not on `main`; 177.1 and 177.2 do not read them, and 177.3 onward wait on T's review, which needs them merged.
- **The review is on hold** (T, 2026-11-11: "hold that ballot", then "let's actually write the ACT 1 story together"). The drafts were written before the story. T reviews them (177.3) after the Act 1 story is written; lines the story changes are redrawn first.
- **The voice is round 5's** (T, 2026-11-12: "Leave on the most recent narrator voice"). Rounds 4 and 5 closed with no per-slot picks; round 5's three takes (plain, cruel, grief) are the voice, and the cruelty stop is picked per line.

## Design

- **The Narrator exemption.** One decision (`D188`, proposed) says: the Narrator may calibrate against Cormac McCarthy and Elden Ring, borrowing manner and never a sentence, on the surfaces listed in the voice bible. Every other voice keeps `ANTI_IMITATION.md` and MB-1 to MB-8 unchanged.
- **The voice bible.** A new `axiomancer-mechanics/docs/narrative/NARRATOR.md`: the scope (what the Narrator writes and what it never writes), the rules below, the five cruelty stops, and the calibration set (T's locked passages and T's rejections with reasons, copied from the ledgers). `ANTI_IMITATION.md`, `DELIVERY_REGISTER.md` and `VOICE_REGISTERS.md` each gain one paragraph pointing at it.
- **The Narrator's rules** (lintable ones marked):
  - A sentence runs at most 40 words (lint).
  - Each surface has a word cap for the whole line (lint): map blurb 18, arrival line 32, loot cache action 30, hazard, rest, dream, travel, quest and description lines 45, screen copy 40, journal 200 (T, 2026-11-12). A story screen or a cutscene has no cap on the whole: see the next rule.
  - **Story screens and cutscenes tell their part of the story** (T, 2026-11-11: "When we have a story screen, it shouldn't be so short ... set it to 40 ... Let's actually tell the part of the story, not just an ambiguous line or two"). Their sentence ceiling is 40 words where MB-1 says 20 (lint). Each is told in panels, one paragraph a panel, and says what happens, to whom and what it costs, as the Act 1 story rules it (review). A panel holds at most 80 words and a screen at most six panels (T, 2026-11-12: "80 words, 6 panels").
  - No quotation marks; reported speech is set off with a comma (lint). No exclamation marks and no semicolons (lint, as today).
  - Canonical player terms keep their spelling (`VITAE`, `GUARD`) (review).
  - No sentence of McCarthy's or of Elden Ring's is reused, and no name, place or character of theirs (review; the lint cannot see this).
  - Violence is told flat and never dwelt on. The prologue's assault stays off-screen and the child's death is named, never shown (review; story overview, prologue step 9).
- **The lint.** `scripts/check-prose.mjs` gains a table of Narrator fields (file, and the field or constant names in it) with each one's word cap. On those fields it applies the Narrator's rules in place of `mb1-long-sentence` and `faux-archaic`. Every other field is linted exactly as today. The files the drafts touch join the content list, so a line added there cannot ship unlinted. A `[content]` placeholder is skipped, as today.
- **Only approved lines land.** T reviews the drafts on the review page (tick to approve, note to change). The verdict is recorded in the ledger's `## Verdicts`. A content chunk lands the approved text exactly; a rejected or unreviewed line keeps its `[content]` tag and is listed in the chunk's PR body.
- **Fit.** The drafts are longer than the placeholders. Each content chunk checks its screen at phone width with its longest approved line and fixes the layout (wrap, scroll or type size from the existing scale) if it clips. No line is shortened to fit without T.
- **Spoken lines stay out.** The four lines marked `[NPC Content Needed]` (village host, innkeeper, shopkeeper, blacksmith) keep their placeholders. They belong to the People voice.
- The word caps above are settled (T, 2026-11-12: "Keep the caps").
- The six enemy descriptions marked `DRAFT (Claude)` are replaced by the approved drafts, and T's own description of the saint beneath is kept as he wrote it (T, 2026-11-12: "Yes, replace, but make sure my description for the saint beneath is kept"). This binds 177.8.

### Decisions made upfront (do not ask)

- No story is added. A detail the drafts invent ships only inside a line T approved; the ledger lists them.
- No card text, rules text, button label or NPC line changes.
- The quest chain's text is BW1e's (spec 116), not this spec's.
- The cruelty slider used when drafting is a session skill (`.claude/skills/narrate/SKILL.md`), not game code; this spec only records its five stops in the voice bible.

### Out of scope

- Chapters 2 to 4.
- The People voice and the four spoken lines.
- Enemy journals for foes with no story yet.
- Rewriting lines that are already authored and untagged, except the two village lines the drafts name.

## Acceptance

- **A3** T's verdict on the drafts is in `plan/ballots/narrator-chapter1.md` (attended; the ledger is redrawn from the new Act 1 story first, 2026-11-12).
- **A4** Map blurbs. Every approved map blurb is in `breakwater.layout.ts`; the map sheet shows the longest one unclipped at phone width.
- **A5** Arrival lines. Every approved arrival line is in `arrival-lines.ts`, keyed by node; the fight reveal shows the longest one unclipped.
- **A6** Event lines. Every approved hazard, rest, dream, travel, village and loot cache action line is in `content.ts`; each event screen shows its longest line unclipped.
- **A7** Screen copy. Every approved defeat, withdraw, death return, game over, quest screen and village counter line, and each approved reward eyebrow, is in its copy file; each screen shows it unclipped.
- **A8** Enemy descriptions. Every approved description is in `enemy.library.ts` with its `DRAFT (Claude)` comment removed.
- **A10** Story screens and cutscenes. Each Chapter 1 scene tells its part of the Act 1 story as T ruled it, in panels, with no sentence past 40 words; none is a one-line hint. Every scene plays from a node's scene slot (spec 178), on the node the story places it on; no node is a cutscene by kind. The cutscene screen shows a six-panel scene unclipped.
- **A9** No approved line is left as a placeholder, and no unapproved draft is in the game: a test reads the ledger's verdicts and the sources and fails on either.
- **A12** The voice rules match the story T ruled. `axiomancer-mechanics/docs/narrative/NARRATOR.md` and `.claude/skills/narrate/SKILL.md` say that the Narrator is the Keeper, who may say "I" and addresses the player as "you" in the present tense; that a person named on the story overview's cast sheet speaks inside his telling, set off by a comma and with no quotation marks, in the voice the cast sheet gives; that the story is the overview as it stands; and that many pieces at once rotate through the stops 1, 2, 1, 3, 1, 4, 1, 5. Neither file names the withdrawn prologue or a rule the overview no longer holds.
- **A13** No line of the story T removed is left in Chapters 2 to 4. The map descriptions, the three arrival scenes, the sealed-door lines, and the rest, hazard and loot lines of the Charcoal Wood, the Beacon Crags and the Lantern Deep, in the engine and in the three mobile layout files, each read `[content] <place>.`; no code comment names a file deleted on 2026-11-12.

## Open questions

None open. Settled by T on 2026-11-12: the word caps stay; the six `DRAFT (Claude)` enemy descriptions are replaced, T's saint beneath description kept; a panel holds 80 words and a screen six panels.
- [T to confirm #1] Pictures for the 18 scenes that have none: each shows the nearest existing scene picture until T supplies art (177.9).
- [T to confirm #2] Chapters 2 to 4's old lines become placeholders now, before those maps are redesigned (177.12).
- Confirmed by T (2026-11-12): the Saint Beneath's description and journal are redrawn to fit the story (ledger E-01) and land with the enemy descriptions in 177.8.
- Confirmed by T (2026-11-12): XP and reward for each quest step keep the engine's present numbers; the key, the questline and each reward take the names and lines W-01 to W-06 in the ledger.

## Chunks

Measure: 10 open · 3 closed · next A14

- [ ] **177.3** T reviews the Chapter 1 drafts (attended) · S · closes A3 · needs — · alias: NV1c
  - T approved the 22 scenes, the quest names and lines, the four refusals and the two gate lines on 2026-11-12; they are in `plan/ballots/narrator-chapter1.md` and need no further review. What is left for this chunk is every other Chapter 1 surface, none of it drafted from the new story yet: the map blurbs, the arrival lines, the hazard, rest, dream, travel, village and loot lines, the screen copy and the enemy descriptions. They are drafted with `/narrate` from `axiomancer-mechanics/content/story/story-overview.md` once 177.11 has amended the voice rules, added to that ledger, and reviewed by T there (a review page is redrawn only if T asks for one); the session writes each verdict under `## Verdicts`.
  - Measure: every line in the ledger is approved (with its final text), rejected, or left for later, by T's word.
- [ ] **177.4** Map blurbs in the game · S · closes A4, A9 · needs 177.3 · alias: NV1d
  - `axiomancer-mobile/state/exploration-maps/breakwater.layout.ts`, 33 lines.
  - `scripts/narrator-verdicts.test.mjs` (new, in root `npm test`): reads the ledger's verdicts and fails on an approved line still tagged `[content]` in a surface a closed chunk owns, and on an unapproved draft found in any source.
  - Measure: the test passes; a phone-width screenshot of the map sheet with the longest blurb is in the PR.
- [ ] **177.5** Arrival lines in the game · S · closes A5 · needs 177.3 · alias: NV1e
  - `axiomancer-mechanics/src/World/MapEvents/arrival-lines.ts`: a table keyed by node id in place of the generated placeholder; a node with no approved line keeps `[content] <place>.`
  - Measure: the verdicts test passes for this surface; a screenshot of the fight reveal with the longest line is in the PR.
- [ ] **177.6** Hazard, rest, dream, travel, village and loot lines in the game · M · closes A6 · needs 177.3 · alias: NV1f
  - `axiomancer-mechanics/src/World/MapEvents/content.ts`: per-node tables for the hazard and rest lines (they are built from the place name today), the three dreams, the two cave travel prompts, a village line each for `bw-t4` and `bw-m5`, and the two action lines of each of the five caches (spec 178's 178.3 makes the old watchtower and the high pass caches).
  - Measure: the verdicts test passes for these surfaces; `cache-action-lines.engine.test.ts` and the chapter e2e pass; one screenshot per event screen with its longest line is in the PR.
- [ ] **177.7** Screen copy in the game · S · closes A7 · needs 177.3 · alias: NV1g
  - Mobile: `combat-summary.copy.ts`, `reveal.copy.ts`, `death-return.copy.ts`, `game-over.copy.ts`, `quest.copy.ts`, `village.copy.ts` (the three counter lines only), `relic-source.copy.ts`.
  - `VITAE` keeps its spelling in the defeat line. The four spoken lines keep their placeholders.
  - Measure: the verdicts test passes for these surfaces; one screenshot per screen is in the PR.
- [ ] **177.8** Enemy descriptions in the game · S · closes A8 · needs 177.3 · alias: NV1h
  - `axiomancer-mechanics/src/Enemy/enemy.library.ts`: the six descriptions, each `DRAFT (Claude)` comment removed with it. The Saint Beneath's description and journal are among them since T's word of 2026-11-12 ("Adjust the saint beneath's entry to fit the new story"): both land as the ledger's E-01, and `Enemy/e2e/saint-beneath.engine.test.ts`, which asserts the old journal word for word, changes with them.
  - Measure: the verdicts test passes for this surface; the enemy library tests pass.
- [ ] **177.9** Story screens and cutscenes tell the Act 1 story · M · closes A10 · needs 178.3 · alias: NV1i
  - T's Act 1 story is ruled (`axiomancer-mechanics/content/story/story-overview.md`, The Carried Light) and its 22 Chapter 1 scenes are approved, word for word, in `plan/ballots/narrator-chapter1.md` (S-01 to S-22; T, 2026-11-12). This chunk puts exactly those panels in the game and writes none. Each scene sits in the scene slot of the node the ledger names and plays before that node's own event (spec 178); the windmill's scene (S-01) keeps the `giveQuestStep` effect. People speak inside the Keeper's telling, so no `[NPC Content Needed]` marker is left in a scene. [T to confirm #1] A scene with no picture of its own shows the picture of the nearest scene that has one (windmill headland, clifftop chapel, old watchtower, high pass) until T supplies art. If `scripts/narrator-verdicts.test.mjs` does not exist yet (177.4 writes it), this chunk writes it for the scene surface.
  - `axiomancer-mechanics/src/World/MapEvents/content.ts`: each scene the story places, as panels (`lines`), in the Breakwater's slot table (`BW_NODE_SCENES`, spec 178), keyed by the node it plays before; the windmill's opening keeps its `giveQuestStep` effect; a slot the story leaves empty is removed. The cutscene screen's fit at six panels.
  - Measure: the verdicts test passes for these surfaces; a screenshot of the longest scene is in the PR.
- [ ] **177.11** The voice rules take the Keeper and the people who speak · S · closes A12 · needs — · alias: NV1k
  - Source: the story overview's rulings 5, 11 and 12 (T, 2026-11-12), and the approved ledger `plan/ballots/narrator-chapter1.md`, which is the worked example of all three.
  - `axiomancer-mechanics/docs/narrative/NARRATOR.md`: the scope table (speech by a cast member is written, inside the narration; `[NPC Content Needed]` stays only for a speaker with no cast entry), rule 4 (speech is set off with a comma, as "Ann Greave says, ..."), rule 7 and the stops section (drop the prologue; keep "a child's death is named, never shown"), rule 8 (the Keeper's first person, present tense), and the rotation. The five stops and their word caps do not change. The line saying T's own description of the saint beneath is kept goes: T had it redrawn on 2026-11-12 (ledger E-01).
  - `.claude/skills/narrate/SKILL.md`: sections 2, 3, 6 and 7 to match, and the ledger path. Section 4's five samples are T's approved calibration and stay as written.
  - `scripts/check-prose.mjs` and its test only if a rule there now contradicts the above; say in the PR which rule, or that none did.
  - No game string changes in this chunk.
  - Measure: `node scripts/check-prose.mjs` and the root `npm test` pass; the two files agree with each other and with the overview's rulings 5, 11 and 12.
- [ ] **177.12** The removed story's lines leave Chapters 2 to 4 · S · closes A13 · needs — · alias: NV1l
  - T ruled the old story removed on 2026-11-12; PR #1629 took it out of the docs and the plan and left the code for after spec 178. [T to confirm #2] These lines become placeholders now, although Chapters 2 to 4's maps are due to be redesigned.
  - Engine, `axiomancer-mechanics/src/World/`: the four maps' `description` strings; the three arrival scenes where 178.4 (closed 2026-11-12) left them, in the slot tables of `MapEvents/content.ts`, and `ldVaultDoor` and `ldDeepStair` there; `CW_CAMP_NODES`, `CW_HAZARD_NODES`, `CW_LOOT_NODES`, `cwStairCave`, the `BC_*` and `LD_*` tables beside them. Symbols and shapes stay; only the text changes.
  - Mobile: the node descriptions in `charcoal-wood.layout.ts`, `beacon-crags.layout.ts` and `lantern-deep.layout.ts`. Node labels (place names) stay.
  - Tests that assert the old text change with it: `World/e2e/lantern-deep.engine.test.ts` (the two sealed-door lines), `state/exploration-maps/__tests__/node-blurb-event.test.ts`, `state/presenters/__tests__/cache.engine.test.ts`. No test is skipped or deleted.
  - Comments naming `braindump/2026-10-28-breakwater-chapter-1-map.md` or `plan/revamp/breakwater-vision.md` (in `breakwater-chapter.ts`, `breakwater-chapter.test.ts`, `MapEvents/content.ts`, `e2e/map-traversal.engine.test.ts`, `breakwater.layout.ts`) point at `plan/116-bw1-breakwater-rebuild.md`. The Breakwater's own lines are not this chunk's: 177.4 to 177.9 and 116.5 own them.
  - Measure: `grep` finds none of the old lines in the three maps' sources; `node scripts/check-prose.mjs`, both packages' verify and the root `npm test` pass.
