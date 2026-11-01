# 126 — The Obsidian vault: brainstorm and plot from the phone

> T writes a rough idea on the phone; within minutes it is in a private GitHub repo every Claude session (local or cloud) can read; Claude's answer comes back into the same notes and is on the phone by the next sync. The vault is shaped around T's two pains: a one-sentence goal checked at the start of every session, and one map of every open thread with its status.

Carried from the v1 brief `phase_OV1_obsidian_vault.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_OV1_obsidian_vault.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

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

### Outcome

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

## Design

### Size

Four phases: OV1a S, OV1b M, OV1c S (attended), OV1d S (attended).

### Decisions made upfront — DO NOT ASK

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

### Follow-ups (out of scope)

- Teaching `rpg-mechanics-brainstorm` to write its session file into
  `vault/Threads/` instead of `braindump/`.
- A Canvas generator that lays out `Map.canvas` from `01 Map.md`.
- Cloud sessions reaching the vault repo need it attached to the session
  (`add_repo`) before `ensure` can clone it.

### Chunk notes (the brief's phase blocks)

#### OV1d (chunk 126.4)

Measure: `docs/reports/vault-bridge.md` records A9 and A10 passing with
timestamps.

Scope: run A9 to A12 with T holding the phone; write the report. Verify gate:
the report.

## Contracts

None beyond Design.

## Acceptance

- **A9** A note created on the phone appears in `git log origin/main` of the
  vault repo within 10 minutes with no manual step.
- **A10** A commit pushed by a Claude session appears on the phone within 10
  minutes with no manual step on the desktop.
- **A11** With desktop Obsidian closed, a phone edit and a Claude push to the
  same note produce a visible conflict on the next desktop pull; neither edit
  is lost.
- **A12** Obsidian Sync's version history lists no `.git/` file, and the vault
  repo's Actions tab lists zero runs.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 4 open · 8 closed · next A13

- [ ] **126.4** The round trip, proved (attended) · S · closes A9, A10, A11, A12 · needs — · alias: OV1d
