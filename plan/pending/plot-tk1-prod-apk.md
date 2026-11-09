---
date: 2026-11-09
---
## Add plan/163-tk1-tester-api-token.md
~~~ section Design
- **Preview stays T's; prod is what testers get (T, 2026-11-09).** The `production` EAS profile is repurposed for Android: it builds a sideloadable APK, with DEV TOOLS off (`app.config.ts` already turns them off for `production`) and the tester token baked, posting play-log rows as `human` like T's own. Its iOS side stays the App Store build it is. The `preview` profile keeps DEV TOOLS and stays T's, never attached to a release. A release carries the production APK only.
~~~
~~~ acceptance
- **A?prod-apk** The `production` profile's Android build is a sideloadable APK whose app has DEV TOOLS off and stamps play-log rows `human`; its iOS build is unchanged. Tests pin all three, and `preview-build` dispatched with `profile: production` bakes the same puzzle API values it bakes for `preview`.
~~~
~~~ chunks
- [ ] **163.?prod** The production profile builds the prod APK, with no DEV TOOLS · S · closes A?prod-apk · needs — · alias: TK1d
  - `axiomancer-mobile/eas.json`: `production.android` becomes `buildType: apk`, `distribution: internal` (`autoIncrement: versionCode` stays); `production.env` gains `EXPO_PUBLIC_PLAY_LOG_SOURCE: human` (without it `playLog.ts` stamps `harness`). `production.ios` does not change.
  - `__tests__/store-submission.test.js` and `__tests__/ios-beta-config.test.ts` ("production is unchanged") pin the new Android shape and the unchanged iOS one. A test reads `app.config.ts` with `EAS_BUILD_PROFILE=production` and asserts `extra.devToolsEnabled === false`, unless one already does.
  - `.github/workflows/preview-build.yml`: the `profile` input's description names `production` as the published APK. No other change: the puzzle API step already writes into whichever profile is dispatched.
  - Nothing is built or published here: before T's rotation (163.2) the baked token is still the owner token.
  - Measure: the two Jest files with `--maxWorkers=1`, and `node -e` printing the production profile, in the PR.
~~~

## Edit plan/163-tk1-tester-api-token.md
~~~ old
- Hiding DEV TOOLS in the preview build ([T to confirm #2]).
~~~
~~~ new
- Hiding DEV TOOLS in the preview build: preview stays T's, and testers get the production APK (Confirmed by T, 2026-11-09).
~~~

## Edit plan/163-tk1-tester-api-token.md
~~~ old
1. [T to confirm #1] A published APK's tester token can still be extracted and used to post junk rows into the play log. Default: accept it, since rows carry a `source` and reads stay owner-only.
2. [T to confirm #2] A published preview APK shows DEV TOOLS to anyone who installs it. Default: leave it, and take it up when real testers are near (spec 132's follow-up).
~~~
~~~ new
1. Confirmed by T (2026-11-09): accepted. The published APK's tester token can be extracted and used to post junk rows; reads stay owner-only, and testers' rows post as `human`, beside T's.
2. Confirmed by T (2026-11-09): no preview APK is published. Preview keeps DEV TOOLS and stays T's; a release carries the production APK, which has none (163.?prod).
~~~

## Edit plan/163-tk1-tester-api-token.md
~~~ old
finds the finished Android preview build for the tag's own commit
~~~
~~~ new
finds the finished Android production build for the tag's own commit
~~~

## Edit plan/163-tk1-tester-api-token.md
~~~ old
· closes A6, A7 · needs 163.2 · alias: TK1c
~~~
~~~ new
· closes A6, A7 · needs 163.2, 163.?prod · alias: TK1c
~~~

## Edit plan/README.md
~~~ old
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2)
~~~
~~~ new
- **163.?prod** · TK1d: the production profile builds the prod APK, with no DEV TOOLS (T, `/plot`, 2026-11-09; 163.3 needs it)
- **163.3** · TK1c: preview builds refuse the owner token, and a release can carry its APK (T, `/plot asap`, 2026-11-09; needs 163.2, 163.?prod)
~~~

## Edit plan/README.md
~~~ old
planned (**Asap**: 163.1, 163.3)
~~~
~~~ new
planned (**Asap**: 163.1, 163.?prod, 163.3)
~~~
