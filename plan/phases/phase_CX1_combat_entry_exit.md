# Phase CX1 — Combat entry and exit: the music steps aside for the whole fight, and the ink really spreads

## Sources

- T, from playing the preview APK built from `main` 8f876ec (2026-10-31), `/plot asap`, verbatim:
  - *"The music should be on a loop throughout the game (except it should pause during combat, then
    resume after as I'll add different combat music in the future)"*
  - *"The 'Start Combat UX treatment' is broken. It just centers to the node and opens the new screen.
    No new animation"*
- MU1 (#1138, `plan/phases/phase_MU1_background_music.md`): the theme loops through one `expo-audio`
  player, paused while a fight or hazard is staged, resumed from the same spot with a 2 s fade-in.
  Its Follow-ups name "combat and hazard music" as T's to supply later; T now says it is coming.
- ET1a (#1197, `plan/phases/phase_ET1_event_node_treatments.md` § ET1a, A1): "Confirming a walk to
  an encounter node plays the ink curtain: ink spreads from that node's token on the map until it
  covers the screen, and the reveal fades in out of it". T picked this from the pitch page (Encounter
  A: "Ink bleeds out of the tapped node's token and fills the screen").
- ST1a (open, `plan/phases/phase_ST1_settings_tab.md` § ST1a, A3): a persisted `musicOn` setting and
  a MUSIC on/off row; "Off silences the theme through MU1's music director".
- D88 (music and art are T's: no combat track is added here), D116/D117 (the reveal's DANGER lines,
  untouched), D113 (the walk and the owed arrival this phase leans on).

## The mechanisms (what the code does today)

**The music comes back while the fight is still on screen, and has only one track.**

1. The pause is keyed on one selector: `components/BackgroundMusic.tsx:68` reads `selectIsInCombat`,
   which is `s.currentEncounter != null` (`axiomancer-mechanics/src/Game/store.ts:559`), and
   `state/presenters/music.engine.ts:35` turns it into `paused`.
2. The fight clears `currentEncounter` the moment it reaches a terminal outcome, not when the player
   leaves: `components/combat/encounter/CombatEncounterPanel.tsx:696-701` writes the outcome back
   ("fires once, the instant combat reaches a terminal outcome") through `endCombat`, whose reducer sets
   `currentEncounter: undefined` (`axiomancer-mechanics/src/Game/game.reducer.ts:411`). So the theme
   fades back in over the victory or defeat summary, while the fight screen is still up. The screen's
   own combat flag (`useCombatMode().inCombat`, `state/combat-mode.tsx:186`) stays raised until the
   player dismisses the summary (`exitCombat`, `app/combat-encounter/index.tsx:103,117,123,132,143`);
   the director never reads it.
3. One track is hard-wired: `BackgroundMusic.tsx:18` (`THEME`) and `lib/platform/audio.ts`
   (`createLoopingPlayer`, one source). There is no notion of which music a screen wants, so a combat
   track has nowhere to drop in.
4. A possible silent stop (not confirmed without a device; named so the build closes it): the
   app never calls `setAudioModeAsync`, so `expo-audio` 1.1.1 asks Android for transient audio focus
   (`node_modules/expo-audio/android/.../AudioModule.kt:124-130`), and on a permanent focus loss it
   pauses every player without marking it to resume (`AudioModule.kt:65-69`). `BackgroundMusic`'s
   `audibleRef` (`:80`) still believes it is playing, so nothing restarts it until the next fight.
   That would read on the phone as "the music stopped and never came back".

**The ink curtain plays, but nobody can see it, and the map half was never built.**

1. Nothing happens on the map. Confirming the walk calls `actions.moveTo` then
   `actions.resolveCurrentMapEvent` in one handler (`app/(tabs)/exploration/index.tsx:161-181`); the
   move changes the camera's subject so the map re-fits on the new node (`MapCanvas.tsx:416-449`,
   "centers to the node"), and `CombatGate` pushes `/combat-encounter` on the next macrotask
   (`components/CombatGate.tsx:62-69`). ET1a's builder recorded the deviation in its commit
   (5baebe536): "the curtain runs on the fight screen (the map hands off at CombatGate's push), not
   from the tapped token". A1's "spreads from that node's token on the map" was not met.
