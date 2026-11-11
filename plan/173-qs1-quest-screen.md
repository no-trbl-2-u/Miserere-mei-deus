# 173 — The quest as one card

> The quest screen stops being a column of eyebrows, a postage-stamp portrait and a vellum note over the ferryman engraving. Each quest node shows one tall card in the game's card frame: the step's name on top, the giver's figure as its art, the ask under it and the pay (+40 XP and the item, with its icon) at its foot. Under the card come the giver's name, one spoken line and four beads joined by a line that show where the chain stands. Brass buttons below. The same card carries all four moments: the offer, the work in progress, the turn-in with its reward, and the giver turning the player away with the reason.

## Why

### Sources

- **T, 2026-11-07** (`plan/deadlines.md`, the quest screen Item): "ET1d settled the giver scene, but the screen itself was never reworked."
- **T's ballot verdict, 2026-11-10** (`plan/card-ledger/screens.md`, "Verdict", verbatim): "S-03 Quest: KEEP S-03g (The quest card) | note: Get rid of "A Quest" and Step 4 of 4"
- **The settled shot:** `plan/card-ledger/screens/S-03-settled.webp` (S-03g with the "A QUEST" eyebrow and the "STEP 4 OF 4" count removed; the offer state, the gate warden, step 4). It lands with PR #1584 (the screens ballot). The winning look is `screens/S-03g.webp`; today's screen, redrawn from the code, is `screens/S-03a.webp`.
- **The ledger's "Open for the plot", S-03:** each step pays +40 XP and an item (Ruby Signet; Siphoning Blade and the Keep key; Mirror Brooch; Scavenger's Coat). Today's offer does not show the pay; showing it before ACCEPT is a presentation change. In progress and turned away offer only LEAVE.
- **The ledger's stand-in table:** fishermen's elder TOR-0702 Prophet (`portraits/Prophet.jpg`), lighthouse keeper TOR-0424 Hermit (`portraits/Hermit A.png`), gate warden TOR-0405 Guard A (`portraits/Guard A.jpg`), bridge-keeper TOR-0843 Sword Master A (`portraits/Sword Master A.png`), all from `Potential Assets/sorted-entity-library-base`. The four givers' figures are T's own to supply (D88).

### What exists today (read 2026-11-10, at origin/main 2a77e8c8a)

