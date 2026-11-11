# 171 — The travel screen: a picture, a question, MOVE or STAY

> A travel node opens one quiet screen: the place you would go fills the top, then the question ("Move to The Charcoal Wood?"), one line of scene under it, and two brass buttons, MOVE and STAY. Nothing else is written on it: no tag, no purse, no cost.

## Why

### Sources

- **T's ballot verdict, 2026-11-10** (`plan/card-ledger/screens.md`, "Verdict", verbatim): "S-01 Travel: KEEP S-01b (Scene and cost) | note: Only text is the "Move" and "Stay", Move to the Cave Face? and the flavor text underneath"
- **The settled shot:** `plan/card-ledger/screens/S-01-settled.webp` (lands with PR #1584), read as: "S-01b. The only words are the question ("Move to The Cave Face?"), the scene line under it, and two plain buttons, MOVE and STAY. No eyebrow, no purse, no cost line, no YES/NO. Both cases drawn." It draws two cases side by side: the chapter exit (the bridge into the Charcoal Wood) and the cave shortcut. The winning look is `screens/S-01b.webp`; today's screen is `screens/S-01a.webp`.
- **T's note overrides the ballot brief's "say what moving costs":** the settled screen has no cost line, so this spec adds no cost field.
- **The ledger's "Open for the plot" (S-01):** "The bridge charges nothing; a quest gate (`bw-b1`) locks it. ... The cave shortcut (`bw-h6` to `bw-c0`) is free and open both ways. Every cost line is new copy; the screen has no cost field today."
- **The deadline plan:** the Nov 30 Chapter 1 release needs all eight event screens in their full treatment, travel among them (`plan/deadlines.md`). T's act "Find two travel images" (the bridge, the cave mouth) is already queued.

### What exists today (read 2026-11-10, at origin/main 2a77e8c8a)

- `axiomancer-mobile/app/travel/index.tsx` (phase NK1d) renders a 320-high art box (`EventArt` with the VM's `artSlug`, the procedural `PlaceholderIllustration`: a head and a box), a gold-boxed eyebrow THE WAY ON over it, then the node's prompt, then the question, then YES · MOVE and NO · STAY on the vellum button (look place `T-02`, `PLACE_PIECES['T-02']` = `action-button-vellum`, worn through `KitPressable`). The eyebrow is look place `T-01`.
- `axiomancer-mobile/state/presenters/travel.engine.ts`: `selectTravelVM` builds `TravelVM` (`eyebrow`, `artSlug`, `prompt`, `destinationLabel`, `question`, `open`, `yesLabel`, `noLabel`); `travelDestinationLabel` names another map by its region and a same-map node by its drawn label. `selectHasActiveTravel` gates the route.
- `axiomancer-mobile/state/presenters/travel.copy.ts` (`TRAVEL_COPY`): `eyebrow`, `question(destination)`, `yes` ('YES · MOVE'), `no` ('NO · STAY'), `shut` ('The way is shut.'), `leave` ('STAY'), `unnamedPlace`, `crossedToast`.
- **A shut way:** while a payload's `opensAfter` node is unspent (`isTravelOpen`, `World/MapEvents/handlers.ts:236`), the question is replaced by "The way is shut." in bone, and only STAY is offered. No live travel node carries `opensAfter` today; only `Game/fixtures/travel-passage.fixture.ts` (`ward`) does.
- **The bridge's lock is not on this screen.** The quest gate is a held road (`breakwater-chapter.ts`, `pastBridge: { from: 'bw-b1', to: 'bw-b2' }`): the player cannot reach the far bank `bw-b2` until the chain's last step is turned in at `bw-b1`, and the map shows that refusal (QL1, MQ1). Once on `bw-b2` the trip is always open.
- **The travel nodes and their lines** (`World/MapEvents/content.ts`, `TRAVEL`): `bw-b2` to the Charcoal Wood, "The bridge has a toll-house and no keeper. Across it, the road runs into a wood full of smoke."; `bw-h6` to `bw-c0`, "[content] The sea cave runs under the cliff, down to a cove."; `bw-c0` to `bw-h6`, "[content] The cave runs back up toward the harbour." Outside the Breakwater: `cw-20` (the stair cave, to the Beacon Crags) and `bc-17` (the glacier shrine, to the Lantern Deep). Drawn labels (`state/exploration-maps/breakwater.layout.ts`): The Far Bank, The Sea Cave Mouth, The Cave Face.
- `selectEventArtSlug` (`state/presenters/event-assets.ts`) gives a travel node its own `art` slug when it names a drawn one, else `'interaction-generic'`. No travel node names one.
- `components/experience/BrassButton.tsx` wears the brass action plate (idle, selected, disabled), and is used by the village hub, the paid rest and the Shop (spec 168). `assets/images/keepers/index.ts` is the model for an image table T swaps in one place (with `provenance.json`).
- The Charcoal Wood arena `assets/images/combat/arena-charcoal-wood-sacred-grove.webp` is the bridge's stand-in in the settled shot. No image in the app stands in for the cave.
- Tests: `app/__tests__/travel.screen.test.tsx`, `state/e2e/travel-door.engine.test.ts`. The `verify:visual` baseline `screenshots/baseline/travel.png` is shot from fixture `wanderer-bw-door-arrive` (the far bank). No fixture stands on the cave mouth.

## Design

- **The picture carries the top.** The destination's picture fills the screen's width and its top half or more, fading into the dark ground behind the words (settled shot). It comes from one table keyed by travel node id, so T swaps an image in one place. A node with no image shows the dark ground alone, with no placeholder figure [T to confirm #2].
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
- The two images are T's (D88). The plot names them; it generates none.

### Out of scope

- The images themselves (T's act "Find two travel images"); TV1b wires them in when T supplies them.
- The Charcoal Wood's and Beacon Crags' travel nodes (`cw-20`, `bc-17`) get no picture here; they use the dark ground until a chapter plot names theirs.
- Transitions and animation into and out of the screen: the verdict asks for none.
- The scene lines' final words (T's Narrator voice).

## Acceptance

- **A1** A travel node's screen shows, top to bottom: the destination picture from the node's entry in the travel scene table (or the dark ground when it has none), the question "Move to {destination}?" in the title type, the node's scene line in the narration type, and MOVE above STAY on the brass action plate. It shows no eyebrow, no purse, no cost line and no other words (S-01b with T's note).
- **A2** MOVE takes the trip and STAY leaves the player on the node, exactly as YES and NO did (`takeTravel`, `closeTravel`); the hermetic travel e2e still passes with the buttons renamed.
- **A3** A shut way (`opensAfter` unspent) shows the shut line in the question's place and MOVE on the disabled brass plate above STAY; pressing MOVE does nothing and the shut line stays on screen [T to confirm #1].
- **A4** One table keyed by travel node id (`bw-b2`, `bw-h6`, `bw-c0`) supplies every travel picture, with a `provenance.json` beside it; the bridge's entry is the Charcoal Wood arena stand-in. A test pins that every Breakwater travel node either has an entry or is listed as dark-ground, and that nothing resolves into `Potential Assets/`.
- **A5** `verify:visual` holds two travel baselines, the far bank (fixture `wanderer-bw-door-arrive`) and the cave mouth (a new fixture on `bw-h6`), each compared by eye against its half of the settled shot.
- **A6** T's bridge and cave-mouth images replace the stand-in and the dark ground in the scene table, with provenance, and both travel baselines are re-approved.

## Open questions

- [T to confirm #1] A shut way: the shut line in the question's place, and MOVE shown greyed (disabled) above STAY. Or: STAY alone, MOVE hidden, as today.
- [T to confirm #2] A travel node with no picture yet (the cave until your image lands): the plain dark ground. Or: a stand-in from the Breakwater's coast arenas until then.
- [T to confirm #3] The way back from the cave face (`bw-c0`) shows the same cave picture as the way in. Or: its own picture (the ballot's image row 3, the cove seen out of the cave mouth), a third image for you to find.

## Chunks

Measure: 6 open · 0 closed · next A7

- [ ] **171.1** The travel screen redrawn: the picture, the question, MOVE and STAY · M · closes A1, A2, A3, A4, A5 · needs — · alias: TV1a
- [ ] **171.2** T's two travel images in the scene table · S · closes A6 · needs 171.1 · alias: TV1b

171.1 adds the travel scene table (`axiomancer-mobile/assets/images/travel/`, keyed by node id, the bridge stand-in copied from the combat arenas with provenance), reshapes `TravelVM` (drops `eyebrow`, `yesLabel`, `noLabel` for `moveLabel`, `stayLabel` and a scene image source), rewrites `TRAVEL_COPY` (MOVE, STAY; the eyebrow gone), redraws `app/travel/index.tsx` on `BrassButton`, retires look places `T-01` and `T-02` from `components/experience/looks.ts` (or points `T-02` at the brass plate), adds a state fixture on `bw-h6`, updates `travel.screen.test.tsx` and the e2e, and approves both baselines. 171.2 waits on T's act "Find two travel images" (Held until T supplies them); it only swaps the table's entries and re-approves the baselines.
