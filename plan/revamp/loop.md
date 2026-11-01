# Revamp — the loop (skills, commands, agents, hooks, workflows)

> Part plan of [THE REVAMP](README.md). Phase **R0** (attended — it edits
> `.claude/**`, which is classifier-blocked for unattended runs). Decision
> D58. Status: RATIFIED 2026-09-28 (D64).

## Ruling

T, 2026-09-28:

- **Role during the revamp:** once ratified, `/march` ships **only** phases
  from the ratified revamp build plan, plus fix-ci and critique. **No
  content creation of any kind** — cards, keywords, enemies, relics, maps,
  NPCs, events, art. Owner-led phases (B1–B3, B5–B9) wait for T.
- `/march` and `night` are disabled on GitHub until ratification, and are
  re-enabled only after R0 merges.
- Keep **every** core verb and fix its doctrine; archive the content
  stewards, the design skills and most helper agents.
- **Amended in the R0 session (T, 2026-09-28):** `/march` keeps the
  upstream nexus chain — triage → critique → phase → expand → iterate —
  with only the stewards, `/forge` and the growth floor removed. `/iterate`
  and `/expand` run on their normal turns and create nothing. Red `main`
  stays with the `ci-autofix` workflow, not a march step. Revamp mode ends
  when Phase R11 (the loop's content phases) ships.
- **Also in the R0 session (T):** `/combat-playtest` is archived (command
  and workflow, to `archive-pre-revamp:plan/archive/2026-09-28-revamp-r0/`); Phase R12
  writes a new one after R11. The engine's matrix CLI
  (`npm run combat-playtest`) stays.

Telemetry note: the hook (`.claude/hooks/telemetry.mjs:232-258`) counts only
`Skill`/`SlashCommand` calls, so verbs `/march` dispatches by reading
`skills/*.md` are uncounted. GitHub Actions is the truer usage record.

## R0 — Loop doctrine reset (attended)

### Archive (move to `archive-pre-revamp:plan/archive/2026-09-28-revamp-r0/`)

| Item | Why |
|---|---|
| `skills/adjust-cards.md`, `skills/adjust-keywords.md` + stubs | audit presets, aspect thirds, `// pts:`, themes; growth rules contradict D37 |
| `skills/adjust-enemies.md`, `adjust-equipment.md`, `adjust-npcs.md` + stubs | no autonomous content work; every recent pass created nothing; KB gates ran empty |
| `skills/forge.md` + stub | used once; maps are hand-authored; events restricted by THE BLANK PAGE |
| `.claude/agents/card-expert.md` | teaches pricing, presets, six themes; a fresh card agent is written at the first card session (B6) |
| `.claude/agents/mechanics-expert.md` | Heart/Body/Mind + fallacy doctrine |
| `.claude/agents/reader.md` | a website auditor; `Auth: none`, no site |
| `.claude/agents/content-curator.md` | writes content the loop may not create |
| `.claude/skills/brainstorm-mechanics/` | RPS/fallacy/moral-meter identity |
| `.claude/skills/character-spec/`, `story-spec/`, `world-spec/` | ~80% shared text; "moral integration"; wrong output paths |
| `.claude/skills/kb-query/` | the MCP tools stay callable directly |

Fold before archiving: the 12-step keyword wiring checklist (from
`adjust-keywords`/`card-expert`) → `axiomancer-mechanics/docs/keyword-atlas.md`;
the map wiring contract → `docs/world.md` "Map shape" (verify complete).
Drop the stewards' `plan/CONTENT_LEDGER.md` rows, `march.md`'s steward
rotation (`:160-198`, `:194`, `:312-315`) and the growth-floor pre-emption
(`:135-156`). Update `scripts/check-harness-grants.mjs:7` (names `reader`),
AGENTS.md (`:92-121`, `:197-206`), bearings (`:223-248`, `:291-300`),
`axiomancer-mechanics/CLAUDE.md:87-89`, `plan/README.md` "Where design lands".

Mark `axiomancer-mechanics/specs/world/W-01-aporia-labyrinth-continent.md`,
`specs/story/00-story-spec-template.md` and `braindump/BRAINDUMP.md`
HISTORICAL. Owner action (not the repo): remove the globally installed
`anthropic-skills:rpg-mechanics-brainstorm` duplicate.

### Keep and fix

| Verb / file | Fixes |
|---|---|
| All verbs | a **revamp-mode banner**: ratified revamp phases only, no content creation (D58), THE CARD HOLD (D37); strip `card-expert` / `/adjust-*` routing (`iterate.md:243-248, 398`; `ship-a-phase.md:66-67`; `digest.md:79-83`) |
| `march.md` + stub | drop the steward rotation; one home for gate logic (critique §9, expand §9, iterate §6.6 repeat it); stub lists paused stewards and calls a 320-line skill "short" |
| `iterate.md` + stub | cut web-template audit categories (pillars, word counts, `alt`, unused CSS); focus list matches the skill; no content fixes |
| `ship-a-phase.md` | cut web-template text (Next.js/Express, 375px, page families, cross-link retrofit, `:84-122, 266-293, 412-413, 460-466`); "HP is sole win condition" (`:416`) → VITAE + befriend; dated incidents → archive |
| `plan-a-phase.md` | drop "specs win over bearings" (`:35, 118-123`) and the web brief format (`:61-73`); briefs cite `plan/revamp/` |
| `expand.md` | D37/D58 filter; exclude `braindump/` and HISTORICAL specs from signal E; drop the dead autonomous-posture branch; "Axiomancer" → product name |
| `oversight.md` | drop the dead `audit` mode (no callers) and the retired `[needs-user-call]` outputs |
| `critique.md` + stub | drop the dead auth dual-pass; stub must not say "delegate to playtester" (the skill forbids it unattended) |
| `jot.md` + stub | trim to the row append; fix `--authenticated`, the "thock" typo, dead route examples |
| `triage.md` | drop the `triage:needs-user` route (THE OPEN GATE abolished it); §6 defers to `close-trailers.yml` |
| `digest.md` | drop "Report CQI", the ten-preset curve, `/adjust-cards` filing, the nightly baseline re-measure (D57); fix "committed HTML" vs the gitignored build |
| `consolidate.md` | paths: `axiomancer-mechanics/docs/lexicon.json`, `…/docs/LEXICON.md`; archived example docs |
| `.claude/commands/fix-ci.md` | promote to `skills/fix-ci.md`; replace the dice-flag witness example; drop `[needs-user-call]` |
| `.claude/commands/combat-playtest.md` | rewrite around S3 questions (does stat growth track the stage curve; are the three survivors winnable/at risk); no status/mercy-as-alt-win/preset/CQI; findings → `plan/AUDIT.md` |
| `.claude/agents/scout.md` | fill `<DOMAIN_AUTHORITATIVE_SOURCE_*>` placeholders (`:68-70`); name; add kb-query tools or a KB-first rule |
| `.claude/agents/playtester.md` | fix `docs/reports/PLAYTEST_REPORT.md`, `docs/state-fixtures.md`, `docs/logging.md` paths; drop "mercy and other alt-wins"; check preset fixture ids |
| `.claude/hooks/telemetry.mjs` | log a row when `skills/<verb>.md` is read, so march-dispatched verbs count |
| `.claude/hooks/guard.mjs` | R1's baseline items (freshness print, baseline write-block) |
| `.claude/settings.json` | drop `lint:names`/`check-naming-law` allowances; add a guard or remove `Bash(git stash:*)` (shared stash across worktrees) |
| `.claude/launch.json` | drop the card-editor config (R1) |

### Workflows

T ruled: fix only ci-autofix. `.github/workflows/ci-autofix.yml` shares the
`nexus-loop` concurrency group (`:23-25`), so skipped runs enter the group
and displace pending real ones (2 successes, 32 cancelled, 266 skipped —
inferred, confirm in logs). Give it its own group or filter on `conclusion`
before queuing. Also fix `.github/workflows/README.md` drift (`:52` says
Opus 4.8; `:53` combat-playtest "doctrine verdict") and AGENTS.md:229
"weekly tuning loops". The idle verb workflows, `pat-probe` and `triage`
stay as they are.

### Plan hygiene

- `plan/bearings.md`: supersede `:283-285` (aspect thirds survive), `:338-345`
  (THE UNSHACKLING's full card authority), `:386-393` (open keyword growth)
  with D36/D37/D58 notes; reconcile `:691-700` CQI with digest.
- `plan/PHASE_CANDIDATES.md`: move moot rows to Rejected citing D36/D37/D48/
  D50/T6 — card-face parity (`:297`), `PRESET_LINEAGE` (`:347`), 27 damned
  exemplars (`:354`), enchant hooks (`:425`), pricing-lint credit (`:437`),
  starter-library trim (`:448`), swap-pool authoring (`:495`),
  premiseShed (`:524`), choice-width (`:546`), challenge-gradient (`:561`),
  themed enemy decks (`:595`), mid-game preset library (`:649`), preset
  budget lint (`:671`), doctrine curve (`:689`), "foe takes more damage"
  (`:794`, met by VULNERABLE); the card-mechanic gap rows (`:857, :914,
  :1003`) move to a card-session queue in `plan/revamp/cards.md`.
- `plan/AUDIT.md`: close moot rows (`:736, :784, :960, :1046, :1058, :1070,
  :1081, :1127, :1292`, `:326` mechanics-expert, `:1091` combat-playtest).
- `plan/CRITIQUE.md`: close `:413, :423, :433, :546, :560, :627`; re-verify
  `:228, :597` against the grey cards.
- `plan/phases/`: archive shipped briefs 102, 103, 104, M4, M5, T6.
- `plan/CONTENT_LEDGER.md`: drop steward rows (above).

## R11 — Reopen the loop (attended, closes the revamp)

Rewritten 2026-10-11 from a comparison with the `hunt` repo's fork of the
nexus kit (the owner's other loop). Added in the R0 session (T, 2026-09-28)
as the revamp's only exit; the original item list (content rules per
surface, the R0 archive review, zero-invocation verbs, the banner strip) is
kept below as items 1, 2 and 6. R11 is attended because it edits
`.claude/**` and sets doctrine. Requires RC.

### Ruling (T, 2026-10-11)

- **The revamp ended when RC cut `v0.1.0-checkpoint`.** Revamp mode (D58)
  was written to end "when R11 ships"; this phase records that it is over
  and removes it. Nine days of `/march` falling through to critique and
  iterate ("expand: pass 30 — no candidates") because every remaining `[ ]`
  row is attended is the cost of not running R11 sooner.
- **The loop opens pull requests.** T wants to see what gets built before
  it lands. Every tick that changes code lands through a PR onto `main`
  that T merges. The PRs are kept green and mergeable by a Haiku fixer, not
  by T.
- **The owner gets an intake.** `/plot` and `/messy`, modelled on hunt's,
  put T's ideas into the plan as briefs with acceptance IDs. The loop stops
  authoring its own briefs.
- **The loop learns after every run.** A retro step and a counted lessons
  ladder, modelled on hunt's footguns, replace "promote on ~weekly cadence,
  judged monthly".
- Cards and keywords stay owner-only (THE CARD HOLD, D37). Other surfaces
  are decided in the session (item 2).

### Before the session

1. Pause the `march` and `night` crons (disable the two workflows on
   GitHub). The loop edits the same doctrine files this phase rewrites.
   Re-enable at exit (item 9). **Done 2026-10-12** (T, attended session):
   both show `disabled_manually` in `gh workflow list --all`; the last
   march tick before the pause was run 38191422615 (2026-10-12 01:19Z).
2. Branch from `main`. R11 itself lands as a PR: it is the first PR the
   loop's new doctrine describes, and T reviews it the way every later one
   will be reviewed.

### Decisions for T (asked in the session, defaults in bold)

Recorded as the next free D-numbers (D84 onward; D83 went to RC2) in
`plan/2026-09-25-refactor-strategy.decisions.md`, each in three lines.

| # | Question | Default |
|---|---|---|
| a | Which ticks open a PR? | **Every tick whose diff touches anything outside `plan/`, `telemetry/`, `docs/reports/`.** Plan-only commits (queue rows, pass counters, build-plan ticks of a merged PR) and telemetry still push straight to `main`, or every PR conflicts on `AUDIT.md`/`CRITIQUE.md`. |
| b | How many loop PRs may be open at once? | **3.** At the cap `/march` does triage and critique's audit pass (no fixes), reports "waiting on T: PRs #a, #b, #c", and ends. |
| c | Who merges? | **T, by hand.** No auto-merge (the repo has it disabled; lessons.md deploy #4). A PR open 7 days is flagged in the tick's output, never closed by the loop. |
| d | What keeps a PR green? | **A Haiku `pr-autofix` run per red check, two attempts per PR**, then the label `loop:pr-stuck` and a line in the next tick's report. Conflicts with `main` are resolved by `pr-resolve` on every push to `main`. |
| e | Content per surface (cards, keywords, enemies, relics, maps, NPCs, events, art) | **Cards and keywords: owner-only (D37). Everything else: loop-shippable only as a plotted phase with a brief T wrote or approved**; nothing from `/expand`. Art stays owner-only (B8). |
| f | `/expand`'s posture now that T has `/plot` | **strict**: `/expand` files candidates only from measured signals (AUDIT, CRITIQUE, perf, telemetry) and never from design surfaces. `/oversight` still promotes; `/plot` is the owner's promoter. |
| g | What may `/iterate` fix? | Unchanged: AUDIT/CRITIQUE rows by score, but **a defect found while shipping is fixed in the same tick in its own commit** (hunt rule 9a), never parked. |

### Work items

**1. End revamp mode.**
- Strip the REVAMP MODE banner from every file that carries it
  (`grep -rl 'REVAMP MODE' --include=*.md .` → 20 files: 8 under
  `.claude/commands/`, 12 under `skills/`). THE CARD HOLD line survives as
  one sentence in `skills/march.md` §3 and `plan/bearings.md`, not a banner.
- `skills/march.md` §3 "Pickable phase": the first `[ ]` row, not attended,
  `Requires` ticked, **and not covered by an open loop PR** (item 3). Drop
  rule 1 (THE REVAMP block). `ship-a-phase.md:125-130` says the same
  (today it omits the attended exclusion; fix it).
- `plan/bearings.md:248-262` THE REVAMP entry → one historical paragraph:
  what it was, D46–D82, the tag, "ended at RC; R11 removed revamp mode".
  `AGENTS.md`, `plan/revamp/README.md` §1 and §7, `plan/README.md`,
  `.github/workflows/README.md`: same sweep.
- Add `revamp mode` to `scripts/check-lexicon.mjs`'s retired-doctrine
  claims so a banner cannot come back by copy-paste; the historical
  paragraph in bearings and this file are the exemptions.

**2. Content rules per surface** (decision e). Record them in bearings
"Decisions standing for the autonomous loop" and in `plan/revamp/README.md`
§Rebuild track. The B-rows stay `[blocked: owner-led]`.

**3. The loop opens PRs** (decisions a–d).
- `skills/ship-a-phase.md` Steps 10–12: branch `loop/<verb>-<slug>` cut
  from a fresh `origin/main`; commit; `git push -u origin <branch>`;
  `gh pr create` with a body template (what shipped, what T can now do,
  Decisions, `Closes #<mirror>` trailer, the brief's acceptance IDs
  ticked); label `loop:pr`; the build-plan row gets `- pr: #N` (the
  `- issue:` field's shape) and stays `[ ]` until merge. The PR's last
  commit flips the row to `[x] (#N)` so the merge ticks it. Then
  `gh pr checks --watch` replaces `deploy:check` for the branch (the
  `verify-*` workflows already run on `pull_request`). Step 12.5's mirror
  comment posts the PR URL; `close-trailers` closes the mirror on the
  merge push as it does today.
- Same change in `skills/iterate.md` (`:325, :337, :431`),
  `skills/critique.md` (`:250, :326`) and `skills/fix-ci.md` for fixes
  that touch code; one PR per tick, never one per fix.
- A row or AUDIT/CRITIQUE item with an open `loop:pr` PR counts as
  claimed: `/march` and `/iterate` skip it. Open PRs are the claim table;
  no `claims` branch (hunt's) is needed while one loop runs at a time.
- `AGENTS.md` standing rule 1 and `plan/bearings.md:331-336` ("Direct
  pushes to main are sanctioned") are amended: direct pushes stay
  sanctioned for plan-only, telemetry and `fix-ci`-on-`main` commits;
  code lands by PR. Attended sessions with T may still push `main` at T's
  word.
- Telemetry shards are per session, so a CI tick's PR carries only its own
  shard and merges clean; the stranded-rows step in `_claude-skill.yml`
  pushes to `GITHUB_REF_NAME`, which is `main` for a cron run, so it stays.
- `.github/workflows/pr-autofix.yml`: `workflow_run` on
  `verify-mechanics`, `verify-mobile`, `verify-prose`, `verify-drift`
  `completed` with `conclusion == 'failure'` and `head_branch != 'main'`,
  job-level concurrency per PR (the ci-autofix lesson above: never the
  shared `nexus-loop` group); only for a PR labelled `loop:pr` whose head
  is in this repo (never a fork). Calls `_claude-skill.yml` with
  `model: claude-haiku-5-5`, prompt `/fix-ci <run-id> --branch <head>`,
  `timeout_minutes: 30`. `skills/fix-ci.md` gains `--branch`: check out
  the PR branch, reproduce, fix the root cause, push to the branch (never
  force), one root cause per run. After two red runs on one PR it adds
  `loop:pr-stuck` and stops; `/march` reports stuck PRs each tick.
- `.github/workflows/pr-resolve.yml`: on `push` to `main`, for each open
  `loop:pr` PR whose `mergeable` is `CONFLICTING`, merge `main` into the
  branch on the runner; a conflict only in `telemetry/` or a plan queue
  is settled by the union of rows (ordered by timestamp for telemetry);
  anything else goes to a Haiku `_claude-skill.yml` run with Read and
  Edit only (hunt's `scripts/pr/resolve.mjs` is the model). Push, never
  force. Mirror hunt's `union-edit-doubles` lesson: after a union merge of
  an append-only file, diff it against `origin/main` and drop doubled
  rows.
- `.github/workflows/claude.yml` (the `@claude` reviewer) stays, on
  Opus; it is T's channel, not the loop's.
- A new test, `scripts/loop-pr.test.mjs`, pins the pieces a PR flow can
  silently lose: the label filter in `pr-autofix.yml`, the `head_branch
  != main` guard, the job-level concurrency group, and the body template's
  `Closes #` trailer shape that `close-trailers` reads.
- **Cost.** The repo is public (`gh repo view --json isPrivate` →
  `false`), so GitHub-hosted standard runners cost no minutes. The PR flow
  doubles `verify-*` runs (once on the PR, once on the merge push); that
  is free. The paid part is Claude usage: a Haiku fixer run only on a red
  check (at most two per PR), and a Haiku resolve only on a conflict. The
  march cadence itself does not change. Put a line in
  `.github/workflows/README.md` saying so, and have `/oversight` print the
  month's run counts (`gh run list --workflow pr-autofix.yml`) so the
  assumption gets checked.

**4. Owner intake: `/plot` and `/messy`.**
- `skills/plot.md` + `.claude/commands/plot.md`, after hunt's
  `.claude/commands/plot.md`: `/plot asap|anytime|peek "<task>"`. Orient
  (bearings, reflexes, the build plan, AUDIT/CRITIQUE heads); research
  (what exists in code and plan, which D-numbers it touches, which
  surfaces per item 2); shape (a brief in `plan/phases/` in the §4 format
  of `plan-a-phase.md`, **with acceptance IDs `A1…` and a `Measure:`
  line**); slot (an `asap` row goes to the top of the build plan's "Next
  up", `anytime` at its end, no word → the command picks and says why);
  commit `phases: plot <N> — <title>` and push `main` (plan-only). Never
  builds. Never dispatched by `/march`.
- `skills/messy.md` + `.claude/commands/messy.md`: a raw dump to a
  gitignored `plan/messy/YYYY-MM-DD-<slug>.md`; cluster; for each theme
  check what exists; refine into a part plan under `plan/revamp/` or a
  new `plan/<topic>.md` and `PHASE_CANDIDATES` rows marked
  `[owner]`; fan out one agent per theme for 3+ themes. Never commits the
  dump. Never builds.
- `skills/plan-a-phase.md` §4: acceptance IDs and `Measure:` become part
  of the brief format; `ship-a-phase.md` ticks the IDs it closes in the PR
  body.
- **The loop stops authoring briefs.** `ship-a-phase.md:132-136` and
  `march.md` Step 3: a `[ ]` row with no brief is not pickable; the tick
  files a `PHASE_CANDIDATES` row "needs a brief: `/plot <N>`" and moves
  on. `/plan-a-phase` stays as the attended way to write or refresh one.
- `/jot` stays as the CRITIQUE quickfire; `/plot` is to the build plan what
  `/jot` is to CRITIQUE. Say so in bearings.
- `/expand` posture per decision f.
- **Owner-only, offered in conversation (T, 2026-10-11).** `/plot` and
  `/messy` are never fired by the loop: no `/march` step, cron, workflow
  or loop verb dispatches them, and `march.md` says so. They are fired
  in a conversation with T:
  - When T, speaking plainly to any agent (attended session, `@claude`
    on GitHub, a brainstorm), says they want work the loop should pick
    up ("let's add…", "the loop should build…", "make a phase for…",
    "queue this"), the agent routes it through `/plot` (one known task)
    or `/messy` (a loose or many-themed dump) instead of writing a
    build-plan row, brief or candidate by hand. A direct request runs
    the skill; an ambiguous one is asked first.
  - At the end of a brainstorm or design conversation that produced
    buildable direction, the agent offers, in one question: "Want to use
    `/plot` to turn this into a phase?" or "Want to use `/messy` to file
    this dump?" (`AskUserQuestion`, per `docs/asking-well.md`), and runs
    the one T picks. No answer or a no means nothing is filed beyond
    AGENTS.md rule 7's residue.
  - Where it lives: a new AGENTS.md standing rule beside rule 7 ("File the
    residue": buildable direction from T goes through `/plot` or
    `/messy`, not a hand-written row), mirrored in `CLAUDE.md` so
    attended sessions read it first; each skill's frontmatter
    `description` names its triggers so the harness surfaces it; rule 7
    points at the two skills for "buildable ideas" instead of writing
    `PHASE_CANDIDATES` rows directly when T is present.
  - A test in `scripts/loop-pr.test.mjs` (or its own) fails if any file
    under `skills/` other than `plot.md`/`messy.md`, or any workflow,
    invokes `/plot` or `/messy`.

**5. The loop learns: retro and a counted lessons ladder.**
- A **Retro** step closes `ship-a-phase`, `iterate`, `critique`, `fix-ci`
  and `plot` (even a tick that shipped nothing): bump or add a lesson in
  `plan/lessons.md`; a lesson **seen twice** is automated in the same tick
  (a guard check, a test, a lint) or, if that is a phase of its own, a
  `PHASE_CANDIDATES` row naming the automation; tighten the skill's own
  file if one of its steps misled you (it may only get safer or clearer);
  "retro: clean" is a valid outcome. Commit `lessons: retro <verb> <N>`.
- `plan/lessons.md` format: one bullet per lesson,
  `- **slug** · trap → rule · seen N× · last YYYY-MM-DD · open | guarded by <hook/test>`,
  ≤500 bytes, under its `@domain:` anchor. Migrate the six existing
  entries. The retro may promote to `plan/reflexes.md` directly when a
  lesson has been seen three times across verbs; `/oversight` reviews
  promotions after the fact (THE OPEN GATE: loop decides, owner reviews).
  `/consolidate` keeps its hygiene pass but no longer gates promotion.
- `scripts/check-lessons.mjs` in the root `npm test` and as a
  `guard.mjs` post-write check: format, unique slugs, the byte cap,
  `reflexes.md` ≤50 lines, ≤40 open lessons (a lesson becomes `guarded by`
  or is merged; the budget forces graduation).
- Skills cite lessons inline where they bite (`… (lesson
  \`shared-tree-sweep\`)`), the way hunt's `next.md` names footguns.
  Start with lessons.md deploy #1–#5 at the steps they came from.

**6. R0 archive and zero-invocation verbs** (unchanged from the R0 text).
Review `git show archive-pre-revamp:plan/archive/2026-09-28-revamp-r0/...`
for anything worth reviving in a new shape under item 2's rules (a content
agent is written at the first owner-led content session, not here). Check
`npm run telemetry` (with `verb-read` rows) and the Actions run history
for verbs with no invocations since R0; fix how they are wired rather
than cutting them (R0: keep every core verb). Also close the telemetry
`tick-end` gap still visible on 2026-10-11 (`/march` prompts at 14:33,
18:39 and 20:34 with no `tick-end`) or file it to AUDIT with the cause.

**7. Doctrine sweep.** `AGENTS.md` (rules 1, 6, 7 and the level-0 "by
hand" text), `plan/bearings.md` (THE REVAMP entry, the push rule, the
verbs table, "Where things are"), `docs/truth-sources.md` (a PR body is a
truth source below the commit), `.github/workflows/README.md`,
`plan/README.md`. Every line that says "pushes to main" for code now says
"opens a PR".

**8. Tests and gates.** `npm run verify` per touched workspace, root
`npm test` (picks up `check-lessons` and `loop-pr.test.mjs`),
`node scripts/check-lexicon.mjs`, `node .claude/hooks/guard.mjs self-test`,
`node .claude/hooks/telemetry.test.mjs`. `actionlint` (or
`gh workflow view`) on the two new workflows.

**9. Exit.**
- The R11 PR is merged by T.
- Re-enable `march` and `night`. Watch the first cron tick end to end: it
  opens a PR (or reports the cap or "no pickable row"), the PR's
  `verify-*` runs are green or `pr-autofix` fires once, T merges, the
  build-plan row flips, the mirror closes.
- Tick R11 `[x]` in the build plan (the merge commit), update
  `plan/revamp/README.md` §7 row 13, add the archive line.
- Next: R12, and the first `/plot` by T.

### Out of scope

Content creation itself (the B-rows, owner-led); R12; a `claims` branch for
several concurrent loops (one loop runs at a time; revisit if a second
cron or a contributor appears); a Haiku PR-description writer (hunt's
`pr-flow`); changing the march cadence.

### DoD

No file carries the REVAMP MODE banner; `check-lexicon` fails if one
returns. `/march` picks the first unattended `[ ]` row with a brief and no
open PR. Code lands only by `loop:pr` PRs; `pr-autofix` and `pr-resolve`
exist, are tested, and have run at least once each (by `workflow_dispatch`
on a throwaway branch if no real red or conflict occurred). `/plot`,
`/messy` exist, no loop verb or workflow fires them, and AGENTS.md and CLAUDE.md tell agents to run or offer them when T asks for loop work or ends a brainstorm; `ship-a-phase` refuses a missing brief. Every closing verb
has a Retro step; `check-lessons` is in the root test. D83+ recorded.
bearings, AGENTS.md and the workflows README describe the loop as it now
runs.

### As shipped (attended session, 2026-10-12)

Ballot (D84–D90): a, b, c, d, g took the defaults. **e** (T): the loop may
propose enemies, relics, maps, NPCs and events, and builds them only from a
build-plan row whose brief T wrote or approved; cards, keywords and art stay
owner-only (D88). **f** (T): `/expand` stays **bold**, not strict (D89).
T also added `devlog/entries/` to the plan-only paths so `/digest` keeps
pushing `main`.

Departures from the text above, each for a reason:

- Banner count: 21 files matched, but the 21st is this file (the brief),
  zoned and exempt; the 20 live banners are gone.
- `_claude-skill.yml`'s stranded-telemetry step did **not** "stay": from a
  `loop/*` branch its `pull --rebase origin main` + `push HEAD:main` would
  push the PR's commits to main. It now pushes to the branch HEAD is on
  (lesson `cross-branch-telemetry-push`, pinned by `loop-pr.test.mjs`).
- `_claude-skill.yml` gained `allowed_tools`, `pre_run` and `post_run`
  inputs, so `pr-resolve`'s Haiku run gets Read and Edit only between a
  scripted prepare and finish (`scripts/pr-resolve.mjs`).
- PR claims are by title (`phase <N>`, `AUDIT <id>`), checked before the
  branch is cut.
- Item 6, telemetry: "zero-invocation verbs" was a logging gap, not unwired
  verbs. CI ticks read skills with `cat`/`sed`, which the Read-only hook
  missed (0 `verb-read` rows across 106 `/march` ticks since R0, while the
  ticks shipped critiques and fixes); shell reads now count. The
  2026-10-11 `tick-end` gap: the runner log shows the shard unchanged ("No
  stranded telemetry rows"), so the Stop hook never wrote the row; the
  runner now writes it from the action's execution file when missing
  (`telemetry.mjs tick-close`). Both are covered by
  `.claude/hooks/telemetry.test.mjs`.
- Item 6, the R0 archive: nothing revived. The stewards' create/retire
  halves contradict D88; their roster audits are filed as one `[owner]`
  candidate ("Roster-health lenses for /iterate"). The design skills stay
  archived (T has the brainstorm skill); `combat-playtest` is R12's.

## R12 — New combat-playtest (attended)

Added in the R0 session (T, 2026-09-28), which archived the old
`/combat-playtest` command and workflow. Write a new command (and, if
wanted, a workflow) for the rebuilt game:

- Decide what it measures: whether stat growth tracks the Act 1 curve,
  whether each survivor is winnable and still dangerous, and the player's
  lowest VITAE per fight (the old matrix never recorded it).
- Build on the engine matrix CLI (`npm run combat-playtest`,
  `src/Combat/combat.playtest.ts`) and the `playtester` agent; re-point the
  stage profiles to Act 1 levels if R9 has not.
- Findings go to `plan/AUDIT.md`; it stays report-only.

The archived rewrite (`archive-pre-revamp:plan/archive/2026-09-28-revamp-r0/.claude/commands/combat-playtest.md`)
is a starting draft, not a spec. Requires R9, R11.

R12a built the engine half: `measuredTruthCells` (`src/Combat/combat.measured-truth.ts`)
measures the grey deck and the Blood Price test deck across the Act 1 ledger
at three stat spreads, with lowest VITAE, into `docs/reports/measured/`, on
mechanics merges and Sundays (`measured-truth.yml`). R12 designs the command
on top of it: the policy roster, the stage-profile re-point, and what a drift
should trigger beyond a `[content]` AUDIT row.

### Exit

R0 merges → T re-enables `march` and `night` → the loop picks R1.
