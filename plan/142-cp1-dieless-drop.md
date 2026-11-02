# 142 — A card with no die to wait for plays when it lands

> Drop a card on the board when no die in the tray could power it, and it plays on landing instead of sitting staged until APPLY or END TURN.

## Why

### Sources

- `/pitch` then `/plot asap` from T, 2026-11-02, attended. The pitch is `braindump/2026-11-02-dieless-drop.md`.
  T's words:
  - "If you drag a card onto the board and you currently don't have a die that could power it, then just 'accept' the card once it lands"
  - "The apply tap right now gives the player the ability to stage the dice. This proposal is about speeding things up when that's not needed. The downside of using the endturn to apply is, all the cards stacked on top of the enemy look bad and it's not intuitive"
  - On a die held by another staged card: "Yes, so it waits". On the drop being final: "Yes, drop means play".
  - T also asked that the plot PR be merged for them once its checks are green, then `/next` run on the new row.

### What exists today (read 2026-11-02, at 5f616b856)

A card dropped on the play area is staged, not played. `resolveDrop` (`CombatBoard.tsx:1066-1081`) refuses it only when
its free and paid lines are both blocked, and otherwise calls `onStage`. It then waits for one of two things:

- the APPLY ribbon on the staged card (`CombatBoard.tsx:757-763`), which commits it powered by the die dropped on it, or
  FREE when none is assigned (`handleApplyRef`, `CombatBoard.tsx:1333`);
- END TURN, which calls `handleApplyRef` on every staged card before `onEndPhase` (`CombatBoard.tsx:1383`).

So a card with no die to wait for still sits on the board, and every one of them plays in a single burst at END TURN.
Nothing is lost by the wait except time and how the board looks. The wait exists only so a die can still be dragged
onto the card (`resolveDieDropTarget`, `CombatBoard.tsx:176-190`).

## Design

This is a presentation change in `axiomancer-mobile`. The engine's play (`playCombatCard`) and every rule stay as they
are.

**When a card counts as having a die.** At the drop, a card "has a die" when at least one unspent die in the tray
could power it: `dieCanPowerCardVM(die, card.stance)` holds and the card's paid line is not blocked (`paidBlock`).
A die that another staged card holds still counts (T, 2026-11-02), so a card that could have used it stages and waits
as today. A die that could not go on the card (wrong colour, or the paid line blocked) does not count.

**What happens at the drop.**

| Card | What happens on landing |
|---|---|
| No die in the tray could power it, free line playable | It plays FREE at once, through the same call APPLY uses with no die, and nothing stays staged |
| At least one die could power it | It stages and waits for APPLY or END TURN, as today |
| No die could power it, free line blocked, paid line playable | Stages or is refused exactly as today |
| Free and paid lines both blocked | Refused at the drop, as today |

The play goes through `onApply(uid, null, false)`, the same path as APPLY, so the log, the fight recorder and every
engine event are the ones APPLY produces. The shortcut adds no new play path.

### Decisions made upfront (do not ask)

- The trigger is the drop onto the play area. No new gesture, button or setting (T, 2026-11-02).
- A die held by another staged card counts as one that could power the card, so that card waits (T, 2026-11-02).
- Drop means play, for every card, including one whose free line costs something. No take-back and no undo window
  (T, 2026-11-02).
- A dieless card whose free line is blocked does not play on landing (the engine would refuse it).
- No card text, keyword or art changes (D37, D88).

### Out of scope

- END TURN playing the staged pile one card at a time (the pitch's Option B).
- Any undo of a played card.
- Cards a player chooses to hold for a die the tray may get back mid-turn (a refresh or a banked die). By design they
  have played already; if that bites in play, it is a follow-up.

## Acceptance

- **A1** Dropping a card on the board when no unspent die in the tray could power it plays it FREE on landing, and
  nothing is left staged.
- **A2** A card that at least one die in the tray could power, including one held by another staged card, stages as
  today and waits for APPLY or END TURN.
- **A3** A dieless card whose free line is blocked does not play on landing; it stages or is refused exactly as today.
- **A4** The landing play goes through the same call as APPLY with no die, so rules outcomes are unchanged, and a test
  pins each case in Design's table from real engine state.
- **A5** After a turn of only dieless drops, END TURN finds nothing staged and ends the turn.

## Open questions

1. A matching die exists but the card's paid line is blocked, so the die could not go on it. Default: the card counts as
   having no die and plays. [T to confirm #1]

## Chunks

Measure: 5 open · 0 closed · next A6

- [ ] **142.1** A card with no die to wait for plays when it lands · M · closes A1, A2, A3, A4, A5 · needs — · alias: CP1a

### 142.1 (CP1a) — A card with no die to wait for plays when it lands · M · closes A1-A5 · requires —

- `components/combat/encounter/CombatBoard.tsx`: in `resolveDrop`'s play-area branch, after the both-blocked refusal,
  decide "has a die" per Design and either stage or call `onApply(uid, null, false)`. Keep the decision in a pure
  exported helper beside `resolveDieDropTarget` so a test can ask it directly.
- Tests, beside `CombatBoard.colorlaw.test.tsx` and the other board suites: the helper over each row of Design's table,
  and one drop test through a rendered board on a real `CombatEncounterState` that reads the staged list and the
  engine's events (A4, A5).
- Measure: `npx jest components/combat` in `axiomancer-mobile`, then `npm run verify -w axiomancer-mobile`. Run it where
  no dev server has generated `axiomancer-mobile/expo-env.d.ts`: that file turns `tsc` red on `useDockDrag.tsx`.
- T drops a dieless card on the preview build or the dev server and sees it resolve on landing.
