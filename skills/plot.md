# Skill: plot

> **Plan, then (optionally) do.** A task leaves `/plot` as spec
> text, acceptance IDs and chunks with a place in `/next`'s
> order, so a later `/next` builds it without anyone
> remembering. `and do` builds it in the same run, so even a
> quick fix is planned, built and archived. Raw ideas go to
> `/messy`; bugs to `/bug`.

## 1. Purpose

Saying "we should also…" costs nothing; making it happen means
research (is it built? planned?), a shape (spec, A-IDs,
chunks), and a slot in line. `/plot` does all three and shows
where the work landed: an ASCII picture of the build order
before and after. The same verb runs for everyone; owner mode
decides only how it lands (owner: straight to main, settled;
contributor: a pull request that contributes the plot, so a
contributor's plan additions are reviewed like code).

## 2. Invocation

```
/plot "<task>"                 # work out the slot, and say why
/plot asap "<task>"            # onto the Asap lane: built before anything else
/plot anytime "<task>"         # no priority: table order, after every priority row
/plot peek "<task>"            # research and slot only; change nothing
/plot ... and do               # also build it now (or --do): plot, build, close, land as one unit
```

## 3. Procedure

### Step 0 — Orient

`git fetch origin`; the primary checkout gets diligence only
(on `<DEFAULT_BRANCH>` and clean: `git pull --ff-only`). Read
`plan/README.md` (table, lanes), the last ~15 lines of
`plan/ARCHIVE.md`, `plan/bearings.md`'s standing decisions (or
`identity/principles.md` and the open lines of
`identity/footguns.md`, where the repo has that layer), and the
specs the task touches. `node scripts/announce.mjs read`. Save
the **before** picture: `node scripts/plan/order.mjs --ref
origin/<DEFAULT_BRANCH>`.

### Step 1 — Research (the heavy lift is yours)

- Restate the task in 1-3 lines, in the asker's terms.
- Find what exists: grep the code, the specs, `plan/pending/`
  (open PRs' too, Step 4.2) and the decisions. Mark each part
  *already built*, *already planned* (spec, A-ID) or *new*.
  Don't plan what is done; link what is planned.
- **Existing features first.** Before designing anything new,
  name the smallest version built from what exists: an entry
  point, a link, a button that reaches a feature already built.
  Say what it covers and what it can't.
- Work out what it changes: the decisions it touches, the data
  and contracts it adds, the specs it crosses, the order it
  forces.
- **A principle or standing decision it would break stops the
  run:** ask (AskUserQuestion, before the first write); under a
  loop, park it in the `/oversight` queue and stop. Changing a
  principle is a recorded decision, never a side effect.

### Step 2 — Shape it

- **The small version first:** Step 1's version on existing
  features is the first chunk(s); a new flow follows only for
  what it can't do. When the small version does the whole task,
  plot only it.
- **Extend before you add:** an open spec that owns the
  surface (screen, flow, script, seam) takes the task, even a
  one-chunk fix, as an `## Add` (Step 4.3); a held spec takes
  no Asap slot. Say which spec it joined, or why none could:
  only then a new `plan/<NN>-<slug>.md` in the spec format
  (`skills/plan-a-spec.md` §4: why, Design, Acceptance with
  A-IDs, Open questions, Chunks). Several specs: each gets its
  part; a cross-spec A-ID closes at this spec's boundary,
  naming the other's.
- **Never quote a spec's moving lines** (last A-ID or chunk,
  Measure line, `N left`): every branch extending it quotes the
  same ones and only the first settles. Add places, settle counts.
- Chunking rules (`nexus/concepts/plan-shape.md`): stable
  A-IDs, never renumbered; sizes S/M/L (split anything bigger
  into vertical slices); every A-ID closed by a chunk;
  contract-first chunks first; a true `Measure:` line; `needs`
  names exact chunk ids (timing goes in `needs`, never prose).
- A lasting choice gets a `(proposed)` decision (`D?<slug>`).
  Questions only the owner can answer go in the spec's Open
  questions.

`peek` stops here: say where it would go and what it would take.

### Step 3 — Slot it

- `asap`: append the chunk ids to the Asap lane, contract-first
  first. `/next` builds lane chunks before anything else once
  their needs are done; it never interrupts a chunk in flight.
- `anytime`: no marker; the row sits in table order.
- *(no word)*: choose, and say why in one line: the Asap lane,
  a `priority N` on the row (never demote a priority the owner
  set without asking), chunks inside an existing priority spec
  gated by `needs`, or table order. Weigh what it needs and
  what needs it, the priorities set, risk (contracts before
  builders), cost.

### Step 4 — Write, in a worktree

