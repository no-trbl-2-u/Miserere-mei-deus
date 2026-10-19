# Miserere Mei, Deus monorepo — agent guide

<!-- lexicon-ok: pressure-tracks -->

**Miserere Mei, Deus** is a turn-based, single-player dark fantasy
deckbuilding RPG for mobile: a deterministic TypeScript rules engine where
what the player owes, and to whom, is a mechanical input, not flavour.
**Read [`docs/game-model.md`](docs/game-model.md) first:** it is the game
as the code stands, every number with its constant, and what the game
does not have. Then the product spec, `spec.md`.

**Reading order:** everyone → `docs/game-model.md`; loop/plan work →
`plan/bearings.md`; package work → that package's `AGENTS.md`;
design/balance/content work → `axiomancer-mechanics/VISION.md` (T's wants)
+ `spec.md`.

npm-workspaces monorepo. Two packages, flat at the root:

| Package | Role |
|---|---|
| `axiomancer-mechanics` | TypeScript game engine + CLI. Owns rules, state transitions, deterministic RNG, content libraries, balance/tuning, hermetic engine tests. |
| `axiomancer-mobile` | Expo / React Native app. Consumes mechanics as **local source** via the `@mechanics` alias (`→ ../axiomancer-mechanics/src`). Owns screens, navigation, theming, presenters. |

## Hard rules

- The pre-monorepo per-package **nexus** harness (old loop verbs + accumulated
  `plan/` memory + nexus CI) formerly lived in `/archive`. It was mined for its
  durable findings and **removed at the 2026-07-03 re-onboard**; its live
  successor is the unified root harness (see "Nexus — the autonomous loop"
  below). Do not resurrect its stale pre-monorepo assumptions (npm-publish /
  engine-pin model, Pressure Tracks) from git history.
- Mobile consumes mechanics via `@mechanics` — a mechanics rename/removal can
  break it. When changing mechanics' public surface, verify mobile. (The card
  editor, the other consumer, was deleted in revamp phase R1, D56.)
- Rules/state/RNG belong in `axiomancer-mechanics`, never duplicated in mobile
  presenters.
- **Asking the user questions.** In attended sessions, every question
  to the user goes through the `AskUserQuestion` tool — never bare
  prose — shaped per [`docs/asking-well.md`](docs/asking-well.md)
  (the canonical question-writing doctrine; `skills/oversight.md` §5
  is its worked example). The six rules in short: 1-4 questions per
  batch; recommended option first and marked; descriptions name the
  trade-off; lead with prose; every question states its defer path;
  answers are policy — file them durably and never re-ask. Autonomous
  loop skills never ask at all — `AskUserQuestion` is reserved for
  `/oversight` there (standing rule 6 below); they decide, document
  the call, and file load-bearing calls as `[loop-call]` residue for T to
  audit afterwards (THE OPEN GATE retired `[needs-user-call]`).

### Cross-package impact checklist

Any diff touching one of these mechanics paths can break `axiomancer-mobile`
(consumed via `@mechanics` as local source, not a published package) and must
be verified against it before a PR lands:

- `src/Combat/**`
- `src/Cards/**`
- `src/Effects/**`
- `src/Enemy/**` (mobile renders `portraitAsset` in the event + combat
  presenters and imports `EnemiesByMap`)
