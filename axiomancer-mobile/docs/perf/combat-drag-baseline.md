# Combat drag-and-drop: perf baseline

Target: the **Android release APK** (EAS `preview`, New Architecture,
Hermes, Reanimated 4.1.7, RNGH 2.28.0, RN 0.81.5). Acceptance for drag (b):
≥90% of frames under 16.7ms and no frame over 50ms.

This pass ran in a cloud Linux container with **no Android device**. So the
Android tables below are blank: the protocol and script are ready to run.
What could be measured here was measured: jest commit/render counts, and the
web export in Chromium with 4x CPU throttling. The web numbers are for
bisecting only and are not the acceptance evidence.

- Base commit (before): `330ec3e`
- Fix commits: `89d328e`, `703272d`, `aa0ed30`, `1dcc003`, `9fdac1f` (branch `ccr-9327878f-vn0e49`)
- Device / Android version / APK commit: **not measured; fill in below**

## Hypotheses

| # | Hypothesis | Verdict | Evidence | Fix |
|---|---|---|---|---|
| 1 | JS re-renders during a drag | **Confirmed** (pickup, stage) | A pickup put one `dragActive` state in front of the ghost, so the ghost showed only after the panel and the whole board re-rendered, plus one passive-effect hop. Staging cost 2 commits (a prune effect built a new `{}`) and re-rendered the dice tray. Per-frame: 0 commits (only the gesture worklets write shared values). | `1dcc003` (ghost first, board as a transition), `703272d` (stage 2→1 commits), `aa0ed30` (pickup re-renders no fanned card) |
| 2 | Gesture cache invalidation / detector remounts | **Partly**: the cache is hit (built once per `${from}-${uid}`, `CombatBoard.tsx` `cardGestureFor`/`dieGesture`), and no detector has a changing `key`. But the lifted card's `GestureDetector` re-rendered on pickup and drop, re-pushing its handler configs | jest: 1 fanned detector re-render on pickup and 1 on drop, now 0 | `aa0ed30` |
| 3 | Per-frame `runOnJS` | **Killed** | `onUpdate` writes `drag.x/y` only. `runOnJS` fires in `onStart`/`onEnd`/`onFinalize`/tap (board), at tumble end (`RollingDie`), and at hit-land/number-pop end (pane, `numberPop`). No `useAnimatedReaction`/`useDerivedValue` on the screen. | none |
| 4 | Layout animations fighting the drag | **Confirmed** (two ways) | (i) Native: an inline `LinearTransition.duration(160)` is a new builder each render, so Reanimated's `_configureLayoutAnimation` re-built and re-serialised the worklet per fanned-card re-render: 1 per pickup, 1 per drop, 4 per stage. (ii) Web: `tryActivateLayoutTransition` forces `getBoundingClientRect` per fanned card on the stage/unstage commit, measured at 83ms of forced layout plus keyframe generation, giving the 200–370ms post-release frame. The card does NOT leave the fan mid-drag, so nothing re-lays out while the ghost is in flight. | `89d328e` (hoist builders), `9fdac1f` (no fan transition on web) |
| 5 | Async `measureRect` on drop | **Killed** (minor) | pointerup → first DOM mutation: 28–41ms card, 13ms die (web, 4x). The first mutation is the end commit, not the measurement. Staged rects are measured in one `Promise.all`. | none |
| 6 | Ambient animations | **Present, marginal** | During a drag, 3 infinite UI-thread animations run on the board (END medallion pulse; enemy idle breath: swell + rise). In LIVE play the exploration map stayed mounted under the full-screen combat layer (the encounter overlay, gone since phase CR1a/CR1b moved the fight to its own route), and every available map node keeps its `withRepeat` pulse (`ExplorationNode.tsx:84`), unseen. No ambient animation touches React state. | not fixed (see Remaining) |
| 7 | Web-specific | **Confirmed**, library-side | RNGH web runs `getBoundingClientRect` + `getComputedStyle` (`calculateViewScale`, `isPointerInBounds`) on every pointermove, which forces layout against Reanimated's per-frame DOM writes. `useDragInterruptRecovery`'s `pointermove` listener is not in the top 15 self-time functions, so it is not hot and was left alone. The `element.ref` warning is dev-only, once per load. Nested-`<button>` hydration errors happen at load, not mid-drag. | none (RNGH web internals) |
| 8 | Store/VM churn | **Killed** | `vm = useMemo(buildCombatViewModel(live), [live])` changes only on an engine state change. Store subscriptions re-render the panel, but every board prop is identity-stable, so the memoized board skips. Dice-ritual timers set per-die state inside `RollingDie`/`DiceRow`, not the VM. | none |
| 9 | Image decode | **Killed** (low risk) | `expo-image` (`lib/platform/image.ts`). Card art is 512×512 VP8 webp (4–12 kB). The ghost stays mounted after the first drag, so a new drag swaps the source at the same size the fan already decoded (memory-cache hit). | none |
| 10 | Android SVG overdraw | **Unverifiable without device** | 30 `<Svg>` roots / 330 paths on the board (1 staged card, jest count). The ghost holds 2 static SVGs (card) or 2 (die). No SVG prop is driven by an animated value (no `useAnimatedProps` on the screen). Translating a parent re-uses the RenderNode display list, so the SVG should not re-rasterise. | needs device |
| 11 | Android shadows/elevation | **Unverifiable without device** | Every card face has `elevation: 6` (`faceOuter`), so 5 hand + N staged + 1 ghost. The ghost has exactly 1, which meets ≤1. GPU overdraw is unmeasured. The live map under the combat layer is drawn every frame (Android does no occlusion culling): suspected 2x+ overdraw. | needs device |
| 12 | Fabric + RNGH arbitration | **Killed** (static) | No `ScrollView` is an ancestor of the board (the reveal/log/modal ScrollViews are siblings, mounted only when open). The live combat layer is a plain `View`, not an RN `Modal`. There is one `GestureHandlerRootView` (`app/_layout.tsx:219`). | none |
| 13 | JS thread: haptics/timers | **Killed** | Haptics fire once per drop. Dice-ritual timers run only while dice tumble. `useDragInterruptRecovery` returns early on native (no `window.addEventListener`). | none |
| 14 | Worklets plugin | **Killed** | `babel-preset-expo` 54.0.11 auto-adds `react-native-worklets/plugin` (worklets 0.5.1 installed). The production **android** bundle (`expo export --platform android --no-bytecode`) has 130 `__workletHash`; the web export has 123. | none |

