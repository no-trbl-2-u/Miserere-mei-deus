# Phase CL1 — Ballots pitch no colour; colours are split after T picks

## Sources

- T, 2026-10-26 (attended session), on the pitch "colour is payment only, scaling lives on the keyword": "Yes,
  let's go with what you're saying. A card's colour is ONLY what die pays for them and is not categorized
  otherwise. This means for lane-creator, don't have it pitch a color for the cards. Instead, I pick the cards,
  then afterwards, it can split the colors up evenly." And: "We can move THORNS to heart."
- Decisions: D110 (colour is payment only; THORNS scales with Heart, this plot), D40 (stats scale keyword
  families: kept; its "a card's colour is its main keyword's family" clause is what D110 replaces), D65 (the
  Color Law, unchanged), D102 (the lane-creator flow), phase BV3 (the job-to-colour pitch this phase retires).
- Code read while shaping this:
  - `plan/card-ledger/ballot-kit.js`: `JOB_COLORS`, `COLOR_TINTS`, `colorOf`, `colorLabel`, `colorTally`,
    `tallyWords`, `pitchProblems` (every candidate needs a job; each colour 27-33 of 90); the Generate text
    printing each keeper's colour (`KEEP P-01b (red)`); the candidate face tinted by its job.
  - `scripts/ballot-kit.test.mjs` (`:282-335`): the table, the docs-match test that pins `docs/lane-creator.md`'s
    job table, the open-ballot pitch check, the tally.
  - `docs/lane-creator.md` "Pitching a colour"; `.claude/commands/lane-creator.md` steps 3, 5 and 7;
    `plan/card-ledger/README.md` "Adding the next ballot" item 2 "The colours".
  - `docs/card-spec.md:128`, T's 2026-10-13 ballot: "A lane card is coloured; its colour is the stat its payoff
    scales with" (the ruling D110 amends).
  - The open Defender ballot (`rehearsal-defender.ballot.html`, `defender-2026-10-26`) carries a `job` on all 90
    candidates; the Elementalist ballot predates the pitch.

## Outcome

T votes on card text only: no ballot shows, checks or tallies a colour, and after T's picks the session splits the
kept family's colours evenly, which T then edits.

Size: S

## Acceptance

- **A1** The ballot kit pitches no colour: `JOB_COLORS`, `colorOf`, `colorTally`, `tallyWords` and `pitchProblems`
  are removed (or `pitchProblems` reduced to nothing a ballot can fail on colour); a candidate's `job`, if a data
  file still has one, is ignored; the candidate face shows no colour tint; the Generate text prints `KEEP P-01b`
  with no colour.
- **A2** `scripts/ballot-kit.test.mjs` drops the colour tests and gains one that fails a ballot data file whose
  candidates carry a colour (`color`, `colour` or `job`) on a ballot opened after this phase; the Defender ballot's
  `job` fields are removed in the same PR.
- **A3** The even split, after T picks: `docs/lane-creator.md` replaces "Pitching a colour" with "Colours after the
  picks": at step 7 (the revisions) the session proposes a colour for every kept lane card so red, blue and purple
  are as even as the count allows (a family of 30: 10 each), and as even as it can within each sub-lane (Payoff,
  Engine and Misc each split about 3/3/4 across the three colours, so every colour holds setup and payoff cards)
  (Confirmed by T, 2026-10-26: split colours evenly within each of Payoff, Engine and Misc); T edits; the ledger's
  "Revisions" records the colours; no card's colour is read from its text. The doc states the within-sub-lane rule
  and why: a rolled tray of one colour can still set up and cash out.
- **A4** `.claude/commands/lane-creator.md` steps 3, 5 and 7 and `plan/card-ledger/README.md` "Adding the next
  ballot" say the same: no `job`, no colour at the ballot or the verdicts, colours proposed at the revisions.
- **A5** `docs/card-spec.md`'s 2026-10-13 colour ruling carries a dated "Amended by D110 (T, 2026-10-26)" line
  naming the new rule; the ruling's text is kept.

Measure: `node --test scripts/ballot-kit.test.mjs` green with A2's test, and the Defender ballot's branch preview
shows its 90 candidates untinted.

## Scope

- `plan/card-ledger/ballot-kit.js`, `plan/card-ledger/rehearsal-defender.ballot.html` (its data's `job` fields),
  `scripts/ballot-kit.test.mjs`, `docs/lane-creator.md`, `.claude/commands/lane-creator.md`,
  `plan/card-ledger/README.md`, `docs/card-spec.md`.
- Not touched: the engine, any live card's colour, the Color Law, D40's keyword scaling, the voted Blood Price and
  Elementalist ballots' recorded verdicts.

## Consumers to update

- The ballot site (`axiomancer-ballots.pages.dev`) serves the kit from `plan/card-ledger`; a verdict T already
  submitted keeps its keeper ids, which carry no colour.

## Save / schema contracts

- None. The D1 `ballot_verdicts` rows are unchanged (a verdict never stored a colour).

## Tests

- Per A2. The rest of `scripts/ballot-kit.test.mjs` passes unchanged.

## Verify gate

`node --test scripts/ballot-kit.test.mjs` and the root `npm test`.

## Decisions made upfront — DO NOT ASK

- D110: a card's colour is only which die pays for it. Keyword scaling stays per D40, on the keyword.
- The even split is of a family's kept lane cards, ignoring colourless (grey) cards, as the BV3 tally did.
- Confirmed by T (2026-10-26): the split is even within each sub-lane (Payoff, Engine and Misc), proposed by the
  session and edited by T at the revisions sitting. *Rejected:* one colour per sub-lane, fixed or rotated per lane
  (the roll would decide whether a turn can set up or pay off).

## Definition of done

A1-A5 met, the verify gate green, the Defender ballot preview untinted.

## Follow-ups

- The Defender ballot is open now with job-pitched colours; until CL1 lands, T votes on text and treats the tint as
  a placeholder.
