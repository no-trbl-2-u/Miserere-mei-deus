# Android smoke test: the runs

`.github/workflows/android-smoke.yml` puts a preview APK on an Android emulator and drives
`axiomancer-mobile/.maestro/android-smoke.yaml` from the title to the end of one combat round. Every run
is recorded here, newest first. It is attended: a run with no `build_id` builds a fresh preview APK and
spends EAS build minutes, so T approves that one.

## How to run it

- Actions tab, `android-smoke`, Run workflow. `build_id` takes an existing EAS Android build id (no build
  minutes); empty builds a fresh `preview` APK with `EXPO_TOKEN` and waits for it. `api_level` defaults to 34.
- List recent build ids with `npx eas-cli build:list --platform android --status finished --limit 5` from
  `axiomancer-mobile/`.
- The run uploads `android-smoke-<run id>`: `shots/<time>/android-smoke/takeScreenshot/` (five flow shots,
  `05-round-2.png` being the pass shot), Maestro's own logs, command record and step screenshots under the
  same folder, `maestro.log` (the flow log), `report.xml` (JUnit), `logcat.txt`, and `failure.png` when the
  flow fails.

## What the flow checks

Launch with cleared state, the title (`title-screen`), EMBARK, the main menu, SETTINGS, DEV TOOLS (a
preview build has dev tools on), the ENCOUNTERS section, the standard-foe trigger, the combat reveal, ENTER,
the board with a live END control, END pressed, then END live again on the board with no error screen. One
round is one END: the foe's threat phase resolves and the next phase deals a fresh hand and tray. It plays
no card, so it needs no drag. Every selector is a testID already in the app.

## Runner

GitHub's `ubuntu-latest` runner exposes KVM once a udev rule opens `/dev/kvm` (the workflow's
`Enable KVM` step); the emulator is API 34 `google_apis` x86_64 on the `pixel_6` profile, booted by
`ReactiveCircus/android-emulator-runner` v2.38.0 pinned by commit. KVM is available, so the `adb`-on-T's-device
variant the spec held in reserve is not needed. The repository is public, so the runner costs no minutes.

## Runs

| Date | Run | Build | APK commit | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-09 | [42576780357](https://github.com/no-trbl-2-u/Miserere-mei-deus/actions/runs/42576780357) | given `eac5d654-36ec-4ccc-a8e8-14603dfea41a` (preview, 2026-11-08) | `a007de341` | pass | The record run for A9. Flow 1m 20s, job about 4 min, no EAS minutes. Round 2 shot: VITAE 170 to 161 after the Quay-Crab's turn, a fresh hand and tray, END live. |
| 2026-11-09 | [42575545752](https://github.com/no-trbl-2-u/Miserere-mei-deus/actions/runs/42575545752) | given, same build | `a007de341` | pass | The first run that kept its shots. Android's one-time "Viewing full screen" card sat over the top of every shot; the run script now marks it seen before launch. |
| 2026-11-09 | [42574235126](https://github.com/no-trbl-2-u/Miserere-mei-deus/actions/runs/42574235126) | given, same build | `a007de341` | pass | The first run. Its screenshots were not uploaded (Maestro 2 writes them under `--test-output-dir`, which the script now sets). |

T's first fresh-build run (A8, phase LG1h) goes at the top of this table.