## Measured here

### jest (full `CombatEncounterPanel`, drag driven through its `DragController`)

| Event | Before (`330ec3e`) | After |
|---|---|---|
| card pickup | 1 commit: panel + **board** + ghost face. Ghost revealed in a passive effect after it | commit 1: panel + ghost only (board idle); commit 2: board (transition); commit 3: no-op re-check. Ghost revealed in a layout effect |
| fanned-card detector re-renders, pickup / drop | 1 / 1 | 0 / 0 |
| layout-animation builds (native reconfigures), pickup / drop / stage | 1+2 / 1+1 / 4+4+1 | 0 / 0 / 0 |
| stage commit | 2 commits, 2 board renders, 1 dice-tray render | 1, 1, 0 |

Pinned by `CombatEncounterPanel.drag-commits.test.tsx` and
`CombatBoard.drag-renders.test.tsx`.

### Web export, Chromium 1194, 390×844, CPU throttle 4x, seed 16, 5 drags per set, 3 runs (median of runs)

`scripts/combat-drag-perf.mjs`. A missed frame is a rAF delta over 17.5ms.
Pickup is the first pointermove past the activation distance to the first
frame the ghost is visible. Drop is pointerup to the first DOM mutation.

| Drag | | p95 | p99 | max | missed | >50ms | longest task | pickup (median) | drop (median) |
|---|---|---|---|---|---|---|---|---|---|
| (a) hand → play | before | 33.4 | 83.4 | 333 | 9.6% | 15 | 288 | 120 | 41 |
| | after | 33.3 | 50.0 | 100 | 5.9% | 5 | 93 | 48 | 28 |
| (b) die → staged (3 staged) | before | 16.8 | 49.9 | 117 | 4.0% | 7 | 101 | 9 | 13 |
| | after | 16.8 | 33.4 | 117 | 3.7% | 5 | 79 | 9 | 13 |
| (c) staged → hand | before | 33.4 | 83.3 | 333 | 8.1% | 14 | 256 | 85 | 34 |
| | after | 16.8 | 50.0 | 117 | 4.6% | 5 | 78 | 25 | 29 |

