# 187 — Mercy at the killing blow: normals and elites stop at 1 VITAE and ask

> A blow that would kill a normal or elite foe sometimes leaves it standing at 1 VITAE and asks spare or finish. Finish is the kill. Spare pays the spare table, whose relic result is likelier for an elite and draws from every relic no quest pays.

## Why

### Sources

- **T, 2026-11-22 (attended, `/oversight` then `/plot`), on spec 183:** the Carapace Belt, Brimming Locket and Penitent's Brooch should come from sparing: "5% normal enemies, 15% for elites".
- **T, same session, the spare rule itself:** "if an enemy WERE to die (as in it has 10 hp and you hit it for 15) it goes to 1hp and asks spare or finish. And that applies to all spares. It should NOT be a combat advantage." Elites can be spared too.
- **T's answers to the follow-up questions:**
  - The check fires on 15% of lethal blows, today's odds.
  - Normals and elites ask; bosses never do.
  - FINISH ends the fight as the kill would have.
  - The spare relic result gives "any relic not part of a quest reward".

### What exists today

- `axiomancer-mechanics/src/Combat/combat.mercy-check.ts`:
  - `rollMercyCheck` runs after the fight is won: the foe is already at 0 VITAE and `finalOutcome` is `'victory'`. A `difficulty: 'normal'` foe asks at `MERCY_CHECK_CHANCE` (0.15); any other foe is finished.
  - `chooseMercyCheck` records `'spared'` or `'finished'`.
  - `mercyCheckSettled` gates payment.
- `axiomancer-mechanics/src/Combat/combat.spare-reward.ts`: `rollSpareReward` rolls `MERCY_TUNING.spareTable` once (shillings 30, consumable 30, upgrade 15, transform 10, gear 10, relic 5). The relic result draws from every relic the player does not carry.
- `axiomancer-mobile/components/combat/encounter/CombatEncounterPanel.tsx` (~line 689) rolls the check when the fight ends and shows the spare-or-finish prompt. `axiomancer-mobile/sim/run-fight.ts` (~line 134) answers it in the sims.
- `axiomancer-mechanics/src/World/roster-health.ts` `orphanItems` does not count the spare pool, so the three relics are pinned as orphans.
- Principle P2 (`identity/principles.md`) and `plan/bearings.md` "Win condition": emptying VITAE is the only way to win, and the check asks only normal foes. This spec changes both (a decision below).

### The small version first

The 5% for normals is already built: the spare table's relic result (5 of 100) already includes the three relics. Two chunks do the rest. The check moves to the lethal blow and opens to elites. Then the relic result follows T's pool and the elite rate, and roster health counts it.

## Design

### The check at the lethal blow (A1, A2)