- `axiomancer-mobile/app/quest/index.tsx` (phase QL1c) renders a scrolling column over `ScreenBg art="event"` (the ferryman engraving): the `QUEST_EYEBROW` "A QUEST", the `vm.eyebrow` title "STEP n OF N" (`questStepEyebrow`), `QuestGiverScene`, the giver's line, a `StepBlock` per stage on the Q-01 vellum panel (`PLACE_PIECES['Q-01']`, `KitSurface`) headed `QUEST_OFFER_HEAD` / `QUEST_TURN_IN_HEAD` / `QUEST_WAITING_HEAD`, a `PAID` panel with chips after a turn-in, the refusal line on `locked`, and plain bordered ACCEPT / TURN IN / LEAVE buttons (`styles.bigButton`). A `card-pick` reward opens `CombatRewardsOverlay` over it.
- `axiomancer-mobile/components/quest/QuestGiverScene.tsx` (phase ET1d, #1206): `QuestGiverScene` draws a 72-point portrait beside the giver's name and dims it to 0.35 opacity when `turnedAway`; `RelicRise` lifts the turned-in step's first item into view (700 ms, instant under reduced motion); `giverPortraitSource(slug)` resolves the slug against the player portrait gallery (`PLAYER_PORTRAITS`), falling back to its first entry. Pinned by `state/e2e/quest-giver.screen.test.tsx`.
- `axiomancer-mobile/state/presenters/quest.engine.ts`: `selectQuestVM` gives `stage` (`offer` | `turn-in` | `waiting` | `locked`, the engine's `questNodeStage`), `giver`, `giverLine`, `lockedLine`, `eyebrow`, `behind` and `ahead` (`QuestStepVM`: name, objectives with progress, status), `canAccept`, `canTurnIn`, `paid` (the last turn-in's ledger, or an on-arrival step's) and `cardOffers`. It carries no pay for the step it shows, and no per-step state for the chain.
- `axiomancer-mobile/state/presenters/quest.copy.ts` holds the eyebrow, the three heads, the labels and `questXpLine` / `questShillingsLine`.
- `axiomancer-mechanics/src/World/breakwater-chapter.questline.ts`: one questline, four steps, `STEP_XP = 40`; step rewards are the Ruby Signet (1), the Keep key and the Blood Price weapon (2, settled on arrival), the Mirror Brooch (3) and the Defender armor (4, turned in at `bw-b1`). Every name and ask is `[content]`.
- `axiomancer-mechanics/src/World/MapEvents/content.ts` `QUEST_NODES`: the four nodes `bw-c2`, `bw-l5`, `bw-k1`, `bw-b1` (nodes 2 to 5), each with `description` (the spoken line), `lockedLine` (the refusal) and `giver` (`name`, `portrait` slug: `biwa-houshi`, `gignos-male`, `paladin-cursed`, `dwarf-lordess`, player-gallery stand-ins). All `[content]`.
- `axiomancer-mobile/components/experience/BrassButton.tsx`: the brass action plate (idle, selected, disabled), built for the village (spec 168).
- `axiomancer-mobile/assets/images/keepers/index.ts`: the village's role-keyed portrait table with `provenance.json`, the model for a figure table.
- `axiomancer-mobile/components/inventory/ItemCard.tsx` `ItemGlyph`: an item's icon by engine id (T's sprite, else the glyph table, else the category glyph).
- No visual baseline exists for `/quest` (`axiomancer-mobile/screenshots/baseline/`). The fixture `apprentice-staged-quest` (`axiomancer-mechanics/src/Game/fixtures/state-fixture.registry.ts`) stages a test questline's first node, not the live chain.

## Design

Built on ET1d, not redone: the giver's figure, its dimming when the giver turns the player away, and the relic rising on a turn-in all stay; they move into the card.

### The card (the offer, as settled)

- **One tall card** centred on a dark ground (not the ferryman engraving), drawn in the frame of the one card face (D91): the gold border and rounded corners, the name band on top, the art edge to edge under it, the text under the art. It is not a playable card, so it carries no FREE pill and no die line.
- **Top:** the step's name (today `[content] Chapter 1: the sea keep`), one line.
- **Art:** the giver's full figure, from the giver figure table.
- **Under the art:** the ask (the step's objective line), and its counter when the objective counts more than one (`questCounterText`, as today).
- **Foot:** the pay, in one row: `+40 XP` in gold, then each item with its icon (`ItemGlyph`) and its name. Shillings, when a step pays them, read `+N shillings` beside the XP. Step 2's three things wrap to a second row.
- **Under the card:** the giver's name, large; the giver's spoken line (the node's `description`); then four beads joined by a line: a finished step's bead is gold and filled, the shown step's bead is larger with a gold ring, a step ahead is dim. The beads carry an accessibility label ("Step 4 of 4") but no visible count.
- **Buttons:** ACCEPT and LEAVE side by side on the brass plate (`BrassButton`).
- **Gone:** the "A QUEST" eyebrow, the "STEP n OF N" title, the stage heads (THE NEXT WORK, THE WORK IS DONE, YOUR WORK, SO FAR), the vellum `StepBlock`, the 72-point portrait row.

### The other three states, from the same card

| State | Stage | The card shows | Under the card | Buttons |
|---|---|---|---|---|
| Offer (settled shot) | `offer`, step unaccepted | the step this node offers, its pay | name, spoken line, beads (this step current) | ACCEPT, LEAVE |
| In progress | `waiting`, or `offer` with the step already accepted | the step being worked: the same card, the ask with its counter | name, spoken line, beads (the worked step current) | LEAVE only, full width |
| Turn in with reward | `turn-in` | the finished step: the ask marked done in gold (the counter, or a gold tick when it has none) and the pay at the foot lit | name, spoken line, beads (the finished step current) | TURN IN, LEAVE |
| Turned away | `locked` | the step this node would offer, with its pay; the art is the giver's figure dimmed (ET1d's `turnedAway`) | name, then the refusal reason in the spoken line's place, kept visible (owner UI doctrine); beads | LEAVE only, full width |

- **Turning in.** TURN IN pays as today (`turnInQuestStep`). The paid item rises off the card's foot (`RelicRise`, reduced motion lands it at once), then the card turns to the next step's offer on the same screen, as the engine already resolves it (`stage` becomes `offer`, `paid` set). What the turn-in paid stays on screen as one line above the new card until LEAVE: `+40 XP · Ruby Signet` [T to confirm #1]. An on-arrival step (step 2, the lighthouse) shows the same line on the next node's offer, from `paid` as today.
- **The chain's end.** At the bridge (`bw-b1`, node 5) the step turned in is step 4 and nothing follows: after TURN IN the card stays on step 4 with its pay marked paid, all four beads gold, and LEAVE only.
- **A step that pays a card pick** still opens the spoils tiles over the screen (`CombatRewardsOverlay`), unchanged. No Breakwater step pays one.
- **Nothing tells offer from in progress but the buttons and the giver's line** (no head on the card, per T's note) [T to confirm #2].
- **It fits a phone without scrolling** at 390x844: the card takes what the giver's name, line, beads and buttons leave. A long ask wraps inside the card; the screen scrolls only past that.

### The giver figure table

- One table keyed by giver id supplies every quest giver's figure: `fishermen-elder`, `lighthouse-keeper`, `gate-warden`, `bridge-keeper` (`axiomancer-mobile/assets/images/givers/index.ts`, beside the keepers' table). T swaps a figure in one place (D88).
- The four nodes' `giver.portrait` in `QUEST_NODES` name these ids instead of player-gallery slugs. An unknown id falls back to a neutral stand-in, as `giverPortraitSource` does today.
- The stand-ins are the ballot's: Prophet (elder), Hermit A (lighthouse keeper; the same figure as the village host's stand-in) [T to confirm #3], Guard A (gate warden), Sword Master A (bridge-keeper). Each is copied out of `Potential Assets/sorted-entity-library-base/portraits`, resized and re-encoded, and recorded in `provenance.json` (AGENTS.md rule 9, D96). The card's art well is dark, so the black grounds can stay.

### Decisions made upfront (do not ask)

- S-03g as voted, with T's note: no "A QUEST", no "STEP n OF N". The settled shot is the reference picture.
- The rules stay: the stages, what each step asks and pays, when it pays (turn-in or on arrival), the gates the steps open. Only the presentation changes. Showing the pay before ACCEPT is presentation (the ledger, "Open for the plot").
- In progress and turned away offer only LEAVE, as today.
- Every name, ask, spoken line, refusal and item name stays the game's `[content]` placeholder until T writes them (BW1d, D88). The screen adds no new copy except the button labels it already has.
- The four givers' figures are T's; the stand-ins hold the places.
- Buttons wear the brass plate (`BrassButton`), the one button (T, 2026-11-09).

### Out of scope

- The quest chain's lines and item names (BW1d, T's).
- The givers' own figures (T's art, D88).
- The map's quest marks and the quest tracker.
- Any rule of the questline (`World/questline.ts`, `breakwater-chapter.questline.ts`).

