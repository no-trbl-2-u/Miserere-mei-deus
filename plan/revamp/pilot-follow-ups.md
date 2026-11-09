# Pilot follow-ups (T, 2026-11-09, `/messy`)

The overnight `/pilot` run of 2026-11-09 parked two questions and merged
two PRs whose reviews left a check that does not test what it claims. T
approved filing all four at the end gate. Each is an `[owner]` candidate
in `plan/CANDIDATES.md`; promote one with `/plot`.

## A. Remeasure the five STALE font-width estimates (extends spec 99, from 99.6 / #1507)

**What exists.** `axiomancer-mobile/state/presenters/__tests__/font-width-estimates.guard.test.ts`
reads each face's real advances from its TTF and fails when an estimate
under-counts it. Five sites were already short when the guard landed, so
they sit on its shrink-only `STALE` set with their numbers unchanged:
- the paid line's `CAPS`, `SERIF` and `SPACE_EM`;
- HazardCard's `GOTHIC_CAP_EM`;
- `effectGlyphEm`.

The current faces measure about 0.78 em for Uncial caps, 0.53 em for
Rosarivo lowercase and 0.31 em for a space.

**Proposed piece (one chunk).** Set each of the five to the measured
advance and take it off `STALE`, so the set is empty. Put before and after
shots of every screen whose fit or wrap moves (the paid line, the hazard
card, any effect line with glyphs) in the PR.

**Open question.** Where a corrected estimate shrinks text that fits
today, should the site keep the larger box, or take the honest number and
re-fit? Default: take the honest number and show the shot.

## B. A visual baseline for the WILDS map (extends spec 158, from 111.3 / #1510)

**What exists.** `axiomancer-mobile/scripts/smoke-screens.mjs` has no
route for the WILDS tab at rest. The exploration shot is the arrival
cutscene, so a map layout regression (camera fit, zoom floor, pan limits,
the gesture line under the frame) passes `verify:visual`.

**Proposed piece (one chunk).** Add two smoke routes:
- the WILDS map at rest after arrival;
- the map after a scripted pan.

Approve their baselines from the CI renderer, never a local one, because
the local renderer drifts every baseline. Cover the case the #1510 review
found: the camera must be re-clamped when the pane shrinks.

## C. The Settings smoke shot renders the wrong page (extends spec 158, from VR1b / #1514)

**What exists.** VR1b's route `/settings` opens the menu page. The tab
lives at `/settings-tab`, so `settings.png` never renders
`app/(tabs)/settings`, and the selection rule and its README name the
wrong file. `deck.png` captures only the empty panel.

**Proposed piece (one chunk).**
- Point the settings shot at the tab route, and fix the rule and README to name the right file.
- Capture the Deck with a card open, so the panel is not empty.
- Re-approve both baselines from CI.

## D. A declined quest files a false node-unresolved break (extends spec 135, from SM2d / #1531)

**What exists.** `axiomancer-mobile/sim/run-driver.ts` lists `quest` in
`LOGS_RESOLVE`. But a quest the bot declines, or one that is unavailable,
closes through `closeQuest` (`sim/run-screens.ts`) without logging
`node-resolved`. The run then files a false `node-unresolved` break as an
issue. The #1531 review also noted that the `sim-runs` workflow gates have
no test.

**Proposed piece (one chunk).**
- Either log `node-resolved` on the decline and unavailable paths, or exempt them from the check.
- Add a test that a declined quest files no break.
- Add a test of the `sim-runs` gate logic.

**Open question.** Is a declined quest "resolved" for the play log, or
only for the sim's break check? Default: the sim's check only; the play
log stays as it is.
