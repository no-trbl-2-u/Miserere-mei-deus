# The lane-creator flow, v1

> Ratified by T on 2026-10-23 (D102): "I LOVE this process so far so should we make it official? This can be our
> lane-Creator v1 flow. V2 we can hold off on until we do this process a few more times and see how we can make it
> better and see if there's more room for automation."
>
> v1 is the process Blood Price went through (`plan/card-ledger/rehearsal-blood-price.md`, 2026-09-30 to
> 2026-10-11) and the Elementalist is going through (`plan/card-ledger/rehearsal-elementalist.md`, from
> 2026-10-22). It is run by a session with T, step by step, with `/lane-creator` (`.claude/commands/lane-creator.md`,
> T, 2026-10-26), which finds the step a family is on from its ledger and runs it. Nothing in it fires on its own.

## The rules a lane meets

From `docs/card-spec.md` §15 and `plan/revamp/cards.md` (deck model): a family is three sub-lanes of about ten
cards (Payoff, Engine, Misc), thirty cards on top of grey; a relic names the family; keywords may cross lanes; every
line clears the scrap floor; a Global opens on a trigger from the closed set. A new family needs the previous one
measured (R12a's report carries its columns). Card names are content T approves (D99).

## The steps

| # | Step | Who | Output |
|---|---|---|---|
| 1 | **Session 0.** The one-line fantasy, the sub-lane shape, the keywords the family needs and T's rulings on how they work. | Session with T | The family's ledger, `plan/card-ledger/rehearsal-<family>.md`, Session 0 section |
| 2 | **Slot pitches.** Ten slot roles per sub-lane, plain text, each one job. | Session drafts, T approves | Ledger, "Sub-lane pitches" |
| 3 | **The ballot.** Three candidates per slot, ninety in all, on the ballot shell with the shared kit (`plan/card-ledger/README.md` "Adding a ballot"), and a `BALLOTS` entry. Candidates carry no colour (below, "Colours after the picks"). | Session | `rehearsal-<family>.ballot.html`, a plan PR, and **the branch preview link sent to T** |
| 4 | **The vote.** T ticks keepers and writes slot notes on the phone at `axiomancer-ballots.pages.dev`, over as many sittings as it takes, then submits. | T | A `final` row in D1 `ballot_verdicts` |
| 5 | **The verdicts.** The session reads the newest `final` row for the ballot (the D1 query tool, or `GET /v1/ballot-verdicts?ballot=<id>&status=final`) and writes it into the ledger; it never asks T to paste. | Session | Ledger, "Verdicts"; the `BALLOTS` entry set `closed` |
| 6 | **The sims.** The kept cards simulated in a sandbox against the Act 1 fights, to inform the revisions; a measurement, not a gate. | Session | A sandbox branch and its numbers in the ledger |
| 7 | **The revisions.** T's cuts, additions and number changes; the open keyword math settled; names; each kept card's colour, split evenly (below, "Colours after the picks"); the test deck; the family relic. | Session with T | Ledger, "Revisions" |
| 8 | **The trial set.** A `/plot` for the removable trial set (its own library file, one `TRIAL_SETS` line, its lane and test deck) and any engine work its keywords need. T merges the plot; the loop builds it. | Session plots, T merges, loop builds | A `plot` PR, then `loop:pr` PRs |
| 9 | **Measured.** The trial set joins the measured-truth report's decks. | Loop | `docs/reports/measured/latest.md` columns |

## Spells

T, 2026-10-29: "I never see Spells (where the card is a Free: as-is, but Paid: <HUGE impact>. Exile.)". The Spell
law (D103) already makes a Spell's PAID line EXILE and sit a step above a plain card; past ballots met only that floor,
so their Spells read as Skills with bigger PAID numbers. From the Merciful on:

- **Two Spell candidates per sub-lane** on the ballot (six of the ninety; T, 2026-10-29). The slot pitches (step 2)
  mark which slots offer them.
- **FREE is the card as-is**: a modest line that plays and discards.
- **PAID is a huge impact**: a bigger kind of effect than FREE (the whole stack, twice over, for the rest of combat,
  the clock run out now), or about three times FREE's numbers, or both (T picked "Both"). The sims (step 6) are where
  a runaway Spell shows up.
- **"EXILE." is printed at the end of the PAID line**, not only in the legend.

## No caps

T, 2026-10-26: "remove the '(max +n)' from every card. If there should be a max, I'll call it out." A slot
pitch or ballot candidate never prints a cap ("max n", "max +n", "capped"); an effect that grows with
something grows without limit. A cap exists only where T asks for one, in a slot note or at the revisions
step, and the sims (step 6) are where a runaway number shows up.

## Colours after the picks

Phase CL1, from T on 2026-10-26 (D110): "A card's colour is ONLY what die pays for them and is not categorized
otherwise. This means for lane-creator, don't have it pitch a color for the cards. Instead, I pick the cards, then
afterwards, it can split the colors up evenly." A card's colour is only which die pays for it (the Color Law, D65);
what scales a number is its keyword (D40), whatever the card's colour.

- **No colour on the ballot.** A candidate carries no `job`, `color` or `colour`; the face is untinted and the
  Generate text names keepers alone (`KEEP P-01b`). `node --test scripts/ballot-kit.test.mjs` fails an open
  ballot whose candidates carry one.
- **The split, at the revisions (step 7).** The session proposes a colour for every kept lane card so red, blue
  and purple are as even as the count allows (a family of 30: 10 each), and as even as it can within each
  sub-lane: Payoff, Engine and Misc each split about 3/3/4 across the colours (T, 2026-10-26: "split colours
  evenly within each of Payoff, Engine and Misc"). Every colour then holds setup and payoff cards, so a tray that
  rolls one colour can still set up and cash out. Grey (colourless) cards are not counted.
- **T edits the proposal**, and the ledger's `## Revisions` records each card's colour. No card's colour is read
  from its text.
- Ballots voted before CL1 (Blood Price, the Elementalist) stand as voted.

## What T does

Steps 1, 2 and 7 in conversation; step 4 on the phone; merging the step 8 `plot` PR. Everything else is the
session's or the loop's.

## v2 (not yet)

T holds v2 until v1 has run a few more times. Candidates noted so far:

- **After the vote, automatic up to T's approval.** When a `final` verdict lands, a session records it (step 5),
  runs the sims (step 6) and opens the trial-set `plot` PR (step 8) for T to merge. T's merge stays the gate; the
  loop still never fires `/plot` on its own.
- **B5's ruled shape as a skill** (`plan/revamp/cards.md` §B5): a card-creator skill that runs steps 1 to 3 from a
  loose idea.
- A per-ballot "in progress / submitted" badge on the ballot index (BV2 Follow-ups).