- **When.** A blow (any damage source the player's turn resolves: card, die, status tick) that would take a normal or elite foe from above 0 to 0 VITAE is the lethal blow.
  - At `MERCY_CHECK_CHANCE` (0.15, from the combat rng), the foe's VITAE is set to 1 instead and the fight pauses with `mercyCheck: 'offered'`. `finalOutcome` stays `null`.
  - Bosses never ask. A fight with several foes asks only on the blow that would end the fight.
- **Not a combat advantage.** While the check is open:
  - The foe takes no turn, and no start-of-turn or end-of-turn effect fires on either side.
  - Nothing else resolves: the rest of the card's effects, queued dice and statuses wait, then are discarded when the check is answered.
  - The player cannot play, roll or end the turn; the prompt is the only action.
- **FINISH.** The foe's VITAE goes to 0 and the fight ends exactly as the lethal blow would have ended it without the check: the same `finalOutcome: 'victory'`, the same on-kill effects, the same pay. `mercyCheck: 'finished'`.
- **SPARE.** The fight ends as a win with the foe left at 1 VITAE: `finalOutcome: 'victory'`, `mercyCheck: 'spared'`, no on-kill effects. It pays the spare wage and one spare-table roll, as today.
- **The rest stays as is.** The spare-or-finish screen, its copy, the spare wage, the journal entry and the attribution (`'mercy'`) keep working on the new timing.
- `rollMercyCheck` is replaced by the check inside the damage step; the after-the-win roll is removed. The sims answer it with the same witness policies. Footgun `win-effects-before-the-check` stays true: payment still gates on `mercyCheckSettled`.

### The spare relic result (A3, A4)

- **Rate.** A spared elite rolls the table with the relic weight at **15 of 100**, taking the 10 from shillings (30 → 20) [T to confirm #1]. A spared normal keeps today's table (relic 5).
- **Pool.** Every relic in `relicLibrary` that the player does not carry and that no registered questline step or quest pays as a reward (T: "any relic not part of a quest reward"). Elite-source relics are in it; the Ruby Signet and the Mirror Brooch (Breakwater questline rewards) are not.
  - The pool is read from the questlines, not from `relicSource`. The Carapace Belt, Brimming Locket and Penitent's Brooch are labelled quest relics, but no quest pays them, so they are in.
  - An empty pool pays the shillings result, as today.
- **Roster health.** `orphanItems` counts every relic in the spare pool as granted. The three pins go, and the 183 orphan test's six stays green.

### Decisions (proposed, T approves by merging)

- **D?mercy-at-the-blow** · 2026-11-22 · The mercy check fires on the lethal blow, not after the win. On 15% of lethal blows against a normal or elite foe, the foe stands at 1 VITAE and asks spare or finish. Finish is the kill; spare is a win that leaves the foe at 1 VITAE. The check gives neither side a turn or an effect. P2 and bearings' "Win condition" are reworded to match. *Why:* T's rule (2026-11-22); sparing should feel like holding the blow back, and elites can be spared.
- **D?spare-relic-pool** · 2026-11-22 · A spare's relic result draws from every relic the player does not carry that no quest pays; a spared elite's relic weight is 15 of 100. *Why:* T, 2026-11-22: the relics nothing else hands out come from mercy.

### Out of scope

- Bosses asking, any change to the mercy chance (0.15), the spare wage, or the other table results' rewards.
- Giving the three relics a quest.

## Acceptance

- **A1** A blow that would kill a normal or elite foe, with the check drawn, leaves it at 1 VITAE with the spare-or-finish prompt open and `finalOutcome` still `null`. Neither side takes a turn or fires an effect until it is answered. A boss is never asked. Engine tests cover a card, a die and a status tick as the lethal source.
- **A2** FINISH ends the fight with the same state, pay and on-kill effects as the same blow with the check not drawn (a test compares the two). SPARE ends it as a win at 1 VITAE paying the spare wage and one table roll. The app prompt, an e2e from the blow through each answer, and the sims' witness answers all work on the new timing. P2 and bearings read the new rule.
- **A3** A spared elite's table has relic weight 15 and shillings 20; a normal's is unchanged. Tests pin both tables.
- **A4** The spare relic pool is every relic not carried and not paid by any quest. A test shows the three relics in it and the Ruby Signet and Mirror Brooch out of it. Roster health lists none of the three as orphans.

## Open questions

- [T to confirm #1] Where an elite's extra 10 relic weight comes from. Default: shillings (30 → 20). Or: spread across shillings and consumable (25/25); or raise the total to 110 so nothing shrinks (relic is then 13.6%).

## Chunks

Measure: 4 open · 0 closed · next A5
- [ ] **187.1** The mercy check at the lethal blow, for normals and elites · M · closes A1, A2 · needs — · alias: MR6a
  - Engine: the check inside the damage step of `combat.engine.ts` (a foe at 1 VITAE, `mercyCheck: 'offered'`, the fight paused); FINISH and SPARE resolution in `combat.mercy-check.ts`; the old post-win `rollMercyCheck` removed. Tests written red first for each lethal source, the boss exclusion and FINISH matching the no-check kill.
  - App: `CombatEncounterPanel` opens the prompt from the paused state; no input but the prompt while it is open. Sims: `sim/run-fight.ts` and `run-policy.fight.ts` answer the paused check.
  - `identity/principles.md` P2 and `plan/bearings.md` "Win condition" reworded to the decision.
  - Check siblings: `combat.attribution.ts`, the spare-reward presenter, the mercy e2e walkers (footgun `win-effects-before-the-check`), `docs/game-model.md`'s mercy lines.
  - Measure: mechanics and mobile verify gates and the root `npm test` pass.
- [ ] **187.2** The spare relic pool and the elite relic rate · S · closes A3, A4 · needs 187.1 · alias: MR6b
  - Engine: an elite spare table in `MERCY_TUNING`, picked by the spared foe's difficulty; the relic pool in `combat.spare-reward.ts` excludes relics any questline pays. `roster-health.ts` counts the spare pool as granted and drops the three pins.
  - Measure: `npm run verify -w axiomancer-mechanics` and the root `npm test` pass.
