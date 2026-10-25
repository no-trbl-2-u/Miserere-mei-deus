# Phase TQ1 — Fewer taps between a decision and the next node

> Agent-facing brief, plotted by T (`/plot`, 2026-10-25, "plot them all,
> one plot run, one PR"), from the `PHASE_CANDIDATES` row of the same
> name. Mobile only: no engine rule, card, keyword, enemy or event copy
> changes (D88, D91).

## Sources

- The candidate "Fewer taps between a decision and the next node:
  interstitials, the spoils pick, the purse and a potion nudge"
  (`plan/PHASE_CANDIDATES.md`, filed by T's `/messy` of 2026-10-24).
- Part plan: `plan/revamp/mobile.md` "The board says what it does (T,
  2026-10-24, `/messy`)", items 6 and 7 and the proposed split (c).
- Evidence: `docs/reports/playtest-elementalist-act1-2026-10-24.md`
  findings **R10** (interstitials, the spoils pick, the anvil's two
  exits; taps per node measured as rest 4, cache 4, spoil 4, map move 2;
  PT2 walked away from the spoils empty twice) and **R12** (the purse is
  visible only inside rest, the anvil and the village; a broke player
  spent two nodes on dead doors).
- Decisions: **D88** (content per surface: rest and cache copy is event
  copy, so no authored line changes here), **D91** (one card face: the
  spoils tiles keep `CombatCardFace` unchanged), **D92** (board layout:
  nothing here touches the combat board), **D93** (lands by `plot` PR),
  **R9a** (`plan/revamp/checkpoint.md`: a node is consumed when its
  encounter settles; settling earlier keeps that rule).

## Outcome

Leaving a rest, a cache, an idle anvil or the combat spoils takes the
fewest taps the decision allows, and the map's node panel shows the
purse before the player walks into a node that charges shillings.

Size: M

## Acceptance

- A1. **Rest settles on the choice.** Choosing REST or UPGRADE A CARD's
  pick or THE CUT's pick applies the node at once: the heal, upgrade,
  removal and spend land on the player, the rest slice clears and the
  screen returns to the map, with no outcome card and no MOVE ON. The
  `rest-outcome` card and `rest-claim` button no longer render.
- A2. **Cache settles on the choice.** Choosing TAKE A CARD or TAKE THE
  GOODS applies the node at once and returns to the map, with no outcome
  card. The `cache-outcome` card and `cache-claim` button no longer
  render.
- A3. **The outcome still reaches the player.** A1 and A2 each push one
  toast through the existing `notifications.toast` slice (`ToastHost`)
  naming what the node paid, built from the existing chip helpers
  (`restOutcomeHealChip`, `restOutcomeSpendChip`,
  `restOutcomeRemovedChip`, `restOutcomeUpgradedChip`,
  `cacheOutcomeCardChip`, `cacheOutcomeItemChip`,
  `cacheOutcomeCurrencyChip`) joined by ` · ` (e.g. `+5 VITAE`,
  `CUT: Ember Toss · −5 SHILLINGS`). A settle that paid nothing pushes
  no toast. [T to confirm]
- A4. **A spoils tap selects.** In `CombatRewardsOverlay`, a tap on an
  offer tile selects it (the selected frame, `accessibilityState
  selected`) and enables TAKE CARD; a tap on the already-selected tile
  opens the full read (the existing `combat-reward-preview` panel, its
  CHOOSE THIS kept as the panel's confirm-and-close). Taking one card is
  tile then TAKE CARD, two taps. Each tile's accessibility label says
  "Tap to choose; tap again to read it in full". [T to confirm]
- A5. **One anvil exit when idle.** In the anvil's forging phase, while
  nothing has been forged this visit (no spend, no hone, temper, swap or
  card upgrade), only one exit renders: `blacksmith-abandon` (LET THE
  COALS DIE), which leaves without an outcome card. `blacksmith-leave`
  (TAKE THEM AND GO) renders only once something has been forged; then
  both exits stay as today (LET THE COALS DIE still discards the work).
- A6. **The purse on the node panel.** When the selected map node is a
  REST, THE ANVIL or VILLAGE node (`NodeConfirmPanel`), the panel prints
  `PURSE <n> SHILLINGS` (`node-confirm-purse`), read from
  `player.currency`. Other node kinds print no purse line.
- A7. **A dead anvil says so before the walk.** For THE ANVIL, when the
  purse is below the cheapest anvil work (`ANVIL_VERB_PRICING.hone`,
  read from `@mechanics`, never a copied number), the purse line adds
  `· the smith's cheapest work costs <hone> SHILLINGS`
  (`node-confirm-purse-short`). The presenter supplies both numbers; the
  panel computes nothing.
- A8. **The drives follow the new flow.** `e2e:map-walk`,
  `e2e:feature-map`, `e2e:exploration-roundtrip` and `e2e:combat-round`
  no longer reference `rest-claim`, `cache-claim` or the
  preview-then-CHOOSE-THIS path, and each passes. The playtest guides
  that name the old flow (`axiomancer-mobile/docs/playtest-guides/combat.md`,
  `minigames.md`) and `axiomancer-mobile/design/encounters/loot-cache.md`
  describe the new one.
- A9. **The taps are pinned.** A jest e2e (`state/e2e/fewer-taps.TQ1.test.tsx`)
  counts presses from screen mount to the session clearing: rest REST 1
  (was 2), cache TAKE THE GOODS 1 (was 2), spoils take-one-card 2 (was
  3, before the summary's close), idle anvil exit 1 visible exit (was
  2). It fails if any count rises.

Measure: `npm run verify -w axiomancer-mobile` with A9's
`fewer-taps.TQ1.test.tsx` passing (rest 1, cache 1, spoils 2, idle anvil
one exit) and the node-panel cases for A6-A7; `npm run e2e:map-walk -w
axiomancer-mobile` passes on the new flow.

## Scope

`axiomancer-mobile` only.

- `state/rest/store-actions.ts`, `state/cache/store-actions.ts` (or the
  loot-cache equivalent): a settle wrapper per screen action (choose
  offer, pick cut, pick upgrade, choose cache offer) that runs the
  existing primitive, and when the engine session reaches `outcome`,
  runs the existing claim and pushes the A3 toast. The primitives
  (`chooseRestChoiceOfferAction`, `claimRestChoiceOutcomeAction`, the
  cache pair) stay exported and unchanged.
- `state/actions.ts`: the screen-facing `chooseRestChoiceOffer`,
  `pickRestChoiceCut`, `pickRestChoiceUpgrade` and
  `chooseLootCacheChoiceOffer` call the settle wrappers; `pushToast`
  becomes a shared helper (e.g. `state/notifications/toast.ts`) both
  `actions.ts` and the wrappers import; `claimRestOutcome` and
  `claimLootCacheChoiceOutcome` leave the screen API.
- `state/presenters/rest.copy.ts`, `cache.copy.ts`: `REST_OUTCOME_*` and
  `CACHE_OUTCOME_*` labels deleted; the chip helpers stay (A3 uses them)
  plus one `restSettleToast` / `cacheSettleToast` joiner each.
- `app/rest/index.tsx`, `app/cache/index.tsx`: the `outcome` phase
  branch deleted.
- `components/combat/encounter/CombatRewardsOverlay.tsx`: tile press
  selects, second press reads (A4).
- `app/blacksmith/index.tsx` and the blacksmith presenter: an `idle`
  flag on the forging VM (nothing forged this visit) that hides
  `blacksmith-leave` (A5).
- `state/presenters/exploration.engine.ts`: the selected option's VM
  gains `purse: number | null` (non-null for `rest`, `blacksmith`,
  `village`) and `cheapestWork: number | null` (the anvil only);
  `components/exploration/NodeConfirmPanel.tsx` prints them (A6, A7);
  `app/(tabs)/exploration/index.tsx` passes them through.
- The e2e drives, guides and design note in A8.

Nothing is parked or deleted beyond the outcome branches and their
labels.

## Consumers to update

- `state/dev/skip-event.ts` calls the primitives
  (`chooseRestChoiceOfferAction` then `claimRestChoiceOutcomeAction`,
  and the cache pair, lines ~486-514). It keeps doing so; because the
  primitives are unchanged it needs no edit, and its test must still
  pass.
- BE2e's deck events (`postRemoveEvent` in the rest claim, the cache
  card-reward post) fire from the claim, which the wrapper still calls:
  one deck event per settle, unchanged.
- `state/e2e/rest-upgrade.UP1d.test.tsx` and
  `state/e2e/blacksmith-upgrade.UP1e.test.tsx` (they press
  `rest-claim` / the anvil exits), `state/e2e/event.engine.test.ts`
  (reads the MOVE ON label), and
  `components/combat/encounter/__tests__/CombatRewardsOverlay.test.tsx`.
- `scripts/map-walk-e2e.mjs:200`, `scripts/feature-map-e2e.mjs:246`,
  `scripts/exploration-combat-roundtrip-e2e.mjs:237`,
  `scripts/combat-round-e2e.mjs:605-637`.
- `docs/feature-map/features.json` regenerates if a navigation edge
  changes (`node scripts/feature-map.mjs`; its `--check` is in the root
  `npm test`).

## Save / schema contracts

- None. No saved shape changes. If the save persists the `rest` or
  `cache` slice (check `state/store.ts` and the save path first), a save
  written mid-outcome by an older build (session at `phase: 'outcome'`)
  must still leave the screen: the screens no longer render that phase,
  so each screen settles a session found already at `outcome` on mount
  (one `useEffect` guard per screen), and a test pins it. If the slice
  is not persisted, record that in the PR and skip the guard.

## Decisions made upfront — DO NOT ASK

- **The potion nudge is dropped from this plot** (T, 2026-10-25,
  "nowhere yet"). The part plan's open question "does a potion nudge
  belong on the map, or only inside rest?" is answered: nowhere for now.
  Listed under Follow-ups only.
- **The aftermath panel is not this phase's** (T, 2026-10-25). The
  combat summary's CONTINUE, the victory panel and level-up screen
  belong to the candidate "Victory and mercy panels do not say what the
  player gained". A4's two taps are counted before the summary's close.
- **Rest and cache copy is event copy (D88)** (T, 2026-10-25). No
  authored line changes; only UI labels for the deleted outcome card go,
  and the toast reuses the existing chip strings.
- **Removing the outcome card loses no safety.** The engine's `outcome`
  phase has no back path (`claimRestChoiceOutcome` is its only exit, and
  the cache's likewise); the card was acknowledgement, not a confirm.
  The irreversible commit is the choice tap, which the intro already
  says ("Pick one — there is no walking back out").
- **Settle in mobile glue, not the engine.** The engine sessions keep
  their `outcome` phase and their tests; the wrapper calls choose then
  claim. Rules stay in `axiomancer-mechanics` (AGENTS.md hard rule).
- **The toast is the outcome's carrier** (A3), because `ToastHost`
  already lives in `app/_layout.tsx` and survives the route back to the
  map; a new merged-choice card would cost a screen. Leading option,
  [T to confirm].
- **Second tap reads** (A4), over long-press (undiscoverable on web and
  for the swarm's drivers) or a separate READ link (one more control per
  tile). The read panel stays because a card committed for the run must
  be readable before the commit (the overlay's own doctrine, point 1).
  Leading option, [T to confirm].
- **One exit means the abandon path** (A5): when nothing is forged,
  LET THE COALS DIE and TAKE THEM AND GO do the same thing, and the
  abandon path skips an empty reckoning card. Once work exists both stay,
  because they differ (pay and keep vs. discard).
- **Purse kinds are the ones that can charge**: rest (THE CUT), the
  anvil, the village. A cache gives shillings, so it gets none. The unit
  is printed `SHILLINGS`, the form CRITIQUE's resolved village row
  settled on (2026-10-14).
- **Only the anvil gets the "short" line** (A7): a rest node is never
  dead at 0 shillings (REST and UPGRADE are free), and village prices
  vary by stall. The number is `ANVIL_VERB_PRICING.hone` from the
  engine.
- **The map move stays two taps** (select, GO). The confirm panel is
  where the purse is read (A6), so removing it would remove the place
  the decision is made.
- **The cache's card preview is not this phase's.** The candidate "The
  decided reward rule, implemented" (plotted in parallel) owns
  previewing the cache's card before the pick. This phase only removes
  the cache's outcome card; if that plot lands first, A2 settles after
  its preview's confirm.

## Tests matrix

- New `state/e2e/fewer-taps.TQ1.test.tsx`: A1, A2, A3, A5, A9 (press
  counts per surface; a toast per paying settle and none for a zero
  settle; a restored `outcome` session settles on mount, if the slice is
  persisted).
- Rewritten `components/combat/encounter/__tests__/CombatRewardsOverlay.test.tsx`:
  A4 (tap selects and enables TAKE CARD; second tap opens the read;
  CHOOSE THIS still selects and closes; the a11y label).
- New or extended `components/exploration/__tests__/NodeConfirmPanel.test.tsx`
  and an `exploration.engine` presenter case: A6, A7 (purse on rest,
  anvil, village; none on battle or cache; the short line below
  `ANVIL_VERB_PRICING.hone` and not at it).
- Updated `state/e2e/rest-upgrade.UP1d.test.tsx`,
  `state/e2e/blacksmith-upgrade.UP1e.test.tsx`,
  `state/e2e/event.engine.test.ts`: the new flow.
- E2e drives in A8.

## Verify gate

`npm run verify -w axiomancer-mobile`; `npm run e2e:map-walk -w
axiomancer-mobile`; `npm run e2e:combat-round -w axiomancer-mobile`;
`npm run verify:visual -w axiomancer-mobile` for the node panel and the
spoils tiles; root `npm test` (feature map `--check`, deadlines lint).

## Commit body template

```
TQ1: fewer taps between a decision and the next node

Rest and cache settle on the choice and say what they paid in a toast;
a spoils tap selects and a second tap reads; an idle anvil has one exit;
the map's node panel shows the purse at rest, anvil and village nodes,
and says when the anvil is out of reach. Acceptance A1-A9.
```

## DoD

A1-A9 ticked.

## Follow-ups (out of scope)

- **A low-VITAE potion nudge.** Dropped by T on 2026-10-25 ("nowhere
  yet"). The swarm's evidence stands (three healing potions in the
  satchel at 1 VITAE, R12); re-plot it when T places it.
- The hazard `RewardsOverlay` (`components/hazard/RewardsOverlay.tsx`)
  has the same tap-reads, CHOOSE THIS, confirm pattern. Not changed
  here: the W2 cuts (the saved hazard deck and its screens) may delete
  it; if it survives, the same A4 change applies.
- The anvil's reckoning card after real work (PAY AND POCKET THEM) is a
  further tap the swarm did not count; a later pass could settle it on
  TAKE THEM AND GO with a toast, as A1 does for rest.
- Re-run the swarm's taps-per-node count after TQ1 ships to confirm the
  measured numbers moved (rest 4, cache 4, spoil 4 in the report).