2. On the fight screen the curtain is a full-screen layer that starts already opaque and only fades:
   `components/combat/encounter/InkCurtain.tsx:30` (`cover` starts at 1), `:45-48` (opacity 1 to 0,
   scale 1 to 1.6), `:55` (`HUE.inkBg`). The ink is `#0c0a08` (`theme/hue.ts:25`); the screen under it
   is `AXM.deepBg`, `#070509` to `#0a0503` across the themes (`theme/palette.ts:225-303`). Near-black
   fading off near-black, while the reveal's portrait also fades in (`CombatEncounterPanel.tsx:834`,
   `FadeInDown.delay(600)`), reads as an ordinary screen opening.
3. It runs under the route's own native transition: `/combat-encounter` is registered
   `presentation: 'fullScreenModal'` (`app/_layout.tsx:336-338`), so the screen slides or fades in by
   the stack's animation while the curtain is mid-fade.
4. No check ever saw it animate: `verify:visual` drives the browser with `reducedMotion: 'reduce'`
   (`scripts/smoke-screens.mjs:368`), which resolves the curtain to `instant`
   (`CombatEncounterPanel.tsx:763`, `lib/juice/instant.ts:26-28`); `InkCurtain.test.tsx` only checks it
   mounts and reports done.
5. Ruled out: the curtain is not web-only, not behind a flag, and is reached on the live map path
   (`app/combat-encounter/index.tsx:72,163` hands `nodeId` from `currentNodeId`, so `inkDone` starts
   false). Reduced motion would hide it only if T's phone has the OS "remove animations" switch on
   with Settings MOTION on `system` (`hooks/useReducedMotion.ts:20-29`); then every transition in the
   game would be instant, which T's other reports do not suggest.

## Outcome

The theme loops everywhere except while a fight or hazard is on screen; it pauses as the fight screen
opens, stays quiet through the summary, and picks up where it stopped once the player is back on the
map. Each screen asks for a music context (exploration, combat, hazard) so a combat track T supplies
later drops into one table entry. Walking to a fight, ink visibly bleeds out of the tapped token on
the map until the screen is black, and the fight screen opens inked and draws the ink back off the foe.

Measure: the music-director and `BackgroundMusic` suites pin the context through a fight (paused from
staging to `exitCombat`, resumed from the paused position after), and the new animate-mode browser
drive of a walk to an encounter node captures the ink mid-spread on the map and mid-draw on the reveal;
`npm run verify -w axiomancer-mobile` is green.

## Acceptance

- **A1** The music director answers a **context**, not a yes/no: `exploration`, `combat` or
  `hazard`, plus a target volume. `combat` holds from the moment a fight is staged
  (`selectIsInCombat`) until the fight screen's combat flag drops (`exitCombat`), so the summary
  screen is `combat` too; `hazard` holds while `selectHasActiveHazard`; everything else is
  `exploration`. Volume 0 and the app in the background stay silent in any context. Pure, with unit
  tests for each edge (staged, terminal outcome with the flag still up, flag down, hazard, both).
- **A2** A track table maps each context to a bundled track or to nothing: `exploration` is T's theme,
  `combat` and `hazard` are nothing today. A context with no track pauses the exploration track in
  place; a context with a track would play that track (the table and the player seam allow it; no
  combat audio is added). The table is the one place a future combat track is wired.
- **A3** Leaving a `combat` or `hazard` context back to `exploration` resumes the theme from where it
  paused, fading in over MU1's 2 s; it is never reloaded or seeked Accepted at merge (default). A test drives a
  fight end to end with the mocked player: paused at staging, still paused after the outcome is
  written, `play()` without a seek after `exitCombat`.
- **A4** The director does not trust its own memory of whether the native player is playing: when it
  wants the theme and the player's status reports it stopped outside a fade (a focus loss, an OS
  pause), it starts it again on the next app-foreground or context change, and the app sets an
  explicit audio mode at start (looping game music: mix with others off, no background play), so
  Android grants lasting focus rather than transient. A mocked-player test covers the
  stopped-behind-our-back case.
- **A5** On a dev build the director publishes `globalThis.__AXM_MUSIC__` (`{ context, playing }`),
  the way `__AXM_COMBAT_SEED__` is dev-only, and the exploration-to-combat round-trip browser drive
  (`e2e:exploration-roundtrip`) asserts `exploration` and playing on the map, `combat` and not playing
  on the reveal and on the summary, then `exploration` and playing back on the map. Inert in
  production.
