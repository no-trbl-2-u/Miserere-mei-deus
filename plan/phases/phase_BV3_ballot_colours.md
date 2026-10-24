# Phase BV3 — Every ballot candidate pitched in a colour

## Sources

- `/plot` from T, 2026-10-24 (attended), while voting on the Elementalist ballot: "I'm noticing it might be hard to
  set which stat will scale with which cards or what color the card will be. I think it would help a lot if when
  these html card ballots are made, the background color for each card should match the color the engine is
  pitching." On the plot: "Yes, plot it. Also note that the logic generating the card ballot tries to keep colors
  around the same amount each."
- The colour law (`docs/card-spec.md` §4): a card's colour is body, mind, heart or `any`; "a lane card is coloured;
  its colour is the stat its payoff scales with" (T's ballot, 2026-10-13).
- Blood Price's split, read off `axiomancer-mechanics/src/Cards/library/blood-price.cards.ts`: red (body) 11, the
  hits (every Attack, "the foe loses n", the damage Globals); blue (mind) 9, walls, healing and utility (GUARD,
  HEAL, Conviction, the WAIVE and double-SACRIFICE spells); purple (heart) 10, the afflictions (TETHER, LEECH,
  VULNERABLE). Its colours were set after the vote; the ballot showed every card as "grey".
- The lane-creator v1 flow (`docs/lane-creator.md`, D102), step 3 (the ballot), which this changes; the ballot kit
  and the "Adding a ballot" steps (`plan/card-ledger/README.md`, phases BV1b and BV2b).
- Code read while shaping this: `plan/card-ledger/rehearsal-elementalist.ballot.html` (`SLOTS` carry `el`, `CARDS`
  carry no colour; `cardHtml` prints `${card.type} · ${el}`; `sheet()` builds the Generate text);
  `plan/card-ledger/ballot-kit.js` (the page owns `sheet`; the kit owns autosave, Save, Submit); `scripts/ballot-kit.test.mjs`
  (fails a ballot with no `BALLOTS` entry or no kit tag).

## Outcome

Every candidate on a ballot is pitched in a colour: its face is tinted red, blue or purple, its header names the
colour and the stat, each tab keeps a live count of kept cards per colour, and the verdict text carries each kept
card's colour. A new ballot is authored with the three colours in near-equal numbers.

## Acceptance

- **A1** A ballot candidate carries `color: 'body' | 'mind' | 'heart'` (or `'any'`). The ballot shell tints the card
  face by it (red, blue, purple, grey, each readable in light and dark), and the header reads
  `<Type> · <element> · <red|blue|purple> (<body|mind|heart>)`. A legend line names the four.
- **A2** Each tab shows a live count of its kept cards per colour, and the page shows the family total, e.g.
  "kept: 4 red · 3 blue · 3 purple".
- **A3** The Generate text prints each kept candidate's colour (`KEEP P-01b (red)`), and a slot note can overrule
  it in T's words ("make it blue"); nothing parses the note.
- **A4** `scripts/ballot-kit.test.mjs` fails a ballot that is `open` in `BALLOTS` and has a candidate with no
  `color`, and fails one where any colour's candidate count is more than 10% away from an equal share of the
  coloured candidates (90 candidates: an equal share is 30, so each colour 27 to 33). `any` candidates are not counted.
- **A5** `docs/lane-creator.md` step 3 and `plan/card-ledger/README.md` "Adding a ballot" say: pitch every
  candidate a colour by its job (red the hits, blue the walls, healing and utility, purple the afflictions, as
  Blood Price split), keep the three near-equal, and let T's notes overrule.
- **A6** The Elementalist ballot is unchanged by this phase: T's sittings are recorded against it as it stands.
  Its kept cards are pitched colours at the revisions step (`docs/lane-creator.md` step 7).

Measure: the next family's ballot opens with every card tinted and the colour counts within the A4 band, and T
votes on colour as well as text without asking which colour a card would be.

## Scope

- `plan/card-ledger/`: the ballot shell's card face, header, legend, counts and `sheet()` output (written once in
  the shell a new ballot is copied from, so the next ballot inherits it); `README.md`.
- `scripts/ballot-kit.test.mjs`: the A4 checks.
- `docs/lane-creator.md` step 3.
- No change to `ballot-kit.js`'s autosave, Save or Submit, to the Worker, or to any live card.

## Consumers to update

- `docs/lane-creator.md`; `plan/card-ledger/README.md`.

## Save / schema contracts

- None. The colour rides in the Generate text, which is already stored verbatim in `ballot_verdicts.verdict_text`.
  No migration; `kept_json` stays a list of ids.

## Decisions made upfront — DO NOT ASK

- **Colour by job, not by keyword scaling.** INFERNO, CHILL and STORM have no scaling stat yet (T, 2026-10-24: "not
  sure yet"); Blood Price's own keywords were unscaled too, and its colours followed each card's job. A pitch never
  waits on a scaling ruling.
- **Balance is checked across the candidates, shown across the keepers.** The author keeps the 90 near-equal (A4);
  the live counts (A2) let T balance the 30 kept while voting. The test never grades T's picks.
- **The Elementalist ballot is not recoloured** (A6). T chose plotting for future ballots, and two of its three
  sittings are already recorded.
- **Tints are the engine's colour names**, red body, blue mind, purple heart, grey `any` (`docs/card-spec.md` §4);
  no new palette names.

## Tests matrix

- Root (`node --test`): a fixture open ballot with an uncoloured candidate fails A4; one with 40/25/25 fails; one
  with 30/30/30 and one with 33/29/28 pass; a `closed` ballot is not checked.
- Manual in the phase's Playwright run (evidence in the PR, not a gate): a coloured fixture ballot at 390 px, light
  and dark, tick three cards of different colours, the counts and the Generate text show them.

## Verify gate

The root `npm test`; `node scripts/check-deadlines.mjs`.

## Commit body template

```
Phase BV3 — Every ballot candidate pitched in a colour

Closes A1-A6 of plan/phases/phase_BV3_ballot_colours.md.
<what changed>
Verify: <commands and results>
```

## DoD

Every acceptance ID closed; the Measure met on the next family's ballot.

## Follow-ups (out of scope)

- The stat that scales INFERNO, CHILL and STORM: T rules it at the Elementalist's revisions step.
- A per-slot colour suggestion in the slot pitches (step 2), if picking colours per candidate proves too late.

Size: M
