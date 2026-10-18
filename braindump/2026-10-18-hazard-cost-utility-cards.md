# Hazard puzzle cost-utility cards — 2026-10-18

## Surface question
"Make the hazard puzzles more interesting: some cards subtract from the outcome in exchange for a utility
benefit like drawing cards, gaining a die or triggering a reroll." (T)

## Better question surfaced
Today's demos leave little to decide, and a cost card helps only if paying it opens a line nothing else reaches.
So: what makes a cost card *necessary sometimes and wrong sometimes*, measured by the solver rather than by
taste, and what in today's rules (the bin, the outcome count) hides that?

## Raw material read
- `HazardCardDef` (`axiomancer-mechanics/src/World/Hazard/hazard.types.ts:72`): numbers `f`/`e` (free line) and
  `fp`/`ep` (powered line), utility `effect: 'draw' | 'recast' | 'convert'` with `drawBase`/`drawPowered`,
  `majorEffect`, `salvage`. All shipped values are 0 or positive.
- `puzzle/hazard-puzzle.session.ts`: the round runs the live engine's stage, unstage, power, apply and discard;
  the reserve is the draw pile; no RNG.
- The solver (`puzzle/hazard-puzzle.solver.ts`) and a scratch enumerator over the three demos, plus two
  runtime-only prototype cards (never committed): TOLL (purple, -1/-1 free, 0/0 powered, DRAW 2) and GREED
  (purple, -3/-3 both lines, DRAW 2).

## Measured (scratch run on main, 2026-10-18; prototypes runtime-only)

| Finding | Data |
|---|---|
| F1 "Hard" means "play everything" | Hard risk: both wins use all 5 cards. Medium risk: footing, grip, runner in all 9 wins. |
| F2 Irrelevant options inflate the count | Adding TOLL to an unchanged layout: hard risk 2 → 6 wins, TOLL staged in 2; safe 5 → 17; cliff safe 71 → 233. Holding or binning a card that changes nothing counts as a new solution. |
| F3 A cost card is necessary only when the reserve holds what nothing else reaches | Hand HAUL/SCRAMBLE/TOLL, reserve IRON GRIP/FAITH LEAP, goal [12,12]: 1 win, surplus 0, TOLL required; without TOLL, 0 wins. The winning line spends a die on TOLL to cancel its cost. |
| F4 A trap emerges | GREED (-3/-3, DRAW 2) is staged in 5-6 easy/medium wins and 0 hard wins. |
| F5 "Pay for a die" half-exists | `salvage: { type: 'mana' }` bins a card for a die; CONVERT/RE-CAST majors add +1 die. Paying for a die on APPLY is new. |
| F6 Reroll vs A2 | Puzzles never read an RNG; RE-CAST is rejected. |
| F7 Negatives already sum | `hazardCardValue` and `hazardProjectedProgress` add signed values; `judge` clamps only p to [0, 1]. |

No-bin re-run of the demos (discard moves removed; "contributing" = distinct sets of staged cards that add
value or hold a die):

| Demo / route | Band | Today | No bin: wins | No bin: contributing sets |
|---|---|---|---|---|
| cliff easy / safe | easy (30+) | 71 | 34 | 34 |
| cliff easy / risk | easy (30+) | 35 | **16 (out of band)** | 16 |
| ashfall medium / safe | medium (5-29) | 23 | 17 | 12 |
| ashfall medium / risk | medium (5-29) | 9 | 7 | 4 (out of band if counted this way) |
| undercroft hard / safe | medium (5-29) | 5 | **4 (out of band)** | 4 |
| undercroft hard / risk | hard (1-4) | 2 | 2 | 2 |

## Prior art consulted
- **Slay the Spire — Offering:** lose 6 HP, gain 2 energy and draw 3. I read it as highly valued by players;
  I don't have a confident read on reception beyond that.
- **Magic: The Gathering — Phyrexian mana:** pay 2 life instead of a coloured mana. Gitaxian Probe was banned
  in Modern partly because a near-free cost card goes in every deck (Wizards' ban announcements). This is the F2
  risk: a cost so cheap the card is always played.
- **Into the Breach — perfect information:** the turn being solved has no hidden randomness. It backs
  layout-set reroll faces over real rerolls.
- **Hades — Chaos boons:** a temporary curse paid for a later blessing; the model for Option C.

## Rulings (T, this session)
- **Negative values are signed, never clamped.** A meter can show a debt; a cost can't be dodged.
- **Reroll is to layout-set faces**, listed in order like the reserve, so A2 (no RNG) holds.
- **A cost may sit on either line or both.** Not limited.
- **Utilities in scope:** cost → DRAW, cost → +1 die, cost → reroll to set faces, cost → CONVERT, and other
  utilities "within the current mechanics".
- **Players cannot bin or discard cards in puzzles.** T: "This shines a light on a major issue! Players should
  not be able to bin/discard cards." Scope: puzzles only; the live three-round hazard is left alone until the
  Act 1 rollout replaces it.
- **Demos that fall out of band are re-authored** in the same phase, with existing cards only.
- **Directions recorded:** A Toll and B Debt, and C Overdrive.
- **Next:** `/plot` the engine phase only. Card design stays with T (D37) in a later attended session.

## Design directions on the table

### Option A — Toll
*(inspired by Slay the Spire, Offering)*

A small cost on the free line that a die cancels (example: -1/-1 DRAW 2, 0/0 DRAW 2 powered). The choice is
"spend the die on the cost, or on a number card".

**Trade-off:** matters only when the reserve or dice hold something no other card reaches (F3).
**Telltale failure mode:** staged in every winning line; the die choice disappears ("free spell").

### Option B — Debt
*(inspired by MTG, Phyrexian mana)*

A cost on both lines, so a die never removes it, paired with a big utility (example: -3/-3 DRAW 2). The trap:
helps on easy layouts, loses hard ones by exactly its cost (F4). With no bin, a Debt card left in hand is simply
held, so the trap stays fair.

**Trade-off:** easy to over-punish; needs a layout where taking it is right.
**Telltale failure mode:** never staged anywhere; it becomes a CRACK card with extra steps.

### Option C — Overdrive
*(inspired by Hades, Chaos boons)*

A positive free line; powering adds a utility and a cost together (example: red +3 FORCE free; powered +6 FORCE,
gain a blue die, -2 ESCAPE).

**Trade-off:** adds a choice to existing play; stresses the dual-meter risk route most.
**Telltale failure mode:** on the safe route, the combined meter absorbs the cost and the choice vanishes.

## What proves it (not T, not Claude)
- Solver numbers per layout: each cost card appears in some but not all winning lines; at least one layout can
  only be solved with one; no card is strictly worse than another in every layout; every layout stays in band.
- Timed first-time solves by the `playtester` agent and T, compared with the current demos (B3f).

## Decision / leaning
Engine phase first: no bin in puzzles, a count that ignores cards that change nothing, a per-card report, signed
costs, +die, layout-set reroll faces, CONVERT and DRAW with costs. Then T designs the cards (A, B, C) in an
attended session against the per-card report.

## Open questions
- Amounts for the new utilities (+die count, how many dice a reroll touches) are engine defaults until T's card
  session sets them per card.
- Whether a cost card should ever be gold (utility-first).
- "Other utilities within the current mechanics": a narrower recolour (one die to a named colour) is the
  candidate; Recall (take back a binned card) is moot with no bin.