## Acceptance

- **A1** The quest presenter gives, for the step the card shows, its pay (XP, shillings, and each item's id, name and category) and the chain's beads (one per step: done, current or ahead), and no longer gives the "STEP n OF N" eyebrow. The engine is read, never changed: the pay is the step's `rewards`, the bead states are `questStepState`.
- **A2** One table keyed by giver id supplies the four givers' figures, with the ballot's stand-ins copied out and recorded in `provenance.json`; the four quest nodes name those ids; an unknown id falls back to a stand-in.
- **A3** The offer shows one tall card in the card frame (the step's name, the giver's figure as its art, the ask, the pay with item icons at its foot), then the giver's name, the spoken line, the four beads and ACCEPT and LEAVE on the brass plate. No "A QUEST", no "STEP n OF N", no stage head. A `verify:visual` route shot of the gate warden's offer at the keep gate matches the settled shot's layout.
- **A4** In progress (`waiting`, or an offer already accepted) shows the same card for the step being worked, with its counter, and LEAVE only.
- **A5** Turn in shows the finished step's card with the ask marked done and the pay lit, with TURN IN and LEAVE. TURN IN pays as today; the item rises off the card's foot (instant under reduced motion), a one-line ledger of what was paid stays above the card, and the card turns to the next step's offer. At the bridge, the last step's card stays, marked paid, with LEAVE only.
- **A6** Turned away (`locked`) shows the card of the step this node would offer, with its pay and the giver's figure dimmed, and the refusal reason in the spoken line's place, with LEAVE only.

## Open questions

1. [T to confirm #1] After a turn-in, what the step paid stays on screen as one line above the next step's card (`+40 XP · Ruby Signet`) until LEAVE. Default: yes, one line. Or: no line, only the item rising off the card.
2. [T to confirm #2] The card carries no head in any state, so the offer and the work in progress differ only by their buttons and the giver's spoken line. Default: no head, per the note on the ballot. Or: a small gold mark on the card's name band while the step is under way.
3. [T to confirm #3] The lighthouse keeper's stand-in is the Hermit, the same figure the village host stands in with. Default: keep it, as the ballot drew it. Or: another figure from the library for one of them.

## Chunks

Measure: 6 open · 0 closed · next A7

- [ ] **173.1** The quest presenter carries the pay and the beads, and the givers get a figure table · M · closes A1, A2 · needs — · alias: QS1a
  - `selectQuestVM` (`state/presenters/quest.engine.ts`) gains the shown step's pay (from the questline step's `rewards`, the way `arrivalPaid` already sums them; items with id, name and category for `ItemGlyph`) and `beads` (from `questStepState` per step; the current bead is the step the card shows: `ahead` on offer and locked, `behind` on waiting and turn-in, `ahead` again after a turn-in that has a next step, and step 4 at the chain's end). `eyebrow` and `questStepEyebrow` go once the screen stops reading them (in 173.2), or stay as the beads' accessibility label.
  - `assets/images/givers/index.ts` (id-keyed table, typed ids) with the four stand-ins and `provenance.json`; `QUEST_NODES` in `axiomancer-mechanics/src/World/MapEvents/content.ts` names the ids; `giverPortraitSource` reads the new table with a fallback.
  - Tests: presenter cases for each stage on the live chain (pay on offer at `bw-k1`, three items on step 2, beads at nodes 2 to 5, the chain's end at `bw-b1`); the table resolves all four ids and falls back on an unknown one.
  - Measure: the presenter tests pass; `npm test` in both packages green.
- [ ] **173.2** The quest card: the offer and the work in progress · M · closes A3, A4 · needs 173.1 · alias: QS1b
  - A `QuestCard` component (`components/quest/`) in the D91 frame (border, name band, edge-to-edge art, text, pay foot) and a `QuestBeads` row; `app/quest/index.tsx` drops the eyebrow, the title, the heads, `StepBlock` and the portrait row (`QuestGiverScene` folds into the card's art; keep its testIDs `quest-giver`, `quest-giver-portrait`, `quest-giver-name`), moves to a dark ground, and wears `BrassButton` for ACCEPT and LEAVE.
  - In progress: the same card, LEAVE only. An offer already accepted reads the same way.
  - A `quest` route in `scripts/smoke-screens.mjs` `ROUTES`, on a fixture that stands at the keep gate (`bw-k1`) with step 3 turned in and step 4 not yet accepted (a new entry in `state-fixture.registry.ts` if none fits), and its baseline approved.
  - Hermetic e2e under `state/e2e/` (extend `quest.screen.test.tsx` / `quest-giver.screen.test.tsx`): no "A QUEST" or "STEP" text; the pay and its item show before ACCEPT; ACCEPT then LEAVE only; waiting shows LEAVE only.
  - Measure: the `quest` route shot in the PR beside `plan/card-ledger/screens/S-03-settled.webp`, the same layout; the e2e passes.
- [ ] **173.3** The quest card: the turn-in with its reward, and the giver turning the player away · M · closes A5, A6 · needs 173.2 · alias: QS1c
  - Turn in: the ask marked done and the pay lit; TURN IN on the brass plate; `RelicRise` lifts off the card's foot; the one-line paid ledger above the next offer's card (or what #1 rules); at `bw-b1` the last card stays marked paid, beads all gold, LEAVE only. The on-arrival step's ledger on the lighthouse offer, as today from `paid`.
  - Turned away: the card with the giver's figure dimmed and the refusal reason in the spoken line's place (`quest-locked-line` kept), LEAVE only.
  - Hermetic e2e: a turn-in at `bw-c2` (the Ruby Signet rises, the ledger line shows, the next offer follows), the chain's end at `bw-b1`, and a turned-away arrival at `bw-l5` that names its reason. Each state's shot (turn in, turned away) in the PR, beside S-03f and S-03i for the states the settled shot does not draw.
  - Measure: the e2e passes; the two state shots in the PR.
