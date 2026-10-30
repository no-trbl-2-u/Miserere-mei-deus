# Phase ET1 — The four MVP event kinds, each in its settled treatment

> Agent-facing brief, plotted by T (`/plot`, 2026-10-30, in the Claude Duet event-node
> thread). The Nov 16 MVP needs "a full treatment (art, transitions, copy, animation, working end
> to end) for the four node kinds every Breakwater run hits: encounter, hazard, rest and quest"
> (`plan/deadlines.md`, D112). T was due to pitch, settle and plot one kind per sitting (Nov 4, 5,
> 6 and 12). Claude drafted three directions per kind on one page of looping phone mockups
> (https://claude.ai/artifact/CLhdGJvDuXNrZiXxxC7Ygi, private to T), T picked one per kind the
> same morning, and said "Plot it". This brief builds the four picks, one phase per kind.

## Sources

- T's picks, 2026-10-30, verbatim: "Encounter A, Hazard B, Rest C (same treatment for when the sun
  comes up, just say "X upgraded" instead of VITAE if they pick upgrade), and quest: Giver (for
  now)". Then: "Plot it".
- What each letter means (the pitch page, Oct 30):
  - **Encounter A, the ink curtain.** Ink bleeds out of the tapped node's token and fills the
    screen; the foe rises out of it; one arrival line; the intent strip. Elites get an oxblood
    frame and a "holds the road to ..." line; the boss gets a held title card first. Then Enter
    combat or Retreat.
  - **Hazard B, the stakes card.** Before the board, one card: the place, what failing costs, what
    clearing pays, the routes, and, for a hazard that holds a road, "Opens: the road to ...".
    Back on the map, the held road draws itself open.
  - **Rest C, night passes.** Pick, then the screen runs dusk to night to dawn in about two
    seconds with one dream line; at dawn the outcome. T's amendment: the dawn says "X upgraded"
    instead of the VITAE line when the player upgraded a card.
  - **Quest A, the giver scene, "for now".** The giver's portrait and name, their lines, the relic
    rising on turn-in; too early, the giver turns the player away in their own voice.
