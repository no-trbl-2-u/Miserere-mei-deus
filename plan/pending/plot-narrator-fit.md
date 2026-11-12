---
date: 2026-11-12
---
## Add plan/177-nv1-narrator-voice.md
~~~ acceptance
- **A?split** A long panel never pushes the Keeper off the screen. The cutscene screen shows a ledger panel longer than its page limit as two or more pages the player taps through, broken only at a sentence end; the ledger, `BW_NODE_SCENES` and the approved words stay exactly as they are. At 360x740 and 390x844 the Keeper figure and the whole text of every page of all 22 Chapter 1 scenes are on screen.
- **A?questfit** The quest card fits a small phone. At 360x740, with the two-paragraph giver line at the lighthouse when paid, LEAVE and ACCEPT can be reached, and the reward banner covers none of the card's rows.
- **A?keep** The sea keep's lord matches his portrait, and the pilot's test gaps are closed. S-17 panel 2 is T's redraw of 2026-11-12 in the ledger and in `BW_NODE_SCENES` (`bw-k2`), word for word. Tests cover the fixture builder's seen-scene line, the R-02 refusal through an engine walk, the `/narrate` skill's description, and the cutscene screen's leave-first fix.
~~~
~~~ chunks
- [ ] **177.?split** The cutscene screen pages a long panel · M · closes A?split · needs — · alias: NV1o
  - Source: T's answer of 2026-11-12 after the shots of #1647, "Screen auto-split". At 360x740 the panels of about 380 characters (S-09 383, S-13 380, S-01 365) push the Keeper figure (`NARRATOR_HEIGHT` 300, `axiomancer-mobile/app/cutscene/index.tsx`) half off the top of the screen. The text itself is not clipped. At 390x844 the figure fits, and on S-13 its top touches the screen edge.
  - Mobile only, `app/cutscene/index.tsx` and a pure helper beside it: a pure function takes a scene's `lines` and returns pages. A line over the page limit is split at the sentence end nearest its middle and repeats until every page is under the limit; a line with no sentence end under the limit stays whole. The screen steps through the pages, and SKIP, the effect and the leave-first rule are unchanged. No engine, ledger or content change.
  - [T to confirm #1] The page limit is 240 characters, so every Chapter 1 panel over 240 becomes two pages. Or: 200 (more pages, a smaller panel); or "whatever fits 360x740" measured on screen.
  - [T to confirm #2] The counter at the foot counts pages ("1 of 2" for one long panel), not ledger panels.
  - Tests: unit tests of the split function (no split under the limit; a split at a sentence end; never mid-sentence; joining the pages gives back the line exactly). A `state/e2e` test plays S-09 and reads its pages in order.
  - Measure: shots at 360x740 and 390x844 of S-09, S-13 and S-01 (each page) show the whole Keeper figure and the whole text; mobile `npx tsc --noEmit`, lint, the whole jest suite and the root `npm test` pass.
- [ ] **177.?questfit** The quest card fits at 360x740 · S · closes A?questfit · needs — · alias: NV1p
  - Source: T's answer of 2026-11-12, "Plot a fit fix", after the shot of the lighthouse paid card at 360x740 (fixture `wanderer-bw-lighthouse-paid`, smoke route `quest-two-lines`). LEAVE and ACCEPT sit below the screen's bottom edge. Whether the screen scrolls is not checked. The reward banner (`RelicRise`, `components/quest/QuestGiverScene`, placed in `app/quest/index.tsx`) covers the card's "Bring" and reward rows. The banner overlap predates spec 177.
  - Mobile only, the quest screen: the buttons are always reachable without the player guessing (in view, or in a column that visibly scrolls), and the banner sits clear of the card's rows. Keep the giver line verbatim (T, 2026-11-12: "Keep verbatim": the name in the heading and in each "X says," tag stays).
  - Measure: shots of the lighthouse paid card at 360x740 and 390x844 show both buttons and every row unobscured; a test reaches ACCEPT at 360x740; CI's visual baselines re-stamp.
- [ ] **177.?keep** The sea keep matches the portrait, and the pilot's test gaps close · S · closes A?keep · needs — · alias: NV1q
  - Source: T, 2026-11-12, "Portrait wins" (the Saint Beneath is a great fish with an old man's face, ledger "The Saint Beneath", E-01), and T approved this redraw of S-17 panel 2 through `/narrate` at stop 1, verbatim: "The lord of the place lies beyond the lamp. Thirty years in that light have taken the edges from him, and he is grown long and pale and scaled, with an old man's face still set in the front of him, its eyes shut. About him on the floor lie the tithes of all those years, laid out in rows, and not one of them has been let to rot."
  - Content: that text replaces S-17 panel 2 in `plan/ballots/narrator-chapter1.md` and the second line of `bw-k2` in `BW_NODE_SCENES` (`axiomancer-mechanics/src/World/MapEvents/content.ts`) in the same commit, because `scripts/narrator-verdicts.test.mjs` reads both. Panels 1 and 3 are unchanged. The ledger gets a dated note under S-17 naming T's ruling.
  - Canon: the story overview (`axiomancer-mechanics/content/story/story-overview.md`, `## Rulings`) gains ruling 13, in T's words of 2026-11-12: "Portrait wins". A creature's or person's approved portrait is canon for how it looks, and a scene or description that disagrees is redrawn through `/narrate`.
  - Tests (the gaps left by pilot vega, 2026-11-12): kill the mutation survivor at `state-fixture.builder.ts` (the line that marks the staged node's scene seen); pin R-02 exactly through an engine walk; a root test that reads `.claude/skills/narrate/SKILL.md`'s front-matter description and asserts its last sentence; make the cutscene leave-first fix (`app/cutscene/index.tsx`) visible to the mutation report's test map, or say in the PR why the tool cannot see `state/e2e/cutscene-leaves-first.test.tsx`.
  - Measure: `node scripts/narrator-verdicts.test.mjs` passes with the new panel; changing one character of it in either file turns it red; `npm run verify -w axiomancer-mechanics`, mobile jest and the root `npm test` pass.
~~~

## Edit plan/README.md
~~~ old
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
~~~
~~~ new
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
- **177.?split** · NV1o: the cutscene screen pages a long panel so the Keeper stays on screen (T, `/plot asap`, 2026-11-12)
- **177.?questfit** · NV1p: the quest card fits at 360x740 (T, `/plot asap`, 2026-11-12)
- **177.?keep** · NV1q: S-17 matches the Saint Beneath's portrait; the pilot's test gaps close (T, `/plot asap`, 2026-11-12)
~~~
