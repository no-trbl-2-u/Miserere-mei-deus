# Phase HW1 — `/heads-down`: ask up front, park mid-run, claim rows, resume after a restart

## Sources

- `/plot asap` request from T, in session, 2026-10-30: "let's plot it", after the comparison of our `/heads-down`
  with Nexus v2's. T picked the claims branch over reusing the mirror issue, and asap over anytime.
- The comparison: Nexus-Smash `main` (`a61e201`), `skills/heads-down.md` (the question gate §3 Step 2, the parked
  questions and the end gate Step 5, `claims.mjs` and `ledger.mjs` Steps 1, 3 and 4, `/reboot-resume`). Ours:
  `skills/heads-down.md`, `.claude/commands/heads-down.md`.
- Why we are not re-adopting all of Nexus: `nexus upgrade` dry run against this repo, 2026-10-30. It parsed 133 of
  459 Status rows (every letter-prefixed id, including every open row, was dropped), read our loop as owner mode
  (pushing `main`) instead of `loop:pr` PRs, and replaced `plot`, `messy`, `march`, `iterate` and `heads-down`.
  So we port only the four pieces that fill gaps in ours.
- `plan/PHASE_CANDIDATES.md`, the held `[owner]` candidate "Claims for a second loop" (hunt's `claims.json` on an
  orphan `claims` branch, compare-and-swap by git plumbing, 24 h TTL). Its trigger, "`/heads-down`-style batches
  appear", has fired. T is promoting it here, ahead of the R11 watch's end on Nov 11.
- D84-D87 (loop PRs, an open `loop:pr` PR is the claim, the PR cap), D93 (`/plot` lands by a `plot` PR), D95 (a
  `loop:pr` PR merges on a green adversarial review). `skills/march.md` §3 "Pickable phase" and "Claims";
  `skills/ship-a-phase.md` Step 2 (the mirror-issue claim and its 2-hour window).

## Outcome

A `/heads-down` run asks T every question it will need before it launches a worker, never blocks mid-run, and asks
the parked questions at the end. No other session or cron tick can pick a row it is building before that row's PR
opens. A restarted session picks the run back up from its ledger.

Size: multi-phase (HW1a S, HW1b M, HW1c M).

## Acceptance

- **A1** **The question gate.** `skills/heads-down.md` gains a gate before any launch. It runs after the waves are
  mapped and replaces the plan-and-ask step. It collects every question the rows in scope need:
  - `[T to confirm #n]` markers still open in their briefs;
  - `## Your calls` items still open on any `plot` PR for those rows;
  - `plan/NEEDS_T.md` rows that name them;
  - ambiguities found in a read of each brief.

  The gate asks them all, together with the plan and its three improvements, in `AskUserQuestion` batches of at most
  four questions, recommended option first (`docs/asking-well.md`), every batch before the first launch. When there
  are no questions, it says so. Each answer goes into the owning worker's prompt as "T's answers". A `plot` PR's
  calls go through a calls worker as Step 7 describes. `scripts/loop-pr.test.mjs` pins the gate's position: before
  "Launch the wave".
- **A2** **Workers park questions.** Every worker prompt says: never ask T; take the recommended default and log it;
  park any new question and carry on. The fixed report shape gains two lines, which `loop-pr.test.mjs` pins:
  - `DEFAULTS:` lists `- <call> | took: <option> | why: <reason>`;
  - `PARKED:` lists `- q: <whole question> | alts: <a; b> | default taken: <x> | why: <reason>`.

  A parked `q` is a whole question that someone who knows the project but not the row can answer: what it decides,
  in words. A report with neither line goes back to its worker, like a report with no `SHOTS:` line.
- **A3** **The end gate.** Wrap-up asks every parked question of the run in `AskUserQuestion` batches before the final
  report. An answer that contradicts a default goes to one of two places:
  - if the row's PR is still open, to its worker (`SendMessage`) as a follow-up commit after the review verdict (the
    push-once rule holds);
  - if the PR has merged, to T as a `/plot` offer (AGENTS.md rule 8), never a hand-made fix.

  The final report lists every default taken and every answer.
