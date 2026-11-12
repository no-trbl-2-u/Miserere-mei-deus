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
- **A9** No approved line is left as a placeholder, and no unapproved draft is in the game: a test reads the ledger's verdicts and the sources and fails on either.
- **A16** A long panel never pushes the Keeper off the screen. The cutscene screen shows a ledger panel longer than its page limit as two or more pages the player taps through, broken only at a sentence end; the ledger, `BW_NODE_SCENES` and the approved words stay exactly as they are. At 360x740 and 390x844 the Keeper figure and the whole text of every page of all 22 Chapter 1 scenes are on screen.
- **A17** The quest card fits a small phone. At 360x740, with the two-paragraph giver line at the lighthouse when paid, LEAVE and ACCEPT can be reached, and the reward banner covers none of the card's rows.
- **A18** The sea keep's lord matches his portrait, and the pilot's test gaps are closed. S-17 panel 2 is T's redraw of 2026-11-12 in the ledger and in `BW_NODE_SCENES` (`bw-k2`), word for word. Tests cover the fixture builder's seen-scene line, the R-02 refusal through an engine walk, the `/narrate` skill's description, and the cutscene screen's leave-first fix.

## Open questions

None open. Settled by T on 2026-11-12: the word caps stay; the six `DRAFT (Claude)` enemy descriptions are replaced, T's saint beneath description kept; a panel holds 80 words and a screen six panels.
- [T to confirm #1] Pictures for the 18 scenes that have none: each shows the nearest existing scene picture until T supplies art (177.9).
- [T to confirm #2] Chapters 2 to 4's old lines become placeholders now, before those maps are redesigned (177.12).
- Confirmed by T (2026-11-12): the Saint Beneath's description and journal are redrawn to fit the story (ledger E-01) and land with the enemy descriptions in 177.8.
- Confirmed by T (2026-11-12): XP and reward for each quest step keep the engine's present numbers; the key, the questline and each reward take the names and lines W-01 to W-06 in the ledger.

## Chunks

Measure: 10 open · 8 closed · next A19

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
- [ ] **177.15** The cutscene screen pages a long panel · M · closes A16 · needs — · alias: NV1o
  - Source: T's answer of 2026-11-12 after the shots of #1647, "Screen auto-split". At 360x740 the panels of about 380 characters (S-09 383, S-13 380, S-01 365) push the Keeper figure (`NARRATOR_HEIGHT` 300, `axiomancer-mobile/app/cutscene/index.tsx`) half off the top of the screen. The text itself is not clipped. At 390x844 the figure fits, and on S-13 its top touches the screen edge.
  - Mobile only, `app/cutscene/index.tsx` and a pure helper beside it: a pure function takes a scene's `lines` and returns pages. A line over the page limit is split at the sentence end nearest its middle and repeats until every page is under the limit; a line with no sentence end under the limit stays whole. The screen steps through the pages, and SKIP, the effect and the leave-first rule are unchanged. No engine, ledger or content change.
  - [T to confirm #1] The page limit is 240 characters, so every Chapter 1 panel over 240 becomes two pages. Or: 200 (more pages, a smaller panel); or "whatever fits 360x740" measured on screen.
  - [T to confirm #2] The counter at the foot counts pages ("1 of 2" for one long panel), not ledger panels.
  - Tests: unit tests of the split function (no split under the limit; a split at a sentence end; never mid-sentence; joining the pages gives back the line exactly). A `state/e2e` test plays S-09 and reads its pages in order.
  - Measure: shots at 360x740 and 390x844 of S-09, S-13 and S-01 (each page) show the whole Keeper figure and the whole text; mobile `npx tsc --noEmit`, lint, the whole jest suite and the root `npm test` pass.
- [ ] **177.16** The quest card fits at 360x740 · S · closes A17 · needs — · alias: NV1p
  - Source: T's answer of 2026-11-12, "Plot a fit fix", after the shot of the lighthouse paid card at 360x740 (fixture `wanderer-bw-lighthouse-paid`, smoke route `quest-two-lines`). LEAVE and ACCEPT sit below the screen's bottom edge. Whether the screen scrolls is not checked. The reward banner (`RelicRise`, `components/quest/QuestGiverScene`, placed in `app/quest/index.tsx`) covers the card's "Bring" and reward rows. The banner overlap predates spec 177.
  - Mobile only, the quest screen: the buttons are always reachable without the player guessing (in view, or in a column that visibly scrolls), and the banner sits clear of the card's rows. Keep the giver line verbatim (T, 2026-11-12: "Keep verbatim": the name in the heading and in each "X says," tag stays).
  - Measure: shots of the lighthouse paid card at 360x740 and 390x844 show both buttons and every row unobscured; a test reaches ACCEPT at 360x740; CI's visual baselines re-stamp.
- [ ] **177.17** The sea keep matches the portrait, and the pilot's test gaps close · S · closes A18 · needs — · alias: NV1q
  - Source: T, 2026-11-12, "Portrait wins" (the Saint Beneath is a great fish with an old man's face, ledger "The Saint Beneath", E-01), and T approved this redraw of S-17 panel 2 through `/narrate` at stop 1, verbatim: "The lord of the place lies beyond the lamp. Thirty years in that light have taken the edges from him, and he is grown long and pale and scaled, with an old man's face still set in the front of him, its eyes shut. About him on the floor lie the tithes of all those years, laid out in rows, and not one of them has been let to rot."
  - Content: that text replaces S-17 panel 2 in `plan/ballots/narrator-chapter1.md` and the second line of `bw-k2` in `BW_NODE_SCENES` (`axiomancer-mechanics/src/World/MapEvents/content.ts`) in the same commit, because `scripts/narrator-verdicts.test.mjs` reads both. Panels 1 and 3 are unchanged. The ledger gets a dated note under S-17 naming T's ruling.
  - Canon: the story overview (`axiomancer-mechanics/content/story/story-overview.md`, `## Rulings`) gains ruling 13, in T's words of 2026-11-12: "Portrait wins". A creature's or person's approved portrait is canon for how it looks, and a scene or description that disagrees is redrawn through `/narrate`.
  - Tests (the gaps left by pilot vega, 2026-11-12): kill the mutation survivor at `state-fixture.builder.ts` (the line that marks the staged node's scene seen); pin R-02 exactly through an engine walk; a root test that reads `.claude/skills/narrate/SKILL.md`'s front-matter description and asserts its last sentence; make the cutscene leave-first fix (`app/cutscene/index.tsx`) visible to the mutation report's test map, or say in the PR why the tool cannot see `state/e2e/cutscene-leaves-first.test.tsx`.
  - Measure: `node scripts/narrator-verdicts.test.mjs` passes with the new panel; changing one character of it in either file turns it red; `npm run verify -w axiomancer-mechanics`, mobile jest and the root `npm test` pass.