- `src/NPCs/**` (dialogue trees drive mobile's dialogue route)
- `src/World/**` — ALL of it, including `MapEvents/`, `Continents/`
  (mobile's `layout-engine-parity` test breaks on any engine map-node
  change), `Labyrinth/`, `Blacksmith/`, `RestChoice/` (the successor of
  the retired `Rest/`), and the world core modules (`map.registry.ts`,
  `map.library.ts`, `encounter.ts`, `quest.*.ts`, `dialogue.runtime.ts`)
- `src/index.ts`

If a diff matches any of the above, run
`npm run verify -w axiomancer-mobile` and block the PR on failure.

This checklist is also mechanized in CI: the owning job in
`.github/workflows/verify-mechanics.yml` diffs the pushed range against
the impact paths above and runs the mobile verify in the same installed
environment. Browser evidence is routed by subsystem:
Combat/Cards/Effects → Combat; Enemy → Combat + Encounter; Hazard →
Hazard; every other `World/**` path and
`NPCs/**` → Encounter routing. Shared, lockfile, workflow,
classifier, or unknown-history changes fail closed to every journey. Run the
consumer gates locally anyway — CI catching a break means it already reached
`main`.

`rest-tuning` was
retired in Phase 52e, `quest-board-tuning` in Phase 61,
`gathering-tuning` in Phase 76, and `loot-cache-tuning` in Phase 63,
each along with the minigame it tuned. `deck-tuning`, `hazard-tuning`,
`world-tuning`, `combat-ux-tuning`, `critic-loop`, `deep-playtest`,
`hermes-playtest` and `dep-upgrades` were retired in trim T5 (2026-09-25,
decision D10) with zero invocations in six weeks; they are to be rebuilt
once the mechanics settle (after the D4 stat hooks and the card rework).
The `/combat-playtest` command was archived in R0 (2026-09-28); Phase R12
writes a new one. The playtest matrix stays as
`npm run combat-playtest -w axiomancer-mechanics`.

## Root `.claude/`

Live, at the repo root:
- `.claude/commands/` — the loop verbs' doorways only. No domain command is
  live: `combat-tuning`, `legacy-combat-tuning`, `playtest`,
  `resolve-playtest` and `bump-engine` were trimmed earlier, the eight
  tuning/playtest commands above went in trim T5 (D10), and `combat-playtest`
  was archived in R0 (Phase R12 rebuilds it).
- `.claude/agents/` — `scout` (web research with citations) and
  `playtester` (plays seeded encounters via Playwright, report only).

The content stewards (`adjust-*`, `forge`), the `card-expert`,
`mechanics-expert`, `reader` and `content-curator` agents, and the design
skills (`brainstorm-mechanics`, `character-spec`, `story-spec`, `world-spec`,
`kb-query`) were archived in R0 of THE REVAMP (2026-09-28, D58); since R10b2
they live only under the `archive-pre-revamp` tag (D66). The loop creates no content during the
revamp; card and keyword design happens only in guided sessions with T (D37),
which will write a fresh card agent (B6). The `kb-query` MCP tools stay
callable directly. The keyword wiring checklist now lives in
`axiomancer-mechanics/docs/keyword-atlas.md`; the map wiring contract in
`axiomancer-mechanics/docs/world.md`.

Commands write their reports to `<package>/docs/reports/` (created on
demand). Each domain command is self-contained — it does not read
`plan/` loop state (the loop verbs in root `skills/` do; see "Nexus"
below).

## Truth sources

**`docs/game-model.md` is the first read for any rules question**; where
it and the code disagree, the code wins and the page is a bug.

Three kinds of truth answer game questions. For any non-deterministic
question or open-ended task, reach for the two MCP servers below —
any agent may use them, not just the design sub-agents. `axio-query`
is an accelerator, never a dependency — it reads this repo's own files,
so the Grep/Read path always works. `kb-query` is the ONLY route to the
external corpus: if it is down, prior-art grounding is unavailable that
run and any claim from memory is marked UNGROUNDED.

| Source | Answers | Freshness |
|---|---|---|
| **`axio-query` MCP** (`axio_overview` / `axio_cards` / `axio_effects` / `axio_keywords`) | The engine's OWN card/enemy/effect/keyword facts, generated from the live libraries | As current as the working tree — never stale |
| **`kb-query` MCP** (`kb_overview` / `kb_find_games` / `kb_search` / `kb_read_doc` / `kb_cards` / `kb_keyword`) | External prior art: board-game rules + reception, Dawncaster corpus (1,692 cards / 141 keywords) — cite `kb:<game-slug>/<doc> (src-NNN)` | Live — served over HTTP by the KB's deployed Worker, current as of that repo's last deploy |
| **Measured baselines** | Win-rate curves, status engagement | **Retired** (D57, R1): none is current until R9/B2 re-measure; the last one lives only under the `archive-pre-revamp` tag and describes a pre-revamp engine |

Measuring is not tuning: a measurement is briefing. During the
revamp, card and deck changes happen only in guided sessions with T (D37);
engine constants move only inside a ratified revamp phase (D58).
Full protocols (consumption surfaces, wishlist, measured truth): [`docs/truth-sources.md`](docs/truth-sources.md). The complete
external-system register (ownership, credentials, recovery):
[`docs/external-architecture.md`](docs/external-architecture.md) —
update it whenever the product gains a hosted service, sibling repo,
MCP server, or external datastore.

## Pull requests

(Applies repo-wide.) The loop lands every code change as a PR labelled
`loop:pr` onto `main` (D84; `skills/march.md` §3 "Landing a change");
plus one `size:*`, at least one `area:*` and any applying `review:*`
label (`skills/march.md` §3 "Area and review labels");
plan-only and telemetry commits still push `main`, except `/plot`'s
spec and rows, which open a PR labelled `plot` (never `loop:pr`; D93)
so T approves the phase split by merging it. Open PRs ready for
review, not drafts. **T merges by hand** (D86): never enable auto-merge
(it is disabled on this repo) and never merge, close or force-push a
`loop:pr` PR. `pr-autofix` (Haiku, two runs per PR) keeps a red
`loop:pr` PR green and `pr-resolve` keeps it mergeable (D87); at most 5
are open at once (D85).

## Per-package guides

Each package keeps its own `AGENTS.md` / `CLAUDE.md` with domain specifics
(engine doctrine, mobile presenter boundaries). Read the relevant one before
working in a package.

## Testing at a known state

`docs/state-fixtures.md` — one declarative **state fixture** (preset, map,
node, flags, seed) boots the mechanics CLI (`--fixture <id>`), seeds a Jest
store, and deep-links the web build (`?fixture=<id>` /
`__AXM_FIXTURE__`). Registry: `axiomancer-mechanics/src/Game/fixtures`.

## Verify

- `npm run verify --workspace axiomancer-mechanics` — type-check + lint + tests + build
- `npm run verify --workspace axiomancer-mobile` — lint + typecheck + jest +
  asset-provenance / art / critique-drive tests
- **Fresh `.claude/worktrees/*` checkouts**: run `npm install` at the
  worktree root before verifying. A worktree has no per-workspace
  `node_modules`, so `tsc` resolves the hoisted root TypeScript instead
  of a package's pinned version (mismatched `module`/`moduleResolution`
  options between them can fail with e.g. `TS5095`) — installing first
  avoids the detour.

