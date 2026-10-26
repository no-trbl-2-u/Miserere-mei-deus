# Phase IO1 — iPhone beta builds

## Sources

- `/plot` from T, 2026-10-22 (attended): "I want to be able to create deployments for iPhones now as well so my
  friends with iPhones can beta test the game." In the same session T answered two questions: T has **no Apple
  Developer Program membership yet and will enroll**, and friends install by **both** channels: ad hoc
  (EAS internal distribution, registered devices) and TestFlight.
- T, 2026-10-26 (PR #803): "Merge it as testflight only." T has a monthly cap on Expo builds, and an ad hoc
  build installs only on devices registered before it was built, so every new tester's iPhone would cost
  another build. One TestFlight build serves every tester. The ad hoc channel is dropped from this phase.
- D84-D87 and D95 (code lands by PR and merges on a green adversarial review; a plan merges by T's hand), D93
  (`/plot` lands by a `plot` PR). No D-number governs mobile distribution; bearings' Expo-decouple exception
  (47c-47e) names "the EAS build path" as one of the things that stays on Expo until a native project ships, and
  this phase stays on that path: no `ios/` folder, no prebuild committed.
- Phase BE2 (`plan/phases/phase_BE2_card_combat_logging.md`), Decisions and DoD: "Before a preview APK is handed
  to anyone but T, the default flips to off and BE1's playtester follow-up (device ids, a privacy note) is
  plotted first." A build on a friend's iPhone is exactly that hand-off, so this phase keeps friends' builds
  from posting anything (Decisions).
- Code read while shaping this:
  - `axiomancer-mobile/eas.json`: `preview` has only an `android` block (`buildType: apk`, `distribution:
    internal`); `production` has `ios: { distribution: store, autoIncrement: buildNumber }`. No `submit`
    section.
  - `axiomancer-mobile/app.json`: `ios` is only `{ supportsTablet: true }`. No `bundleIdentifier`, no
    `buildNumber`, no export-compliance flag. Android's package is `com.axiomancer.mobile`. `owner` is
    `no.trbl.2.u` and the EAS project id is set.
  - `axiomancer-mobile/app.config.ts`: `devToolsEnabled` is `profile !== 'production'`, so any new non-production
    profile ships the dev menu. `lib/buildProfile.ts` reads it.
  - `axiomancer-mobile/package.json`: `deploy:preview` builds Android only; `deploy:production` builds `all`.
    `eas-build-on-success` runs `scripts/sentry-release.mjs`, which is platform-blind.
  - `.github/workflows/preview-build.yml`: already offers `platform: android | ios | all` and a free-text
    `profile`, runs the mobile verify gate, then `npx eas-cli@latest build --non-interactive`. Its step "Pass the
    puzzle API values to the build" writes `EXPO_PUBLIC_PUZZLE_API_*` into **every non-production profile**.
    It never submits.
  - `scripts/devlog-record-build.mjs` and `devlog/builds.json`: the public DevLog offers the newest **Android**
    preview APK only.
  - The `@sentry/react-native` plugin in `app.json` carries only `experimental_android` options; the iOS side
    needs `SENTRY_AUTH_TOKEN` in the EAS environment, which the Android builds already use.
  - No `Platform.OS === 'android'`-only branch in `app/`, `components/`, `lib/` or `state/`.
    `expo-navigation-bar` is Android-only and inert on iOS.
- Apple and Expo facts this leans on (checked 2026-10-22): every route onto a friend's iPhone, ad hoc or
  TestFlight, needs a paid Apple Developer Program membership. EAS builds iOS in the cloud, so no Mac is needed.
  The first iOS credentials (distribution certificate, provisioning profile) are made by an interactive
  `eas credentials` or a first interactive `eas build` with an Apple ID login. After that, CI runs
  non-interactively with an App Store Connect API key. An ad hoc build installs only on devices registered with
  `eas device:create` before the build (100 per device type a year). TestFlight external testing allows up to
  10,000 testers by public link, needs Beta App Review on the first build of a version, and each build expires
  after 90 days.

## Outcome

T can build the game for iPhone from GitHub Actions as one TestFlight build that T and friends install from
TestFlight, friends by one public link. A friend with an iPhone has installed it and played a fight.

## Acceptance

- **A1** `app.json` `ios` carries `bundleIdentifier: "com.axiomancer.mobile"` (the Android package name),
  `buildNumber: "1"`, `supportsTablet: false` and `config.usesNonExemptEncryption: false`. A mobile test reads
  the resolved config (`app.config.ts` default export) and pins all four.
- **A2** `eas.json` `preview` stays Android-only (no `ios` block: no ad hoc channel), and a new `beta` profile
  builds iOS with `distribution: "store"` and `autoIncrement: "buildNumber"`, with `appVersionSource` set so
  build numbers are kept by EAS. A `submit.beta.ios` block names the App Store Connect app id, filled in IO1b.
  The same test pins the profile shapes. `production` is unchanged.
- **A3** `axiomancer-mobile/package.json` gains `deploy:ios-beta` (`eas build --platform ios --profile beta
  --auto-submit`), behind `npm run verify` and `scripts/with-env.mjs` as `deploy:preview` is. No
  `deploy:ios-preview`.
- **A4** `axiomancer-mobile/docs/ios-beta.md` is the runbook T follows in IO1b and IO1d: enrolling as an
  individual, the first interactive `eas credentials -p ios`, creating the App Store Connect app record, making the App
  Store Connect API key and which GitHub secrets hold it, adding T to the TestFlight internal group, adding a
  friend to the TestFlight external group or sending the public link, the 90-day expiry, and that no device
  is ever registered (no ad hoc builds). `AGENTS.md` and
  `docs/external-architecture.md` § Expo EAS name it.
- **A5** (attended) T is enrolled in the Apple Developer Program. The iOS distribution certificate and the App
  Store provisioning profile exist on EAS. No device is registered. The App Store Connect app record exists
  for `com.axiomancer.mobile`, and its numeric id is in `eas.json` `submit.beta.ios.ascAppId`. An App Store
  Connect API key (App Manager role) is stored as the repo secrets `ASC_API_KEY_P8`, `ASC_API_KEY_ID` and
  `ASC_API_ISSUER_ID`, and as an EAS submit credential.
- **A6** `preview-build.yml` gains a `submit` boolean input. When it is set, the platform is `ios` and the
  profile is `beta`, the EAS step runs with `--auto-submit` and the App Store Connect key is written from the
  secrets to a temp file for the non-interactive submit. The job fails loudly, naming the missing secret, when
  `submit` is set and a key secret is absent. A root test reads the workflow and pins these steps.
- **A7** No build meant for anyone but T posts play data. The puzzle-API step in `preview-build.yml` skips the
  `beta` profile as it skips `production`, so a TestFlight build carries no `EXPO_PUBLIC_PUZZLE_API_*` values,
  and `canSendPlayLog()` (BE2b) and the BE1 poster both stay closed. The A6 test pins the skip.
- **A8** (attended) The first `beta` build from `main` installs on T's iPhone from TestFlight's internal
  group (no Beta App Review for internal testers) and reaches the end of one combat round. T notes anything that looks wrong only on iOS: safe areas around the
  notch and home indicator, fonts, haptics, the splash.
- **A9** (attended) That same `beta` build, submitted from the workflow passes Beta App Review. The TestFlight external
  group "Friends" has a public link, and at least one friend installs from it and finishes a fight.

**Measure:** A9: a friend's iPhone runs the TestFlight build through one fight, recorded in
`docs/reports/ios-beta.md` with the build number and commit.

## Scope

- `axiomancer-mobile/app.json` `ios` block; `eas.json` the `beta` profile and `submit.beta`;
  the `deploy:ios-beta` script; `docs/ios-beta.md`; a config test.
- `.github/workflows/preview-build.yml`: the `submit` input, the key-file step, `--auto-submit`, the `beta` skip
  on the puzzle-API step; a root test that reads the workflow.
- `docs/reports/ios-beta.md` (IO1d's record).
- No game code, no `ios/` folder, no prebuild, no change to the Android profiles or the production profile.

## Consumers to update

- `AGENTS.md` (the deploy line), `docs/external-architecture.md` § Expo EAS and § credentials (the three ASC
  secrets), `.github/workflows/README.md` (the `submit` input).
- The root `npm test` list in `package.json` (the workflow test).

## Save / schema contracts

None. No save data, no API route, no D1 table.

## Decisions made upfront — DO NOT ASK

- **Bundle id `com.axiomancer.mobile`**, the Android package name, so both stores carry one id. It is
  permanent once the App Store Connect record exists.
- **Enroll as an individual** (T, 2026-10-22: "I'll enroll"). An organization account needs a D-U-N-S number
  and takes weeks. TestFlight will show T's legal name as the seller. [T to confirm]
- **iPhone only: `supportsTablet: false`.** T asked for iPhones. The game is portrait-only, and a tablet build
  would need its own layout pass. iPads still run it in iPhone compatibility mode.
- **TestFlight only** (T, 2026-10-26, replacing T's 2026-10-22 choice of both channels). T's own iPhone
  installs from the internal group, friends from the external group's public link. No ad hoc channel: each
  newly registered device would need a fresh build, and T's Expo plan caps builds a month. One `beta` build
  serves every tester, so a beta round costs one iOS build.
- **A new `beta` profile rather than reusing `production`.** `production` is the store build and turns the dev
  tools off. Keeping beta apart lets it keep the dev menu and lets the App Store release path change later
  without touching friends' builds.
- **Friends' builds keep the dev menu**, as the Android preview APK does, so a tester can skip past a block.
  The `beta` profile is not `production`, so `app.config.ts` already gives that. [T to confirm]
- **Friends' builds post nothing** (BE2's DoD). The TestFlight build carries no puzzle-API values, so neither
  the BE1 poster nor the BE2 play log can send. Telemetry from testers waits on BE1's playtester follow-up
  (device ids, a privacy note). Sentry crash reports still flow, as they do from every build today.
- **Export compliance is declared once in config** (`usesNonExemptEncryption: false`: the app uses only HTTPS
  and the OS's own crypto), so App Store Connect stops asking on every build.
- **Build numbers live on EAS** (`appVersionSource: "remote"`, `autoIncrement`). A committed `buildNumber`
  bumped by hand would collide across branches.
- **Submit runs from CI with an App Store Connect API key**, never T's Apple ID password. The interactive Apple
  login happens once, on T's machine, in IO1b.
- **Builds stay attended-dispatch only**, as `preview-build.yml` is today (automatic scheduling was removed
  2026-07-13). No cron, no build on merge.
- **The DevLog stays Android-only** for now: it offers an APK file, and an iOS build cannot be sideloaded.
  Follow-ups names the TestFlight link.

## Tests matrix

- Mobile: a config test over `app.config.ts`'s resolved config and `eas.json` (A1, A2): the four `ios` keys,
  `preview` has no `ios` block, the `beta` profile's distribution and autoIncrement, `appVersionSource`, the
  `submit.beta.ios` block's presence, and `production` unchanged.
- Root: a workflow test that parses `preview-build.yml` (A6, A7): the `submit` input exists; `--auto-submit`
  appears only behind `submit`; the key-file step reads the three secrets and fails on a missing one; the
  puzzle-API step's condition excludes `beta` and `production`.
- No device test in CI. IO1d's attended checks are the device proof.

## Verify gate

Per phase, below. The root `npm test` runs in every phase.

## Commit body template

```
<what shipped, one paragraph>

Closes A<n>[, A<m>] of plan/phases/phase_IO1_iphone_beta.md.
Measure: <the phase's Measure line and its result>.
```

## DoD

A1-A9 ticked, each by the phase that closes it. `docs/ios-beta.md` states that friends' builds post no play
data and why. `docs/reports/ios-beta.md` records the first TestFlight build a friend played.

## Follow-ups (out of scope)

- **Tester telemetry** (BE1's playtester follow-up, BE2's DoD): device ids and a privacy note, then a `beta`
  build may carry the API values. Plot it when T wants friends' fights in the play log.
- **The TestFlight link on the public DevLog** beside the APK, once T is happy to share it publicly.
- **The App Store release**: listing, screenshots (`store-assets/ios` exists), age rating, privacy nutrition
  label, review. A separate plot when T wants the game in the store.
- **iOS-only defects** that IO1d finds are filed as `plan/CRITIQUE.md` rows by that phase, not fixed in it.
- **Over-the-air updates** (`eas update`) so a friend gets a JS-only fix without a new build and review.

## Phases

### IO1a — iOS build config and the runbook · S · closes A1, A2, A3, A4 · requires nothing
Measure: `npm run verify -w axiomancer-mobile`; the config test pins the `ios` block, the `beta` profile and
`preview` staying Android-only.
- Scope: `app.json` `ios`; `eas.json` `beta`, `submit.beta.ios` with `ascAppId` left as a clearly named
  placeholder that IO1b fills; the `deploy:ios-beta` script; `docs/ios-beta.md`; the AGENTS and
  external-architecture lines.
- Consumers: `AGENTS.md`, `docs/external-architecture.md`.
- Tests: the mobile config test.
- Verify gate: mobile verify, prose verify for the docs, root `npm test`.

### IO1b — Apple enrollment and the credentials (attended) · S · closes A5 · requires IO1a
Measure: `eas credentials -p ios` lists a distribution certificate and an App Store provisioning profile;
`gh secret list` shows the three ASC secrets; `eas.json` carries the real `ascAppId`.
- Scope: T, following `docs/ios-beta.md`: enroll; run `eas credentials -p ios` once (Apple ID login on T's
  machine); create the App Store Connect record and the API key; add the
  three GitHub secrets. The agent then writes the `ascAppId` into `eas.json` and fixes any runbook step that
  did not match what T saw.
- Consumers: none.
- Tests: the A2 config test now pins a numeric `ascAppId`.
- Verify gate: mobile verify, root `npm test`. Apple's approval of the enrollment can take a day or more; the
  phase waits on it, so it is attended.

### IO1c — The workflow builds and submits · M · closes A6, A7 · requires IO1a
Measure: root `npm test`; the workflow test pins `--auto-submit` behind `submit`, the key-file step, and the
puzzle-API skip for `beta`.
- Scope: `preview-build.yml` (`submit` input, key-file step, `--auto-submit`, the `beta` skip); the root
  workflow test; `.github/workflows/README.md`; the ASC secrets in `docs/external-architecture.md`.
- Consumers: the root `npm test` list.
- Tests: the workflow test.
- Verify gate: root `npm test`. No real dispatch: IO1d is the first real run, after IO1b's secrets exist.

### IO1d — First builds on real iPhones (attended) · S · closes A8, A9 · requires IO1b, IO1c
Measure: A9, with the build number, commit and friend's install recorded in `docs/reports/ios-beta.md`.
- Scope: T dispatches `preview-build.yml` once, with `platform: ios`, `profile: beta`, `submit: true`; T
  installs it from TestFlight's internal group (A8); in App Store Connect T creates the external group
  "Friends", submits the build for Beta App Review and turns on the public link; one friend
  installs and plays a fight (A9). The agent writes `docs/reports/ios-beta.md` and files each iOS-only defect
  as a CRITIQUE row.
- Consumers: none.
- Tests: none new.
- Verify gate: prose verify for the report, root `npm test`.
