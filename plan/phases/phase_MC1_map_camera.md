# Phase MC1 — The map camera holds still: a smooth pinch, a memory across fights, a gentler recentre, the whole map reachable

> Agent-facing brief, plotted by T (`/plot asap`, 2026-10-31, run unattended on T's word). T played
> the preview APK built from `main` 8f876ec and filed four bugs about the WILDS map: the zoom jumps
> about mid-pinch, the map comes back from a fight zoomed far in, the recentre button zooms far in,
> and the bottom of the map cannot be seen. T ruled that a black ground behind the map beats a map
> that jumps. This plot is the map camera and layout group only; T's other bugs are plotted apart.

## Sources

- T, 2026-10-31, verbatim, from the preview APK (main 8f876ec):
  1. "The zoom is glitchy again. It jumps all over the place while I'm zooming."
  8. "After combat, it goes right to 'center' which is WAY too zoomed in. If possible we should hold
     on to where they were zoomed before the node they enter"
  9. "On that note, the maps 'center' button zooms in way too far. It should just center on to the
     player's icon, but not zoomed in that far (not even close)"
  10. "The Bottom of the map is actually completely cut off"
- T, same day, the ruling (verbatim): "Now regarding the map issue. If I have to choose between
  glitchey but with no background behind the map vs. a black background behind the map, I'm going to
  go 'black background'." Confirmed by T (2026-10-31): stability over edge-clamping. The map may pan
  and zoom past its edges with a black ground behind it; no clamp may make the zoom jump.
- T's screenshot (phone, about 900x2000 px): WILDS tab; header (character, VITAE), region title, a
  QUESTS box, then the map frame. The map's lower part is clipped by the frame; the
  "TRODDEN · OPEN · SEALED" legend and a step count sit over its bottom-left, the recentre button
  bottom-right, and below the frame the hint box "walk the roads from where you stand — choose a
  glowing node, or tap a trodden one to walk back." T scribbled over the legend and the hint box
  (meaning not stated): the default moves both out of the map frame `[T to confirm #1]`. The tab bar is WILDS, SELF, THE LEDGER, SATCHEL, DECK.
- T, 2026-10-28 (the zoom-offset bug, PR #1046): the pinch zoomed "up and to the left" of the
  fingers, and "the screen would always be the map". The 2026-10-31 ruling supersedes the second
  half: black around the map is now allowed.
- D15 (the plate pans and zooms with the nodes); phase PF4 (no map under live combat), whose
  decision "The camera re-fits on return" (`plan/phases/phase_PF4_no_map_under_combat.md:99`) this
  plot amends.

## What exists

Read from `main` at 8f876ec on 2026-10-31. Paths under `axiomancer-mobile/`. The causes below are
read from the code; the device behaviour itself was not reproduced here (no device in this run).

- **The camera** is local state in `components/exploration/MapCanvas.tsx`: shared values `scale`,
  `savedScale`, `tx`, `ty` (`:405-408`), a top-left transform origin (`:815`), the transform applied
  to the canvas `Animated.View` (`:599-605`, `:616-618`). Zoom range `minScaleFor` (the plate
  *covers* the pane, `:61-65`) to `MAX_SCALE = 3` (`:52`).
- **The pinch** (`:523-545`) anchors on its focal point, `t' = f' - k(f - t)`, and clamps both axes
  through `settleAxis` every frame (`:537-538`). **The pan** (`:552-568`) works in deltas and clamps
  through `settleAxis` (`:566-567`). **The web wheel** (`:577-597`) does the same with the cursor.
  `settleAxis` (`:134-138`) holds the plate's edge at the pane's edge.
- **The fit** `computeFocusTransform` (`:141-173`): frames the current node plus every open move,
  at `max(minScaleFor, min(1, fitX, fitY))` (`:166`). It runs on mount and on every change of
  `focusKey` (`:472-498`); **RECENTRE** (`:467-470`, button `:783-793`) runs the same fit.
- **The viewport** is measured once: `setViewport((prev) => prev ?? {...})` (`:431`). The clamp
  bounds read it (`:510-519`).
- **The map unmounts under a fight** (PF4, `966434253`): `app/(tabs)/exploration/index.tsx` gates the
  map on the overlay's mode, so after a fight `MapCanvas` mounts fresh with `scale = 1` and runs the
  fit.
- **The furniture**: `MapOverlays.tsx` draws the gesture line top-left (`:85-94`) and the legend
  plate (keys and step count) bottom-left (`:120-140`), both inside the frame
  (`MapCanvas.tsx:775-779`). The hint is `NodeConfirmPanel`'s empty state below the frame
  (`components/exploration/NodeConfirmPanel.tsx:70`; copy `state/presenters/exploration.engine.ts:613`).
- **Tests**: `components/exploration/__tests__/MapCanvas.test.tsx` drives the pinch and pan with
  RNGH's `fireGestureHandler`, feeding focal points directly, so it cannot see which coordinate space
  the device reports them in. No `plan/lessons.md` entry covers map gestures.

### The causes, bug by bug

1. **The zoom jumps (bug 1; what regressed).** PR #1046 (`22009a7c2`, `a4bebe775`, merged
   2026-10-28) fixed the 2026-10-28 offset bug on the web build and changed the pinch to anchor on
   its focal point. Its commit message and PR body say "The `GestureDetector` moves to an
   untransformed full-pane layer, so the pinch's focal point arrives in screen coordinates", but the
   merged code never did it: the `GestureDetector` still wraps the transformed canvas
   (`MapCanvas.tsx:615-618`, unchanged from `22009a7c2^`). On a device RNGH reports `focalX/Y`
   relative to the view the detector is attached to, so the focal point arrives in the *canvas's*
   scaled, moving coordinates while the anchor formula (`:537-538`) treats it as a pane point; each
   frame's write moves the canvas, which moves the next focal reading, a feedback loop that throws
   the map about. The PR says "Not verified: a real two-finger pinch on a device", and the jest suite
   passes pane points by hand, so nothing caught it. Second cause, same lines: the per-frame
   `settleAxis` clamp breaks the anchor whenever an edge is reached, so near any edge the plate slides
   out from under the fingers. "Again" is the 2026-10-28 report coming back on the device: the web
   fix shipped, the device half did not.
2. **After a fight, zoomed far in (bug 8).** PF4 unmounts the map under combat; on return the shared
   values restart (`:405-408`) and the fit runs (`:472-498`). Nothing remembers the player's camera.
3. **RECENTRE zooms far in (bug 9).** The fit caps the zoom at 1x (`:166`, "never in past 1x"),
   written for the 360x400 x2.6 legacy sheet. The Act 1 sheets are 1000x1000 x2.4
   (`state/exploration-maps/breakwater.layout.ts:27`), a 2400 px canvas, so 1x on a phone shows
   about a seventh of the region's width; the current node and its few open moves fit inside that,
   so the fit lands on the cap every time. It also frames the open moves, not the player's icon.
4. **The bottom is cut off (bug 10).** The viewport is kept from the first layout (`:431`). When the
   pane later shrinks (the QUESTS box, the event badge or the confirm panel growing under it after
   the first layout pass), the camera still believes the pane is taller, so `settleAxis` stops the
   pan short by the difference and the plate's bottom strip can never be dragged into view; the fit
   also centres on a pane that is not there. Likely, not reproduced: MC1c's builder confirms by
   logging the wrapper's layouts on the web build before changing it. The legend plate over the
   frame's bottom-left also hides what is there.

## Outcome

On the phone the map pinches and drags smoothly under the fingers with black behind it at the
edges, comes back from a fight exactly as the player left it, recentres on the player's icon at a
comfortable distance, and every part of the region, its bottom row included, can be brought into
view with nothing drawn over it but the recentre button.

## Acceptance

- **A1 (the pinch reads pane points)** The `GestureDetector` is attached to an untransformed
  full-pane layer, never to the transformed canvas; the pinch anchor and the pan read pane
  coordinates. A test renders `MapCanvas` and asserts the view carrying `map-pinch`/`map-pan` has no
  transform and spans the pane.
- **A2 (no edge clamp in a gesture)** No pinch or wheel update moves the translation for any reason
  but the anchor: `settleAxis` is gone from the pinch, the wheel and the fit, so the point under the
  fingers stays under them to within 1 px at every scale, edges included. A test pinches at a point
  near each edge of the plate and asserts the anchor holds.
- **A3 (black past the edges, with limits)** The pane's ground behind the canvas is the existing
  near-black `deepBg` (`MapCanvas.tsx:613`). Zooming out stops at the scale where the whole plate
  fits the pane (not the cover scale); the pan stops when a plate edge reaches the middle of the
  pane (Accepted at merge (default), #2). The pan limit is applied to the pan's own delta only, never inside a
  pinch. Tests for the floor, the 3x ceiling and the pan limit on each side.
- **A4 (a finger lifted mid-pinch does not jump)** A pinch update with fewer than two pointers moves
  nothing, and the pan's delta is rebased when the pinch ends, so lifting one finger and dragging on
  with the other moves the map by the drag alone. A test.
- **A5 (RECENTRE centres on the player's icon)** RECENTRE puts the current node at the pane's
  centre at the recentre zoom: the pane spans about 40% of the sheet's width `[T to confirm #3]`
  (on the Breakwater, 400 of 1000 sheet units across, about 0.4x on a phone), whatever the open
  moves are. A test on the Breakwater sheet at 360x640.
- **A6 (a first visit opens at the recentre framing)** A map seen for the first time this app
  session opens framed as RECENTRE frames it; the 1x cap and the open-moves fit are retired.
- **A7 (the camera is remembered across a fight)** The camera (zoom and the sheet point at the
  pane's centre) is kept per map outside `MapCanvas`, in memory, and restored when the map mounts
  again, so returning from a fight, a rest, a hazard or any other screen shows the same zoom and
  place as before the node was entered `[T to confirm #4]`. Not saved: a fresh app launch opens as
  A6. A screen test: zoom, pan, enter a fight, close it, the camera matches.
- **A8 (a move pans, never zooms)** When the player's node changes, the zoom is kept; the camera
  pans only if the new current node would sit outside the pane's inner 80%, and then only enough to
  bring it inside. Moves inside the frame do not move the camera. Tests for a move inside and a
  move outside the frame.
- **A9 (the pane is measured on every layout)** The viewport, the pan limit and the framing follow
  every layout change of the map's pane, not only the first. A test that relayouts the wrapper
  shorter and asserts the bounds follow.
- **A10 (the whole region is reachable)** On the web build at 360x800 the Breakwater's bottom-most
  node and the plate's bottom edge can be panned fully into view above the tab bar; a
  `verify:visual` baseline of the WILDS tab panned to the plate's foot shows it.
- **A11 (nothing over the map but RECENTRE)** The legend, the step count and the gesture line leave
  the map frame and sit in one strip directly under it, above the hint, so no furniture covers a
  node `[T to confirm #1]`; the recentre button stays bottom-right inside the frame. A
  `verify:visual` baseline of the WILDS tab.

Measure: at T's Nov 9 mid-MVP check on the preview APK, T pinches near the map's edges and reports
no jump, comes back from a fight at the zoom T left, recentres to a view showing the player's icon
and its neighbours, and drags the Breakwater's bottom row into view; on the web build the
`verify:visual` baselines of A10 and A11 hold. Root `npm test` passes.

## Scope

- **axiomancer-mobile:** `components/exploration/MapCanvas.tsx` (detector layer, gestures, zoom
  floor, framing, RECENTRE, camera memory hook-up, layout tracking), a small camera memory module
  beside it (`components/exploration/mapCameraMemory.ts`, a per-map `Map` in module scope),
  `MapOverlays.tsx` and `app/(tabs)/exploration/index.tsx` (the furniture strip), their tests,
  `verify:visual` baselines for the WILDS tab.
- **Not touched:** the engine, the save, node positions and sheets, the plate art, node marks and
  their counter-scale (`nodeCounterScale`), the legend's and hint's words, the PF4 gate itself (the
  map still unmounts under a fight), the labyrinth.

## Consumers to update

`MapCanvas.test.tsx` (the cover-floor and edge-clamp cases from #1046 are rewritten to the new
floor and pan limit; the 1x-cap fit cases to the recentre framing); `MapOverlays.test.tsx` (the
`RECENTRE_CLEARANCE` and legend-position cases); `ExplorationNode.test.tsx` if it reads
`minScaleFor`; the exploration screen tests from PF4 that pin the fit on return; `verify:visual`
baselines of the WILDS tab; the PF4 brief's "The camera re-fits on return" line gets a pointer to
MC1b; `e2e:map-walk` and `e2e:exploration-roundtrip` test ids if the furniture moves.

## Save / schema contracts

None. The camera memory is in-memory only (A7) and never written to the save.

## Decisions made upfront — DO NOT ASK

1. **Stability over edge-clamping** (Confirmed by T, 2026-10-31): black may show past the plate's
   edges; no gesture is ever clamped in a way that moves the anchor.
2. **The pan limit** (A3): a plate edge may come as far as the middle of the pane, so the plate can
   never be lost entirely and RECENTRE is not the only way back (Accepted at merge (default), #2).
3. **The recentre zoom** (A5): about 40% of the sheet's width across the pane, as a constant beside
   `MAX_SCALE`, the same on every sheet `[T to confirm #3]`. The open moves are not framed: T asked
   for the player's icon.
4. **What "where they were" means** (A7, A8): the zoom and centre point from before the node was
   entered, restored as they were; the camera then pans only if the node the player now stands on
   is off-frame `[T to confirm #4]`. This covers every return to the map, not only fights, since
   every move used to re-fit too.
5. **The memory is per map, in memory, not saved**: a different region opens at the recentre
   framing; so does a fresh launch.
6. **The furniture leaves the frame** (A11) `[T to confirm #1]`: T scribbled over the legend and the
   hint without saying what was meant; the default reads it as "these are in the way". The hint box
   keeps its place and words below the strip.
7. **Each phase needs a new preview APK** to prove on the phone; the loop proves each on the web
   build and in jest, and T's Nov 9 mid-MVP check is the device check. No separate attended phase.
8. **Slot: asap** (T's word): T is playing this map now and the MVP run is on it.

## Tests matrix

- `MapCanvas.test.tsx`: the detector layer has no transform (A1); the anchor holds near each edge
  (A2); the floor, ceiling and pan limit (A3); a one-pointer pinch update and the pan rebase (A4);
  RECENTRE on the Breakwater sheet (A5); first-visit framing (A6); a move inside and outside the
  frame (A8); a relayout (A9).
- `mapCameraMemory` unit tests and an exploration screen test across a fight (A7).
- `verify:visual`: the WILDS tab at rest and panned to the plate's foot (A10, A11).

## Verify gate

`npm run verify -w axiomancer-mobile`, root `npm test`, `verify:visual` on the WILDS tab,
`npm run e2e:map-walk -w axiomancer-mobile` and `npm run e2e:exploration-roundtrip -w axiomancer-mobile`.

## Commit body template

`<what the player now feels or sees on the map, in plain words>. Closes A<n>, ...`

## DoD

A1-A11 ticked; each phase's web check written in its PR; a lesson filed by MC1a on the detector
layer (a gesture's coordinates follow the view it is attached to; a gesture change is not done until
a device or a real pointer stream has moved it).

## Follow-ups (out of scope)

- **A device gesture harness**: driving a real two-finger pinch in CI (Android emulator or a
  Playwright multi-touch script on the web build) so a regression like #1046's cannot pass on jest
  alone. Its own plot if T wants it.
- **The hint's words** (`exploration.engine.ts:613`) and whether the step count belongs in the
  header: copy is T's.
- **The labyrinth's map**, if it shares this camera later.

## Phases

### MC1a — The pinch holds under the fingers; black past the edges · M · closes A1, A2, A3, A4 · requires nothing
Measure: on the web build with a two-pointer pinch near a plate edge (Playwright pointer events or
the wheel), the point under the pointer stays put to within 1 px and black shows past the edge; the
jest anchor-near-edge case passes.
- Scope: an untransformed full-pane gesture layer holding the canvas; `settleAxis` out of pinch,
  wheel and fit; the contain-scale floor; the pan limit on the pan's delta; the one-pointer guard and
  pan rebase; the lesson.
- Tests: A1-A4 in `MapCanvas.test.tsx`; the #1046 clamp cases rewritten.
- Verify: `npm run verify -w axiomancer-mobile`, root `npm test`, `e2e:map-walk`.

### MC1b — The camera remembers; RECENTRE centres on the player · M · closes A5, A6, A7, A8 · requires MC1a
Measure: on the web build, zoom out and pan, enter a fight and leave it: the camera matches; press
RECENTRE: the player's icon is centred with the region about 40% across.
- Scope: the recentre framing constant and RECENTRE on the current node; first-visit framing;
  `mapCameraMemory.ts` and its restore on mount; the move rule (pan into the inner 80%, never zoom);
  the PF4 brief pointer.
- Tests: A5-A8; the PF4 screen test that pinned the fit on return, rewritten.
- Verify: `npm run verify -w axiomancer-mobile`, root `npm test`, `e2e:exploration-roundtrip`.

### MC1c — The map's foot in view, nothing over the map · S · closes A9, A10, A11 · requires MC1a
Measure: on the web build at 360x800 the Breakwater's bottom-most node pans fully into view above
the tab bar, and the legend, step count and gesture line sit in a strip under the frame.
- Scope: the viewport tracks every layout (confirm the stale-layout cause first by logging the
  wrapper's layouts); the furniture strip under the frame (`MapOverlays.tsx`, the exploration
  screen); baselines.
- Tests: A9 relayout case; `MapOverlays.test.tsx` updated; the two `verify:visual` baselines.
- Verify: `npm run verify -w axiomancer-mobile`, root `npm test`, `verify:visual` on the WILDS tab,
  `e2e:map-walk`.
