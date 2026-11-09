# 132 — A Settings tab: the gear, a music switch, a feedback form, and the dev menu moved in

> A sixth tab with a gear sits at the right of the tab bar and opens Settings. Settings gains a music on/off switch beside the volume, a FEEDBACK button that opens a form (bug or proposal, a text box, Submit or Cancel), and, in dev and preview builds, the DEV TOOLS link that used to sit on the SELF tab. Feedback is not sent or saved anywhere yet.

Carried from the v1 brief `phase_ST1_settings_tab.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_ST1_settings_tab.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- T, in session, 2026-10-31, while planning the beta (testers get the preview APK): *"I need to make a
  settings menu in the game. So plot a settings menu (for now just make it a tab with a gear symbol. In it
  will be the music volume/toggle, the dev menu (which means remove it from the character menu and move it
  into settings), and a feedback button that brings up a modal to provide either a bug or proposal and then
  submit or cancel. For now they're for show, but eventually we'll save those somewhere)."*
- `axiomancer-mobile/app/settings/index.tsx`: a SETTINGS screen already exists at `/settings` (appearance,
  motion, sound, story, the run, this device), reached from the main menu (`app/index.tsx` `onSettings`)
  and from the SELF tab (`components/menu/SettingsLink.tsx`, mounted at `app/(tabs)/character/index.tsx`
  line 324). It has a MUSIC volume stepper (`musicVolume`, 0–100, `state/settings.ts`) that MU1's
  `components/BackgroundMusic.tsx` follows. There is no music on/off switch; volume 0 is the only silence.
- `app/(tabs)/_layout.tsx`: five tabs (WILDS, SELF, MEMOIR, BAG, DECK), icons from the icon canon
  (`components/icons/`, game-icons.net paths, `LICENSE-game-icons.txt`). The canon has no gear glyph.
  `state/presenters/tabs.engine.ts` holds `TabKey` and `TAB_TITLES`.
- `components/dev/DevToolsLink.tsx`: the DEV TOOLS link to `/dev`, gated by `isDevToolsEnabled()`
  (`lib/buildProfile.ts`: on in dev and preview builds, off in production), mounted on the SELF tab at
  `app/(tabs)/character/index.tsx` line 325, testID `self-dev-tools-link`. That id is driven by
  `scripts/combat-round-e2e.mjs`, `encounter-routing-e2e.mjs`, `exploration-combat-roundtrip-e2e.mjs`,
  `feature-map-e2e.mjs`, `hazard-e2e.mjs`, `live-fight-entry.mjs`, `audit-capture.mjs`, its own test
  `components/dev/__tests__/DevToolsLink.test.tsx`, `.claude/agents/playtester.md`, and the docs
  `axiomancer-mobile/AGENTS.md`, `docs/dev-tools.md`, `docs/playtest-guides/{README,map}.md`,
  `plan/revamp/mobile.md`.
- `plan/revamp/mobile.md` § B10: the dev menu's redesign is owner-led and blocked. This plot only moves
  the link; what is inside `/dev` is untouched.

### Outcome

A sixth tab with a gear sits at the right of the tab bar and opens Settings. Settings gains a music on/off
switch beside the volume, a FEEDBACK button that opens a form (bug or proposal, a text box, Submit or
Cancel), and, in dev and preview builds, the DEV TOOLS link that used to sit on the SELF tab. Feedback is
not sent or saved anywhere yet.

Measure: the settings, tabs and feedback tests pass, the 390 px `verify:visual` shot of the tab bar shows
six labels unclipped, every e2e script that opens `/dev` passes through the new link, and
`npm run verify -w axiomancer-mobile` is green.

## Design

### Decisions made upfront — DO NOT ASK

- **A tab, not a header gear.** T said "for now just make it a tab with a gear symbol". The `/settings`
  route stays for the main menu, which has no tab bar.
- **The gear comes from the canon's own source.** game-icons.net is already the canon's licensed set
  (CC BY 3.0, credited); a UI glyph from it is not new game art under D88.
- **Tab label `SETTINGS`.** If the 390 px shot shows it clipping beside the other five, the label font
  drops one step for all six tabs; the label is not shortened. The PR shows the shot.
- **Feedback text never leaves the device in this phase**, and nothing is written to storage either: a
  closed modal forgets it. Saving comes with the pipeline (Follow-ups).
- **The dev link moves; `/dev` does not change.** B10 (owner-led) still owns its redesign.
- **One settings body.** The tab and the route import one component with a `showClose` prop; no copy of
  the screen.

### Follow-ups (not in this phase)

- **The feedback pipeline (T, 2026-10-31; an idea, not yet designed, T: "let's not brainstorm it now").**
  Save each submitted bug or proposal somewhere; an agent reads them in batches on a schedule, decides
  which are real and worth acting on, and files a GitHub issue for each, labelled `Unresolved`; `/march`
  (and its triage gate) does not act on an `Unresolved` issue until T removes the label. Constraints
  already known from the 2026-10-31 security review, to carry into its design:
  - tester text is untrusted input. The agent that reads it should hold no `GH_PAT`, no Claude OAuth
    token with write tools, and no network beyond filing the issue, or the filing step should be a plain
    script fed the agent's structured verdict;
  - the issue body quotes the tester's text as data (fenced), so a later agent run that reads the issue
    is not steered by it; `/march` triage and `@claude` must skip `Unresolved` issues;
  - storage is likely a new owner-read-only route on `miserere-api` (D1), written by the app with a
    tester-scoped token, never the current all-routes token.
- **Tester-scoped API token** (same review): the preview APK bakes in the one `PUZZLE_API_TOKEN`, which
  reads every route, ballot verdicts included. Split it into a POST-only tester token and an owner token,
  and rotate the current one, before the APK goes to testers. Its own plot.
- **Dev tools in testers' hands.** Preview builds show DEV TOOLS, so beta testers on the preview APK will
  have it. A tester build flag (or a hidden gesture) that hides it is its own plot, or part of B10.

### Chunk notes (the brief's phase blocks)

#### ST1a (chunk 132.1)

Closes A1, A2, A3, A4, A5. Requires nothing. Size: M.

Scope: `components/icons/` (the cog glyph, registry entry, licence line), `app/(tabs)/_layout.tsx` and
`state/presenters/tabs.engine.ts` (the sixth tab), `app/settings/index.tsx` split into a shared settings
body plus the route host, a new `app/(tabs)/settings/index.tsx` tab host, `components/menu/SettingsLink.tsx`
unmounted from SELF (confirmed by T, 2026-10-31), `state/settings.ts` (`musicOn`), the music director's input
(MU1's presenter) to honour it, `state/presenters/settings.engine.ts` (copy, the music row, the feedback
presenter), a new `components/menu/FeedbackSheet.tsx`.

Consumers: the tab bar, the main menu's `/settings` route, `BackgroundMusic`.

Tests: tabs-engine order and titles; the settings presenter for `musicOn` (default, old save, reset); the
music director paused when `musicOn` is false and resumed at the kept volume; the feedback presenter
(disabled until kind and text, 1000 cap, the draft shape); the sheet's submit, cancel and dismiss; the tab
host has no ✕ and the route host does.

Verify gate: `npm run verify -w axiomancer-mobile` and a `verify:visual` shot of the tab bar at 390 px.

Measure: the tab bar shot shows six labels and the gear, and the new suites pass.

#### ST1b (chunk 132.2)

Closes A6, A7. Requires ST1a. Size: S.

Scope: `components/dev/DevToolsLink.tsx` (testID, mounted in the shared settings body under a DEV
section), `app/(tabs)/character/index.tsx` (unmount), the e2e scripts and `audit-capture.mjs` (open the
SETTINGS tab, then the link), `components/dev/__tests__/DevToolsLink.test.tsx`,
`.claude/agents/playtester.md`, `axiomancer-mobile/AGENTS.md`, `docs/dev-tools.md`,
`docs/playtest-guides/README.md` and `map.md`, `plan/revamp/mobile.md` (the B10 audit's id).

Consumers: every e2e script and agent that opens `/dev`.

Tests: the link renders in Settings when dev tools are on and the DEV section is absent when they are off;
SELF no longer renders it; the e2e scripts that run in CI pass on the PR.

Verify gate: `npm run verify -w axiomancer-mobile` and the CI e2e jobs.

Measure: a tree grep for `self-dev-tools-link` outside `plan/` is empty and the e2e jobs are green.

## Contracts

`state/settings.ts` gains `musicOn: boolean` (default `true`), read with a default so a save written
before ST1a loads unchanged. Nothing else is saved; `FeedbackDraft` is in memory only.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 0 open · 7 closed · next A8


<!-- Not chunked yet: hand absorb in progress -->