- **A6** Confirming a walk to an encounter, elite or boss node starts an ink spread **on the map**: a
  blot of ink grows out of that node's token (its on-screen point after the camera has framed it)
  until it covers the screen, in under a second. The node's event is resolved (and the fight staged)
  only once the ink covers, so `CombatGate` pushes into a black screen. A reload during the spread
  lands on the map with the arrival still owed, which replays the fight (`vm.arrivalPending`, the
  existing path).
- **A7** The fight screen opens with no stack slide or fade of its own when an ink spread led to it,
  and its curtain starts covered and draws back with a visible edge (the ink receding off the foe,
  not a near-black opacity fade on a near-black screen); the reveal's portrait rises as the ink
  leaves. Total from confirm to the reveal settled stays near two seconds (ET1 decision 8); a tap
  skips to the end state.
- **A8** Reduced motion and the e2e escape hatch still land the end states at once: no map spread, the
  event resolved on confirm as today, the reveal with no curtain. The motion answer comes from the
  caller (`components/combat/frames/__tests__/reducedMotionSource.test.ts`).
- **A9** The trigger path is pinned without a device: a screen test on the exploration screen confirms
  a walk to an encounter node in animate mode and sees the map ink mount at the token and
  `resolveCurrentMapEvent` not called until the spread reports covered (and called at once in instant
  mode); a browser drive with motion **not** reduced walks to W2 and captures the map mid-spread and
  the reveal mid-draw (the frames ride the PR), asserting the ink element's coverage is between none
  and full at each capture.

## Decisions made upfront — DO NOT ASK

1. **Two phases, music first.** They touch different files and neither needs the other; music is the
   smaller and closes a live defect T heard. Either can ship first.
2. **Resume, not restart** Accepted at merge (default): the theme picks up where it paused, as MU1 and T's
   2026-10-30 "Pick up, but fade in if possible" already say.
3. **The music returns when the player leaves the fight screen** Accepted at merge (default), not the instant
   the foe falls: the summary is part of the fight, and it is the screen a combat track will cover.
4. **Hazards stay silent**, as MU1 (T, 2026-10-30: "except for combat and hazards"); the context
   exists so a hazard track could drop in later the same way.
5. **No combat track now** (D88; T: "I'll add different combat music in the future"). `combat` maps
   to nothing. When T supplies one, a row adds the file and one table entry; whether combat music
   restarts per fight or carries on is that row's call.
6. **ST1a's MUSIC switch is not built here.** ST1a adds `musicOn` and feeds it to the director. CX1a
   keeps the director's inputs open to it: `musicOn: false` is a master mute (silent in every
   context, like volume 0), never a context. Whichever of CX1a and ST1a lands second rebases onto the
   other's `music.engine.ts`; neither requires the other, and CX1a does not add the setting.
