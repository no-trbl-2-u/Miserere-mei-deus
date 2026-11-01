# Skill: consolidate

> **The memory curator.** One tick a month: compact the loop's
> durable memory (`plan/bearings.md`, `plan/CRITIQUE.md`,
> `plan/lessons.md` + `plan/reflexes.md`) so the context tax of
> "read first" files stays flat while the project grows.
> Curation only — meaning is never changed, decisions are never
> re-litigated, and anything ambiguous stays put.

For this verb that means: compaction records the revamp's
decisions (D46–D83) and R11's (D84–D90) as standing, and never trims
a passage in a way that revives a retired steward, agent or content
route. Its commits are plan-only and push `main`.

## 1. Purpose

Every skill's Step 0 reads `plan/bearings.md` and
`plan/reflexes.md`; `/iterate` drains `plan/CRITIQUE.md`;
`/expand` mines it. These files only ever grow — resolved
critique rows pile up, bearings prose gets superseded a
paragraph at a time, lessons duplicate each other in different
words. Unbounded growth is a tax on every future tick. This
verb is the garbage collector: it merges and prunes
**without changing what the memory says**.

## 2. Invocation

```
/consolidate                 # the full monthly pass
```

Runs from `.github/workflows/consolidate.yml` (monthly) or by
hand. Never dispatched by `/march` — like `/digest`, it is its
own loop shape with its own cadence.

## 3. The procedure

1. **Sync:** `git pull --ff-only`. Record the before-sizes:

   ```bash
   wc -l plan/bearings.md plan/CRITIQUE.md plan/lessons.md plan/reflexes.md
   ```

2. **CRITIQUE.md — prune the closed.** Rows in `## Done`
   older than 60 days are deleted; the consolidation commit is
   their record (there is no `plan/archive/`, D66). The
   `## Pending` section is never pruned. Recurring findings (same defect observed
   across ≥3 passes, e.g. a spacing nit that re-fires every
   pass) are collapsed to ONE row: keep the latest
   observation and the suggested fix, fold the prior
   occurrences into a single `- history:` line of pass numbers
   and commits. The metadata header (`> Last pass / Pass
   count`) is `/critique`'s — do not touch it.

