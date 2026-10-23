# The lane-creator flow, v1

> Ratified by T on 2026-10-23 (D102): "I LOVE this process so far so should we make it official? This can be our
> lane-Creator v1 flow. V2 we can hold off on until we do this process a few more times and see how we can make it
> better and see if there's more room for automation."
>
> v1 is the process Blood Price went through (`plan/card-ledger/rehearsal-blood-price.md`, 2026-09-30 to
> 2026-10-11) and the Elementalist is going through (`plan/card-ledger/rehearsal-elementalist.md`, from
> 2026-10-22). It is run by a session with T, step by step. Nothing in it fires on its own.

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
| 3 | **The ballot.** Three candidates per slot, ninety in all, on the ballot shell with the shared kit (`plan/card-ledger/README.md` "Adding a ballot"), and a `BALLOTS` entry. | Session | `rehearsal-<family>.ballot.html`, a plan PR, and **the branch preview link sent to T** |
| 4 | **The vote.** T ticks keepers and writes slot notes on the phone at `axiomancer-ballots.pages.dev`, over as many sittings as it takes, then submits. | T | A `final` row in D1 `ballot_verdicts` |
| 5 | **The verdicts.** The session reads the newest `final` row for the ballot (the D1 query tool, or `GET /v1/ballot-verdicts?ballot=<id>&status=final`) and writes it into the ledger; it never asks T to paste. | Session | Ledger, "Verdicts"; the `BALLOTS` entry set `closed` |
| 6 | **The sims.** The kept cards simulated in a sandbox against the Act 1 fights, to inform the revisions; a measurement, not a gate. | Session | A sandbox branch and its numbers in the ledger |
| 7 | **The revisions.** T's cuts, additions and number changes; the open keyword math settled; names; the test deck; the family relic. | Session with T | Ledger, "Revisions" |
| 8 | **The trial set.** A `/plot` for the removable trial set (its own library file, one `TRIAL_SETS` line, its lane and test deck) and any engine work its keywords need. T merges the plot; the loop builds it. | Session plots, T merges, loop builds | A `plot` PR, then `loop:pr` PRs |
| 9 | **Measured.** The trial set joins the measured-truth report's decks. | Loop | `docs/reports/measured/latest.md` columns |

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