- **D112** (eight node kinds), **D114** (T's 44-node Breakwater, told by gates; every quest pays a
  relic), **D116** (enemies telegraph a kind; DANGER is named only once beaten), **D88** (art and
  words are T's; the builder writes `[content]` placeholders), **D93** (lands by `plot` PR).
- `plan/revamp/breakwater-vision.md` and `braindump/2026-10-28-breakwater-chapter-1-map.md` (the
  node list: 15 fights, elites W5, C1 and L4, the boss K2; hazards H4, T5, D4, M2, M4, P1; rests W4,
  H5, L3; quests C2, L5, K1, B1).

## What exists

Read from `main` at 87fa70a on 2026-10-30 (engine paths under `axiomancer-mechanics/src`, app
paths under `axiomancer-mobile`):

- **The map to a node.** A tap selects a node; `components/exploration/NodeConfirmPanel.tsx` shows
  its kind and a two-line blurb (`selected.description`, `:88`); confirming walks there, and a
  gate component pushes the node's route: `CombatGate.tsx:64` (`/combat-encounter`),
  `HazardGate.tsx:24` (`/hazard`), `RestGate.tsx:18` (`/rest`), `QuestGate.tsx:27` (`/quest`).
  There is no transition between the map and a node's screen today.
- **Kinds on the map.** `state/presenters/exploration.engine.ts` maps an encounter node to
  `encounter`, `elite` or `boss` (`:316`, `isEliteNode` at `:359`); `KindToken.tsx` draws each
  kind's coloured token (BW1c; colours in `theme/palette.ts:182-187`).
- **The encounter reveal.** `components/combat/encounter/CombatEncounterPanel.tsx:735-790`: the
  `reveal` phase shows "A FOE BARS THE WAY", a blood-bordered portrait, name, HP, the player's
  VITAE, the threat-phase accordion, Enter combat and Retreat (`:135`). EN1c (shipped) gives the
  telegraph its five kinds (ATTACK, DEFEND, STATUS, DANGER, UNKNOWN) through `IntentIcon.tsx`, and
  EN1b's defeat ledger decides whether a DANGER move is named (D116). Elites and the boss look like
  any fight. Breakwater encounter events carry no `description` (`MapEvents/content.ts`, `poolFor`
  `fight`/`elite`/`boss` cases), and EN1f-EN1h are re-authoring that section now.
- **Held roads.** `breakwater-chapter.ts` names `BREAKWATER_CHAPTER_HELD` (`bw-h4`, `bw-c1`,
  `bw-l4`, `bw-w5`): each holds its own far road until crossed or beaten. `MapCanvas.tsx:199-230`
  draws a blocked road thin, dotted and ash, and a locked one dashed; a road that opens simply
  redraws solid on the next render.
- **The hazard.** `app/hazard/index.tsx` mounts `RouteSelect` (Safe and Risk panels with the opening
  hand) first, then the board, `OutcomeOverlay` and `RewardsOverlay`. The view model
  (`state/presenters/hazard.engine.ts:142-176`) has `title`, `scenario`, `routeChoices`,
  `outcome` and `rewards`; it states no failure cost before play. Breakwater hazards are the shared
  damage hazard with a `[content] <place>.` description; the live routing to the puzzle board is
  T's Nov 3 plot, not yet written.
- **The rest.** `app/rest/index.tsx`: phases `offer` (Rest, Upgrade a card), `upgrade-pick`
  (`CardUpgradePicker`) and `outcome`, whose chips come from `rest.copy.ts`
  (`restOutcomeHealChip` "+N VITAE", `:58`; `restOutcomeUpgradedChip` "UPGRADED: from → to",
  `:72`). The node is consumed on entry; there is no back-out. Breakwater rests use
  `campRestPool(nodeId, '[content] <place>.')`.
- **The quest.** `app/quest/index.tsx` with `state/presenters/quest.engine.ts`: an eyebrow, the
  giver line (`giverLine`, the event's `description`, `:169`), step blocks with objectives and
  rewards, Accept, Turn in and Leave, a "paid" card listing XP, shillings and item names, and the
  locked line when the quest is not held. The four quest nodes' description and `lockedLine` are
  `[content]` in `MapEvents/content.ts` (`QUEST_NODES`); every step pays XP and a relic
  (`breakwater-chapter.questline.ts:49-54`, placeholders until BW1d/BW1e). No giver name or
  portrait exists anywhere.
- **Motion.** `lib/juice/instant.ts` gives every juice primitive an `animate`/`instant` mode from
  the reduced-motion setting (`state/settings.ts:49`) and the e2e escape hatch
  `__AXM_JUICE_INSTANT__`; `components/combat/frames/__tests__/reducedMotionSource.test.ts` pins
  that motion gates take the answer from their caller. Screens animate with
  `react-native-reanimated`.

## Outcome

Every encounter, hazard, rest and quest node on the Breakwater opens in T's settled treatment, with
its transition, copy slots, animation and tier cues, and still resolves end to end exactly as today.

## Acceptance

- **A1** Confirming a walk to an encounter node plays the ink curtain: ink spreads from that node's
  token on the map until it covers the screen, and the reveal fades in out of it, with the foe's
  portrait rising into place. A test drives the transition in `instant` mode and sees the reveal
  mount with nothing skipped.
  With reduced motion on, it lands its end state at once, the motion gate taking the answer from its
  caller as `reducedMotionSource.test.ts` requires of the combat frames.
- **A2** The encounter reveal shows one arrival line for its node, read from a per-node table that
  holds a line for each of the 19 Breakwater encounter nodes (`[content]` until T's Nov 10
  sitting); a node with no line shows none. A test pins all 19 present.
- **A3** The reveal shows the foe's tier: a normal fight as today; an elite with an oxblood frame and
  the line "Holds the road to <place>", naming the place of the node its held road leads to; the
  boss behind a held title card (its name and "Chapter 1 boss") before the reveal. A presenter
  test covers W5, C1, L4 and K2.
- **A4** The reveal's intent strip is EN1c's, and the DANGER rule holds inside the new reveal: the
  move is named only when the defeat ledger records that foe (a test for each case).
- **A5** Before a hazard's board, a stakes card shows the place, its kind line ("Hazard", or "Hazard
  · holds the road" for a held hazard), what failing costs and what clearing pays as the engine
  states them, and its routes; one button, "Face it", leads on to today's route select. A line the
  engine cannot state is left off the card, never guessed.
- **A6** For a held hazard (H4), the card adds "Opens: the road to <place>", naming the node beyond
  it. A presenter test for H4 and for one plain hazard (T5).
- **A7** When the player returns to the map after crossing a held hazard or beating a held elite,
  each road it held draws open once, from the closed style to the open style along its length; a
  test drives it in `instant` mode and sees the road end open. With reduced motion on, it lands its
  end state at once.
- **A8** At a rest, after the player picks Rest, or picks Upgrade and chooses a card, the screen
  runs dusk to night to dawn with one dream line for that node (three `[content]` lines, one per
  Breakwater rest), then shows the outcome at dawn with "Move on".
  With reduced motion on, it lands its end state at once, the motion gate taking the answer from its
  caller as `reducedMotionSource.test.ts` requires of the combat frames.
- **A9** The dawn outcome reads "+N VITAE" after Rest and "<card> upgraded" after an upgrade, with
  no VITAE line, where `<card>` is the card's name before the upgrade (T: "just say "X upgraded"
  instead of VITAE"). A copy test pins both.
- **A10** Each quest node names a giver (a name and a portrait slug, `[content]` and a stand-in
  portrait until T picks), and the quest screen opens on the giver: portrait, name, then the giver
  line and the step's lines one after another.
- **A11** On a turn-in the step's relic rises into view (its item icon and name) before the paid
  card; Accept, Turn in and Leave keep today's rules and test ids.
  With reduced motion on, it lands its end state at once, the motion gate taking the answer from its
  caller as `reducedMotionSource.test.ts` requires of the combat frames.
- **A12** Reaching a quest node before its quest is held shows the giver dimmed and turned away with
  the node's `lockedLine`, and only Leave. A test for C2 before the fishermen quest is held.

Measure: on the web build, a run from the windmill reaches an encounter (the ink curtain and a tiered
reveal), the wreck (the stakes card, then its road drawing open), a rest (night passes, "<card>
upgraded" at dawn) and the fishermen's camp (the giver scene paying a relic), and root `npm test`
passes, with the Breakwater chapter e2e still walking W1 to B2 through every gate and the Act 1
walk (`npm run e2e:act1-walk -w axiomancer-mobile`) still resolving every kind by its screen's test ids.

## Scope

- **axiomancer-mechanics:** `World/MapEvents/` (a per-node arrival-line table for the Breakwater's
  encounter nodes, kept out of the encounter pools EN1f-EN1h edit; a dream-line field on the
  Breakwater rest payloads; a `giver` on the quest payload and its four nodes); the read helpers the
  presenters need (a held node's far place).
- **axiomancer-mobile:** the map's hand-off to each gate (`CombatGate`, `HazardGate`), the encounter
  reveal in `CombatEncounterPanel.tsx`, a hazard stakes card before `RouteSelect`, the held-road
  draw in `MapCanvas.tsx`, the rest outcome phase, the quest screen and presenter, `rest.copy.ts`,
  `quest.copy.ts`.
- **Not touched:** combat rules, enemy moves and numbers (EN1); the hazard board's rules and the
  live puzzle routing (T's Nov 3 plot); rest, quest and gate rules; the other four kinds (W3
  sittings); every `[content]` word (T's).

## Consumers to update

The Act 1 walk (`e2e:act1-walk`) and its route test ids; `state/dev/skip-event.ts` (the skip seam
must still resolve a node after its new screen mounts); the hazard, rest and quest screen tests; the
`content.engine.test.ts` parity guard for the new fields; `verify:visual` baselines for the four
screens (re-approved in each phase's PR).

## Save / schema contracts

None. Arrival lines, dream lines and givers are event content, re-read from content on load (NK1's
finding: payloads are not saved). The held-road draw is presentation: it keys on a road that was
closed when the map last drew and is open now, held in screen state, never in the save.

## Decisions made upfront — DO NOT ASK

1. **One phase per kind**, in T's order (encounter, hazard, rest, quest), each standing alone:
   none requires another, so the loop can take them in any order and T can play each as it lands.
2. **The ink curtain is the encounter's transition only.** T picked a different look per kind;
   the other three open with their own treatment (the card, the dusk, the giver).
3. **Arrival lines live in their own table** keyed by node id, not in the encounter pools, so ET1a
   does not collide with EN1f-EN1h, which are rewriting those pools now.
4. **Tier comes from the map's own kind** (`isEliteNode`, the boss flag), the same source the map
   tokens use, so the token the player tapped and the reveal always agree.
5. **The stakes card reads, never invents.** It shows only the costs and rewards the hazard's
   engine states; when T's Nov 3 routing moves hazards onto the puzzle board, the card reads the
   board's stakes from the same view model (see Follow-ups).
6. **"X" in "X upgraded" is the card's name before the upgrade**, the name the player chose from.
7. **Giver portraits are stand-ins** from the art already in the tree until T picks them [T to
   confirm #1]; names and lines are `[content]` and join the quest-chain lines T writes on Nov 10
   (BW1d's table gains a giver name per quest node).
8. **Timing:** the ink curtain, the dusk-to-dawn run and the relic rise each sit near two seconds or
   under; a tap skips any of them to its end state. Fifteen normal fights a chapter is the reason.
9. **Slot: asap** [T to confirm #2]: the treatments are what the Nov 15 MVP run shows, and plotting
   them now instead of across Nov 4-12 is what buys the build time.

## Tests matrix

- Engine: the arrival-line table (19 nodes), dream lines (3 rests), givers (4 quest nodes) in
  `content.engine.test.ts`; a held node's far place helper.
- Mobile: an encounter reveal tier test (W5, C1, L4, K2, one normal), the DANGER naming pair inside
  the new reveal, the ink transition in `instant` mode; the stakes card presenter (H4, T5) and
  screen; the held-road draw; the rest phases with the night and both dawn outcomes; the quest giver
  screen (accept, turn in with the relic, the refusal); a reduced-motion pass per screen.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, root `npm test`,
`verify:visual` on the phase's screen, and `npm run e2e:act1-walk -w axiomancer-mobile`.

## Commit body template

`<what the player now sees at <kind> nodes, in plain words>. Closes A<n>, ... Kinds left: <list>.`

## DoD

A1-A12 ticked; the chapter e2e and the Act 1 walk green after each phase.

## Follow-ups (out of scope)

- **Giver portraits** (T's art, D88): a sitting to pick four, then the swap; see call #1.
- **The hazard routing** (T's Nov 3 plot): it should keep the stakes card's inputs (fail cost,
  reward, routes) on the view model when the board changes.
- **The other four kinds** (village, travel, loot cache, cutscene): T's W3 sittings, Nov 17-27.
- **Gate set-pieces** for K1 and B1 (the key turning, the bridge lowering): offered as quest option C
  on the pitch page; a later add on top of the giver scene if T wants it.
- **The bestiary page** (encounter option C) as a later layer over the ink curtain.

## Phases

### ET1a — Encounter: the ink curtain · M · closes A1, A2, A3, A4 · requires nothing
Measure: on the web build, walking to W2 plays the ink curtain into a reveal with its arrival line,
and C1 shows the oxblood frame with "Holds the road to Fishermen's camp".
- Scope: the arrival-line table (19 `[content]` lines); the ink transition from the tapped token at
  `CombatGate`'s push; the reveal's tier frame, held-road line and the boss title card; the
  existing intent strip and DANGER rule kept.
- Tests: the reveal tier test, the arrival-line table, the DANGER pair, the transition in `instant`
  mode.
- Verify: both workspaces, root `npm test`, `verify:visual` on the reveal, the Act 1 walk.

### ET1b — Hazard: the stakes card and the road that opens · M · closes A5, A6, A7 · requires nothing
Measure: on the web build the wreck shows its stakes card with "Opens: the road to Moored ship", and
after crossing it the H4 to H5 road draws open on the map.
- Scope: the stakes card before `RouteSelect` and its presenter lines; the held node's far place
  helper; the held-road draw in `MapCanvas.tsx` for hazards and elites.
- Tests: the stakes card presenter (H4, T5) and screen, the road draw in `instant` mode.
- Verify: both workspaces, root `npm test`, `verify:visual` on the card, the Act 1 walk.

### ET1c — Rest: night passes · S · closes A8, A9 · requires nothing
Measure: on the web build, W4's Rest runs the night into "+N VITAE" at dawn, and an upgrade at H5
dawns on "<card> upgraded".
- Scope: the dream-line field on the three Breakwater rests (`[content]`); the night phase between
  the pick and the outcome; the dawn copy in `rest.copy.ts`.
- Tests: the rest screen phases, both dawn outcomes, the copy test.
- Verify: both workspaces, root `npm test`, `verify:visual` on the rest outcome.

### ET1d — Quest: the giver scene · M · closes A10, A11, A12 · requires nothing
Measure: on the web build the fishermen's camp opens on its giver, turning in pays the relic with it
rising into view, and reaching L5 before its quest shows the turned-away giver.
- Scope: the `giver` on the quest payload and the four nodes (stand-in portrait, `[content]` name);
  the giver layout on the quest screen; the relic rise; the refusal.
- Tests: the quest giver screen (accept, turn in, refusal), its reduced-motion pass.
- Verify: both workspaces, root `npm test`, `verify:visual` on the quest screen, the Act 1 walk.
