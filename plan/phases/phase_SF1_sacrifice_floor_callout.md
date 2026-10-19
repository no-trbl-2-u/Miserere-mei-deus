# Phase SF1 — The SACRIFICE floor points at the VITAE bar

> Agent-facing brief, plotted by T (`/plot`, 2026-10-14), from the
> PR #516 review. UI only: no card, keyword, art or engine rule changes
> (D37, D88).

## Sources

- T's request, 2026-10-14, on PR #516: a line refused with "that
  SACRIFICE would leave you below 1 VITAE" is understandable, "let's
  drop a note where when this happens, call attention to the health bar
  in some way to show the user why".
- PR #516 (`loop/iterate-blocked-die-drop`, closes #515): adds the
  refused-stage and refused-die-drop reject line
  (`PROGRAM_COPY.blocked`) and gates on the engine's
  `paidBlock` / `freeBlock`.
- Engine: `programIllegalReason` in
  `axiomancer-mechanics/src/Combat/combat.card-program.ts` (the
  SACRIFICE floor branch), `programLineBlock` in `combat.engine.ts`.
- Decisions: **D37**, **D88** (no card, keyword or art change),
  **D84** (code by PR; T merges). BT2b (D92) moves the player VITAE bar
  into a footer dock; this phase targets the bar's component, wherever
  it lives.

## Outcome

When a card line is refused because its SACRIFICE would leave the player
below 1 VITAE, the player's VITAE bar visibly flags itself and shows the
SACRIFICE that cannot be paid, so the player sees why without reading
the reject line.

## Acceptance

- A1. The engine exports a structured reason for the SACRIFICE floor:
  `programLineShortfall(state, uid, paid, x?)` returns
  `{ cost: number; vitae: number } | null` (non-null exactly when
  `programLineBlock` returns the SACRIFICE-floor reason). An engine
  test pins it on a Blood Price card at low VITAE (e.g. P-01a PAID at
  4 VITAE: `{ cost: 4, vitae: 4 }`) and null when the line can be paid.
- A2. The card play VM carries it (`play.paidShortfall` /
  `play.freeShortfall`), read from A1. The presenter does not match the
  reason string and does not re-derive the rule.
- A3. When the board refuses a stage, die drop, die tap or APPLY on a
  line with a shortfall, the player VITAE bar runs a callout: a red
  pulse on the bar's outline (2 cycles, about 900 ms total) and a ghost
  segment of `cost` drawn from the current fill past the bar's floor,
  labelled `SACRIFICE <cost>`. [T to confirm the look]
- A4. With reduce-motion on, the callout is a static red outline and
  ghost segment for the same duration, with no pulse.
- A5. The reject line gains the bar as its accessibility target: the
  VITAE bar's accessibility label during the callout reads
  `VITAE <vitae> of <max>. SACRIFICE <cost> would leave you below 1.`
- A6. A refusal for any other reason (half-VITAE condition, Global
  already in play, off-colour die, armed card) does not trigger the
  callout. A jest test pins both directions.

Measure: `npm run verify`; the new engine test and the CombatBoard jest
cases pass; a `verify:visual` shot of the callout at low VITAE.

## Scope

- `axiomancer-mechanics`: `combat.card-program.ts` (shortfall helper
  next to `programIllegalReason`; the floor check is factored so both
  read one computation), `combat.engine.ts` export, `index.ts` exports.
- `axiomancer-mobile`: `state/presenters/card-program.engine.ts` (VM
  fields), `combat-encounter.engine.ts` (VM type),
  `components/combat/encounter/CombatBoard.tsx` (trigger),
  the player VITAE bar component (`CombatCombatantPane.tsx` today) for
  the callout.

## Consumers to update

- The card play VM consumers in `CombatBoard.tsx` (the reject paths
  PR #516 added).

## Save / schema contracts

- None. Nothing is saved.

## Decisions made upfront — DO NOT ASK

- Trigger on the refusal, not on hover or staging: the callout answers
  "why was that refused" (T's ask).
- The engine owns the number (A1); mobile never computes cost minus
  VITAE (mobile AGENTS rule: no rules in presenters).
- The look in A3 is the leading option (T confirmed 2026-10-19);
  ship it and T judges it in the PR.
- Requires PR #516 merged, because the refusal paths come from it.

## Tests matrix

- mechanics: `blood-price.engine.test.ts` (or a sibling) — A1.
- mobile: `CombatBoard.colorlaw.test.tsx` or a new
  `CombatBoard.sacfloor.test.tsx` — A3, A5, A6.

## Verify gate

`npm run verify`; `npm run verify:visual --workspace axiomancer-mobile`.

## Commit body template

```
SF1: the SACRIFICE floor points at the VITAE bar

A refused line whose SACRIFICE would leave you below 1 VITAE now flags
the VITAE bar and shows the unpaid SACRIFICE. Acceptance A1-A6.
```

## DoD

A1-A6 ticked.

## Follow-ups (out of scope)

- The same callout for "SACRIFICE any amount" X lines when the chosen X
  exceeds the floor.