- **A4** **The claims record.** `scripts/claims.mjs` keeps `claims.json` on an orphan `claims` branch of origin and
  supports these verbs:
  - `claim <id…> --owner <o> [--ttl <hours>]` (all or nothing);
  - `renew --owner <o>`;
  - `release <id…> --owner <o>`;
  - `check <id> [--owner <o>]`;
  - `list`;
  - `prune`.

  Every write is a compare-and-swap. The script builds a commit whose parent is the fetched tip using git plumbing,
  never touching a working tree, and pushes it without force. A rejected push is re-fetched and retried, up to five
  times. A claim past `renewed + ttl` (24 h default) counts as free and is dropped on the next write.
  `scripts/claims.test.mjs` (in the root `npm test`) covers the following against a temporary bare origin:
  - two writers racing for one id, where exactly one wins;
  - all-or-nothing refusal, which names the holder;
  - renew, release, expiry and prune;
  - `check` exit codes.
- **A5** **The loop honours claims.**
  - `skills/march.md` §3 "Pickable phase" rule 4 reads "is not claimed by an open `loop:pr` PR or a live claim in
    `claims.json` held by another owner". §3 "Claims" describes both and drops "No `claims` branch is needed".
  - `skills/ship-a-phase.md` Step 2 claims the row before reading its brief. The owner is `$CLAIM_OWNER` when set (a
    `/heads-down` worker), else `tick:<GITHUB_RUN_ID or session id>`. A refused claim skips the row. A
    `claims.mjs` tooling error is logged and falls back to the PR and mirror-issue checks (best-effort, like the
    mirror). The claim is released once the PR is open, because the PR becomes the claim.
  - `claims.test.mjs` pins these texts.
- **A6** **`/heads-down` claims its waves.** The orchestrator's owner is `heads-down:<session id>`.
  - Before launching a wave it claims the wave's rows in one call. It drops any refused row from the wave and names
    who holds it.
  - Each worker prompt carries `CLAIM_OWNER=heads-down:<session id>`.
  - The orchestrator renews at each worker report and each wave start.
  - Wrap-up releases every claim the session still holds without a PR.
  - Hard rule: a crash never releases claims (the TTL keeps the work).
- **A7** **The session ledger.** `scripts/heads-down-ledger.mjs` writes `.heads-down/<session id>.json` in the
  primary checkout (the root `.gitignore` ignores `.heads-down/`), with the verbs `start`, `beat`, `show`, `latest`
  and `end`. The ledger records:
  - the scope and the waves;
  - each worker's row, agent id, worktree, branch, model, prompt file, status and PR;
  - the claims;
  - the gate answers, the defaults and the parked questions;
  - the callout digest's path.

  Each worker's prompt is saved under `.heads-down/<session id>/prompts/<row>.md`. The skill beats the ledger at
  every step. `scripts/heads-down-ledger.test.mjs` (in the root `npm test`) covers start, beat, the latest unended
  ledger, end and the ignore line.
- **A8** **Resume.** `/heads-down resume` (command and skill) reads the latest unended ledger and renews its claims.
  For each worker that has not reported, it checks the branch on origin and the PR state:
  - a live PR is driven with `fix-ci --branch`;
  - a dead or empty worker is relaunched from its saved prompt.

  Then it continues from the first unfinished wave. This replaces §5's manual check of each transcript's mtime, and
  `loop-pr.test.mjs` pins the `resume` doorway.

Measure: the root `npm test` passes with `scripts/claims.test.mjs` and `scripts/heads-down-ledger.test.mjs` in it, and
the race test shows exactly one of two concurrent `claim` calls winning.

## Decisions made upfront — DO NOT ASK

- **Claims live on an orphan `claims` branch, not in the mirror issue** (T, 2026-10-30, "Build the claims branch").
  The mirror issue's 2-hour window stays as the fallback for a tick that cannot reach `claims.json`. A push to
  `claims` triggers no workflow: every `push:` trigger in `.github/workflows/` is `branches: [main]`.
- **Every `/ship-a-phase` run claims, not only `/heads-down` workers.** That one rule protects both directions: a
  cron tick from a heads-down row, and a heads-down wave from a row a cron tick is building.
- **The PR replaces the claim.** The claim is released when the PR opens, so the D85 rule stays the single long-lived
  claim, and `claims.json` holds only pre-PR work.
- **24 h TTL, renewed by the holder.** This follows Nexus and hunt. Expiry is the only sweep: we have no `/tidy`, and
  `prune` is there for a human.
