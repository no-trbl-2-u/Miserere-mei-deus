# Phase SG1 — The starting ring's signature is on the board and fires

> Agent-facing brief, plotted by T (`/plot asap`, 2026-10-25, run unattended
> on T's in-session report). A live defect: the Suppliant's Ring can reach the
> first fight unworn, so the board shows no rune at all, and when it is worn
> its only signature, The Open Hand, is refused in Act 1's common fight. Ship
> without asking; record judgment calls in the commit body. Two calls are
> T's and carry a default (`[T to confirm #n]`).

## Sources

- T's report, 2026-10-25, verbatim: "Signature skills do not work! There's
  no icon in combat to trigger them. And even the starting relic's signature
  skill doesn't allow the player to trigger the sigSkill." T named it "most
  important first", so it is slotted asap.
- Decisions: **D47** (relics keep signatures; "Leave the starting ring with
  befriend": The Open Hand opens the mercy choice), **D48** (the roster is
  one normal, one elite and one boss: Float-Eye, Green Jelly, Death
  Beholder), **D88/D99** (an enemy content edit is allowed because T is
  asking now), **D84** (code by `loop:pr` PR), **D93** (this plot lands by
  PR).
- Prior phases this extends: EQ1a (#862, the loadout is the truth: CONFIRM
  carries a relic unworn) and EQ1b (#866, a refused rune says why). Brief
  `plan/phases/phase_EQ1_relic_loadout.md`. Nothing in the build plan,
  `PHASE_CANDIDATES.md`, `AUDIT.md` or `CRITIQUE.md` Pending already covers
  this.

## What exists (mapped 2026-10-25 on `main` 9cc5e20e9)

The board, the engine and the cast path all work. The rune column renders
unconditionally (`axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:253-330`,
`combat-signature-bar` at :269, one `Pressable` per signature at :303, mounted
at :1450 with `onCast={onSignature}`); a castable rune's tap calls
`playSignatureSkill` (`CombatEncounterPanel.tsx:566`), which checks
`signatureCastBlock`, spends the Conviction and applies the skill
(`axiomancer-mechanics/src/Combat/combat.engine.ts:1802-1823`). No flag, dev
setting or Conviction gate hides the column. The defect is in what reaches it:

1. **The ring can be carried unworn into every fight (no rune at all).**
   Signatures come only from worn equipment: `getSignaturesForLoadout(player.equipment)`
   at combat init (`combat.engine.ts:250`, `Items/relic.library.ts:91-107`).
   A fresh run has no ring; after the first resolved node `<ItemRewardGate>`
   offers it on `/item-reward` (`components/item-reward/ItemRewardGate.tsx:33`,
   `state/item-reward/store-actions.ts:126-145`) with `settleFlags:
   [FIRST_NODE_RELIC_FLAG]` (:140). The screen has two buttons, EQUIP and
   "put in the satchel" (`app/item-reward/index.tsx:141-160`), and **every
   exit (Back, swipe, Android back) is CONFIRM** (`app/item-reward/index.tsx:69`,
   `dismissItemRewardAction`, store-actions :247). CONFIRM grants with
   `equip: false` (store-actions :197) and still stamps the settle flag
   (:212-216), so the `START_COMBAT` floor that would wear the ring
   (`Game/game.reducer.ts:220-224, 243`) sees a settled grant and does
   nothing. Result: the ring sits in the satchel, `state.signatures` is `[]`,
   and the column draws only the CONVICTION chip.
   Reproduced on this tree with a probe on the real fight
   (`arriveAtRealFight()`, bw-2 Float-Eye): ring stripped and offered, then
   `dismissItemRewardAction` → worn `[]`, signatures `[]`, runes `[]`;
   offered then `equipItemRewardAction` → signatures
   `['sig-disarming-plea']`. With no hand-over at all, `beginHazardEncounter`
   → `START_COMBAT` floor wears it (signatures `['sig-disarming-plea']`).
   `state/e2e/item-reward.engine.test.ts:393` ("CONFIRM also settles the
   grant — the ring is owned, just not worn") pins today's behaviour.
   **History:** the CONFIRM path has left the ring unworn since the hand-over
   screen landed (087245ea5, 2026-09-21); before EQ1a the satchel drew it as
   WORN by inventory position while combat (which reads `player.equipment`)
   never had it. EQ1a made the satchel honest; it did not cause the miss.
2. **Worn, The Open Hand is refused in Act 1's common fight.**
   `signatureCastBlock` (`combat.signature.ts:62-73`) refuses a `mercy`
   skill unless `isEnemyBefriendable(enemy)` (`Enemy/befriend.ts:13`:
   `friendshipReward !== undefined`) and `befriendHpGateOpen`. Of the three
   live foes (`Enemy/enemy.library.ts:221`) only Green Jelly (the elite,
   pinned per node, gate 30% VITAE) has a `friendshipReward`; Float-Eye, the
   whole wandering pool (`ACT1_POOL`, :228), has none. So on nearly every
   fight the rune reads refused (EQ1b's dashed ring and cross) and a tap
   opens the info sheet instead of casting (`CombatBoard.tsx:296-299`), the
   intended EQ1b behaviour. The probe above shows it: `{ affordable: false,
   reason: "Float-Eye will not be befriended" }` at 9 Conviction.
3. **The mercy branch already exists end to end.** `applySignatureSkill`'s
   `mercy` arm moves to `phase: 'mercy-choice'` (`combat.signature.ts:84-91`),
   the panel shows `combat-mercy` with spare/exploit
   (`CombatEncounterPanel.tsx:607, 696`), and a friendship outcome appends
   the foe's `flagSet` and codex entry (`game.reducer.ts:332-350`).
   `scripts/combat-round-e2e.mjs` already fires the first affordable rune
   (:412-432) and takes the spare branch when `combat-mercy` shows (:588-591),
   but never fails when no rune is drawn.

## Outcome

On a fresh run, every fight after the Suppliant's Ring is handed over shows
The Open Hand on the combat board whatever the player tapped on the hand-over
screen, and in Act 1's common fight (Float-Eye) the rune can be tapped to open
the mercy choice once the foe is low enough and the player has the Conviction.

Size: M

## Acceptance

- **A1** The first-node ring hand-over always leaves the ring worn: EQUIP,
  CONFIRM and every exit of `/item-reward` (dismiss on unmount) wear it into
  `player.equipment` and settle `FIRST_NODE_RELIC_FLAG`. For that entry the
  screen shows one button (testID `item-reward-equip`, label from the
  presenter) and no "put in the satchel" button. Other item rewards keep
  EQUIP and CONFIRM exactly as today (CONFIRM carries unworn). The test at
  `state/e2e/item-reward.engine.test.ts:393` is rewritten to the new rule.
  [T to confirm #1]
- **A2** A journey test that fails on today's `main`: from a fresh store
  (`createAppStore`) the run resolves a node, the gate's
  `offerFirstNodeRelicAction` queues the ring, the player leaves the screen
  (`dismissItemRewardAction`), the fight starts through
  `actions.beginHazardEncounter()` as the live route does, and
  `<CombatEncounterPanel>` mounted with the store's player as
  `bootstrapPlayer` shows `combat-signature-sig-disarming-plea`.
- **A3** Float-Eye can be befriended: it gains `befriendabilityConfig:
  { hpGate: { belowPct: 0.3 } }` and a `friendshipReward` (one
  `minor-healing-potion`, `xpBonus` 10, a short narrative in the house voice,
  `flagSet: 'befriended-float-eye'`). Death Beholder stays unbefriendable.
  `World/roster-health.ts` and the enemy-library guards stay green.
  [T to confirm #2]
- **A4** A panel test that fails on today's `main`: the real bw-2 Float-Eye
  fight (`startRealFight`) with the ring worn, the foe at or below 30% VITAE
  and Conviction at `SIGNATURE_COST`: the rune is castable (not refused, no
  cross), a press on `combat-signature-sig-disarming-plea` casts it (the log
  carries `signature-cast`, Conviction drops by the cost) and `combat-mercy`
  appears. At full VITAE the same rune reads refused with "not yet low
  enough to spare", and a press opens the info sheet, not the mercy choice.
  Short of Conviction it reads `◆4` dim, and a press casts nothing.
- **A5** `scripts/combat-round-e2e.mjs` fails a run whose board draws no
  rune on round 1 (it counts `combat-signature-<id>` elements other than the
  bar and the refused marks, and the live-fight player wears the ring by
  then), and its summary prints how many signatures it fired.

Measure: `npm run verify -w axiomancer-mobile` with the A2 and A4 tests
(both fail on 9cc5e20e9), `npm run verify -w axiomancer-mechanics`, and
`node scripts/combat-round-e2e.mjs` green with a rune drawn every run.

## Scope

- `axiomancer-mobile/state/item-reward/store-actions.ts`: the queue entry
  gains a `wearOnCommit` (or equivalent) field; `offerFirstNodeRelicAction`
  sets it; `commitItemRewardAction` equips when it is set, in either mode, so
  `dismissItemRewardAction` wears it too.
- `axiomancer-mobile/state/presenters/item-reward.engine.ts`: the VM says
  the entry is wear-only (`canConfirm: false` or equivalent) and gives the
  one button its label; the copy stays in the presenter.
- `axiomancer-mobile/app/item-reward/index.tsx`: hide the CONFIRM button for
  a wear-only entry; the keep note reads true for it.
- `axiomancer-mechanics/src/Enemy/enemy.library.ts`: Float-Eye's
  `befriendabilityConfig` and `friendshipReward` (A3), following Green
  Jelly's block.
- `axiomancer-mobile/scripts/combat-round-e2e.mjs`: the rune-drawn
  assertion and the fired count (A5).
- No change to `CombatBoard.tsx`, `combat.signature.ts`, `playSignatureSkill`
  or the relic library: the rune, the gate and the cast already behave.

## Consumers to update

- `state/e2e/item-reward.engine.test.ts` (the CONFIRM-on-the-ring case),
  `state/e2e/loadout-truth.engine.test.ts` (add the hand-over case beside
  "the first-node grant arrives worn").
- `components/combat/encounter/__tests__/CombatBoard.refused-rune.test.tsx`:
  its premise "Float-Eye, a foe with no friendship reward, so The Open Hand is
  refused there however much Conviction" no longer holds; rewrite the Open
  Hand cases to the HP gate (refused above 30%, castable at or below it) and
  keep the Covenant cases.
- Any mechanics test that asserts Float-Eye is unbefriendable or counts
  befriendable foes (grep `isEnemyBefriendable`, `friendshipReward`,
  `befriended-` under `axiomancer-mechanics/src` and `audit/`).
- The codex: if Green Jelly's friendship carries a `journalEntry`, give
  Float-Eye's the same treatment only if the codex guard requires it;
  otherwise none.

## Save / schema contracts

- One optional field on the mobile item-reward queue entry; the queue is
  persisted with the save, so an old save's entries read the field as absent
  (CONFIRM as before). No `Game/game.migrate.ts` change, no save version bump.
- No repair of saves that already carry the ring unworn: the satchel's EQUIP
  wears it in one tap, and a forced wear would override a player who took it
  off on purpose. Named under Follow-ups.

## Decisions made upfront — DO NOT ASK

- **The fix is at the hand-over, not at the board.** The rune column, the
  engine gate and the cast path already work (What exists); adding a board
  hint for "a relic in your satchel is not worn" would treat the symptom.
- **Only the first-node ring is wear-only.** It is the run's starting kit and
  D47's starting signature; every other reward keeps the EQUIP / CONFIRM
  choice EQ1a built (EQ1a's "the loadout is the truth" stands). [T to confirm #1]
- **The Open Hand keeps D47's befriend rule.** "Leave the starting ring with
  befriend": the skill stays a mercy that only a befriendable foe answers. The
  common foe is made befriendable instead of loosening the gate. [T to confirm #2]
- **Float-Eye's terms follow Green Jelly's at a normal foe's scale:** the same
  30% VITAE gate; a smaller reward than the elite's (a minor potion against a
  healing potion, `xpBonus` 10 against 35). A spared Float-Eye ends the fight
  as a friendship outcome, as the Jelly's does today; the wandering pool keeps
  drawing Float-Eye after a befriend (the flag gates nothing yet).
- **A refused rune still opens the info sheet on tap** (EQ1b); it never casts.
- **The e2e asserts a rune is drawn, not that one was cast.** A cast needs the
  foe under 30% with 4 Conviction in hand, which a seed sweep may not reach;
  A4 pins the cast hermetically.

## Tests matrix

| Suite | Kind | Subject |
|---|---|---|
| `state/e2e/item-reward.engine.test.ts` | rewritten case | the ring's CONFIRM and dismiss wear it; another relic's CONFIRM still carries unworn (A1) |
| `state/e2e/signature-trigger.engine.test.tsx` (new) | journey | fresh store → hand-over → leave the screen → live fight → rune on the board (A2) |
| `components/combat/encounter/__tests__/CombatEncounterPanel.signature-cast.test.tsx` (new) | panel | Float-Eye low: press casts and `combat-mercy` shows; full VITAE: refused, info sheet; short: nothing (A4) |
| `CombatBoard.refused-rune.test.tsx` | rewritten cases | The Open Hand refused by the HP gate, not by "will not be befriended" |
| mechanics enemy-library / befriend tests | added case | Float-Eye befriendable at or below 30%, Death Beholder not (A3) |
| `scripts/combat-round-e2e.mjs` | e2e assertion | a rune drawn on round 1; fired count in the summary (A5) |

## Verify gate

```bash
npm run verify -w axiomancer-mechanics
npm run verify -w axiomancer-mobile
node axiomancer-mobile/scripts/combat-round-e2e.mjs
npm test
```

## Commit body template

```
fix: the starting ring's signature is on the board and fires — phase SG1

Closes A1-A5 of plan/phases/phase_SG1_signature_trigger.md.
- The first-node ring hand-over wears the ring whatever the player taps ...
- Float-Eye can be befriended below 30% VITAE ...
- combat-round-e2e fails a run with no rune on the board ...

Decisions:
- ...

Verify: npm run verify -w axiomancer-mechanics; npm run verify -w axiomancer-mobile; combat-round-e2e; npm test.
```

## DoD

A1, A2, A3, A4 and A5 ticked.

## Follow-ups (out of scope)

- A save that already carries the ring unworn stays that way until the player
  taps EQUIP in the satchel (T's current run included). A one-time repair would
  need a save migration; not planned.
- The measured report (`docs/reports/measured/latest.md`) does not model mercy;
  whether the harness should spare a befriendable Float-Eye is for the next
  report regeneration, not this phase.
- The relic pass (B1, W5) may give the starting kit a second, always-castable
  signature; this phase does not author one.
