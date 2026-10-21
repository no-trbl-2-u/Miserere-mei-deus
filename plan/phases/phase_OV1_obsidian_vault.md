# Phase OV1 — The Obsidian vault: brainstorm and plot from the phone

## Sources

- T, attended session 2026-10-20: T keeps Obsidian on Android and wants to
  brainstorm and plot with Claude through it. T's two named pains: "hard to see
  the whole" and "I have a hard time setting a clear goal". T chose "inside
  Miserere" for the vault's home, then asked for "the new github repo".
- T has Obsidian Sync running between the phone and a desktop (2026-10-20).
  No Obsidian desktop install was found on T's Windows workspace machine
  (no `%APPDATA%\obsidian\obsidian.json`, no `.obsidian/` under the user
  folder), so the desktop end is set up by this phase.
- Obsidian Sync never syncs dot-prefixed files or folders except `.obsidian/`
  (help: Sync settings, "Always excluded from sync"): `.git/`, `.gitignore`
  and `.gitattributes` exist only on the bridge machine.
- Obsidian Git plugin (vinzent03/obsidian-git): commit-and-sync commits all
  changes, pulls and pushes; pull on startup; a timed auto commit-and-sync.
- Ruleset 25469169 ("main requires verify-gate") blocks pushes to Miserere
  `main` that have not passed the gate, so the vault cannot be a folder on
  Miserere `main`; Miserere is ~290 MB.
- No MCP server: the vault is plain Markdown on disk; every Claude session
  reads and writes it as files. The Local REST API plugin the Obsidian MCP
  servers depend on is desktop-only and would not reach the phone anyway.

## Outcome

T writes a rough idea on the phone; within minutes it is in a private GitHub
repo every Claude session (local or cloud) can read; Claude's answer comes back
into the same notes and is on the phone by the next sync. The vault is shaped
around T's two pains: a one-sentence goal checked at the start of every session,
and one map of every open thread with its status.

```
phone <-> Obsidian Sync <-> desktop folder Miserere-mei-deus/vault/
      <-> Obsidian Git (desktop, timed) <-> github no-trbl-2-u/miserere-vault
      <-> Claude sessions (local: the folder directly; cloud: clone/pull)
```

## Size

Four phases: OV1a S, OV1b M, OV1c S (attended), OV1d S (attended).

## Acceptance

- **A1** A private repo `no-trbl-2-u/miserere-vault` exists with default
  branch `main` and no `.github/workflows/`, so a push to it runs no Actions.
- **A2** The repo holds the skeleton: `00 Goal.md` (one goal sentence slot and
  a "Not doing" list), `01 Map.md` (a table of threads: name, status
  `seed | growing | decided | parked`, one-line next step), `Inbox.md`,
  `Threads/`, `Map.canvas`, and `README.md` stating the conventions of A5. Its
  `.gitignore` excludes `.obsidian/workspace*.json`, `.obsidian/cache`,
  `.trash/`; its `.gitattributes` is `* text=auto eol=lf`.
- **A3** Miserere's `.gitignore` carries `/vault/`; with a vault clone present
  at `vault/`, `git status` in Miserere is clean and the root `npm test` does
  not read it.
- **A4** `node scripts/vault.mjs ensure` clones the vault repo into `vault/`
  at the main checkout's root when it is missing and runs `git pull --ff-only`
  when present; on a dirty tree or a diverged branch it exits non-zero and
  names the state instead of merging. `node scripts/vault.mjs status` prints
  the head commit, ahead/behind counts and whether the tree is dirty. From a
  linked worktree both resolve the main checkout's `vault/`, not the worktree's.
- **A5** `docs/vault.md` states the write zones: T owns the body of
  `00 Goal.md` and appends to `Inbox.md`; Claude removes an Inbox item only by
  filing it (to a thread, with the Map updated in the same commit); in
  `Threads/` Claude adds notes and Obsidian `question` callouts and never rewrites
  T's prose; `01 Map.md` and `Map.canvas` are Claude-maintained. Claude
  commits as `vault: <summary>` after `ensure`, then pushes.
- **A6** A `/vault` command (`.claude/commands/vault.md`) runs a session: run
  `ensure`; read `00 Goal.md`; if the goal is empty or T says it moved, ask T
  at most three questions to sharpen it and write T's answer, never a goal of
  Claude's own; work the Inbox; update the Map; commit and push. `CLAUDE.md`
  points to it in one line.