1. **Worktree** (never the primary checkout), cut from
   `origin/<DEFAULT_BRANCH>`: owner, detached at
   `../<PROJECT_LOWER>-wt/plot-<slug>`; contributor, on branch
   `plot/<slug>`.
2. **Open PRs:** `gh pr list --json number,files`; for each
   touching `plan/pending/`, `gh pr diff <n> | grep -E
   '^\+## (Add|Edit) plan/[0-9]'` names the specs it extends.
   One already covering the task: "Already in PR #N", plot
   nothing. **A new spec's number** is above every spec on
   origin, in `ARCHIVE.md` and in every open PR. Reserve it:
   `node scripts/claims.mjs claim <NN>` (refused: take the next).
   The new spec file is written directly: a new file conflicts
   with nothing.
3. **Everything shared goes in one pending file**,
   `plan/pending/plot-<slug>.md` (`plan/pending/README.md`;
   `date:` front matter first): `## Add plan/NN-<slug>.md` for
   a spec it extends (parts `~~~ acceptance`, `chunks`,
   `questions`, `section <Heading>`; placeholder ids wherever
   the file names them); `## Edit plan/README.md` for a row
   and the lane entry, the root `README.md`'s roadmap if it
   lists specs; `## Edit` of a spec only to rewrite its text;
   `## Decisions` for a `(proposed)` decision. Each old text
   quotes enough to be found exactly once.
4. The gate (`pnpm verify`, or what `agents.md` names),
   foreground. Commit `plan: plot <what>`, the body saying why
   this slot.
5. The **after** picture: `node scripts/plan/order.mjs --mark
   <new chunk ids>` (placeholders too; it reads the pending
   file as settled).

### Step 5 — `and do` (only when asked)

