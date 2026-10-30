# Phase MU1 — Background music: T's theme plays all game, paused in combat and hazards

## Sources

- T, in session, 2026-10-30: uploaded `Miserere_prompt_1.mp3` (title tag "Miserere (prompt 1)", 2:25, 3.4 MB)
  with *"This is the official background music that should play uninterrupted all game (except for combat
  and hazards)."* Asked what happens after a fight or hazard, T answered *"Pick up, but fade in if
  possible"*, and chose `/plot` over building it in session.
- The track is committed with this plot at `axiomancer-mobile/assets/audio/miserere-theme.mp3`, byte for
  byte as T uploaded it, so the builder (and the cloud loop, which cannot read T's upload folder) has it.
  D88 (art and other owner content is T's): T made the pick; D115 (all game art is open; publish it).
- `axiomancer-mobile/state/settings.ts`: `musicVolume` (0–100, default 70) is persisted "for the audio
  build; no audio system plays yet". `app/settings/index.tsx` steps it by `VOLUME_STEP`.
  `state/presenters/settings.engine.ts` `soundNote`: "no sound plays yet — these are kept for the build
  that brings it". `docs/save-slots-and-settings.md` line 90 says the same.
- `axiomancer-mobile/package.json`: Expo SDK 54 (`expo ~54.0.33`), no audio package.
- `components/CombatGate.tsx` reads `selectIsInCombat` (`@mechanics`); `components/HazardGate.tsx` reads
  `selectHasActiveHazard` (`state/presenters/hazard.engine`). Both are side-effect-only components mounted
  once in `app/_layout.tsx`, the pattern this phase follows.
- `lib/platform/` holds one thin wrapper per native module (`haptics.ts`, `splash-screen.ts`, …) so tests
  and the web build import a stable seam.

## Outcome

From the title screen on, T's theme loops under everything (the map, the village, events, menus, the
deck and inventory tabs, cutscenes), at the music volume set in Settings. It goes quiet when a fight or a
hazard starts and, when that ends, picks up where it stopped, fading in.

Size: M

Measure: the music-director tests pass (plays outside combat and hazards, pauses inside, resumes from the
paused position with a fade, follows the volume, silent at 0), and `npm run verify -w axiomancer-mobile`
is green.

## Acceptance

- **A1** `expo-audio` (the SDK 54 audio module) is a dependency of `axiomancer-mobile`, reached only
  through a new `lib/platform/audio.ts` wrapper; jest has a mock for it, so no suite loads the native
  module.
- **A2** A pure function decides the music state from the app state and settings: `paused` while
  `selectIsInCombat` or `selectHasActiveHazard` is true, or while `musicVolume` is 0; `playing` otherwise,
  with a target volume of `musicVolume / 100`. It has its own unit tests.
- **A3** One `<BackgroundMusic>` component, mounted once in `app/_layout.tsx` beside the gates, owns the
  single player for `assets/audio/miserere-theme.mp3`, looping. It applies A2: on `paused` it fades out
  and pauses (keeping the position); on `playing` after a pause it resumes from that position and fades in
  to the target volume. A volume change in Settings applies at once, without a restart.
- **A4** Nothing else restarts the track: moving between screens, tabs, events, cutscenes, the
  hazard-deck view and the death-return screen leaves it playing where it is (a test drives a route change
  and asserts no seek or reload).
- **A5** The Settings screen no longer says no music plays: `soundNote` names only sound effects as still
  to come, and `docs/save-slots-and-settings.md` line 90 is updated to match.
- **A6** On the web build, where browsers block sound until the player touches the page, the music
  starts on the first tap or key press and not before; no error is logged when autoplay is refused.

## Decisions made upfront — DO NOT ASK

- **`expo-audio`, not `expo-av`.** `expo-av`'s audio is deprecated from SDK 53 on; `expo-audio` is the
  supported module on SDK 54 and works on web. It is a native module, so the change reaches Android only
  through a new EAS build (the preview APK); local web plays it at once.
- **One player, never two.** The theme is one long-lived player owned by the root layout, so a re-render
  or route change cannot start a second copy.
- **Pause is decided from game state, not routes.** The same selectors the gates use decide it, so a fight
  or hazard counts the moment it is staged, wherever the player is, and dev entry points behave like real
  ones.
- **Fades.** Fade in over 2 seconds on resume, fade out over 0.5 seconds into a pause. [T to confirm #1]
- **The title screen plays it too**, since T said "all game": the track starts on boot (on web, on the
  first touch). [T to confirm #2]
- **The app in the background is silent.** When Android sends the app to the background (home button,
  screen off), the music pauses, and it resumes with the same fade on return. [T to confirm #3]
- **The combat prelude keeps the music**; it pauses when the fight itself is staged
  (`selectIsInCombat`), the same moment `CombatGate` routes.
- **Volume is linear**, `musicVolume / 100`, the setting's existing scale; no new setting.
- **The asset rides the plot PR.** A plot never builds, but the track is T's content, not code, and the
  loop cannot reach T's upload folder; the PR carries it unreferenced so the build row only wires it.

## Save / schema contracts

None. `musicVolume` already persists; nothing new is saved. The playback position is not saved: a new
session starts the track from the top.

## Phases

One phase: Phase MU1.

Scope: `axiomancer-mobile/package.json` and lockfile (`expo-audio`), `lib/platform/audio.ts` (new),
`jest.setup.ts` (the mock), a pure music presenter under `state/presenters/` with tests,
`components/BackgroundMusic.tsx` (new) with tests, `app/_layout.tsx` (mount), the `soundNote` copy in
`state/presenters/settings.engine.ts` and its tests, `docs/save-slots-and-settings.md`. Not touched: the
track itself, any mechanics file, sound effects (still not played).

Consumers: the root layout only.

Tests: the presenter's states (A2) including volume 0 and combat and hazard at once; the component with a
mocked player: loops on mount, fades out and pauses when combat is staged, resumes from the same position
and fades in when it ends, follows a volume change, does not seek or reload on a route change (A3, A4); the
web first-gesture start (A6); the settings copy (A5).

Verify gate: `npm run verify -w axiomancer-mobile`.

## DoD

A1–A6 ticked; T hears it on the next preview build (the Nov 9 mid-MVP check plays that build).

## Follow-ups (not in this phase)

- **Combat and hazard music.** T asked for silence there today; a battle track or hazard track would be
  T's to supply.
- **Sound effects.** `sfxVolume` stays unused; a sound-effects pass is its own plot.
- **More than one theme** (per chapter or per place) would turn the single player into a playlist.
