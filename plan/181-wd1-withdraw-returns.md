# 181 — Withdraw sends the player back

> Withdrawing from a fight, or fleeing it before it starts, leaves the player standing on the fight's node, so the way on is open without the fight won. The player goes back to the node they came from, and the fight node stays unspent. WITHDRAW's second line goes.

## Why

### Sources

- **T, 2026-11-12 (attended, after the review of the fight reveal):** "Withdraw ... Keep withdraw, AND, there's a bug. Withdraw should send you back to the node you came from." And the line under the button: "remove that line."
- **T, 2026-11-12, the worked case:** nodes 1, 2, 3; 1 is the start, 2 is combat, 3 is a quest. The player starts on 1 and moves to 2, and has to complete 2's fight to move on to 3. Today they can withdraw, but then they stay on 2 and may move to 3. They should go back to 1. And "Node 1 (any starting node) will never be a combat encounter."
- **T, 2026-11-12, scope:** both ways out of a fight, the reveal's WITHDRAW and the prelude's FLEE, go back.

### What exists today

- **A flee leaves the player on the node.** `END_COMBAT` with a flee outcome runs `answerUnsettledArrival` (`axiomancer-mechanics/src/Game/game.reducer.ts`, `World/MapEvents/resolve-map-event.ts`): it only clears the owed arrival, so the node stays unspent and the player stays on it, with its moves open (phase QL1c, A24; `axiomancer-mobile/state/e2e/flee-incomplete.engine.test.tsx` asserts exactly this).
- **Two ways out.** The reveal's WITHDRAW calls `fleeEncounter` then `endCombat('flee')` (`axiomancer-mobile/app/combat-encounter/index.tsx`, `state/actions.ts`); the prelude's FLEE answers the arrival through `answerArrivalAction` (`state/actions.ts`, the `pickEventChoice` flee branch).
- **The death return already goes back.** `returnNode` in `axiomancer-mechanics/src/Game/death.ts` reads `map.arrivedFrom`, moves the player there, reveals its adjacents and re-syncs the move lists. The map state carries `arrivedFrom` and `currentNode`.
- **The second line.** `WITHDRAW_COST` (`axiomancer-mobile/components/combat/encounter/reveal.copy.ts`) is a `[content]` placeholder, "No reward. You may try again.", drawn under WITHDRAW in `CombatEncounterPanel.tsx`.

### The small version first

The engine already knows where the player came from. The fix reuses the death return's rule for a flee: one engine function, used by both ways out, plus the line's removal. One chunk.

## Design

### The retreat (A1)

- **One engine rule.** A flee (WITHDRAW or the prelude's FLEE) moves the player to `map.arrivedFrom`, reveals that node's adjacents and re-syncs the move lists, the way `returnNode`'s caller does. The fight node stays unspent (not in `consumedNodes`), its arrival answered, so moving onto it again is a fresh arrival and a fresh fight.
- **The way on stays shut.** From the node they return to, the player cannot reach the node beyond the fight node; to pass it they must win the fight.
- **No previous node cannot happen for a fight.** A start node is never a combat encounter (T), so a fight always has an `arrivedFrom`. If the engine is ever asked to flee with none, it leaves the player where they are, as today.
- **Defeat is unchanged.** A defeat still goes through the death rule; only the flee outcome changes.

### The button (A2)

- WITHDRAW stays, with its label and its place. The second line is gone: no `WITHDRAW_COST`, no empty row left under the label. Bosses still have no WITHDRAW.

### Decisions made upfront (do not ask)

- Both ways out go back, one rule (T, 2026-11-12).
- The retreat is free and gives no reward, as before; nothing about the toast or the run log changes except the node the player ends on.

### Out of scope

- A retreat from inside a fight (there is none; `retreat` is dead code).
- Changing the death return.

## Acceptance

- **A1** A flee, by WITHDRAW or by the prelude's FLEE, puts the player on the node they came from, with the fight node unspent and its arrival answered; from there the node beyond the fight node is not reachable, and walking back onto the fight node is a fresh fight. Tested on a three-node map: 1 start, 2 combat, 3 quest. `flee-incomplete.engine.test.tsx` is rewritten to say so.
- **A2** The fight reveal's WITHDRAW shows only its label: `WITHDRAW_COST` and its row are gone, and no test or lint still names them.

## Open questions

None.

## Chunks

Measure: 2 open · 0 closed · next A3
- [ ] **181.1** Withdraw and flee go back to the previous node; WITHDRAW loses its second line · S · closes A1, A2 · needs — · alias: WD1a
  - Engine: a pure function beside `answerUnsettledArrival` that answers the arrival and moves the player to `arrivedFrom` (the death return's rule: reveal adjacents, sync move lists); `END_COMBAT` runs it for a flee outcome, and the prelude's flee branch reaches it too. Victory and defeat paths untouched.
  - Mobile: `reveal.copy.ts` and `CombatEncounterPanel.tsx` drop `WITHDRAW_COST` and its text; the withdraw button's style loses what only the second line needed.
  - Tests: an engine test on the three-node map (1 start, 2 combat, 3 quest) for A1 through both ways out, red first; `flee-incomplete.engine.test.tsx` updated; a screen test that WITHDRAW renders its label and no second line. Check siblings: the run log and play log record the flee as before; any visual baseline of the reveal (`combat-encounter.png`, `combat-elite.png`) re-stamps.
  - Measure: `npm run verify -w axiomancer-mechanics`, mobile `npx tsc --noEmit`, lint and the whole jest suite, and the root `npm test` pass.