3. **bearings.md — compact the prose, not the contract.**
   Three legal moves, applied section by section:

   - **Merge** — two passages saying the same thing in
     different words become one (keep the clearer phrasing).
   - **Prune** — passages describing things that no longer
     exist (check against the tree before deleting; a stale
     path reference is prunable, a decision record is not).
   - **Tighten** — narrative that has become common knowledge
     (already restated in `AGENTS.md` or a skill's contract)
     becomes a one-line pointer to the canonical home.

   Sections marked **locked** (`Stack`, `URL / API / CLI
   contract`) and `## Decisions standing for the autonomous
   loop` are load-bearing records: entries there may be
   *reformatted*, never merged away, weakened, or summarized
   into ambiguity. When in doubt, leave the passage alone —
   an over-long bearings file is a tax; a lossy one is a bug.

4. **lessons.md + reflexes.md — run the two-tier hygiene.**

   - Merge duplicate lessons within a domain (same behavioral
     change, different incidents → one entry citing both).
   - Promotion is no longer this pass's call (R11): the Retro step
     promotes a lesson seen 3× across verbs and `/oversight` reviews
     it after the fact. This pass checks the result: every lesson
     still matches the `plan/lessons.md` format
     (`node scripts/check-lessons.mjs`), no `seen 2×` lesson is still
     `open` without a `CANDIDATES` row naming its automation,
     and the open count stays ≤40.
   - Flag drained reflexes: a reflex that has become an
     enforced rule (guard hook, CI job, deny wall) no longer
     needs to be read every tick — move it to the Drain log
     citing the enforcement point. `reflexes.md` stays ≤50
     lines; if it is over, draining is the pass's priority.

5. **Terminology sweep — the janitor mandate.** `check-lexicon`
   is CI-enforced and should already be green; that's not the
   pass's job. The pass's job is the unknown-unknowns it can't
   catch on its own:

   - Run `node scripts/check-lexicon.mjs`. A finding here means
     CI's own gate has a hole (an exemption zone/banner/pragma
     hiding a real regression) — treat it as a bug in the gate,
     not just a doc fix.
   - Skim the live doc surfaces changed since the last consolidate
     pass (`git log --since="<last pass>" --name-only -- '*.md'`,
     excluding the lexicon's own zoned paths) for claims that
     contradict the current engine or the revamp plan
     (`plan/revamp/`; e.g. a doc still teaching the preset
     library, enemy keywords or a steward rotation the revamp
     removed).
   - **Newly-dead concept found** → add a row to
     `axiomancer-mechanics/docs/lexicon.json` (the registry
     `check-lexicon` enforces; + a table row in
     `axiomancer-mechanics/docs/LEXICON.md` if load-bearing) and
     fix/banner/pragma the flags it produces in the same pass.
     The registry grows via the curator, not via ad-hoc 3-day
     cleanups. (`axiomancer-mechanics/docs/narrative/LEXICON.md`
     is the narrative vocabulary guide, not the retired-terms
     registry; this sweep does not touch it.)
   - **Dated doc posing as current law** → add a `**Status:**
     HISTORICAL` banner at its head (the convention is
     `axiomancer-mechanics/docs/LEXICON.md` → "Exempt by
     banner").
   - **Suspected-dead agent-facing file** (references a removed
     system, e.g. an engine path deleted per a lexicon row) →
     flag it as a `plan/AUDIT.md` finding. Do not delete it —
     that call belongs to whoever owns the surface it documents.

6. **Log the pass** in the commit body, one entry:

   ```
   - <YYYY-MM-DD>: bearings <N>→<M> lines, CRITIQUE <N>→<M>,
     lessons <N>→<M>; <K> rows pruned, <J> merged; terminology
     sweep <clean | K lexicon rows added | K files banked/flagged>.
     <one-line note>
   ```

7. **Gate + commit + push:** `npm run verify` foreground, then
   one commit `consolidate: <YYYY-MM-DD>` and push. Same
   single-invocation warning as `/digest` §3.6: never end the
   turn with the commit pending on a backgrounded command.

## 4. Hard rules

1. **Curation, never authorship.** This verb adds no new
   decisions, rules, findings, or opinions. Its entire output
   is the same memory, smaller. Narrow exception: the
   terminology sweep (§3.5) may add a
   `axiomancer-mechanics/docs/lexicon.json` row or a
   `HISTORICAL` banner — that's recording a fact already true of
   the code (a concept is dead, a doc is dated), not authoring a
   new one.
2. **Locked sections and standing decisions are immutable in
   meaning.** Reformat yes; merge away, weaken, or summarize
   into ambiguity, no.
3. **Pending work is untouchable.** `## Pending` critique
   rows, open AUDIT rows, and `[ ]` build-plan rows are the
   dispatcher's queue, not clutter.
4. **Git is the archive** (D66). Anything removed from a live
   file is deleted; never recreate `plan/archive/`. The commit
   that removes it names what went.
5. **When in doubt, leave it.** A passage whose staleness you
   cannot verify against the tree stays put.
6. One commit; the standing rules (no `Co-Authored-By`, no
   emojis, foreground verify, atomic commit+push) apply.

## 5. Failure modes

1. **A compaction changes a sentence's meaning and you notice
   mid-pass** — revert that hunk; note it in the pass log.
2. **bearings.md references something you can't verify**
   (external service, user preference) — leave it; flag it as
   a question in the pass-log note for `/oversight`.
3. **Verify gate red on the consolidate commit** — only
   possible if archiving broke a path some check reads; fix
   the reference or revert the move. ≤3 iterations, then stop
   loud.
4. **`git pull` divergence** — stop.

## 6. Quick reference

```bash
plan/bearings.md                      # compact prose, never contracts
plan/CRITIQUE.md                      # prune Done >60d, collapse recurrences
plan/lessons.md · plan/reflexes.md    # merge dupes, propose promotions, drain enforced
node scripts/check-lexicon.mjs        # terminology sweep — should be green; hunt unknown-unknowns
plan/AUDIT.md                         # suspected-dead files land here, not deleted
npm run verify
git commit -m "consolidate: <YYYY-MM-DD>" && git push origin main
```
