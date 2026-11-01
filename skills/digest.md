# Skill: digest

> **The night shift.** One tick a day: take the loop's pulse,
> append the day's briefing as a Markdown DevLog entry under
> `devlog/entries/` (committed; `npm run site:build` renders the
> private HTML locally and `npm run site:public` builds the public
> site, and both outputs are gitignored), run the breadth
> checks too slow for the per-commit path, propose gate tunings
> as candidates — never apply them. The instrument panel,
> delivered instead of fetched. The live unified-loop bearings are
> `plan/bearings.md`; the retired pre-monorepo `nexus/` tree is not authority.

The digest reports what the loop shipped and what waits on T: open
`loop:pr` PRs (and any `loop:pr-stuck`), rows waiting for a brief, and
the owner-led B-rows. It never files new-content work. Its entry under
`devlog/entries/` is plan-only and pushes `main` (D84).

## 1. Purpose

The dispatcher's ticks are visible one at a time; nobody
reads twenty run logs. This verb compresses a day of loop
activity — shipped ticks, no-ops, crashes — into one
committed DevLog entry that renders phone-readable, and owns the
O(everything) work that must never run per-commit.

## 2. Invocation

```
/digest                      # the full nightly pass
```

Runs from `.github/workflows/night.yml` (odd days only) or by hand.
Never dispatched by `/march` — it is its own loop shape with
its own cadence.

## 3. The procedure

1. **Sync:** `git pull --ff-only`.
2. **Gather the pulse:**

   ```bash
   git log --since="26 hours ago" --oneline
   gh run list --workflow march -L 20 \
     --json displayTitle,conclusion,createdAt,updatedAt
   ```

   Plus queue states: open chunk / Held line counts,
   `plan/AUDIT.md` pending, `plan/CRITIQUE.md` pending + last
   pass age, `plan/CANDIDATES.md` pending, open
   `loop:do` issues, deploy state (`npm run deploy:check`).
   Name the phase in flight (an open `loop:pr` PR) and the next
   pickable row (`skills/march.md` §3), and list open `loop:pr` PRs
   with their age.
3. **Breadth checks** (the night-only browser legs):

   ```bash
   npm --workspace axiomancer-mobile run e2e:minigames
   ```

   Failures become HIGH `plan/AUDIT.md` rows — the digest
   files them; the next dispatcher tick fixes them.

   **Measured truth** (R12a). The digest does not re-measure;
   `measured-truth.yml` does, on mechanics merges and Sundays. Read
   the last two lines of `docs/reports/measured/history.jsonl` and
   render the section with the pure renderer:

   ```bash
   node --input-type=module -e "
   import { readFileSync } from 'node:fs'
   import { compare, renderDigestSection } from './scripts/measured-compare.mjs'
   const lines = readFileSync('docs/reports/measured/history.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse)
   const [previous, current] = [lines.at(-2) ?? null, lines.at(-1) ?? null]
   const thresholds = JSON.parse(readFileSync('docs/reports/measured/thresholds.json', 'utf8'))
   const drifts = current ? compare({ current, previous, thresholds }) : []
   process.stdout.write(renderDigestSection(current, previous, drifts, { sinceDate: process.argv[1] }))
   " <date of the previous DIGEST entry>
   ```

   Paste its output into today's entry as is. With no run since the
   last entry it prints one line, not an empty table; with no run at
   all it says so. The numbers are a measurement, not a grade (D57):
   say what moved, never that the game got better or worse. Drift
   rows are already filed in `plan/AUDIT.md` by the run itself; do not
   file them again.

