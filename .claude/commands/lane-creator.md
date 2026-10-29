---
description: Run the lane-creator v1 flow with T for one card family (a new lane) — find the step the family is on from its ledger, run that step (Session 0, slot pitches, the ballot, the verdicts, the sims, the revisions, the trial-set /plot), land it as a plan PR and stop at T's next turn. Attended only; never fired by the loop.
---

You are running the lane-creator flow with T. Read `docs/lane-creator.md` end
to end first: it is the single source of truth for the nine steps, the rules a
lane meets and how colours are split after T picks (D102, D110). Then read the newest
family's ledger as a worked example (`plan/card-ledger/rehearsal-elementalist.md`,
and `rehearsal-blood-price.md` when a step's shape is unclear) and
`plan/card-ledger/README.md` for the ballot kit. This command is attended
only; no loop verb, cron or workflow fires it.

Argument handling:
- no argument → list every family ledger in `plan/card-ledger/` with the step
  it is on (below, "Where a family is"), then ask T which to work on or
  whether to start a new one.
- `new` → step 1 for a new family.
- `<family>` → resume that family (`plan/card-ledger/rehearsal-<family>.md`)
  at the step it is on.
- `<family> <step number>` → run that step for that family, after checking
  the steps before it are done; if one is not, say which and stop.

## Where a family is

Read from the ledger and the ballot index, never from memory:

| The ledger has | The family is on |
|---|---|
| no file | step 1 |
| `## Session 0`, no `## Sub-lane pitches` | step 2 |
| pitches T approved, no `rehearsal-<family>.ballot.html` | step 3 |
| a ballot whose `BALLOTS` entry (`plan/card-ledger/index.html`) is `open` | step 4, or step 5 once D1 holds a `final` row for it |
| `## Verdicts` complete, the entry `closed`, no sims section | step 6 |
| sims numbers, no `## Revisions` (or T's revisions still open) | step 7 |
| revisions settled, no trial-set `plot` PR | step 8 |
| a merged trial-set plot | step 9 is the loop's; nothing to run |

Say the step back to T in one line before doing anything.

## The steps

1. **Session 0 (with T).** Check the gate first: the previous family is
   measured (`docs/reports/measured/latest.md` carries its columns); if not,
   say so and ask whether to go on anyway. Then ask, in batches of at most
   four (`AskUserQuestion`, `docs/asking-well.md`): the one-line fantasy, the
   sub-lane shape (Payoff / Engine / Misc, about ten each, unless T rules
   otherwise), the mechanics or elements and their roles, the keywords the
   family needs and T's rulings on how they work, and how the family pairs
   with the lanes that exist. Record T's answers in T's words in a new ledger,
   `## Session 0 — rulings (T, <date>)`, with an `### Open` list for what T
   left unsettled. Never invent a ruling; a gap is an Open line.
2. **Slot pitches (session drafts, T approves).** Ten slot roles per
   sub-lane, plain text, one job each, under `## Sub-lane pitches`; two slots per
   sub-lane are typed Spell (`docs/lane-creator.md` "Spells"). Show T
   the thirty and ask for approval or edits; record "approved (T, <date>)".
3. **The ballot (session).** Three candidates per slot, ninety in all, on
   the ballot shell per `plan/card-ledger/README.md` "Adding the next
   ballot": the data file (no `job` or colour on any candidate, D110), the
   kit tag and the `BALLOTS` entry. Every
   line clears the scrap floor, every Global opens on a trigger from the
   closed set (`docs/card-spec.md` §15), and no line prints a cap ("max n",
   "max +n", "capped"): T calls out a cap when one is wanted (T, 2026-10-26). Each sub-lane
   carries two Spell candidates, each FREE as-is and PAID a huge impact (a bigger kind of
   effect, about three times the numbers, or both) ending "EXILE." on the line
   (`docs/lane-creator.md` "Spells", T, 2026-10-29). Run `node --test
   scripts/ballot-kit.test.mjs`; it must pass. Land it as the plan PR (below)
   and send T the branch preview link for the ballot.
4. **The vote (T, on the phone).** Nothing to run. Tell T the ballot id and
   link, and stop.
5. **The verdicts (session).** Read the newest `final` row for the ballot id
   (the D1 query tool on `miserere`, table `ballot_verdicts`, or `GET
   /v1/ballot-verdicts?ballot=<id>&status=final`); a `draft` row is never a
   verdict. Never ask T to paste. Write `## Verdicts` (keepers per slot, T's
   slot notes and general note), then set the `BALLOTS` entry
   `closed`. If no `final` row exists yet, say so and stop.
6. **The sims (session).** Simulate the kept cards against the Act 1 fights
   on a `sandbox/<family>-sims` branch, as `sandbox/elementalist-sims` did,
   and write the numbers and what they suggest into the ledger. A
   measurement, not a gate; the sandbox is never merged.
7. **The revisions (with T).** Put the sims' findings and every Open line
   to T in batches: cuts, additions and number changes, the open keyword
   math, names (content T approves, D99), the test deck and the family
   relic. Propose each kept lane card's colour, split evenly within each
   sub-lane (`docs/lane-creator.md` "Colours after the picks"), and let T
   edit it. Record each ruling under `## Revisions` in T's words.
8. **The trial set.** Run `/plot` (`skills/plot.md`) for the removable trial
   set: its own library file, one `TRIAL_SETS` line, its lane and test deck,
   and any engine work its keywords need. The plot opens its own `plot` PR;
   T merges it and the loop builds it.
9. **Measured.** The loop's (the trial set joins the measured-truth report).
   Nothing to run here.

## Landing

Steps 1-3, 5, 6 and 7 write only the ledger and the ballot files. Each sitting
lands as one plan PR from a fresh branch off `origin/main`,
`plan/<family>-<step slug>` (for example `plan/elementalist-ballot`), titled
`plan: <Family> — <what this sitting did>`, labelled `area:cards`,
`review:plan-only`, `risk:low`. It is not a `plot` PR, so it does not wait on
T (D101). Step 8's PR is `/plot`'s.

Close every sitting in two or three lines: the step done, the PR, and what is
waiting on T next (the vote, a ruling, a merge).

Hard rules:
- Never builds: no code, no tests, no library card. Cards enter the game only
  through step 8's plot.
- T's rulings are recorded in T's words; the session never fills a gap with
  its own ruling.
- One family per run. A family's ledger is the only record of where it is.
- No emojis, no attribution trailers in commits (AGENTS.md rule 2).

Argument: $ARGUMENTS