- **The ledger is untracked and lives in the primary checkout, not the scratchpad.** A restarted session gets a new
  scratchpad, so a scratchpad ledger could not be resumed. Untracked, it never conflicts and never rides a PR.
- **Questions go to `AskUserQuestion` in batches of at most four.** `docs/asking-well.md` caps a call at four, so a
  run with more questions asks several batches, all before the first launch.
- **The end gate never fixes a merged PR by hand.** A contradicting answer on merged work is new loop work, so it goes
  through `/plot` (AGENTS.md rule 8).
- **`/march` and `/iterate` do not claim.** `/march` dispatches `/ship-a-phase`, which claims. `/iterate` works on
  queue items, which an open PR already claims.
- **Attended only, as today.** No workflow or other skill fires `/heads-down` or its `resume`
  (`loop-pr.test.mjs`'s existing tests stay).

## Tests matrix

| Suite | Phase | Subject |
|---|---|---|
| `scripts/loop-pr.test.mjs` | HW1a, HW1c | gate before launch; `DEFAULTS:`/`PARKED:` lines; end gate; `CLAIM_OWNER`; `resume` doorway |
| `scripts/claims.test.mjs` (new) | HW1b | CAS race, all-or-nothing, renew, release, TTL expiry, prune, `check` exit codes; march and ship-a-phase texts |
| `scripts/heads-down-ledger.test.mjs` (new) | HW1c | start, beat, latest unended, end, `.gitignore` line |

## Verify gate

Root `npm test`. No workspace code changes, so no `verify-*` workspace gate.

## Commit body template

```
<phase id>: <title>

Closes A<n>, A<m> (plan/phases/phase_HW1_heads_down_gates_and_claims.md § <phase id>).
<what changed, one line per file group>
```

## DoD

A1-A8 ticked, each by its one phase.

## Follow-ups (out of scope)

- A GUI or board for the ledger (Nexus's `progress.mjs` and fleet screen). The final report and `ledger.mjs show` are
  enough for one owner.
- Making `/iterate` claim queue items before their PR exists. Not needed while an open PR is the claim.
- Running claims for a second cron or a contributor. The record supports it; nothing schedules one.

## Phases

### HW1a — Ask up front, park mid-run, ask at the end · S · closes A1, A2, A3 · requires nothing
Measure: `node --test scripts/loop-pr.test.mjs` passes with the gate, report-line and end-gate pins.
- Scope: `skills/heads-down.md` (Step 3 becomes the question gate; Step 4 worker prompt gains the park rule and the
  two report lines; Step 8 becomes the end gate; hard rules gain "questions only at the two gates"),
  `.claude/commands/heads-down.md` (procedure line), `scripts/loop-pr.test.mjs`.
- Consumers: none. Save/schema: none.
- Verify: root `npm test`.

### HW1b — The claims record, honoured by the loop · M · closes A4, A5 · requires nothing
Measure: `node --test scripts/claims.test.mjs` passes, including the two-writer race.
- Scope: `scripts/claims.mjs` and `scripts/claims.test.mjs` (new; the test added to the root `npm test` list),
  `skills/march.md` §3 "Pickable phase" and "Claims", `skills/ship-a-phase.md` Step 2 and Step 12.5 (release on PR
  open). Does not touch `skills/heads-down.md` or `scripts/loop-pr.test.mjs`, so it runs beside HW1a.
- Consumers: `/march`, `/ship-a-phase`. Save/schema: `claims.json` `{ "<id>": { owner, at, renewed, ttlHours } }`
  on branch `claims`.
- Verify: root `npm test`.

### HW1c — `/heads-down` claims its waves, keeps a ledger, resumes · M · closes A6, A7, A8 · requires HW1a, HW1b
Measure: `node --test scripts/heads-down-ledger.test.mjs scripts/loop-pr.test.mjs` passes, and `/heads-down peek` on
two open rows still launches nothing.
- Scope: `skills/heads-down.md` (Steps 1, 4, 6 and 8, §3 hard rules, §5 restart note replaced by `resume`),
  `.claude/commands/heads-down.md` (`resume` argument), `scripts/heads-down-ledger.mjs` and its test (new; added to
  the root `npm test` list), `.gitignore` (`.heads-down/`), `scripts/loop-pr.test.mjs`.
- Consumers: none outside the skill. Save/schema: `.heads-down/<session id>.json` (untracked).
- Verify: root `npm test`.