4. **Write today's DevLog entry** — create
   `devlog/entries/DIGEST_<YYYY-MM-DD>.md`. Never overwrite a
   past day; the DevLog is an accumulating ledger. The entry is
   a *visual, organized explanation of the day's work*, not a
   flat status dump. Structure (the build parses it — see
   `scripts/build-devlog.mjs`):

   **The entry is now PUBLISHED** (T, 2026-09-20 — see
   `archive-pre-revamp:plan/archive/2026-09-25-trim-t4/plan/2026-09-20-devlog-public-publish.prompt.md`). Write every
   line for a player who has never opened a terminal, not for the
   maintainer. The same file still renders the private index; the
   public site is `npm run site:public`.

   - `# <YYYY-MM-DD> — <title>` — the heading line carries a TITLE
     now. Five to nine words naming the day's largest change, in the
     reader's language ("The world gains a door"), not the loop's.
     Without one the public site derives a title from the headline's
     first clause, which is a fallback, not the intent.
   - then a `>` blockquote **headline** — the standfirst; it may run
     over several `>` lines and they are joined.
   - **Work-item cards** — one per meaningful change, each a
     `## [<category>] <title>` with `<category>` one of
     `mechanics | ui | content | infra | balance`. Under it:
     `**What:**` (what changed) and `**Why:**` (the reason, mined
     from the commit body / PR / ADR / `plan/` note; never invent).
     Both fields may run over several wrapped lines — they end at a
     blank line or the next field.

     **The `**Why:**` is mandatory and substantive.** It is the most
     important field on the public page. A why that restates the
     what ("because the number was wrong") fails the contract: name
     the player-facing consequence, the evidence, or the decision
     behind the change. A work item whose why cannot be written from
     the record does not get an invented one — say what is known and
     say that the reason was not recorded.

     Optional: `**Commits:**` short SHAs; a fenced ```diff block with
     a *representative* hunk (≤~40 lines — the telling change, not
     the whole diff); the evidence fields:

     - `**Shot:** <screen> — <caption>` for a UI screen (step 4a)
     - `**Evidence:** <kind> <id> — <caption>` for everything else,
       `<kind>` being `card`, `foe`, `plate` or `rule` (steps 4b, 4c)
     - `**No capture:** <sentence>` when a change has no picture and
       one cannot be made. Missing evidence is STATED, never faked:
       never show an "after" twice, never reuse a neighbouring day's
       capture.
   - **Panels** — un-bracketed `##` sections rendered as-is:
     `While you were out` (pulse table: tick, verb, outcome —
     no-ops included), `Needs you` (open `loop:pr` PRs to merge,
     `loop:pr-stuck` PRs, rows waiting for `/plot`, owner-led rows,
     open `loop:do` issues, anything the loop stopped on), `Tuning proposals` (step 5, or "none"). Add
     `Queues now` / `Today's intent` as useful.

     **Panels are public by default. `Needs you` is the one
     exception** — the public build withholds it, because it is
     correspondence between the maintainer and his tooling, and
     every post says at its foot that it is held back. That places
     an obligation on this skill: anything in `Needs you` that a
     PLAYER would want to know (a boss that can flatten a new
     pilgrim, a map tap that silently does nothing) is written into
     `Queues now` as well, in plain words. Only the correspondence
     is withheld; nothing about the game's real state is.

     Write the other three for a stranger: `While you were out`
     publishes as *The night's watch*, `Tuning proposals` as *The
     measure — did the fighting change?*, `Queues now` as *What is
     still unfinished*. Verb/outcome shorthand and raw queue counts
     read as machine output; sentences read as a report. Any panel
     the build does not recognise publishes under its own title, and
     the build names it in its output — so a new internal panel is
     noticed the night it appears.

   Then `npm run site:build` renders the entry into styled HTML,
   refreshes the hub (`devlog/index.html`), AND regenerates the
   Cards / Enemies / Effects catalog from the current engine
   libraries (`npm run catalog` — ts-node export + zero-dep
   render) so the catalog never drifts from what ships. The
   built HTML, `devlog/data/**`, and `devlog/assets/catalog/**`
   are gitignored (phase 57 — Cloudflare Pages serves whatever
   `main`'s tree contains, so generated output never gets
   committed); commit the entry, and any new
   `devlog/assets/<date>/**` screenshots from step 4a. Body
   Markdown: pipe tables,
   `-`/`1.` lists, fenced code / ```diff, `**bold**`, `_italic_`,
   `` `code` ``, `[links](url)`.

4a. **UI shots (visual before/after)** — if the day's commits
    changed any baseline screen
    (`axiomancer-mobile/screenshots/baseline/*.png`), run:

    ```bash
    npm run devlog:shots -- <since-ref> <YYYY-MM-DD>
    # <since-ref> = range start, e.g. the previous digest commit
    # or `git rev-list -1 --before='26 hours ago' HEAD`
    ```

    It diffs the baselines across `<since>..HEAD` and writes
    `devlog/assets/<date>/<screen>.{before,after,diff}.png`
    (before = blob at `<since>`, after = current, diff = a
    pixelmatch highlight). For each `<screen>` it prints
    (`SHOTS_JSON`), add a `**Shot:** <screen> — <caption>` line
    to the matching `[ui]` card so the build embeds the trio.
    Only *noticeably* changed screens are emitted (≥2% pixels,
    `DEVLOG_SHOT_MIN_RATIO`), so trivial diffs stay out. No
    browser and no AI run here — it reuses the committed
    baselines (the verify gate's approved captures), already
    made when the UI change landed.

4b. **Card, foe and affliction evidence** — the same idea for
    content that is data rather than pixels:

    ```bash
    npm run devlog:catalog-shots -- <since-ref> <YYYY-MM-DD>
    ```

    It exports the catalog at `<since-ref>` (the engine's OWN
    exporter, in a throwaway worktree) and diffs it against the
    current one on the fields a player can read. Every changed or
    new card and foe gets a before/after plate
    (`card-<id>.{before,after}.svg`, `foe-<id>...`); every changed
    affliction gets a rules-text pair (`rule-<id>.after.json`). It
    prints the `**Evidence:**` lines to paste into the matching
    work-item card. Deterministic, no browser, no model call.

4c. **World-plate evidence** — an arena or map engraving that was
    added or replaced:

    ```bash
    npm run devlog:plate-shots -- <since-ref> <YYYY-MM-DD>
    ```

    Before is the blob at `<since-ref>`, after is the file now. The
    licence gate runs first: it withholds a plate only when its
    provenance record names no licence the gate recognises, and says
    which and why. The art licence question is closed (T, 2026-10-29,
    D115): all of the game's art is open source, so a withheld line
    means a new file with no record, never "the licence is unresolved".
    Never raise the licence with T.

    All three collectors write `devlog/assets/<date>/manifest.json`,
    which records the ref the "before" side came from. The public
    site prints a date on the older plate only where that manifest
    proves one.

   **Format contract** (the shared shell in
   `scripts/build-devlog.mjs` guarantees this; keep it honest if
   you touch the shell):
   - Fully self-contained HTML: inline `<style>`, no external
     fetches, no JS. Renders from a raw file open on a phone
     (screenshots are local `devlog/assets/**` files).
   - Phone-first: single column, centered ~`46rem` measure,
     base font ≥16px; tables, diffs, and shot rows scroll in
     their own container — the page never scrolls sideways.
   - Light via `prefers-color-scheme` with a dark default; one
     accent per category chip; restrained, no emojis.
   - `<title>Miserere Mei, Deus digest — YYYY-MM-DD</title>`; the date
     in the header strip; every entry links back to the index.
   - Boring, diffable DOM: semantic tags, slugged section/card
     ids, styles at the top. Git history is the archive.
5. **Meta-loop, within rails:** if the pulse shows a mistuned
   gate (critique never firing, the ceiling hibernating
   productive days, a starved queue), file the tuning as a
   `plan/CANDIDATES.md` candidate citing the pulse
   numbers. **Never edit gates, cadences, ceilings, or rules
   directly** — proposals only; `/oversight` promotes. The
   loop does not vote on its own constraints.
5b. **Publish gate** (T, 2026-09-22: "major releases and QOL UI
    updates mostly"): the public site deploys ONLY when
    `devlog/PUBLISH` changes. That file is the Pages project's sole
    build watch path (`docs/devlog-public-deploy.md` step 7). Decide
    whether tonight publishes, then act on the decision.

    **Publish** when the window since the last `devlog/PUBLISH`
    line carries at least one of these three triggers:

    1. **A major release**:
       - a chunk shipped (an `ARCHIVE.md` line in the window); or
       - a new game system, mechanic or feature a player uses: a
         new screen, a new way to play, a new enemy archetype, a
         new region.

       A single card, foe, item or line of text is not a release on
       its own.
    2. **A UI or quality-of-life change** a player sees or feels:
       - a screen, control, readout or layout change;
       - a legibility or accessibility fix;
       - a flow that got shorter or clearer.

       These are typically `[ui]` work items, but judge the change,
       not the chip.
    3. **A fix to something that blocks play**: a crash, a blank or
       stuck screen, lost progress or save, or a fight or node that
       cannot be finished. Lesser bug fixes wait.

    **Hold** (do not publish) for everything else, even when a
    player could notice it:
    - content additions alone (new or reworded cards, foes, items,
      dialogue, flavour, art swaps);
    - balance and number changes;
    - minor bug fixes;
    - all loop-internal work: critique and audit passes,
      tooling, CI, docs and plans.

    Held items are not lost. They are in the committed entries and
    appear on the site with the next publish.

    **When unsure, hold.** A missed night costs two days of latency.
    A noisy site costs build quota and the reader's trust.

    **The window is cumulative.** Judge everything since the last
    `devlog/PUBLISH` line, not just tonight's commits. A phase that
    shipped on a held night still counts on the next one.

    **To publish,** append one line to `devlog/PUBLISH`:
    `<YYYY-MM-DD> — <tonight's entry title>`. It is append-only:
    never edit a past line. Commit it with the entry.

    **Either way,** write and commit the entry, and state the
    decision in one line in the `While you were out` panel:
    - `published — <which trigger>`, or
    - `held — <why>`.

6. **Gate + commit + push:** `npm run verify`, then `npm run
   site:public` (the public build, which is also the check that
   tonight's entry renders for a stranger — it reports any panel it
   did not recognise and any capture it withheld for want of a
   what-line), then one commit `digest: <YYYY-MM-DD>` and push.
   The build output (`dist/`) is gitignored and stays uncommitted;
   the deploy happens from the Pages project, not from the tree
   (`docs/devlog-public-deploy.md`). Cloud ticks confirm the
   deploy per the standing rules if the digest commit
   triggers one. Run `npm run verify` **synchronously, in the
   same turn** — do not background it and do not call
   `ScheduleWakeup`/`send_later` to resume and commit later.
   The night workflow is one `claude-code-action` invocation:
   when the turn ends, the runner tears down and anything
   uncommitted is gone, no matter what got scheduled. If
   verify is still running when you'd otherwise end the turn,
   keep waiting on it in-turn (a blocking `Bash` call, or a
   poll loop) until it resolves, then commit and push before
   finishing.

## 4. Hard rules

1. Append a new `devlog/entries/DIGEST_<date>.md` each run;
   never overwrite a past day — the DevLog is a ledger. Run
   `npm run site:build` to check the entry renders: the HTML,
   hub and Cards / Enemies / Effects catalog it writes are
   gitignored build output (`.gitignore`, phase 57) and are
   never committed. The commit carries the Markdown entry, any
   `devlog/assets/<date>/**` captures and, on a publish night,
   the `devlog/PUBLISH` line.
2. Ship nothing else — breadth failures become findings, not
   fixes. The night shift briefs; the dispatcher ships.
2b. The entry is public. Every work item carries a substantive
   `**Why:**`; evidence is captured for every kind of change that
   has one (§4a-4c); a change with no picture says so in a
   `**No capture:**` line rather than borrowing one.
3. Proposals, never actions (the meta-loop rail).
4. A quiet day still gets a digest — "quiet" is information.
5. One commit; cloud ticks carry the `Cloud-Run:` trailer.
6. No `Co-Authored-By`, no emojis, no `--no-verify` — the
   standing rules apply at 3am too.
6b. Publishing is the §3 step 5b decision (major release, UI or
   QOL change, or play-blocking fix; when unsure, hold). It is
   recorded only by appending to `devlog/PUBLISH`. Never edit a
   past line of that file, and never touch it on a night that holds.
7. Never end the turn with the commit/push still pending on
   a backgrounded command or a scheduled wakeup — this run has
   no later turn to resume into (§3.6).

## 5. Failure modes

1. **`gh` unavailable** — degrade to a git-only pulse; note
   the degradation in the digest itself.
2. **Breadth check red** — that's a finding (HIGH AUDIT row),
   not a stop; the digest ships with the finding filed.
3. **Verify gate red on the digest commit itself** — fix only
   what the digest broke; ≤3 iterations, then stop loud per
   the standing rules.
4. **`git pull` divergence** — stop.
5. **`npm run verify` is slow** — wait on it in-turn; do not
   background it past the turn boundary. If it risks the
   job's `timeout_minutes`, that's a finding for tomorrow's
   digest, not a reason to defer this one.

## 6. Quick reference

```bash
devlog/entries/DIGEST_<date>.md      # the deliverable (append, never overwrite)
devlog/PUBLISH                       # append ONLY for a major release / UI-QOL change / play-blocking fix (§3 5b) — the sole deploy trigger
npm run devlog:shots -- <ref> <date> # collect UI before/after/diff (if screens changed)
npm run site:build                   # catalog (export+render) + entry HTML + hub (gitignored output)
npm run site:public                  # the public build into dist/ (gitignored)
plan/AUDIT.md                        # breadth failures land here
plan/CANDIDATES.md             # tuning proposals land here
gh run list --workflow march -L 20   # the invisible no-ops
npm --workspace axiomancer-mobile run e2e:minigames  # nightly breadth leg
npm run verify
git commit -m "digest: <YYYY-MM-DD>" && git push origin main
```