## Nexus — the autonomous loop (live)

The unified **nexus** harness was re-onboarded onto the monorepo on
2026-07-03 (`chore: adopt nexus methodology`). It is now live at the repo root:

- `skills/` — the loop verbs: `ship-a-phase`, `plan-a-phase`, `iterate`,
  `critique`, `triage`, `expand`, `march`, `oversight`, `jot`, `digest`,
  `consolidate`, `fix-ci`, and T's intake `plot` and `messy` (never
  fired by the loop, rule 8). (Heavyweight source-of-truth files; the
  `.claude/commands/<verb>.md` pointers are the doorways.) `/march` runs
  the upstream chain (triage → critique → phase → expand → iterate) and
  builds only briefed, unattended, unclaimed build-plan rows. **Content
  per surface (D88):** cards, keywords and art are owner-only (THE CARD
  HOLD, D37); enemies, relics, maps, NPCs and events are built only from
  a row whose brief T wrote or approved, and `/expand` may propose them.
- `plan/` — the loop's durable memory: `bearings.md` (standing context —
  **read this first**), `steps/01_build_plan.md` (the phase queue),
  `AUDIT.md` + `CRITIQUE.md` (the drain queues), `PHASE_CANDIDATES.md`,
  `revamp/` (THE REVAMP part plans, kept as the record),
  `reflexes.md`, `lessons.md` (the counted retro ladder, linted by
  `scripts/check-lessons.mjs`) and `phases/` (open + recent briefs).
  There is no archive directory (D66): pre-revamp history is read with
  `git show archive-pre-revamp:plan/archive/<path>`, and only when T asks
  about history. Never read it to learn how the game works.
- **Deadlines** (T, 2026-10-19): `plan/deadlines.md` is the whole deadline plan (the v0.3 milestone, the
  two-week windows, and the Items table with every deadline item, done or open, its due date and the phase ids
  that finish it or `needs plot`). `LIVE_DEADLINES.md` at the root is the next two weeks of items that need T,
  generated from it daily by `.github/workflows/deadlines.yml` (never edit it by hand). A `/plot` of a
  deadline item replaces its `needs plot` with the new phase ids. The loop is not restricted to the current
  window.
- `scripts/` — `deploy-check.mjs` (CI-green deploy gate),
  `notify.mjs` (pager), `loop-issue.mjs` (GitHub issue mirror),
  `pr-resolve.mjs` (keeps `loop:pr` PRs mergeable).
- `docs/game-model.md` — the game as the code stands; `spec.md` — the
  product spec the loop builds against.

Two gates wrap every shipping tick: the **verify gate**
(`npm run verify`, per-workspace, pre-commit) and the **CI gate** on the
PR (`gh pr checks --watch`; `npm run deploy:check` for `main`). The loop
**opens a PR** for code and pushes plan-only commits to `main`; T merges
the PR. Every closing verb ends with a **Retro** (`skills/march.md` §3).
Start at intervention level 0 (`/ship-a-phase` by hand, which opens its
PR); ratchet up via `/march` then `/loop /march`.
Full context lives in `plan/bearings.md` and the nexus kit
(`../nexus/`).

