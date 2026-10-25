# Phase TQ1 — The spoils pick in two taps, the purse on the map

> Agent-facing brief, plotted by T (`/plot`, 2026-10-25, "plot them all,
> one plot run, one PR"), from the `PHASE_CANDIDATES` row "Fewer taps
> between a decision and the next node", then cut by T the same day to
> two of its changes ("I only like spoils after a fight and map node
> panel. Remove the others."). Mobile only: no engine rule, card,
> keyword, enemy or event copy changes (D88, D91).

## Sources

- The candidate "Fewer taps between a decision and the next node:
  interstitials, the spoils pick, the purse and a potion nudge"
  (`plan/PHASE_CANDIDATES.md`, filed by T's `/messy` of 2026-10-24).
- Part plan: `plan/revamp/mobile.md` "The board says what it does (T,
  2026-10-24, `/messy`)", items 6 and 7 and the proposed split (c).
- Evidence: `docs/reports/playtest-elementalist-act1-2026-10-24.md`
  findings **R10** (the spoils pick: tile, CHOOSE THIS, TAKE CARD; PT2
  walked away from the spoils empty twice) and **R12** (the purse is
  visible only inside rest, the anvil and the village; a broke player
  spent two nodes on dead doors).
- Decisions: **D91** (one card face: the spoils tiles keep
  `CombatCardFace` unchanged), **D92** (board layout: nothing here
  touches the combat board), **D93** (lands by `plot` PR).

## Outcome

Taking a card from the combat spoils is two taps (the tile, then TAKE
CARD), and the map's node panel shows the purse before the player walks
into a node that charges shillings, saying so when the anvil is out of
reach.

Size: S

## Acceptance

- A1. **A spoils tap selects.** In `CombatRewardsOverlay`, a tap on an
  offer tile selects it (the selected frame, `accessibilityState
  selected`) and enables TAKE CARD; a tap on the already-selected tile
  opens the full read (the existing `combat-reward-preview` panel, its
  CHOOSE THIS kept as the panel's confirm-and-close). Taking one card is
  tile then TAKE CARD, two taps. Each tile's accessibility label says
  "Tap to choose; tap again to read it in full".
- A2. **The purse on the node panel.** When the selected map node is a
  REST, THE ANVIL or VILLAGE node (`NodeConfirmPanel`), the panel prints
  `PURSE <n> SHILLINGS` (`node-confirm-purse`), read from
  `player.currency`. Other node kinds print no purse line.
- A3. **A dead anvil says so before the walk.** For THE ANVIL, when the
  purse is below the cheapest anvil work (`ANVIL_VERB_PRICING.hone`,
  read from `@mechanics`, never a copied number), the purse line adds
  `· the smith's cheapest work costs <hone> SHILLINGS`
  (`node-confirm-purse-short`). The presenter supplies both numbers; the
  panel computes nothing.
- A4. **The drives and guides follow the spoils change.**
  `e2e:combat-round` (`scripts/combat-round-e2e.mjs`) no longer drives
  the preview-then-CHOOSE-THIS path to take a card, and passes; any
  other drive that takes a spoils card the old way
  (`e2e:exploration-roundtrip`, `e2e:map-walk`, `e2e:feature-map`: grep
  for `combat-reward-preview`) is updated likewise and passes. The
  playtest guide that names the old spoils flow
  (`axiomancer-mobile/docs/playtest-guides/combat.md`) describes the new
  one.
- A5. **The taps are pinned.** A jest e2e (`state/e2e/fewer-taps.TQ1.test.tsx`)
  counts presses for the spoils take-one-card from overlay mount to the
  card in the deck: 2 (was 3, before the summary's close); it fails if
  the count rises. The same file pins the node-panel cases: the purse
  line on rest, anvil and village nodes and none on battle or cache; the
  short line below `ANVIL_VERB_PRICING.hone` and not at it.

Measure: `npm run verify -w axiomancer-mobile` with A5's
`fewer-taps.TQ1.test.tsx` passing (spoils 2 taps; the node-panel purse
and short-line cases); `npm run e2e:combat-round -w axiomancer-mobile`
passes on the new spoils flow.

## Scope

`axiomancer-mobile` only.

- `components/combat/encounter/CombatRewardsOverlay.tsx`: tile press
  selects, second press on the selected tile reads (A1).
- `state/presenters/exploration.engine.ts`: the selected option's VM
  gains `purse: number | null` (non-null for `rest`, `blacksmith`,
  `village`) and `cheapestWork: number | null` (the anvil only);
  `components/exploration/NodeConfirmPanel.tsx` prints them (A2, A3);
  `app/(tabs)/exploration/index.tsx` passes them through.
- The e2e drives and guide in A4.

Rest, cache and the anvil's exits are not touched. Nothing is parked or
deleted.

## Consumers to update

- `components/combat/encounter/__tests__/CombatRewardsOverlay.test.tsx`
  (it presses a tile expecting the read panel).
- `scripts/combat-round-e2e.mjs:605-637` (the spoils take), and any
  other drive found by grepping `combat-reward-preview`.
- Tests or snapshots of `NodeConfirmPanel` and the exploration
  presenter VM, if any, gain the two new fields.
- `docs/feature-map/features.json` regenerates if a navigation edge
  changes (`node scripts/feature-map.mjs`; its `--check` is in the root
  `npm test`). Neither change should add an edge.

## Save / schema contracts

- None. No saved shape changes; the purse is read from the existing
  `player.currency` and the price from the engine.

## Decisions made upfront — DO NOT ASK

- **T cut the plot to two changes** (T, 2026-10-25, in session: "I only
  like spoils after a fight and map node panel. Remove the others.").
  Rest and cache settling on the choice, the toast that would have
  carried their outcome, and the idle anvil's single exit are removed
  from this phase, not deferred to another; they are listed under
  Follow-ups as cut.
- **The potion nudge is dropped from this plot** (T, 2026-10-25,
  "nowhere yet"). The part plan's open question "does a potion nudge
  belong on the map, or only inside rest?" is answered: nowhere for now.
  Listed under Follow-ups only.
- **The aftermath panel is not this phase's** (T, 2026-10-25). The
  combat summary's CONTINUE, the victory panel and level-up screen
  belong to the candidate "Victory and mercy panels do not say what the
  player gained". A1's two taps are counted before the summary's close.
- **Second tap reads** (A1), confirmed by T (2026-10-25), over
  long-press (undiscoverable on web and for the swarm's drivers) or a
  separate READ link (one more control per tile). The read panel stays
  because a card committed for the run must be readable before the
  commit (the overlay's own doctrine, point 1).
- **Purse kinds are the ones that can charge**: rest (THE CUT), the
  anvil, the village. A cache gives shillings, so it gets none. The unit
  is printed `SHILLINGS`, the form CRITIQUE's resolved village row
  settled on (2026-10-14).
- **Only the anvil gets the "short" line** (A3): a rest node is never
  dead at 0 shillings (REST and UPGRADE are free), and village prices
  vary by stall. The number is `ANVIL_VERB_PRICING.hone` from the
  engine.
- **The map move stays two taps** (select, GO). The confirm panel is
  where the purse is read (A2), so removing it would remove the place
  the decision is made.

## Tests matrix

- New `state/e2e/fewer-taps.TQ1.test.tsx`: A5 (the spoils press count;
  the node-panel purse and short-line cases).
- Rewritten `components/combat/encounter/__tests__/CombatRewardsOverlay.test.tsx`:
  A1 (tap selects and enables TAKE CARD; second tap opens the read;
  CHOOSE THIS still selects and closes; the a11y label).
- New or extended `components/exploration/__tests__/NodeConfirmPanel.test.tsx`
  and an `exploration.engine` presenter case: A2, A3 (purse on rest,
  anvil, village; none on battle or cache; the short line below
  `ANVIL_VERB_PRICING.hone` and not at it).
- E2e drives in A4.

## Verify gate

`npm run verify -w axiomancer-mobile`; `npm run e2e:combat-round -w
axiomancer-mobile`; `npm run verify:visual -w axiomancer-mobile` for the
node panel and the spoils tiles; root `npm test` (feature map `--check`,
deadlines lint).

## Commit body template

```
TQ1: the spoils pick in two taps, the purse on the map

A spoils tap selects a tile and TAKE CARD takes it; a second tap on the
selected tile reads it in full. The map's node panel shows the purse at
rest, anvil and village nodes, and says when the anvil's cheapest work
is out of reach. Acceptance A1-A5.
```

## DoD

A1-A5 ticked.

## Follow-ups (out of scope)

- **Rest settling on the choice** (no outcome card, no MOVE ON): cut by
  T, 2026-10-25.
- **Cache settling on the choice** (no outcome card): cut by T,
  2026-10-25.
- **A toast carrying the rest or cache outcome**: cut by T, 2026-10-25.
- **One anvil exit when nothing was forged**: cut by T, 2026-10-25.
- **A low-VITAE potion nudge.** Dropped by T on 2026-10-25 ("nowhere
  yet"). The swarm's evidence stands (three healing potions in the
  satchel at 1 VITAE, R12); re-plot it when T places it.
- The hazard `RewardsOverlay` (`components/hazard/RewardsOverlay.tsx`)
  has the same tap-reads, CHOOSE THIS, confirm pattern. Not changed
  here: the W2 cuts (the saved hazard deck and its screens) may delete
  it; if it survives, the same A1 change applies.
- Re-run the swarm's spoils tap count after TQ1 ships to confirm the
  measured number moved (spoil 4 in the report).
