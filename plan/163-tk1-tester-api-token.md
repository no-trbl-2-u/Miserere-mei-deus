# 163 — The published APK carries a tester token that can only post

> The preview APK has the one API token baked into it, and that token reads every route, ballot verdicts included. This spec gives the app its own token that can only post what the app posts, rotates the old one, and then lets a release carry its APK.

## Why

### Sources

- **T, 2026-11-09:** asked for the APK on the release links, then, told that the APK holds the all-routes token and the repo is public, chose "Plot the token split now".
- **Spec 132's security review (2026-10-31), its Follow-ups:** "Split it into a POST-only tester token and an owner token, and rotate the current one, before the APK goes to testers. Its own plot." Carried to `plan/CANDIDATES.md` when spec 132 retired.

### What exists today (read 2026-11-09, at 7c7e5ada2)

- **The Worker** (`backend/src/index.ts`, `backend/src/auth.ts`): one secret, `PUZZLE_API_TOKEN`. Every route, method and report checks `isAuthorized(request, env.PUZZLE_API_TOKEN)`. The checks are in `handle`, the run-end path and `handleReport`.
- **What the app calls** (`axiomancer-mobile/lib/puzzleAttempts.ts`, `playLog.ts`, `deckEvents.ts`, `fightRecorder.ts`, `runLog.ts`): POSTs only, to the puzzle attempts, fights, deck events, play runs, run events and run-end paths. It reads nothing.
- **The bake** (`.github/workflows/preview-build.yml`): the repo secret `EXPO_PUBLIC_PUZZLE_API_TOKEN` goes into the build as an `EXPO_PUBLIC_` value, so anyone holding the APK can extract it. It has been baked since 2026-10-21 (BE1c).
- **Everyone else on the owner token:** `scripts/api.mjs`, `scripts/puzzle-times.mjs`, `scripts/sim-run.mjs`, `.github/workflows/sim-runs.yml`, and the ballot site (typed into the browser, kept in `localStorage`).
- **The deploy** (`.github/workflows/backend-deploy.yml`): sets the Worker secret from the repo secret, and fails when it is missing.
- **Releases:** v0.6.0 and v0.7.0 link their EAS build pages, and no APK is attached. T had one attached on 2026-11-09 and it came down the same hour, before any download, for this reason.

## Design

- **Two tokens.** `PUZZLE_API_TOKEN` stays the name of the owner token, so no script, workflow or ballot page changes. A new Worker secret, `PUZZLE_TESTER_TOKEN`, is accepted on the app's six POST paths and nowhere else.
- **A route opts in.** The check is a property of the route (`tester: true` on the app's POST routes), so a new route is owner-only until it says otherwise. The ballot POST, every GET and every report stay owner-only, and a tester token on them gets today's 401.
- **The new secret is optional at first.** A Worker without `PUZZLE_TESTER_TOKEN` behaves exactly as today, and the deploy sets it only when the repo secret exists, so the code can ship before T's rotation.
- **The rotation is T's, once.** It replaces both values, so every APK built before it stops posting (its posts are dropped with a warning, and the game plays on). The old value then opens nothing, which is also what makes the older APKs safe to publish.
- **Then the guard.** After the rotation a preview build refuses to bake the owner token, comparing the two repo secrets in the workflow. It cannot come earlier, because today they hold the same value.

### Decisions made upfront (do not ask)

- No new client code: the app already sends whatever `EXPO_PUBLIC_PUZZLE_API_TOKEN` holds. Only that secret's value changes.
- No per-tester tokens, revocation list, or rate limiter.
- A release keeps its EAS build link and gains the APK as an asset.

### Out of scope

- Rate limits or abuse handling on the POST routes, beyond the size caps they already have.
- The feedback pipeline, spec 132's other follow-up.
- Hiding DEV TOOLS in the preview build: preview stays T's, and testers get the production APK (Confirmed by T, 2026-11-09).

- **Preview stays T's; prod is what testers get (T, 2026-11-09).** The `production` EAS profile is repurposed for Android: it builds a sideloadable APK, with DEV TOOLS off (`app.config.ts` already turns them off for `production`) and the tester token baked, posting play-log rows as `human` like T's own. Its iOS side stays the App Store build it is. The `preview` profile keeps DEV TOOLS and stays T's, never attached to a release. A release carries the production APK only.

## Acceptance

- **A5** T's rotation is done: new values in the Worker and repo secrets, a preview build made with the tester value and seen posting a row, and the old value refused by the live Worker with a 401.
- **A6** `preview-build` fails before spending a build when the baked token equals the owner token.
- **A7** `node scripts/release-apk.mjs <tag>` finds the finished Android production build for the tag's own commit, refuses any other commit, and attaches its APK to that release. Run on v0.7.0 as its proof.

## Open questions

1. Confirmed by T (2026-11-09): accepted. The published APK's tester token can be extracted and used to post junk rows; reads stay owner-only, and testers' rows post as `human`, beside T's.
2. Confirmed by T (2026-11-09): no preview APK is published. Preview keeps DEV TOOLS and stays T's; a release carries the production APK, which has none (163.4).

## Chunks

Measure: 3 open · 5 closed · next A9

- [ ] **163.2** T rotates both tokens (attended) · S · closes A5 · needs — · alias: TK1b
  - An attended session: Claude generates two values and runs `gh secret set` for `PUZZLE_API_TOKEN`, `PUZZLE_TESTER_TOKEN` and `EXPO_PUBLIC_PUZZLE_API_TOKEN` (the tester value), never printing them. Then `backend-deploy` and `preview-build` by `workflow_dispatch`.
  - T re-enters the owner value on the ballot page, and `~/.config/miserere/puzzle-api.env` is updated (this also closes NEEDS_T `local-api-token-stale`).
  - T's installed APK stops posting until the new build is on the phone. Proof: T installs it, plays a fight and the row appears, and a `curl` with the old value gets 401.
- [ ] **163.3** Preview builds refuse the owner token, and a release can carry its APK · S · closes A6, A7 · needs 163.2 · alias: TK1c
  - `preview-build.yml`: an early step comparing `EXPO_PUBLIC_PUZZLE_API_TOKEN` with `PUZZLE_API_TOKEN` and failing when they match.
  - `scripts/release-apk.mjs`, using `eas-cli build:list` the way `scripts/devlog-record-build.mjs` does (`EXPO_TOKEN`), matching the tag's full commit, then `gh release upload`. Its pure parts are tested.
  - The command goes where the release steps are written down, or in `docs/external-architecture.md`'s EAS section if there is no such place.
  - Measure: the workflow's guard shown failing on a run with equal values, or its shell tested locally; the script run on v0.7.0 and the asset's link in the PR.
