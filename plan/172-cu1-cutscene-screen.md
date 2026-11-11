# 172 — The cutscene as a teller over a vellum panel

> Every cutscene stops showing the same dim ferryman engraving with one faint line. Its own scene picture fills the top, one narrator (the same figure in every cutscene) stands over the top edge of a vellum panel, and the line sits inside the panel in large dark ink with a small "1 of 2" count. There is no CONTINUE and no bottom SKIP: a tap anywhere moves the story on, the last tap ends it, and SKIP stays at the top right.

## Why

### Sources

- **T's ballot verdict, 2026-11-10** (`plan/card-ledger/screens.md`, "Verdict", verbatim): "S-02 Cutscene: KEEP S-02h (The teller) | note: No continue or bottom skip. Taps continue the story. Text should be inside the vellum scroll thing and the image of the teller should be on top of the vellum card."
- **The settled shot** (the Source picture of this spec): `plan/card-ledger/screens/S-02-settled.webp`, read in the ledger as "S-02h. No CONTINUE and no bottom SKIP: a tap anywhere moves the story on. The line sits inside a vellum panel (the kit's `modal-panel-vellum`), dark ink on vellum; the teller stands over the panel's top edge, in front of it. The top SKIP and the '2 of 2' count stay." The winning look is `screens/S-02h.webp`; today's screen is `screens/S-02a.webp`. The ledger and its shots land with PR #1584 (`plan/screens-ballot`); merge it first.
- **The ledger's "Open for the plot"** (S-02): "The node lines are `[content]` placeholders. ... Every look needs a picture per scene, which the cutscene content does not carry yet."
- **The ledger's "Images to generate"**: rows 6 to 9 (the windmill on the headland, the clifftop chapel, the old watchtower, the high pass; landscape, 1560x1000 at 2x) and, from the verdict's image list, "one picture each for the chapter arrival; the teller figure per scene is T's." T has since made it one figure for every cutscene (below).
- **The deadline act** (`plan/deadlines.md`): "Event kind 8, cutscene: pitch its full treatment (art, transitions, copy, animation, working end to end), settle it and plot it", and the review act "Review the reworked travel, loot cache and cutscene screens", both due 2026-11-30 with Chapter 1.
- **T's answer on this PR, 2026-11-11** (call 2, verbatim): "All cutscenes should have the same narrator for now". One teller, the narrator, tells every cutscene, the five below and every other.
- **The Narrator voice is T's** (D88): the round 5 voice ballot is open (PR #1568), and T writes Chapter 1's lines in BW1d (116.4). This spec writes no copy.

### What exists today (read 2026-11-10, at origin/main 2a77e8c8a)

- `axiomancer-mobile/app/cutscene/index.tsx` (`CutsceneScreen`) plays the pending cutscene's `lines` one at a time: the line fades in (`FADE_IN_MS` 600), a tap anywhere fades it out (`FADE_OUT_MS` 320) and steps on, the last tap calls `actions.dismissEvent()`, and re-entrant taps are ignored while a fade runs (`advancing`). Reduce motion collapses the fades to 0. It draws a centred bare plate: the eyebrow "▶ OMEN", the line in the rules face at 17pt in parchment, and the hint `CUTSCENE_HINT` ("· continue ·" / "· walk on ·", `state/presenters/event.engine.ts`). SKIP is a bordered plate at the top right (44pt box, pinned by `state/e2e/cutscene-skip.S4-world-C17.test.tsx`) that dismisses at once. TestIDs: `cutscene-advance`, `cutscene-plate`, `cutscene-line-<n>`, `cutscene-skip`, `cutscene-inactive`.
- The backdrop is `ScreenBg art="cutscene"`, which `assets/images/screens/index.ts` maps to `maps/charon-crossing.webp` for every cutscene. There is no per-scene picture, no figure and no progress count.
- The engine: `CutscenePayload` (`axiomancer-mechanics/src/World/MapEvents/types.ts`) carries `lines`, `description` and an optional `effect` (`giveQuestStep`). `resolveCutscene` (`World/MapEvents/handlers.ts`) applies the effect at resolve time and returns `{ kind: 'cutscene', lines }`; the resolved event (`types.ts`, the `ResolvedEvent` union) carries the lines only.
- The cutscenes the ballot drew (`World/MapEvents/content.ts`): the run opening is the windmill's arrival (`windmillArrival`, node `bw-w1`, two lines, the second a `[content]` line, and it gives the questline's first step). The three Breakwater cutscene nodes come from `BREAKWATER_CHAPTER_KINDS` (`bw-l2` Clifftop chapel, `bw-d5` Old watchtower, `bw-p3` High pass), each built as one `[content] <place>.` line. The chapter arrival is the Charcoal Wood's (`cwArrival`, `cw-1.cutscene`, two lines). Other cutscenes exist and are out of scope: the later chapters' arrivals (`bc-1`, `ld-1`), Lantern Deep's sealed scenery (`ld-15`, `ld-18`) and the Labyrinth's Sophist lines (`World/Labyrinth/labyrinth.pools.ts`).
- The fixture `wanderer-staged-cutscene` (`Game/fixtures/state-fixture.registry.ts`) stages `FIXTURE_CUTSCENE_EVENT` (two placeholder lines); `verify:visual` shoots it as the `cutscene` route (`axiomancer-mobile/scripts/smoke-screens.mjs`; baseline `screenshots/baseline/cutscene.png`).
- The kit: `KitBackdrop piece="modal-panel-vellum"` (`components/experience/KitBackdrop.tsx`, nine-sliced) is already worn by `DeckOpenCard`, `CombatRewardsOverlay` and `CombatSummaryModal`; the dark inks on vellum are `SPOILS_INK` (`components/combat/encounter/spoils-ink`). Eagle Lake is loaded (`theme/axm.ts`, `TYPE_ROLES.narration`). The brass action plate (`assets/images/experience/brass/`) is the one button (T, 2026-11-09).
- Stand-ins in the repo: the Hermit cut-out (TOR-0424 Hermit, black ground removed) is `assets/images/keepers/host.webp` with its provenance; the dim landscape engravings the ballot used are the combat arenas (`assets/images/combat/arena-breakwater-kuste-bei-mondschein.webp`, `arena-breakwater-mondscheinnacht-ruegen.webp`, `arena-breakwater-northern-sea.webp`, `arena-beacon-crags-riesengebirge.webp`, `arena-charcoal-wood-eldena.webp`).
- No open spec owns the cutscene screen. Its last rework was UK2d (154.4, archived 2026-11-06: the omen as bare text, no panel), which this spec supersedes.

