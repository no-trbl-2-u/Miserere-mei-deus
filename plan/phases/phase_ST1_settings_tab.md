# Phase ST1 — A Settings tab: the gear, a music switch, a feedback form, and the dev menu moved in

## Sources

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

## Outcome

A sixth tab with a gear sits at the right of the tab bar and opens Settings. Settings gains a music on/off
switch beside the volume, a FEEDBACK button that opens a form (bug or proposal, a text box, Submit or
Cancel), and, in dev and preview builds, the DEV TOOLS link that used to sit on the SELF tab. Feedback is
not sent or saved anywhere yet.

Measure: the settings, tabs and feedback tests pass, the 390 px `verify:visual` shot of the tab bar shows
six labels unclipped, every e2e script that opens `/dev` passes through the new link, and
`npm run verify -w axiomancer-mobile` is green.

## Acceptance

- **A1** The tab bar has a sixth tab, SETTINGS, rightmost, with a gear icon. The gear is the game-icons.net
  `cog` glyph added to the icon canon (`components/icons/game-icon-paths.ts` and the registry) with its
  credit in `LICENSE-game-icons.txt`. `TabKey` and `TAB_TITLES` carry it; the tabs-engine tests pin the
  order.
- **A2** The SETTINGS tab renders the same settings body as `/settings` (one component, two hosts). In the
  tab it has no ✕ close button; on the `/settings` route, reached from the main menu, it keeps it.
  The SELF tab's Settings link is removed, since the tab replaces it. Confirmed by T (2026-10-31): yes,
  remove it from the Character tab.
- **A3** The SOUND section has a MUSIC on/off row above the volume, a new persisted setting `musicOn`
  (default on; an old save without it reads as on). Off silences the theme through MU1's music director,
  as volume 0 does; switching back on resumes at the kept volume. `[T to confirm #2]` The reset-settings
  button restores it to on.
- **A4** A FEEDBACK section holds one SEND FEEDBACK button. It opens a modal with a two-way pick, BUG or
  PROPOSAL, a multi-line text box capped at 1000 characters with a live count, and SUBMIT and CANCEL.
  SUBMIT is disabled until a kind is picked and the text is not blank. CANCEL, the back gesture and a tap
  outside close it and discard the text.
- **A5** SUBMIT, for now, sends and saves nothing. It closes the modal and shows one line: "Thanks. This
  build doesn't send feedback yet." Confirmed by T (2026-10-31): yes, close and say so. The form's state
  is one typed value, `FeedbackDraft { kind: 'bug' | 'proposal'; text: string }`, built by a pure presenter function with its
  own tests, so the build that stores feedback replaces only the submit handler.
- **A6** The DEV TOOLS link moves from the SELF tab into Settings, in a DEV section at the bottom, under the
  same `isDevToolsEnabled()` gate: present in dev and preview builds, absent (section and all) in
  production. The SELF tab no longer mounts it. Its testID becomes `settings-dev-tools-link`.
- **A7** Every consumer of the old id is moved to the new path (the SETTINGS tab, then the link): the six
  e2e scripts and `audit-capture.mjs`, the link's test, the playtester agent and the five docs named under
  Sources. `self-dev-tools-link` appears nowhere in the tree outside `plan/` history.

## Decisions made upfront — DO NOT ASK

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

## Save / schema contracts

`state/settings.ts` gains `musicOn: boolean` (default `true`), read with a default so a save written
before ST1a loads unchanged. Nothing else is saved; `FeedbackDraft` is in memory only.

## Phases

### Phase ST1a — The SETTINGS tab, the music switch and the feedback form

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

### Phase ST1b — The dev menu moves into Settings

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

## DoD

A1–A7 ticked; T sees the gear on the next preview APK.

## Follow-ups (not in this phase)

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