Before, the slow frames in (a) and (c) fell into two clusters. One was
mid-drag (50–133ms: the board commit the ghost waited on). The other came
right after release (200–350ms: the fan's web layout transition). After the
fixes, both mid-drag clusters are gone. What remains is the stage/unstage
commit itself (50–150ms after release, at 4x).

Re-run with:

```sh
cd axiomancer-mobile
node scripts/combat-drag-perf.mjs    # reuses .smoke-dist on a stamp hit
# a named CPU profile of the first drag of each kind (a hand-built dir is used as it stands):
npx expo export --platform web --output-dir .smoke-dist-nomin --no-minify
PROFILE=1 COMBAT_DRAG_PERF_DIST=.smoke-dist-nomin node scripts/combat-drag-perf.mjs
```

## Android release APK: to be run on a device

`scripts/android-drag-perf.sh` drives the three drags with `adb shell input
swipe` between on-screen testIDs (RN exposes `testID` as resource-id). It
records `dumpsys gfxinfo` per set and a Perfetto trace during set (b).

```sh
# 0. Build + install the preview APK at the commit under test, note its hash.
#    Developer options: "Profile HWUI rendering" → "In adb shell dumpsys gfxinfo";
#    optionally "Show GPU overdraw" for hypothesis 10/11 screenshots.
# 1. Open a combat board (dev route /combat-encounter, or a live map
#    encounter), ENTER, let the dice settle.
cd axiomancer-mobile
scripts/android-drag-perf.sh a        # (a) 5 × hand card → play region
#    stage exactly one card, then:
scripts/android-drag-perf.sh c        # (c) 5 × staged card → hand
#    stage three cards, then:
scripts/android-drag-perf.sh b        # (b) 5 × die → staged card, + Perfetto
# Outputs: drag-perf-out/{a,b,c}.gfxinfo.txt, drag-perf-out/axm-drag-b.pftrace
```

The same thing by hand, if the script cannot find the testIDs:

```sh
PKG=com.axiomancer.mobile
adb shell dumpsys gfxinfo $PKG reset
adb shell input swipe X1 Y1 X2 Y2 600     # ×5, coordinates from Developer options → Pointer location
adb shell dumpsys gfxinfo $PKG | grep -E "Total frames|Janky|percentile|Missed Vsync"
adb shell perfetto -o /data/misc/perfetto-traces/b.pftrace -t 15s -b 64mb \
    sched freq idle gfx view input am wm dalvik hal res -a $PKG &
#   ... drag set (b) ...
adb pull /data/misc/perfetto-traces/b.pftrace
```

In Perfetto (ui.perfetto.dev), during set (b) note:

- the longest `UI thread` / `RenderThread` slices;
- the longest `mqt_js` (JS thread) slices;
- for each, what it is: Fabric commit / `ReanimatedModuleProxy::performOperations` / Hermes GC / SVG draw / image decode / layout.

Device: `__________` · Android: `____` · APK commit: `_______` · Run date: `__________`

| Drag | | Total frames | Janky % | p50 | p90 | p95 | p99 | Missed vsync | Frames >50ms |
|---|---|---|---|---|---|---|---|---|---|
| (a) hand → play | before (`330ec3e`) | | | | | | | | |
| | after | | | | | | | | |
| (b) die → staged (3 staged) | before (`330ec3e`) | | | | | | | | |
| | after | | | | | | | | |
| (c) staged → hand | before (`330ec3e`) | | | | | | | | |
| | after | | | | | | | | |

Perfetto, drag (b):

| | Before | After |
|---|---|---|
| Longest UI-thread slice (ms, what) | | |
| Longest JS-thread slice (ms, what) | | |
| Reanimated `performOperations` per frame (typical ms) | | |

Dev-build only (it locates the thread; it is not acceptance evidence):

| | Before | After |
|---|---|---|
| `<PerformanceMonitor />` JS FPS / UI FPS during (a) | | |
| `<PerformanceMonitor />` JS FPS / UI FPS during (b) | | |
| Hermes sampling profile, one drag: top 3 self-time functions | | |

## Remaining (not fixed here, and why)

1. **Reanimated commit pausing vs. React commits (Android, strongest
   suspect, unverified).** On Fabric, Reanimated 4.1.7 applies every
   animation frame (the ghost's transform, the END pulse, the enemy breath)
   as a shadow-tree commit. While React commits on the JS thread it
   *skips* its own commit (`ReanimatedModuleProxy::performOperations`,
   `shouldReanimatedSkipCommit`). So the ghost can freeze for the length of
   each pickup/drop commit. The opt-in static flag
   `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS` applies non-layout props
   (`transform`, `opacity`, `zIndex`, colours) straight to the native view
   instead. The ghost uses only those props. To try it, add to
   `axiomancer-mobile/package.json`:
   ```json
   "reanimated": { "staticFeatureFlags": { "ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS": true } }
   ```
   then rebuild the APK; the flag is read at native build time
   (`react-native-reanimated/android/build.gradle`). It is not shipped
   because it is experimental and only a device A/B (the tables above) can
   show it helps without visual regressions.
2. **The live exploration map under combat.** It stays mounted and drawn
   beneath the opaque combat layer, and its available-node pulses keep
   running. Likely GPU overdraw plus per-frame UI-thread work during every
   drag, in live play only (the dev sandbox has no map). Candidate fix: pause
   `ExplorationNode` pulses and hide the map canvas (`display: 'none'`)
   while the encounter overlay is in combat mode. It is not shipped because
   only "Show GPU overdraw" or a trace can say whether it matters, and it
   touches the exploration screen.
3. **The fan's native `LinearTransition`.** On Fabric, layout animations
   run frame by frame for 160ms after every stage/unstage. They are kept
   because they are a design choice and their native cost is unmeasured. A/B
   by setting `fanCardLayoutFor` to return `undefined` for every platform.
4. **The stage/unstage commit itself** (50–150ms at 4x on web): the board
   re-renders, the staged card mounts with `FadeInDown`, and the fan
   re-lays out. That is the real work of the drop. The next lever would be
   splitting `CombatBoard` (2.3k lines) so a stage re-renders only the play
   row and the fan.
5. **RNGH web pointer handling** forces layout per pointermove. This is
   library-internal and web-only.
6. **Elevation on every card face** (hypothesis 11). This is a GPU cost
   that only a device can price.
