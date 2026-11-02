# A dropped card with no die plays on landing — 2026-11-02

## Surface question
"I was thinking of ways to speed up combat rounds a little bit ... If you drag a card onto the board and you currently
don't have a die that could power it, then just 'accept' the card once it lands."

## Better question surfaced
Today a dropped card stays staged on the board until its APPLY ribbon is tapped or END TURN plays every staged card
(`CombatBoard.tsx:1383`, read from `origin/main`, not watched on screen). The APPLY step exists so the player can drag a
die onto the card first. When no die could ever go on it, that step buys nothing, and END TURN then plays a pile of
stacked cards over the enemy in one go, which looks bad and is not intuitive (T, t2). The question is not "how do we
cut taps" but "when does a staged card have nothing left to wait for".

## Path taken this session
1. Opened diverge: one solution named, no mechanism for "could power it" given. A read of the board code found that
   END TURN already plays staged cards, so the stated itch (having to tap each one) did not match the code.
2. t1: T's trigger. t2: T re-grounded the itch (the pile on the enemy, and that APPLY exists to stage dice) and ruled
   three calls. The GOAL narrowed from "no accept tap" to "the card resolves on landing".
3. Parked: nothing.

## Raw material read
- `axiomancer-mobile/components/combat/encounter/CombatBoard.tsx:1383`: END TURN calls `handleApplyRef` for every staged card, then `onEndPhase`.
- `CombatBoard.tsx:1333`: `handleApply` commits FREE when no die is assigned to the card, powered when one is.
- `CombatBoard.tsx:1068-1081`: a drop on the play area refuses a card whose free and paid lines are both blocked, else calls `onStage`.
- `CombatBoard.tsx:176-190` `resolveDieDropTarget`: a die is legal on a card when its stance matches, the card holds no pending die and the paid line is not blocked.
- `CombatBoard.tsx:1377`: END TURN is held only while a staged card holds a die on an unpayable PAID discard line.
- `CombatEncounterPanel.tsx:604-613`: `onApply` calls `playCombatCard(state, { uid }, power, dieId)`.

## Measured
Not measurable before build: taps per turn and how the pile looks exist only in play. The fight recorder's `ui-staged`
events (spec 128) could count staged drops per turn on a later run; no such run was made.

## Prior art consulted
The knowledge base returned nothing on card-play UI (searched all scopes). Both cases are memory reads, not KB citations.
- **Slay the Spire — drag to play, no confirm step:** a card plays on release over the target; a drag cancelled before release returns it to hand, and nothing is staged. No confident read on reception of this detail.
- **Marvel Snap — stage, then commit at End Turn:** cards sit on the board and resolve together when the turn ends, with a retreat before that. It is the model this game has today; no confident read on reception.

## Rulings (T, this session)
- The trigger: a card dropped on the board when no die could power it plays on landing (t1).
- APPLY exists to let the player stage dice, so the shortcut covers only cards where that is not needed (t2).
- A die held by another staged card still counts as one that could power the new card, so that card waits (t2).
- Drop means play, for every card, including ones whose free line costs something. No take-back (t2).

## Directions considered
### Option A — Play on landing when no die could power it *(chosen by T)*
The drop calls the same play APPLY calls, with no die. **Trade-off:** a mis-drop cannot be undone. **Telltale failure
mode:** a die returned mid-turn (a refresh or a banked die) would have powered a card that already played FREE.
### Option B — Keep staging, resolve the pile one card at a time at END TURN
Each staged card flies off the board in turn. **Trade-off:** fixes how the stack looks but saves no taps and no time.
**Telltale failure mode:** END TURN becomes slower, which is the opposite of the goal. Not chosen.

## What proves it (not T, not the agent)
A jest suite on the board's drop path with a real `CombatEncounterState`: each case drops a card and reads the staged
list and the engine's events. A pass: a dieless drop leaves nothing staged and its play events are those of APPLY.
Then T plays it on the dev server and sees a dieless card resolve on landing.

## Handoff to /plot
Task: A card dropped on the board plays on landing when no die in the tray could power it, so cards stop stacking on the enemy and T stops tapping APPLY on cards that need no die.
Source: this file
Visual: skipped
Acceptance:
- A1 Dropping a card on the board when no die in the tray could power it plays it FREE on landing, and it leaves nothing staged.
- A2 A card for which at least one die in the tray could be powered (including one held by another staged card) stages as today and waits for APPLY or END TURN.
- A3 A dieless card whose free line is blocked does not play on landing; it stages or is refused exactly as today.
- A4 The landing play goes through the same engine call as APPLY with no die, so rules outcomes are unchanged, and a test pins each case from real engine state.
- A5 After a turn of only dieless drops, END TURN finds nothing staged and ends the turn.
Measure: a jest suite over the board's drop path (A1-A5), then T drops a dieless card on the dev server and sees it resolve on landing.
Decisions made upfront: the trigger is the drop; a die held by another staged card counts as one that could power the card; drop means play for every card, with no take-back; no card text, keyword or art changes.
Out of scope: END TURN playing the pile one card at a time (Option B); undo of a played card.
To confirm: a matching die exists but the card's paid line is blocked: default "that die could not go on it, so the card counts as dieless and plays" [T to confirm #1].
Suggested slot: asap, because the Nov 9 Mid-MVP check plays fights and T wants combat faster.