## Design

- **The picture.** The scene's own picture fills the top of the screen (about the top 60%), cropped to cover, and fades into black below it. A cutscene with no scene id, or an id the app does not know, shows today's engraving.
- **The eyebrow.** The chapter's name in small parchment capitals at the top left ("THE BREAKWATER"), as the settled shot shows ([T to confirm #1]).
- **SKIP** stays at the top right, on the brass action plate, with its 44pt box. It ends the scene at once, as today.
- **The vellum panel** sits at the foot, nearly full width (14pt margins), drawn with `KitBackdrop piece="modal-panel-vellum"`. Its height follows the line; it holds about five lines at the default size, and a longer line steps the type down to a 20pt floor.
- **The line** sits inside the panel, centred, in Eagle Lake at about 26pt (line height about 32) in the dark iron-gall ink (`SPOILS_INK.body`). Under it, inside the panel, a small muted "1 of 2" count (the current beat of the scene's beats).
- **The teller** is the narrator, one figure for every cutscene (Confirmed by T (2026-11-11): "All cutscenes should have the same narrator for now"). It stands over the panel's top edge and in front of it: a full-figure cut-out about 300pt tall, centred, its feet overlapping the panel's top border, drawn above the panel. It rides the panel's top edge when the panel grows. Every cutscene draws it, including one with no scene id and one restored from an older save.
- **Tapping.** A tap anywhere but SKIP fades the line out and the next one in (today's fades and timings); the picture, the eyebrow and the teller stay put within a scene. The last tap ends the scene. There is no CONTINUE, no bottom SKIP, no "▶ OMEN" eyebrow and no "· continue ·" hint. Reduce motion snaps, as today.
- **Content carries ids, the app carries the images.** A cutscene's content names a `scene` id (its picture); it names no teller, because one narrator tells every scene. One module in the app, `assets/images/cutscenes/index.ts`, maps scene ids to pictures and holds the one narrator figure, so T swaps an image in one place (a file, a line, and its provenance entry). A later spec that gives a scene its own teller adds a `teller` id then. Nothing in it resolves into `Potential Assets/`.

### The scenes this spec names

| Scene | Content | Scene id | Stand-in picture (until T's) | Image row |
|---|---|---|---|---|
| Run opening | `windmillArrival` (`bw-w1`) | `windmill-headland` | `arena-breakwater-kuste-bei-mondschein` | 6 |
| Clifftop chapel | `bw-l2` | `clifftop-chapel` | `arena-breakwater-mondscheinnacht-ruegen` | 7 |
| Old watchtower | `bw-d5` | `old-watchtower` | `arena-breakwater-northern-sea` | 8 |
| High pass | `bw-p3` | `high-pass` | `arena-beacon-crags-riesengebirge` | 9 |
| Chapter arrival | `cwArrival` (`cw-1`) | `charcoal-wood-arrival` | `arena-charcoal-wood-eldena` | new: the bridge's far end in the pines, smoke under the branches; landscape, 1560x1000 at 2x |

The narrator is one stand-in until T supplies the figure: the Hermit cut-out, copied once to `assets/images/cutscenes/narrator-standin.webp` with a `provenance.json` entry (AGENTS.md rule 9, D96).

### Decisions made upfront (do not ask)

- S-02h as settled, with T's note applied: the settled shot is the reference picture.
- The lines stay as they are: the windmill's first line and the Charcoal Wood's two lines are the game's; every other line stays `[content]` until T writes it (D88; the Narrator ballot, PR #1568, and BW1d).
- Rules do not change: the scene's effect (the windmill gives the questline's first step) still applies when the cutscene resolves, so SKIP loses nothing.
- The new field is optional and additive. A cutscene without it (and any pending cutscene restored from an older save) draws the fallback picture, with the narrator.
- The cutscenes outside the five above keep their content as is and draw the fallback picture, in the new panel, with the narrator over it (Confirmed by T (2026-11-11): "All cutscenes should have the same narrator for now").

### Out of scope

- The pictures and the narrator figure themselves (T's art, D88): stand-ins hold the space until 172.3.
- Every line of copy.
- The later chapters' arrivals, Lantern Deep's sealed scenery and the Labyrinth's Sophist lines beyond the fallback above.
- Transitions into and out of the screen (today's route push and back stay).

## Acceptance

- **A1** `CutscenePayload` and the resolved cutscene event carry an optional `scene` id, and `resolveCutscene` passes it through. The five scenes in the table carry their scene ids; their lines and effects are unchanged. An engine test pins the five ids and that a cutscene without one resolves as today.
- **A2** One app module (`assets/images/cutscenes/index.ts`) maps each scene id to a picture and holds the one narrator figure, with the stand-ins in the table and a provenance entry for the copied narrator. A presenter (`cutsceneView`, beside `composeCutscene` in `state/presenters/event.engine.ts`) turns the pending cutscene into the picture, the narrator figure, the chapter's name, the beats and each beat's "n of m" count. A test asserts every id the five scenes author resolves without the fallback, that an absent or unknown scene id gives the fallback picture, and that every cutscene (the five, one without a scene id, and a Labyrinth Sophist cutscene) gets the same narrator figure.
- **A3** The screen matches the settled shot: the scene picture at the top fading to black, the chapter's name at the top left, SKIP on the brass plate at the top right, the vellum panel at the foot with the line inside it in Eagle Lake in dark ink and the "n of m" count under it, and the narrator standing over the panel's top edge in front of it. There is no CONTINUE, no bottom SKIP, no "▶ OMEN" eyebrow and no hint line (`CUTSCENE_HINT` is retired). A line longer than five lines at the default size steps down to the 20pt floor and stays inside the panel.
- **A4** A tap anywhere but SKIP moves to the next beat with today's fades; the last tap ends the scene; SKIP ends it at once; a tap during a fade is ignored; reduce motion snaps. The screen test (`cutscene-skip.S4-world-C17.test.tsx`, rewritten) pins the taps through a two-beat scene, the count reading "1 of 2" then "2 of 2", SKIP's 44pt box, and that no CONTINUE or hint text renders.
- **A5** `verify:visual` re-shoots the `cutscene` route: the fixture `wanderer-staged-cutscene` stages a two-beat scene carrying the windmill's ids, and the new baseline is shown beside the settled shot in the build's PR.
- **A6** T's five pictures and the narrator figure replace the stand-ins in the one module, each with a provenance entry; the stand-in narrator copy is deleted; the `cutscene` baseline is re-shot.

## Open questions

- [T to confirm #1] The chapter's name at the top left, as the settled shot shows. Default: keep it ("THE BREAKWATER", "THE CHARCOAL WOOD"), from a small title table beside the pictures. Or: drop it.
- Confirmed by T (2026-11-11): one narrator for every cutscene, for now ("All cutscenes should have the same narrator for now"; call 2, not the per-scene default). Content names no teller; the app draws the one narrator figure.
- Confirmed by T (2026-11-11): the other cutscenes (later chapters' arrivals, Lantern Deep's sealed scenery, the Labyrinth's Sophist lines) show today's engraving in the new panel, and the narrator tells them too (call 3, read from "All cutscenes").
- [T to confirm #4] Supplying the art (five pictures, the narrator figure) stays undated under `## Unscheduled` in the deadline plan. Default: undated. Or: an act of yours due Nov 30 with Chapter 1.

## Chunks

Measure: 6 open · 0 closed · next A7

- [ ] **172.1** Cutscene content names its picture, one narrator tells them all · M · closes A1, A2 · needs — · alias: CU1a
- [ ] **172.2** The cutscene screen: the teller over the vellum panel · M · closes A3, A4, A5 · needs 172.1 · alias: CU1b
- [ ] **172.3** T's cutscene pictures and narrator · S · closes A6 · needs 172.1 · alias: CU1c

172.1 is the contract: the engine field, the five scenes' ids, the image module with stand-ins and the narrator, and the presenter, with no change on screen. 172.2 redraws the screen on that presenter and re-shoots its baseline against the settled shot. 172.3 waits on T's art (Held until T supplies it); it is a table swap, and it can land before or after 172.2.