- **A7** Obsidian desktop is installed on T's Windows machine, `vault/` is
  opened as a vault, and Obsidian Sync is connected to T's remote vault, so the
  notes T wrote on the phone are present in `vault/`.
- **A8** Obsidian Git is installed in that vault with pull on startup and a
  5-minute auto commit-and-sync, and is disabled on the phone (its
  disable-on-this-device setting), so the phone never runs git.
- **A9** A note created on the phone appears in `git log origin/main` of the
  vault repo within 10 minutes with no manual step.
- **A10** A commit pushed by a Claude session appears on the phone within 10
  minutes with no manual step on the desktop.
- **A11** With desktop Obsidian closed, a phone edit and a Claude push to the
  same note produce a visible conflict on the next desktop pull; neither edit
  is lost.
- **A12** Obsidian Sync's version history lists no `.git/` file, and the vault
  repo's Actions tab lists zero runs.

Measure: one sitting in which A9 and A10 both pass, with timestamps, recorded
in `docs/reports/vault-bridge.md`.

## Decisions made upfront — DO NOT ASK

- **A separate repo, not a `vault` branch of Miserere** (T, 2026-10-20: "the
  new github repo"). With the phone on Obsidian Sync instead of git, the branch
  design's one advantage (a small phone clone) is gone, and a separate repo
  cannot trip Miserere's ruleset, workflows, review pipeline or `/march`.
- **Its working copy lives inside Miserere, ignored** (T: "inside Miserere"):
  `Miserere-mei-deus/vault/` in the main checkout, under `/vault/` in
  `.gitignore`. Local sessions in Miserere see it as files; links to canon on
  Miserere `main` are GitHub permalinks, not wiki-links.
- Repo name `miserere-vault`, private. [T to confirm]
- Auto commit-and-sync interval 5 minutes. [T to confirm]
- No MCP server (see Sources).
- **Every row is `(attended)`** so `/march` never picks one: T is building all
  four in the plotting session with sub-agents (T, 2026-10-20).
- **T merges this plot PR by having the session merge it** (T, 2026-10-20,
  explicit exception to `skills/plot.md` §3 rule 5 for this plot only).

## DoD

Every acceptance ID closed by its phase; the four rows ticked; A9 and A10
recorded per the Measure line.

## Follow-ups (out of scope)

- Teaching `rpg-mechanics-brainstorm` to write its session file into
  `vault/Threads/` instead of `braindump/`.
- A Canvas generator that lays out `Map.canvas` from `01 Map.md`.
- Cloud sessions reaching the vault repo need it attached to the session
  (`add_repo`) before `ensure` can clone it.

## Phases

### OV1a — The vault repo and its skeleton · S · closes A1, A2 · requires nothing
Measure: `gh repo view no-trbl-2-u/miserere-vault` shows it private, and a
fresh clone holds every A2 file.

Scope: create the repo, seed and push the skeleton. Consumers: none yet.
Save/schema: none. Tests: A2 checked by listing a fresh clone. Verify gate:
`gh api repos/no-trbl-2-u/miserere-vault --jq .private` is `true`.

### OV1b — Miserere wiring: ignore, script, conventions, `/vault` · M · closes A3, A4, A5, A6 · requires OV1a
Measure: `node --test scripts/vault.test.mjs` passes in the root `npm test`.

Scope: `.gitignore`, `scripts/vault.mjs`, `scripts/vault.test.mjs` (against a
temp bare repo: clone, fast-forward, dirty refusal, diverged refusal, worktree
resolution), `docs/vault.md`, `.claude/commands/vault.md`, one `CLAUDE.md`
line, the test added to the root `npm test` list. Consumers: `CLAUDE.md`.
Save/schema: none. Verify gate: root `npm test`.

### OV1c — The desktop bridge · S · closes A7, A8 · requires OV1a · attended
Measure: desktop Obsidian shows the phone's notes in `vault/` and the Obsidian
Git settings of A8.

Scope: install Obsidian (winget), clone the vault repo to `vault/`, place and
configure Obsidian Git; T opens the vault and signs in to Obsidian Sync (only T
can). Tests: none beyond A7 and A8. Verify gate: T's look at the desktop app.

### OV1d — The round trip, proved · S · closes A9, A10, A11, A12 · requires OV1b, OV1c · attended
Measure: `docs/reports/vault-bridge.md` records A9 and A10 passing with
timestamps.

Scope: run A9 to A12 with T holding the phone; write the report. Verify gate:
the report.