**GitHub Actions layer.** Every zero-input skill/command also runs in CI
via `.github/workflows/` (scheduled `/march` ticks, `/digest` every other
night, monthly `/consolidate`, weekly drift and lint checks, `/fix-ci` on red
main, `pr-autofix` on a red `loop:pr` PR, `pr-resolve` on every push to
main, `@claude` mentions). See `.github/workflows/README.md` for the full map, cadences,
and required secrets (`CLAUDE_CODE_OAUTH_TOKEN`, recommended `GH_PAT`).

**Enforcement layer (always on).** `.claude/settings.json` is committed
and active in every session, attended or not: permission allowlist (so
unattended `/loop` ticks never stall on a prompt), deny walls for
force-push / `--no-verify` / destructive resets / `.env` reads, and the
`.claude/hooks/guard.mjs` hooks that block forbidden commands at the
harness and warn on unclean turn-ends. Personal overrides go in
`.claude/settings.local.json` (gitignored), never in the shared file.
Self-test the guard any time with
`node .claude/hooks/guard.mjs self-test`.

Domain commands (none live until R12's new combat-playtest) are a separate
layer from the loop verbs. Do not merge the two.

## Nexus standing rules (canonical)

These apply to every loop skill and session. `plan/bearings.md` echoes
them; update here first.

1. **Commit and push as a single atomic act.** Code goes to a
   `loop/<verb>-<slug>` branch and a `loop:pr` PR that T merges;
   plan-only (`plan/`, `telemetry/`, `docs/reports/`, `devlog/entries/`) commits and
   `fix-ci` on red `main` push `main` directly (D84), except `/plot`,
   which opens a `plot` PR for T to merge (D93). Attended sessions
   may push `main` at T's word. No unpushed commits between ticks; no
   dirty tree left behind. The session's
   `telemetry/` shard is part of every commit that changes it: the tracked
   `.githooks/pre-commit` auto-stages `telemetry/`, and `.githooks/pre-push`
   blocks if newer rows remain uncommitted. One shard per session, so the
   log never conflicts on merge. Session startup installs the hooks through `core.hooksPath`.
2. **No `Co-Authored-By:` trailers, no emojis** — in commits, code, or
   content.
3. **The verify gate is non-negotiable.** No `--no-verify`, no
   force-push, no destructive resets. Run the gate **foreground**,
   never backgrounded.
4. **Tests alongside code** — hermetic e2e at the highest public entry
   point; never "add tests later".
5. **The CI gate runs after every push.** A red `verify-*` run on the
   tick's PR: read the log, patch on the branch, push again (≤3
   same-root-cause iterations, then leave it to `pr-autofix`). Red on
   `main` is `ci-autofix`'s.
6. **`AskUserQuestion` only in `/oversight`, and in `/plot` or `/messy`
   when T is present.** Every other skill decides, documents the call in
   the commit body or PR, and ships. Since
   THE OPEN GATE (T direct, 2026-08-28 — see `plan/bearings.md`)
   there are no owner-blocked decisions: the loop answers every open
   question itself and files owner-flavored calls to `plan/AUDIT.md`
   as `[loop-call]` residue for after-the-fact review. The retired
   `[needs-user-call]` tag survives only in historical rows.
7. **File the residue.** Any session or tick tasked with substantial
   work that produces direction beyond what it ships — decisions made,
   work discovered, design conclusions, side-findings — files that
   residue into the loop's queues before ending: buildable ideas to
   `plan/PHASE_CANDIDATES.md`, findings and `[loop-call]`
   decisions to `plan/AUDIT.md`, committed work as build-plan phase
   rows, observable defects to `plan/CRITIQUE.md` (jot-row format).
   Direction that lives only in a conversation is invisible to the
   loop. File only unshipped direction — not routine work the tick
   already committed, and not chit-chat. When T is present, buildable
   ideas go through `/plot` or `/messy` (rule 8), not a hand-written
   `PHASE_CANDIDATES` row.
8. **T's buildable direction goes through `/plot` or `/messy`.** When T,
   speaking plainly to any agent (an attended session, `@claude` on
   GitHub, a brainstorm), says they want work the loop should pick up
   ("let's add…", "the loop should build…", "make a phase for…", "queue
   this"), route it through `/plot` (one known task) or `/messy` (a
   loose or many-themed dump) instead of writing a build-plan row, brief
   or candidate by hand. A direct request runs the skill; an ambiguous
   one is asked first. At the end of a brainstorm or design conversation
   that produced buildable direction, offer it in one question ("Want to
   use `/plot` to turn this into a phase?" or "Want to use `/messy` to
   file this dump?", `AskUserQuestion` per `docs/asking-well.md`) and run
   the one T picks; a no files nothing beyond rule 7's residue. No
   `/march` step, cron, workflow or loop verb ever fires them
   (`scripts/loop-pr.test.mjs`).