Build the plotted chunks in order in the same worktree, each
as `/next` Steps 3-4 (`skills/next.md`): claim the chunk
(release the spec number's reservation first), delegate the
build by size, gate, write its pending close (an `## Add`
chunk has a number once the plot settles: settle first).
Contributor: on `plot/<slug>`, so plot and build are one pull
request; an `## Add` chunk waits for the merge. Too big for
the run: stop doing, keep the plot, say what's left.

### Step 6 — Land per owner mode

- **Owner:** `git rebase origin/<DEFAULT_BRANCH>`, `node
  scripts/plan/settle.mjs --no-commit` (folds the plot, and any
  close, in), the gate, commit with settle's message, `git push
  origin HEAD:<DEFAULT_BRANCH>` (`skills/next/land.md` §3; a
  spec `and do` emptied is absorbed in that commit). Rejected:
  fetch, rebase, settle, gate, retry.
- **Contributor:** `git push -u origin plot/<slug>`; `gh pr
  create --title "plan: plot <what>"`, the body holding the
  before/after pictures. Never settle.
- Release the spec-number claim once main (or the PR) holds the
  spec; close the worktree with `node scripts/worktree.mjs
  close <path>`.

### Step 7 — Report and retro

Before/after pictures (new chunks marked); the small version or
a new flow and why; the chunks (id, size, closes, needs); when
`/next` builds them; open questions, each with a default; one
line to move it; a brief retro (`/next` Step 6). End with the
same report as a `nexus-plot` JSON block; a trailing `Answers:`
on a later `/plot` answers its questions (`nexus/customization/plot-report.md`).

## 4. Hard rules

1. Never plan what is built; link what is planned.
2. Shared plan files change only through the pending file.
3. A principle the task would break is asked, never decided.
4. `and do` is off unless asked; the plot always lands, even
   when the doing stops early.
5. Extend before you add; never quote a spec's moving lines.

## 5. Failure modes

- **The task is already built:** say where, plot nothing.
- **It needs an owner's call before it can be shaped:** ask
  before the first write; under a loop, park it in the
  `/oversight` queue and stop.
- **It needs a chunk in another open PR** (no number yet):
  `needs —`, and say what it waits on.
- **The pending edit won't apply** (main moved under it):
  re-quote the old text against origin and retry once.

## 6. Quick reference

```bash
node scripts/plan/order.mjs --ref origin/<DEFAULT_BRANCH>   # before
node scripts/plan/order.mjs --mark 07.4,07.?zip            # after (reads pending files as settled)
node scripts/claims.mjs claim <NN>                          # reserve a new spec number
node scripts/plan/settle.mjs --no-commit                    # owner: land it settled
```

## 7. Miserere: kept on top of the kit

Carried at the nexus v2 cut-over (phase NX1d; `docs/nexus-deviations.md`
rows "plot", D93, D101, DL1c, rule 8). Where this section and the kit's
steps above disagree, this section wins for Miserere.

### 7.1 Open the PR (D93)

**Always the contributor path, as a `plot` PR T merges (D93).** Step 6's
owner path never runs here: the plot lands on a branch
`loop/plot-<slug>` (cut from `origin/main` before the first edit, in
its own worktree) as a pull request labelled `plot`, never `loop:pr`,
titled `plot: <what>`, which T merges to approve (D101; the merge job
never merges it). It carries exactly one size label (`size:S|M|L` for
one chunk, `size:multi-phase` for several), `review:plan-only`, and at
least one `area:*` label from the labels that exist (`gh label list
--search area:`). It does not count toward the PR cap (D85) and is not
a claim; `pr-resolve` keeps it mergeable (D87). Until phase NX1e
teaches the merge job to settle pending files, the plot writes its
spec, its roadmap row and its lane lines directly on that branch (a
new spec file conflicts with nothing), not through `plan/pending/`.

```bash
git fetch origin main
git worktree add -b "loop/plot-<slug>" ../miserere-wt/plot-<slug> origin/main
# or, from a clean checkout: git switch -c "loop/plot-<slug>" origin/main
# the spec, the roadmap row, Held lines, plan/deadlines.md edit here
git add plan/<NN>-<slug>.md plan/README.md plan/deadlines.md
git commit -m "plan: plot <NN> — <title>" -m "<k> chunk(s): <aliases>. <asap|anytime> because <reason>."
git push -u origin "loop/plot-<slug>"
# one chunk: size:S|M|L (its size); several chunks: size:multi-phase
gh pr create --repo "$GH_REPO" --base main --head "loop/plot-<slug>" \
  --label plot --label "<size:S|size:M|size:L|size:multi-phase>" \
  --label review:plan-only --label "area:<area the chunks will touch>" \
  --title "plot: <NN> — <title>" --body-file "$body"
```

The size label: `size:S`, `size:M` or `size:L` for a one-chunk plot,
`size:multi-phase` for a plot that splits (the per-chunk sizes are in
the PR's chunk table).

**Retro:** run `skills/march.md` §3 "Retro" (the Retro notes in
`skills/march.lanes.md` since the cut-over); a lessons commit rides the
PR.

### 7.2 Aliases, Held lines and the deadline plan

**Every new chunk carries an `alias:`** in the family-id style the
deadlines tools read (`EQ3a`, `EQ3b`, ...), so `plan/deadlines.md`,
PR titles and D-entries keep naming work the way they always have
(`scripts/deadlines-lib.mjs` resolves an id only from an alias). A
chunk only T can do (attended, owner-led) gets a Held line on the
roadmap (`since:`, `until:` its Item's date or `T's word`, `max_age:`).

**Reconcile the deadline plan** (phase DL1c), in the same commit as the
spec. `plan/deadlines.md` is edited by hand here; nothing regenerates
it except the Status cells:

- **Every chunk the plot added** gets a home, and every Item is a T act
  (phase DL2b). A loop chunk goes in the `Waits on` cell of the T act it
  unblocks, by its alias, never into an Item of its own and never into
  an Item's `Rows` (the lint fails that). A chunk that waits on T may be
  named in an `## Items` row's `Rows` whose due date sits inside its
  Window. A `needs plot` Item this plot answers is ticked `[x]` by hand.
  A chunk with no T act after it gets a `- <alias> — <reason>` line
  under `## Unscheduled` ("date not set" when the date is T's to pick
  and T is not here to pick it). Never guess a date for T.
- **Every Item the plot supersedes, re-scopes or completes** is edited
  itself, not only its Rows cell. Read each open Item in the plot's
  window and ask whether its premise still holds once these chunks
  exist; no lint sees an Item whose premise is gone.
- **One `## Change log` line** at the top of that section names what was
  added, edited and ticked, and why.

Then re-derive the Status cells and run the lint; both must be clean
before the PR opens:

```bash
node scripts/deadlines.mjs --write && git checkout -- LIVE_DEADLINES.md
node scripts/check-deadlines.mjs
```

### 7.3 The PR body

**The body is written for T first, the builder second (T,
2026-10-25).** The spec speaks to the agent that builds the chunk;
the PR body opens by saying what the player or T will see, because
T reads it to decide. `## What you'll see` comes first and holds no
file paths, chunk or acceptance IDs, D-numbers or code names: a
before/after table in player or owner terms (what is on screen, what
T can do, what changes in a run), one row per visible change, then
one `Cost:` line giving the size in plain words and what it does not
change. Write it as you would explain the plot to T across a table;
if T would have to ask "what does that mean?", rewrite it. The
engineering sections follow under it, then the kit's before/after
order pictures (Step 7).

`## Your calls` lists each `[T to confirm #n]` decision of the spec
under the same number, as a question T can answer in a word: the
default the spec assumes, then one or two alternatives in plain
words. "nothing" when the spec has none. A call the spec leaves open
for T, mark it `[T to confirm #n]` in the spec (numbered from 1) and
list it here under the same number.

```markdown
## What you'll see
| Today | After this ships |
|---|---|
| <what the player or T sees or does now, in plain words> | <what they see or do once every chunk lands> |

Cost: <size in plain words, e.g. "one evening of agent work, one PR">. It does not change <what stays exactly as it is>.

## Your calls
1. <a question T can answer in a word>? Default: <what the spec assumes>. Or: <alternative>; or <alternative>.
2. ...
(or "nothing")

To answer, comment `@claude 1: yes, 2: <word>` (or in your own words);
the spec, the roadmap row and this body update on the branch. Merging
with a call unanswered accepts its default.

## The task
<1-3 lines, in T's terms>

## What exists
- <already built / already planned, with paths; or "nothing">

## Recommendation
<one chunk, or k chunks and why it splits>

| Chunk | Alias | Size | Closes | Needs | Attended |
|---|---|---|---|---|---|
| <NN.k> — <title> | <alias> | M | A1, A2 | — | no |

## Slot
<asap|anytime>: <where in the order, what comes before it, and why>

## After merge
The next `/next` (or `/march` tick) can pick <first chunk> (or why it
cannot: held, `needs` unmet).
```

`## Your calls` sits second, right under `## What you'll see`, so T
reads what changes and what is asked before any engineering detail
(`scripts/loop-pr.test.mjs` pins the order).

### 7.4 Answering T's calls

T answers the PR's `## Your calls` by
commenting on the open `plot` PR with `@claude`: numbered (`@claude 1:
yes, 2: dock`) or in free text. `.github/workflows/claude.yml` runs the
Claude action on that comment and, because the PR carries the `plot`
label and T wrote it, tells it to follow this paragraph. The comment is
T's word, so this is T firing the skill, not the loop. On the PR's
branch:

1. **Read.** The PR body's `## Your calls`, the spec it adds
   (`plan/<NN>-<slug>.md`), its roadmap row and Held lines, and any
   part-plan or `plan/deadlines.md` lines the plot touched
   (`gh pr diff <n>`).
2. **Parse the answers.** Map each to a call number. `yes`, `ok`,
   `default` or `fine` keeps the default; a word that matches an
   alternative picks it; anything else is a new answer in T's words. A
   call the comment does not mention stays open. An ambiguous answer
   changes nothing for that call and is asked about in the reply.
3. **Then rewrite the spec to match:** each answered marker
   `[T to confirm #n]` becomes `Confirmed by T (<YYYY-MM-DD>): <answer in plain words>`
   (open calls keep their numbers); the acceptance IDs and chunks the
   answer changes, the `Measure:` line kept true; any roadmap,
   part-plan or `plan/deadlines.md` line the answer touches.
4. **Regenerate the PR body** (`gh pr edit <n> --body-file`): each
   answered call reads `<n>. <question> Answered (<date>): <answer>`,
   and the size label follows the answer if it changes the size.
5. **Re-run the deadline lint** (7.2's two commands); both must be
   clean.
6. **Commit and push** to the PR's branch (never force), then **reply on
   the PR**: one line per call (kept, changed to, or still open and
   why).

On a merged or closed `plot` PR change nothing: a new answer needs a
new `/plot`.

### 7.5 Merge means agreement

T merging a `plot` PR approves the whole
recommendation, so a call still unanswered at merge is its default,
accepted (AGENTS.md § Building a phase, "Calls left open"). It does not
hold the chunk; the build that picks it rewrites each `[T to confirm
#n]` left in the spec to `Accepted at merge (default)` in its own PR.

### 7.6 Hard rules, Miserere's

1. **Never fired by the loop** (AGENTS.md rule 8). A `skills/` file
   other than this one and `skills/messy.md` that dispatches `/plot`
   fails `scripts/loop-pr.test.mjs`. `/plot asap` from the Support SLA
   stays off (`Support: triage-only`).
2. **Asks only with T present** (rule 6); unattended it decides and
   writes the call into `## Your calls`.
3. **Content only from T's brief** (D88, D99): a card, keyword, art,
   enemy, relic, map, NPC or event chunk is plotted only from what T
   wrote or approved.
4. **Lands by a `plot` PR with one size label, never a push to
   `main`, never `loop:pr` (D93).** Never merges, closes or
   force-pushes its PR; T merges.
5. **No emojis, no attribution trailers** (AGENTS.md rule 2).
