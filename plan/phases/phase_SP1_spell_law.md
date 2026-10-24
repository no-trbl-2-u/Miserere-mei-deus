# Phase SP1 — The Spell law: a Spell's PAID line exiles, and is stronger for it

## Sources

- T, 2026-10-24 (attended), after playing the Elementalist preview build: "'Spells' should actually end their paid
  line with 'Exile.'" Then, on scope (AskUserQuestion): "It should be every spell, all lanes. That's what makes a
  spell a spell. However, they should be stronger than regular skills so make sure their numbers are higher than
  their skill counterparts. And set into law that: Spells always end their paid line with EXILE and are always
  stronger than their skill counterpart (since the exiling of the card is such a downside, we want to make sure it's
  worth it to pay for it and lose it). For now, their free line does not exile."
- D69 (card types, `plan/revamp/cards.md` "Card types"): Attack, Skill and Spell are all "play, then discard". D103
  amends it: a Spell's PAID line exiles.
- The upgrade scale (`axiomancer-mechanics/src/Cards/card-upgrade.scale.ts`): one MAGNITUDE step is +40%, at least
  +2; one INTENSITY step is +1. This phase reuses it as the measure of "stronger".
- Code read while shaping this:
  - the 18 Spells: `grey-word` (`Cards/library/starters.cards.ts`; plain card, PAID in `combatEffects`); nine Blood
    Price (`blood-price.cards.ts`: p-04c, p-05b, p-09b, e-01n, e-04c, e-07b, e-10d, m-07a, m-10a; p-04c already
    exiles on PAID); eight Elementalist (`elementalist.cards.ts`: P-05, E-01, E-03, E-05, E-08, E-10, M-04, M-07);
  - `ProgramLine.exile` and `programLines` in `card-upgrade-law.engine.test.ts` (EXILE is a line flag);
  - `Cards/card-rules.ts` (the card-rules guards).

## Outcome

Every Spell, in every lane, exiles on its PAID line and not on its FREE line. To pay for that, its PAID line is at
least one upgrade step stronger than it was as a plain discard card. A guard holds both, so a future Spell cannot ship
without them.

## Acceptance

- **A1** D103 is recorded. `docs/card-spec.md` (the card types) and `plan/revamp/cards.md` "Card types" state the
  Spell lifecycle: FREE plays and discards; PAID plays, then EXILEs; a Spell's PAID line is stronger than a Skill's
  would be.
- **A2** A card-rules guard fails any Spell whose PAID line does not EXILE, or whose FREE line does. This covers
  program cards (`paid.exile`) and plain cards (`grey-word`'s PAID).
- **A3** All 18 Spells EXILE on PAID; their FREE lines are unchanged. The card face prints EXILE at the end of the
  PAID line.
- **A4** Each Spell's PAID payoffs are raised by at least one upgrade step over its pre-SP1 numbers. MAGNITUDE
  payoffs (DEAL, GUARD, HEAL, VULNERABLE %, "the foe loses", the weather numbers) take +40%, at least +2.
  INTENSITY payoffs (LEECH, Conviction, DRAW) take +1. A guard pins it: a table of each Spell's pre-SP1 PAID
  payoffs, and every applied PAID payoff at or above one step past its row. Costs never grow (the upgrade law), and
  `p-04c`, which already exiled, still takes the raise.
- **A5** Upgrades still hold: an upgraded Spell keeps EXILE on PAID, and the upgrade law tests pass.
- **A6** The measured-truth report is regenerated (grey's Word and both lanes' Spells changed) and cited by commit in
  the PR. It is a measurement, not a gate (D57).

Measure: the card-rules guard passes for all 18 Spells, and on T's next preview build every Spell's PAID line ends in
EXILE with bigger numbers than before.

## Scope

- `axiomancer-mechanics`:
  - `starters.cards.ts` (`grey-word` PAID);
  - `blood-price.cards.ts` and `elementalist.cards.ts` (the Spells' PAID lines);
  - `card-rules.ts` and its tests (A2, A4);
  - the card tests that pin these numbers.
- Docs: `docs/card-spec.md`, `plan/revamp/cards.md`, `axiomancer-mechanics/docs/keyword-atlas.md` (EXILE's
  carriers), `docs/game-model.md`, and the measured report.
- No Attack, Skill, Global or Curse changes. No engine rule changes: EXILE already exists.

## Consumers to update

- Mobile: card faces print EXILE from the line flag, so there's no code change expected. Snapshot or text tests that
  pin a Spell's PAID text are updated.
- `plan/card-ledger/rehearsal-blood-price.md` and `rehearsal-elementalist.md`: a note that SP1 changed their Spells.

## Save / schema contracts

- None. EXILE is per combat. Card ids are unchanged.

## Decisions made upfront — DO NOT ASK

- **"Stronger than its skill counterpart" means at least one upgrade step over the card's own pre-law numbers.** A
  Spell's skill counterpart is that same card as a plain discard card. This is measurable, consistent across lanes,
  and reuses the step the upgrade law already defines.
- **The grey starter's A Plain Word is a Spell and follows the law** (T: "every spell, all lanes"). Its PAID line
  (VULNERABLE +25% for 2 turns) exiles and grows. Flagged to T because it changes every fresh run.
- **FREE lines never exile, for now** (T).
- **No Skill becomes a Spell here.** That is T's later call, after play logs (Follow-ups).

## Tests matrix

- Mechanics: the A2 guard, on a fixture Spell missing PAID EXILE and one with FREE EXILE; the A4 guard on the 18; the
  upgrade law suite; the card tests for the changed numbers.
- Root: `npm test`.

## Verify gate

`npm run verify -w axiomancer-mechanics`, `npm run verify -w axiomancer-mobile`, the root `npm test`.

## Commit body template

```
Phase SP1 — The Spell law

Closes A1-A6 of plan/phases/phase_SP1_spell_law.md.
<what changed>
Verify: <commands and results>
```

## DoD

A1-A6 closed; D103 in the decisions log; the guard in the root `npm test`.

## Follow-ups (out of scope)

- Skills that may become Spells (with EXILE) once T has play logs (T, 2026-10-24: "we might have to turn some skills
  into spells (with exile) to balance them").
- BLIZZARD's drop rule (T is still testing; see `plan/card-ledger/rehearsal-elementalist.md` "Notes from play").

Size: L