7. **The ink spreads from the token on the map** Accepted at merge (default), as ET1a's A1 asked: the spread
   belongs to the exploration screen (it owns the token and the camera), and the fight screen picks
   it up already covered. The map gains the primitive it lacks: the window point of a node's token
   under the current camera (`MapCanvas` holds the node layout and the camera's `scale`, `tx`, `ty`).
8. **The fight is staged only after the ink covers.** Delaying `resolveCurrentMapEvent` is safe
   because the move checkpoints first and the arrival is owed until resolved
   (`app/(tabs)/exploration/index.tsx:50-56`); `CombatGate` is not changed, so the labyrinth, the
   dev triggers and a resumed fight route exactly as today.
9. **Labyrinth fights and dev entries keep the plain open** Accepted at merge (default): they have no map token
   (`nodeOf` returns nothing), so no curtain, as ET1a left them; the route's native transition stays
   for them.
10. **Ink colour** stays `HUE.inkBg`; the fix is the shape (a spreading, then receding, edge over a
    lighter map and a lit reveal), not a new colour.

## Save / schema contracts

None. No setting is added (ST1a owns `musicOn`), the playback position is not saved (as MU1), and the
map spread delays a resolve the save already treats as owed.

## Tests matrix

- `state/presenters/music.engine.test.ts` (rewritten): contexts and their edges, the track
  table, the mute inputs (A1, A2).
- `components/__tests__/BackgroundMusic.test.tsx` (extended): the fight end to end with the combat
  flag (A3); the native player stopped behind the director's back (A4); the dev probe (A5).
- `e2e:exploration-roundtrip` (extended): the music probe through a fight (A5).
- A map-ink component test: animate mode grows from the given point and reports covered once; instant
  mode reports at once (A6, A8).
- An exploration screen test (`app/(tabs)/exploration/index.tsx` has none today; a new suite under `components/exploration/__tests__/` or beside the screen): confirm to an encounter node defers the resolve until covered;
  instant resolves at once; a non-fight node is unchanged (A6, A9).
- `InkCurtain.test.tsx` (extended): starts covered, recedes, skip on tap, instant end state (A7, A8).
- A new animate-mode browser drive of the walk to W2 with mid-spread and mid-draw captures (A9).

## Phases

### CX1a — The music steps aside for the whole fight · M · closes A1, A2, A3, A4, A5 · requires nothing
Measure: `music.engine.test.ts` and `BackgroundMusic.test.tsx` pass with the summary-screen and
stopped-player cases, and `e2e:exploration-roundtrip` reads `combat`/paused on the summary and
`exploration`/playing back on the map.
- Scope: `state/presenters/music.engine.ts` (contexts, the track table), `components/BackgroundMusic.tsx`
  (reads `useCombatMode().inCombat` beside the two selectors; one player per track that has one, the
  theme paused in place for a context with none; the stopped-player re-start; the dev probe),
  `lib/platform/audio.ts` (a status read and the audio mode call), `jest.setup.ts` (mock surface),
  `scripts/exploration-combat-roundtrip-e2e.mjs`, `docs/save-slots-and-settings.md` if its music line
  names the pause rule. Not touched: the track, any mechanics file, `state/settings.ts`.
- Consumers: the root layout's `<BackgroundMusic>` only. ST1a's director input (decision 6).
- Tests: as the matrix, A1-A5 rows.
- Verify: `npm run verify -w axiomancer-mobile`; `npm run e2e:exploration-roundtrip -w axiomancer-mobile`.

### CX1b — The ink bleeds out of the token · L · closes A6, A7, A8, A9 · requires nothing
Measure: the exploration screen test sees the resolve held until the ink covers, and the animate-mode
walk to W2 captures the map mid-spread from W2's token and the reveal mid-draw.
- Scope: a map-ink overlay on the exploration screen (new component under `components/exploration/`),
  the token's window point from `MapCanvas.tsx`, `app/(tabs)/exploration/index.tsx` (`onConfirmMove`
  defers the resolve for fight kinds in animate mode), `components/combat/encounter/InkCurtain.tsx`
  (starts covered, recedes with an edge), `CombatEncounterPanel.tsx` (the portrait's rise timed to the
  draw), `app/_layout.tsx` (the fight route opens without its own animation when an ink spread led to
  it, through a route param or a one-shot flag the screen reads), a new browser drive script beside
  `scripts/act1-walk-e2e.mjs` that does not set reduced motion or `__AXM_JUICE_INSTANT__`. Not
  touched: `CombatGate.tsx`, the reveal's DANGER lines (D117), arrival lines, the labyrinth.
- Consumers: the exploration screen, the fight screen; `verify:visual` keeps its reduced-motion end
  states.
- Tests: as the matrix, A6-A9 rows.
- Verify: `npm run verify -w axiomancer-mobile`; the new drive; `npm run e2e:act1-walk -w
  axiomancer-mobile`; `npm run verify:visual -w axiomancer-mobile` on the reveal.

## Commit body template

```
<feat>: <what the player now sees or hears> — phase CX1<a|b>

- <one line per acceptance closed>

Closes #<issue>
```

## DoD

A1-A9 ticked; T hears and sees both on the next preview APK (the Nov 9 mid-MVP check plays that build).

## Follow-ups (not in this phase)

- **A combat track.** T supplies the file; one row adds it to the track table and decides restart vs
  carry-on per fight.
- **A hazard track**, the same way, if T wants one.
- **The labyrinth's entry treatment** (no token to bleed from), if call 4 is answered "ink from the
  centre".
- **A critique-drive pass on `/settings`** (CRITIQUE pending, LOW): no unattended pass sees the music
  rows; ST1a's tab is the natural place to add it.
