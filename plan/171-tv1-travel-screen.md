# 171 — The travel screen: a picture, a question, MOVE or STAY

> A travel node opens one quiet screen: the place you would go fills the top, then the question ("Move to The Charcoal Wood?"), one line of scene under it, and two brass buttons, MOVE and STAY. Nothing else is written on it: no tag, no purse, no cost.

## Why

### Sources

- **T's ballot verdict, 2026-11-10** (`plan/card-ledger/screens.md`, "Verdict", verbatim): "S-01 Travel: KEEP S-01b (Scene and cost) | note: Only text is the "Move" and "Stay", Move to the Cave Face? and the flavor text underneath"
- **The settled shot:** `plan/card-ledger/screens/S-01-settled.webp` (lands with PR #1584), read as: "S-01b. The only words are the question ("Move to The Cave Face?"), the scene line under it, and two plain buttons, MOVE and STAY. No eyebrow, no purse, no cost line, no YES/NO. Both cases drawn." It draws two cases side by side: the chapter exit (the bridge into the Charcoal Wood) and the cave shortcut. The winning look is `screens/S-01b.webp`; today's screen is `screens/S-01a.webp`.
- **T's note overrides the ballot brief's "say what moving costs":** the settled screen has no cost line, so this spec adds no cost field.
- **The ledger's "Open for the plot" (S-01):** "The bridge charges nothing; a quest gate (`bw-b1`) locks it. ... The cave shortcut (`bw-h6` to `bw-c0`) is free and open both ways. Every cost line is new copy; the screen has no cost field today."
- **The deadline plan:** the Nov 30 Chapter 1 release needs all eight event screens in their full treatment, travel among them (`plan/deadlines.md`). T's act "Find two travel images" (the bridge, the cave mouth) is already queued; T's answer to calls 2 and 3 narrows it to the bridge alone (renamed "Find the bridge travel image").
- **T's answer to calls 2 and 3, 2026-11-11** (PR #1585, verbatim): "for 2 and 3, the image should just be the map with the cave as the focal point, wherever they're entering, use that photo. Zoom in a bit though, of course"

### What exists today (read 2026-11-10, at origin/main 2a77e8c8a)

- `axiomancer-mobile/app/travel/index.tsx` (phase NK1d) renders a 320-high art box (`EventArt` with the VM's `artSlug`, the procedural `PlaceholderIllustration`: a head and a box), a gold-boxed eyebrow THE WAY ON over it, then the node's prompt, then the question, then YES · MOVE and NO · STAY on the vellum button (look place `T-02`, `PLACE_PIECES['T-02']` = `action-button-vellum`, worn through `KitPressable`). The eyebrow is look place `T-01`.
- `axiomancer-mobile/state/presenters/travel.engine.ts`: `selectTravelVM` builds `TravelVM` (`eyebrow`, `artSlug`, `prompt`, `destinationLabel`, `question`, `open`, `yesLabel`, `noLabel`); `travelDestinationLabel` names another map by its region and a same-map node by its drawn label. `selectHasActiveTravel` gates the route.
- `axiomancer-mobile/state/presenters/travel.copy.ts` (`TRAVEL_COPY`): `eyebrow`, `question(destination)`, `yes` ('YES · MOVE'), `no` ('NO · STAY'), `shut` ('The way is shut.'), `leave` ('STAY'), `unnamedPlace`, `crossedToast`.
- **A shut way:** while a payload's `opensAfter` node is unspent (`isTravelOpen`, `World/MapEvents/handlers.ts:236`), the question is replaced by "The way is shut." in bone, and only STAY is offered. No live travel node carries `opensAfter` today; only `Game/fixtures/travel-passage.fixture.ts` (`ward`) does.
- **The bridge's lock is not on this screen.** The quest gate is a held road (`breakwater-chapter.ts`, `pastBridge: { from: 'bw-b1', to: 'bw-b2' }`): the player cannot reach the far bank `bw-b2` until the chain's last step is turned in at `bw-b1`, and the map shows that refusal (QL1, MQ1). Once on `bw-b2` the trip is always open.
- **The travel nodes and their lines** (`World/MapEvents/content.ts`, `TRAVEL`): `bw-b2` to the Charcoal Wood, "The bridge has a toll-house and no keeper. Across it, the road runs into a wood full of smoke."; `bw-h6` to `bw-c0`, "[content] The sea cave runs under the cliff, down to a cove."; `bw-c0` to `bw-h6`, "[content] The cave runs back up toward the harbour." Outside the Breakwater: `cw-20` (the stair cave, to the Beacon Crags) and `bc-17` (the glacier shrine, to the Lantern Deep). Drawn labels (`state/exploration-maps/breakwater.layout.ts`): The Far Bank, The Sea Cave Mouth, The Cave Face.
- `selectEventArtSlug` (`state/presenters/event-assets.ts`) gives a travel node its own `art` slug when it names a drawn one, else `'interaction-generic'`. No travel node names one.
- `components/experience/BrassButton.tsx` wears the brass action plate (idle, selected, disabled), and is used by the village hub, the paid rest and the Shop (spec 168). `assets/images/keepers/index.ts` is the model for an image table T swaps in one place (with `provenance.json`).
- The Charcoal Wood arena `assets/images/combat/arena-charcoal-wood-sacred-grove.webp` is the bridge's stand-in in the settled shot. The Breakwater's map is the coast plate `assets/images/maps/act1-coast.webp` (`ACT1_PLATES.coast`, provenance in that directory's `provenance.json`); its landmarks (`act1-landmarks.json`) put `sea-cave-mouth` (`bw-h6`) at x 0.459, y 0.303 and `cave-face` (`bw-c0`) at x 0.332, y 0.752.
- Tests: `app/__tests__/travel.screen.test.tsx`, `state/e2e/travel-door.engine.test.ts`. The `verify:visual` baseline `screenshots/baseline/travel.png` is shot from fixture `wanderer-bw-door-arrive` (the far bank). No fixture stands on the cave mouth.

## Design

- **The picture carries the top.** The destination's picture fills the screen's width and its top half or more, fading into the dark ground behind the words (settled shot). It comes from one table keyed by travel node id, so T swaps an image in one place. An entry is either a whole image (the bridge) or a crop of a map plate: a plate, a landmark to centre on, and a zoom. A node with no entry shows the dark ground alone, with no placeholder figure.
- **The cave is the map, zoomed in.** Confirmed by T (2026-11-11): the cave shortcut's picture, both ways, is the Breakwater's own map plate, zoomed in a little with the cave end the player is entering as the focal point. So `bw-h6` (Move to The Cave Face?) centres on the `cave-face` landmark and `bw-c0` (Move to The Sea Cave Mouth?) centres on the `sea-cave-mouth` landmark: each direction its own crop of the same plate, no new image to find.
- **The words are three, and only three:** the question in the title type ("Move to The Charcoal Wood?", "Move to The Cave Face?"), the node's scene line under it in the narration type, and the two buttons. The question now sits above the scene line, as the settled shot draws it (today the prompt comes first).
- **MOVE and STAY** on the brass action plate (`BrassButton`), full width, stacked, MOVE on top. MOVE takes the trip (`takeTravel`), STAY closes the screen and leaves the player on the node (`closeTravel`), as today.
- **Gone:** the THE WAY ON eyebrow, the YES/NO words, the procedural placeholder figure. No purse, no cost line.
- **A shut way stays loud** (owner UI doctrine: an illegal action is prevented loudly). The settled shot draws no shut case, and T's note allows only the question and the scene line as words. Default: a shut way keeps the picture and the scene line; the shut line "The way is shut." takes the question's place, and MOVE is shown on the disabled brass plate above STAY, so the refusal is seen, not hidden [T to confirm #1].
- **The bridge's quest gate** stays on the map, where it is refused today; this screen never opens on a locked bridge.
- **The scene lines are the nodes' own `prompt`s.** A line the game lacks stays a `[content]` placeholder for T (D88): both cave lines are; the bridge's line is the game's.

### Decisions made upfront (do not ask)

- S-01b with T's note, as the settled shot draws it. The settled shot is the reference picture for both cases.
- No cost line and no cost field. The engine's travel rules (`World/MapEvents/travel.ts`, `handlers.ts`) are untouched; this is presentation only.
- The crossing toast ("You cross into ...") and the inactive "The road is quiet." stay as they are.
- The bridge's stand-in until T's image lands is the Charcoal Wood arena already in the app, as in the settled shot. Nothing resolves a path into `Potential Assets/` (rule 9, D96).
- The bridge image is T's (D88). The plot names it; it generates none. The cave crops use T's map plate already in the app, so they ship in 171.1.
- The cave crop centres on the destination's landmark (the screen shows where you would go, as the bridge does), at 2x the plate's full-width view (the crop is half the plate's width), one constant in the scene table so the zoom is tuned in one place. The crop is drawn at render time from the plate; no cropped copy of the image is written.

### Out of scope

- The bridge image itself (T's act "Find the bridge travel image"); TV1b wires it in when T supplies it.
- The Charcoal Wood's and Beacon Crags' travel nodes (`cw-20`, `bc-17`) get no picture here; they use the dark ground until a chapter plot names theirs.
- Transitions and animation into and out of the screen: the verdict asks for none.
- The scene lines' final words (T's Narrator voice).

## Acceptance

- **A6** T's bridge image replaces the Charcoal Wood stand-in in the scene table, with provenance, and the far-bank travel baseline is re-approved. The cave entries are untouched.

## Open questions

- [T to confirm #1] A shut way: the shut line in the question's place, and MOVE shown greyed (disabled) above STAY. Or: STAY alone, MOVE hidden, as today.
- Confirmed by T (2026-11-11): the cave has no stand-in and no plain dark top; its picture is the Breakwater map, zoomed in on the cave (was call 2).
- Confirmed by T (2026-11-11): each way through the cave shows the map zoomed on the end the player is entering, so the way in and the way back are two crops of the same plate; no third image to find (was call 3).

## Chunks

Measure: 1 open · 5 closed · next A7

- [ ] **171.2** T's bridge image in the travel scene table · S · closes A6 · needs — · alias: TV1b

171.1 adds the travel scene table (`axiomancer-mobile/assets/images/travel/`, keyed by node id: the bridge stand-in copied from the combat arenas with provenance, the two cave entries as crops of `ACT1_PLATES.coast` on their destination landmarks), reshapes `TravelVM` (drops `eyebrow`, `yesLabel`, `noLabel` for `moveLabel`, `stayLabel` and a scene image source), rewrites `TRAVEL_COPY` (MOVE, STAY; the eyebrow gone), redraws `app/travel/index.tsx` on `BrassButton`, retires look places `T-01` and `T-02` from `components/experience/looks.ts` (or points `T-02` at the brass plate), adds a state fixture on `bw-h6`, updates `travel.screen.test.tsx` and the e2e, and approves both baselines. 171.2 waits on T's act "Find the bridge travel image" (Held until T supplies it); it only swaps the bridge's entry and re-approves the far-bank baseline.
