# Phase SG1 — No starting ring; every relic grant is worn, and its signature reaches the board

> Agent-facing brief, plotted by T (`/plot asap`, 2026-10-25, run unattended
> on T's in-session report), rewritten the same day on T's answers (in
> session, after #921 merged). Three changes: a fresh run starts with no
> relic (the Suppliant's Ring hand-over goes); every dev relic grant wears
> the relic while a position is free, which is the Bleeding Signet defect
> T hit; and the satchel says when a relic is carried but not worn. Ship
> without asking; record judgment calls in the commit body. One call is
> T's and carries a default (`[T to confirm #1]`).

## Sources

- T's report, 2026-10-25, verbatim: "Signature skills do not work! There's
  no icon in combat to trigger them. And even the starting relic's signature
  skill doesn't allow the player to trigger the sigSkill." T named it "most
  important first", so it is slotted asap.
- T's answers, 2026-10-25, in session, after the first plot (#921) merged:
  1. The player no longer starts with the Suppliant's Ring. The first-node
     hand-over, `STARTING_RELICS` and the fight-start floor go; a fresh run
     starts with no relic. The ring stays in `relicLibrary`: T will build a
     healing, stalling and utility lane for it later. Old saves that carry
     the ring keep it.
  2. The two calls of #921 are cut by T: "the starting ring always arrives
     worn" and "Float-Eye befriendable" are both moot once nobody starts with
     the ring.
  3. Every relic grant wears the relic while a slot is free; the dev
     POPULATE and add-item-by-id paths must wear like GET ALL RELICS.
  4. An unworn relic is flagged: the satchel or the relic's detail says it is
     not worn, so its signature is off, and offers WEAR. Short UI copy.
  5. The Bleeding Signet's signature never shows, even via the dev menu's
     "GET ALL RELICS", while the store-level tests pass. Find it.
- Decisions: **D47** (relics keep signatures), **D88/D99** (a relic content
  edit is allowed because T is asking now), **D84** (code by `loop:pr` PR),
  **D93** (this plot lands by PR), **D104** (relic lanes feed the reward slot;
  the ring's future lane is T's, not this phase's).
- Prior phases this extends: EQ1a (#862, the loadout is the truth; GET ALL
  RELICS wears while a position is free) and EQ1b (#866, a refused rune says
  why). Brief `plan/phases/phase_EQ1_relic_loadout.md`. The open plot LR1
  (#922, lane relics and their sources) is not touched: it adds relic sources
  through the item-reward screen, which this phase keeps.

## What exists (mapped 2026-10-25 on `main` ade555829)

### The Signet defect (T's answer 5): root cause found

**The dev menu has had no GET ALL RELICS button since 2026-10-16.**
`DebugGetAllRelics` (added 839393c05, 2026-10-11) was deleted by a82a4fd10
("dev: cut the blacksmith and relics leaves", 2026-10-16) on the argument
that `DebugItemPicker` "already chips every id in `relicLibrary`". It does
chip them, but a chip does not do what the button did:

- `components/DebugItemPicker.tsx:31` calls `actions.addItemById(id)`;
  `state/dev/item-by-id.ts:64` resolves the relic and calls the store's
  `addItem`, which only pushes into `player.inventory`
  (`axiomancer-mechanics/src/Game/store.ts:452-455`). Nothing is worn.
- Signatures come only from the worn loadout, read once when the fight starts
  (`getSignaturesForLoadout(clonedPlayer.equipment)`,
  `axiomancer-mechanics/src/Combat/combat.engine.ts:250`). A carried Signet
  gives `signatures: []`, so the board draws no Crimson Covenant rune.
- `actions.grantAllRelics()` (`state/actions.ts:1287-1316`) still wears each
  relic while a position is free, which is why
  `state/e2e/loadout-truth.engine.test.ts` "GET ALL RELICS wears each relic
  while a position is free" and `dev-presets.engine.test.ts` pass. No UI calls
  it any more (grep: only tests and `state/actions.ts:716`). The same holds
  for `populateAllItems` (`state/actions.ts:1249`, satchel only, no caller)
  and `debugSeedAction` (`state/actions.ts:1172`, satchel only).
- Before EQ1a (2026-10-24) the satchel drew a relic as WORN by its inventory
  position while combat read `player.equipment`, so a chip-added Signet could
  even look worn in the satchel and still be missing from the fight.

Reproduced on this tree with a throwaway jest probe (deleted, not
committed): the real bw-2 fight (`startRealFight`) stripped of relics,
`<DebugItemPicker>` rendered in `GameStoreProvider`, a press on
`debug-item-relic-bleeding-signet`, then a fight started from the store's
player and `<CombatBoard>` rendered: inventory
`['minor-healing-potion', 'relic-bleeding-signet']`, worn `[]`,
`signatures: []`, no `combat-signature-sig-crimson-covenant`. The same board
after `actions.grantAllRelics()`: `['sig-disarming-plea',
'sig-crimson-covenant']`, both runes rendered. `populateAllItems`:
`signatures: []`.

Ruled out on the way: `signaturesVM` / `getSignatureSkill`
(`combat.signature.ts:30-40` keys `sig-crimson-covenant`; the grant-all board
renders it); the board hiding a second rune (`CombatBoard.tsx` renders both
in jest); the store dropping `equipment.accessories` (the grant-all path
reaches the fight intact). Not ruled out but not the cause: a relic worn
mid-fight joins the next fight only, because the fight's `signatures` are
fixed at `combat.engine.ts:250`. This phase keeps that rule.

### The starting ring (T's answer 1)

- A fresh run already starts relic-free (`NEW_GAME`,
  `Game/game.reducer.ts:150-166`, `seedStartingRelics: false`); the ring
  arrives later by three routes, all of which go:
  1. the hand-over screen: `<ItemRewardGate>` arms it
     (`components/item-reward/ItemRewardGate.tsx:30-35`) on
     `selectFirstNodeRelicMoment` (`state/presenters/item-reward.engine.ts:160-185`),
     which calls `offerFirstNodeRelicAction`
     (`state/item-reward/store-actions.ts:115-145`);
  2. the reducer floors: `settleFirstNodeRelic` (`game.reducer.ts:220-226`) on
     `START_COMBAT` (:244) and `PROCESS_NODE` (:388);
  3. the engine grant itself: `Character/first-node-grant.ts`
     (`grantFirstNodeRelic`, `withholdFirstNodeRelic`,
     `isFirstNodeRelicPending`, `FIRST_NODE_RELIC_ID`, `FIRST_NODE_RELIC_FLAG`),
     exported from `Character/index.ts:173-175` and `src/index.ts:25`.
- `STARTING_RELICS` / `cloneStartingRelics` (`Items/relic.library.ts:69-83`)
  seed the ring into every character built with `seedStartingRelics: true`:
  `createCharacter` (`Character/index.ts:57-74`), the presets
  (`Character/presets.ts:259`), the state-fixture builder
  (`Game/fixtures/state-fixture.builder.ts:64`), the mock player
  (`Character/characters.mock.ts:12`), and through them `startRealFight` and
  the measured harness. `World/roster-health.ts:137` lists the ring as a
  starting item. `Game/game.migrate.ts:102, 165` use `cloneStartingRelics()`
  inside historical migrations, and :437 stamps `FIRST_NODE_RELIC_FLAG` in
  v23 → v24.
- The item-reward screen itself (`app/item-reward/index.tsx`, EQUIP / CONFIRM)
  is generic and stays: the ring was its only in-game relic today, and LR1
  plans to route quest and elite relics through it.
- Harnesses that wait for the hand-over: `scripts/act1-walk-e2e.mjs:329-330`,
  `scripts/feature-map-e2e.mjs:279-280`, `scripts/map-walk-e2e.mjs:239-240`
  ("the first relic"), and `scripts/critique-drive.mjs:198-200` (tolerant).
  Docs that state it: `docs/game-model.md:199-200`, `plan/revamp/relics.md:29,
  55`, `axiomancer-mobile/docs/playtest-guides/minigames.md:43`,
  `docs/feature-map/features.json` (generated; `first-node-grant.ts`,
  `ItemRewardGate.tsx` edges).

### The satchel (T's answer 4)

The satchel shows a WORN badge on a worn relic (`components/inventory/ItemCard.tsx:259`,
`state/presenters/inventory.engine.ts:244`) and nothing on a carried one. The
detail's primary button reads `EQUIP` or `EQUIP · REPLACE <NAME>`
(`state/presenters/loadout.ts:82`, `inventory.modal.engine.ts:209-210`); the
row's quick button reads `EQUIP` (`ItemCard.tsx:326`). Nothing tells the
player that a carried relic's signature is off.

## Outcome

A fresh run starts with no relic and is never handed one at the first node.
Any relic the player is given (the dev menu included) is worn when a position
is free, so its signature is on the next fight's board; one that is carried
unworn says so in the satchel and offers WEAR. The Bleeding Signet added from
the dev menu shows Crimson Covenant in the next fight, and it fires.

Size: L

## Acceptance

- **A1** A fresh run starts with no relic, and nothing hands one over: from a
  fresh store (`createAppStore`) a new game resolves its first node and starts
  its first fight through `actions.beginHazardEncounter()` (the live route),
  and `player.inventory` holds no relic, `player.equipment.accessories` is
  empty, the item-reward queue is empty, and the fight's `signatures` is `[]`.
  `Character/first-node-grant.ts` and its exports, `offerFirstNodeRelicAction`,
  `selectFirstNodeRelicMoment`, the gate's first-node arm, `settleFirstNodeRelic`
  (both floors), `STARTING_RELICS`, `cloneStartingRelics` and the
  `seedStartingRelics` option are gone. The Suppliant's Ring is still in
  `relicLibrary` and `getRelicById('relic-disarming-plea')` resolves. The test
  fails on today's `main` (the floor wears the ring at `START_COMBAT`).
- **A2** Old saves keep what they carry: a save whose player wears the ring,
  and one that carries it unworn, load and start a fight with the ring exactly
  where it was (worn gives `sig-disarming-plea`; carried gives none). The
  v23 → v24 migration still stamps the `first-node-relic-granted` flag (an
  inert string now, kept as a local constant in `game.migrate.ts`), and the
  older migrations that seeded the ring still produce it byte-for-byte (a local
  clone of the ring replaces `cloneStartingRelics()`). No save version bump.
- **A3** Every dev relic grant wears the relic while a position is free:
  `addItemById`, `populateAllItems`, `debugSeedAction`, `grantAllRelics` and
  the mechanics CLI `devGrantAllEquipment` share one helper (wear when the
  slot has a free position; never displace a worn relic; otherwise carry). A
  test drives each: on a bare player each relic is worn; with the slot full
  the relic is carried and nothing worn moves. The `addItemById` and
  `populateAllItems` cases fail on today's `main`.
- **A4** The Signet defect, pinned through the real dev button: a jest test
  renders `<DebugItemPicker>` in a `GameStoreProvider` on the real bw-2 fight's
  store stripped of relics, presses `debug-item-relic-bleeding-signet`, starts
  the fight as the route does (`<CombatEncounterPanel>` with the store's player
  as `bootstrapPlayer`), and asserts `combat-signature-sig-crimson-covenant`
  renders; with Conviction at `SIGNATURE_COST` a press casts it (the log
  carries `signature-cast`, Conviction drops by the cost). Fails on today's
  `main` (`signatures: []`, no rune).
- **A5** An unworn relic says so: in the satchel a carried, unworn relic's row
  shows a `NOT WORN` badge where a worn one shows `WORN` (testID
  `item-not-worn-<id>`), and its detail shows one line naming the signature
  that is off ("Not worn: Crimson Covenant is off.", built in the presenter)
  above a primary button that reads `WEAR` (`WEAR · REPLACE <NAME>` when the
  slot is full). A press wears it, the badge becomes `WORN`, and the next
  fight from the store carries its signature. A worn relic shows neither the
  badge nor the line.
- **A6** The live fight shows the Signet: `scripts/combat-round-e2e.mjs` opens
  `/dev` DECKS & ITEMS (`dev-section-decks`), presses
  `debug-item-relic-bleeding-signet` before it arms the encounter, and fails a
  run whose round-1 board draws no `combat-signature-sig-crimson-covenant`
  (counting `combat-signature-<id>` elements, not the bar or the refused
  marks). Its summary prints the signatures drawn and fired. Fails on today's
  `main`.
- **A7** No harness or doc still expects the ring: `act1-walk-e2e.mjs`,
  `feature-map-e2e.mjs`, `map-walk-e2e.mjs` and `critique-drive.mjs` no longer
  wait for "the first relic"; `docs/game-model.md`, `plan/revamp/relics.md`,
  `axiomancer-mobile/docs/playtest-guides/minigames.md` and
  `axiomancer-mobile/docs/dev-tools.md` (the removed-leaves row for
  `DebugGetAllRelics` now says the chips wear) say a run starts with no relic;
  `docs/feature-map/features.json` is regenerated; `npm test` (root) is green.

Measure: `npm run verify -w axiomancer-mobile` with the A1, A3, A4 and A5
tests (A1, A3 and A4 fail on ade555829), `npm run verify -w
axiomancer-mechanics`, `node axiomancer-mobile/scripts/combat-round-e2e.mjs`
green with Crimson Covenant drawn every run, and `npm test`.

## Scope

- `axiomancer-mechanics/src/Character/first-node-grant.ts`: delete. Drop its
  exports from `Character/index.ts` and `src/index.ts`.
- `axiomancer-mechanics/src/Game/game.reducer.ts`: delete
  `settleFirstNodeRelic` and its two calls (`START_COMBAT`, `PROCESS_NODE`);
  rewrite the `NEW_GAME` comment (a run starts with no relic).
- `axiomancer-mechanics/src/Items/relic.library.ts`: delete `STARTING_RELICS`
  and `cloneStartingRelics`; keep `SUPPLIANTS_RING` in `relicLibrary`; export
  the relic clone helper if callers need one. Rewrite the header comment.
- `axiomancer-mechanics/src/Character/index.ts`: drop `seedStartingRelics`;
  `createCharacter` wears only the `equipment` it is given.
- `axiomancer-mechanics/src/Character/presets.ts`,
  `Game/fixtures/state-fixture.builder.ts`, `Character/characters.mock.ts`:
  drop `seedStartingRelics: true`. A fixture or preset that needs the ring
  passes it as `equipment` explicitly.
- `axiomancer-mechanics/src/Game/game.migrate.ts`: local constants for the
  flag string and a local ring clone in the historical migrations (A2).
- `axiomancer-mechanics/src/World/roster-health.ts`: `startingItemIds: []`.
  The ring becomes an orphan finding like the Signet (orphans are a design
  state, `roster-health.ts:13`, not a failure).
- `axiomancer-mechanics/src/Items/item-grant.ts`: the shared "wear while a
  position is free" grant (A3), used by `CLI/dev-tools.ts`
  `devGrantAllEquipment` and the mobile dev paths.
- `axiomancer-mobile/state/dev/item-by-id.ts`, `state/actions.ts`
  (`populateAllItemsAction`, `debugSeedAction`, `grantAllRelicsAction`): use
  the shared grant.
- `axiomancer-mobile/components/item-reward/ItemRewardGate.tsx`: keep the
  pending-reward push; drop the first-node arm.
  `state/item-reward/store-actions.ts`: delete `offerFirstNodeRelicAction`.
  `state/presenters/item-reward.engine.ts`: delete `selectFirstNodeRelicMoment`.
- `axiomancer-mobile/state/presenters/inventory.engine.ts`,
  `inventory.modal.engine.ts`, `loadout.ts`, `components/inventory/ItemCard.tsx`
  and the detail modal: the `NOT WORN` badge, the "Not worn: <signature> is
  off." line and the `WEAR` label (A5). Copy lives in the presenters.
- `axiomancer-mobile/scripts/combat-round-e2e.mjs` (A6); the four walk and
  drive scripts and the docs in A7.
- No change to `CombatBoard.tsx`, `combat.signature.ts`, `combat.engine.ts`,
  `playSignatureSkill` or the item-reward screen's EQUIP / CONFIRM.

## Consumers to update

Mechanics (grep `first-node-grant`, `FIRST_NODE_RELIC`, `seedStartingRelics`,
`cloneStartingRelics`, `withholdFirstNodeRelic`):

- delete `Character/e2e/first-node-relic-grant.engine.test.ts`;
- rewrite `Game/e2e/fresh-start.engine.test.ts` (a fresh start holds no
  relic) and `Game/e2e/first-node-relic-migration.engine.test.ts` (keep the
  v23 → v24 flag cases; drop the grant cases);
- `Items/e2e/relic-library.engine.test.ts`, `Character/e2e/relic-equip.engine.test.ts`,
  `Items/e2e/item-grant.engine.test.ts`,
  `Game/e2e/derived-stats-retirement-migration.engine.test.ts`,
  `Game/e2e/equipment-progression-migration.engine.test.ts`,
  `Game/e2e/relic-migration.engine.test.ts`,
  `World/e2e/roster-health.engine.test.ts`: build the ring explicitly where a
  case needs it.

Mobile (same greps plus `ItemRewardGate`, `offerFirstNodeRelic`):

- delete `app/(tabs)/inventory/__tests__/satchel-first-node-relic.test.ts`
  or rewrite it to the NOT WORN badge (A5);
- `state/e2e/item-reward.engine.test.ts` (drop the hand-over cases, keep the
  generic EQUIP / CONFIRM cases with the ring as an ordinary relic),
  `state/e2e/item-reward.screen.test.tsx`, `state/e2e/loadout-truth.engine.test.ts`
  (drop "the first-node grant arrives worn"; add the chip case),
  `state/e2e/dev-presets.engine.test.ts`,
  `state/e2e/ware-effect-line.S5-talk-C04.test.tsx`: replace
  `FIRST_NODE_RELIC_ID` with the relic id;
- `components/combat/encounter/__tests__/CombatBoard.refused-rune.test.tsx`:
  set signatures explicitly already; check its fixture still builds;
- any suite that leaned on `startRealFight`'s player wearing the ring (run the
  mobile suite; fix each by wearing the ring explicitly in that test);
- `scripts/feature-map-render.test.mjs:45` (the `ItemRewardGate` flow edge
  stays if the gate stays).

## Save / schema contracts

- No save version bump, no new migration. `first-node-relic-granted` stays as
  an inert string in old saves; nothing reads it after this phase except the
  v23 → v24 step that writes it.
- A save carrying the ring, worn or not, keeps it (A2). A save that never got
  the ring is not given it.

## Decisions made upfront — DO NOT ASK

- **The ring stays in the library, unsourced.** T will give it a lane; until
  then only the dev menu and old saves hold it. Roster health reports it as an
  orphan, which is a report, not a gate.
- **Cut by T (2026-10-25): "the starting ring always arrives worn" and
  "Float-Eye befriendable"** (#921's calls 1 and 2). Moot once no run starts
  with the ring. Float-Eye keeps no `friendshipReward`; The Open Hand stays a
  Green Jelly tool for old saves and the dev menu.
- **"Wear while a position is free" is EQ1a's rule, extended.** A grant never
  displaces a worn relic; past the last free position the relic is carried
  and the A5 badge says so.
- **A fight's signatures stay fixed when it starts** (`combat.engine.ts:250`).
  A relic worn mid-fight joins the next fight.
- **The item-reward screen's "put in the satchel" stays.** It is the player's
  explicit choice to carry a relic unworn, and A5 now flags it.
  [T to confirm #1]
- **Copy:** the badge reads `NOT WORN`; the detail line reads "Not worn:
  <signature name> is off."; the button reads `WEAR` (T's word) for relics,
  replacing `EQUIP` in the satchel only. The item-reward screen keeps its own
  labels.
- **No GET ALL RELICS button returns.** The chips are the dev path; making
  them wear closes the gap without adding a leaf back.

## Tests matrix

| Suite | Kind | Subject |
|---|---|---|
| `state/e2e/no-starting-relic.engine.test.ts` (new) | journey | fresh store, first node, live fight: no relic, no hand-over, `signatures: []` (A1) |
| mechanics migration suites | rewritten cases | a save wearing or carrying the ring keeps it; v23 → v24 still stamps the flag (A2) |
| `state/e2e/dev-relic-grants.engine.test.ts` (new) and an `item-grant` engine case | engine + store | every dev grant wears while free, never displaces (A3) |
| `state/e2e/signet-signature.screen.test.tsx` (new) | UI | press the real chip, mount the panel, rune renders and casts (A4) |
| satchel presenter and `ItemCard` tests | presenter + component | `NOT WORN`, the off line, `WEAR` wears it, next fight carries it (A5) |
| `scripts/combat-round-e2e.mjs` | e2e | Signet chip before the fight; Crimson Covenant drawn on round 1 (A6) |
| root `npm test`, walk and drive scripts | harness | no wait for the first relic; feature map regenerated (A7) |

## Verify gate

```bash
npm run verify -w axiomancer-mechanics
npm run verify -w axiomancer-mobile
node axiomancer-mobile/scripts/combat-round-e2e.mjs
npm test
```

## Commit body template

```
fix: no starting ring; every relic grant is worn — phase SG1

Closes A1-A7 of plan/phases/phase_SG1_signature_trigger.md.
- A fresh run starts with no relic; the first-node hand-over, the fight-start
  floor and STARTING_RELICS are gone; the ring stays in relicLibrary ...
- Every dev relic grant wears while a position is free (the Signet defect:
  the dev chips only added to the satchel) ...
- The satchel flags a carried relic NOT WORN and offers WEAR ...

Decisions:
- ...

Verify: npm run verify -w axiomancer-mechanics; npm run verify -w axiomancer-mobile; combat-round-e2e; npm test.
```

## DoD

A1, A2, A3, A4, A5, A6 and A7 ticked.

## Follow-ups (out of scope)

- The ring's lane (healing, stalling, utility) and where a run finds it: T's,
  later; LR1 (#922) builds relic sources.
- The measured report (`docs/reports/measured/latest.md`) loses the ring from
  its preset players. The harness never cast The Open Hand on Float-Eye, so no
  number should move; the next report regeneration confirms it.
- `PHASE_CANDIDATES.md`: a fight that shows a relic worn mid-fight would need
  `signatures` re-read on equip; not planned.
