# 130 — The modular feature map: a note per feature, canvases you zoom into

> T opens `Feature Map.canvas` and sees five blocks (Tabs, World routes, Minigames, Engine areas, Dev routes) with the player-flow arrows between them. Clicking a block opens that group's canvas: its features as cards with the flow arrows between them. Clicking a card opens the feature's note: its flags, what it leads to, and what it uses in code. Graph view over `Features/` shows the same flow as a zoomable graph, coloured by group, with the features that need a pitch tagged. All of it is generated from `features.json`, so it cannot drift.

Carried from the v1 brief `phase_FM2_modular_feature_map.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_FM2_modular_feature_map.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- T, attended session 2026-10-22, looking at `vault/Feature Map.canvas` on the
  phone: "I would like more modular feature blocks. Obsidian offers a lot to
  create graphs and maps where I can zoom in and out to see how the features
  relate."
- T chose (2026-10-22, `AskUserQuestion`): shape **"Notes + nested canvases"**
  (one note per feature for Graph view and local graphs, plus a top-level group
  canvas that drills into one canvas per group, its nodes the feature notes);
  coupling **"Separate, off by default"** (player flow is the main view;
  coupling lives under its own heading and is never drawn on a canvas). Slot
  anytime.
- What FM1 built (all shipped, `main` at 22da9e072):
  - `scripts/feature-map.mjs` and `scripts/feature-map.evidence.mjs` write
    `docs/feature-map/features.json`: 42 features, each with id, name, kind,
    group, source and the `reachable`/`driven`/`tested`/`needsPitch` flags;
    877 edges (321 `flow`, 556 `coupling`), one per file each was found in.
  - `scripts/feature-map-render.mjs` writes `docs/feature-map/README.md` and
    `Map.canvas` (JSON Canvas 1.0, one text node per feature inside five group
    nodes) with `--check`. `drawnEdges` collapses the edges to one per feature
    pair; `isShellGateEdge` drops the shell-gate edges and marks their targets
    "opens from any screen". The canvas draws 213 edges, 181 of them coupling:
    the tangle T is looking at.
  - `scripts/vault.mjs features` copies `Map.canvas` to
    `vault/Feature Map.canvas` and the README table to `vault/02 Features.md`,
    touching those two files only (FM1e); `docs/vault.md` lists them as
    generated and as the only files `features` writes.
- Obsidian facts this leans on: a canvas `file` node shows a vault file (a note
  or another `.canvas`) and opens it on click; Graph view draws one edge per
  link between notes and filters notes, not links (by path, tag or search), so
  a link in a note cannot be switched off on its own; frontmatter `tags` are
  searchable and colourable in Graph view groups.

### Outcome

T opens `Feature Map.canvas` and sees five blocks (Tabs, World routes,
Minigames, Engine areas, Dev routes) with the player-flow arrows between them.
Clicking a block opens that group's canvas: its features as cards with the flow
arrows between them. Clicking a card opens the feature's note: its flags, what
it leads to, and what it uses in code. Graph view over `Features/` shows the
same flow as a zoomable graph, coloured by group, with the features that need a
pitch tagged. All of it is generated from `features.json`, so it cannot drift.

## Design

### Decisions made upfront — DO NOT ASK

- **Notes + nested canvases; coupling separate and off the canvases** (T,
  2026-10-22).
- **Slot anytime** (T, 2026-10-22): after Phase BE2g, the last open row.
- **Coupling is plain text, not links** [T to confirm]. Graph view cannot hide
  some of a note's links, so "off by default" is kept by not linking coupling
  at all; the names stay readable in each note. A switchable coupling layer
  (a second set of notes Graph view can filter in) is a Follow-up.
- **Generated in the repo, mirrored into the vault**, as FM1 (the loop cannot
  see `vault/`). The generated files under `docs/feature-map/Features/` use
  vault-relative paths in their links and `file` nodes (`Features/<name>.md`),
  because they are only ever opened from the vault.
- **`Feature Map.canvas` keeps its name** and becomes the overview, so T's
  existing link and habit still work; `02 Features.md` is unchanged.
- **The whole `Features/` folder is generated and Claude-owned.** T does not
  edit it; notes T wants to keep about a feature go in `Threads/`. A delete
  inside it only ever removes a file the generator marks as its own.
- **No numbers and no specs** on the notes (FM1): names, flags, links, the
  missing pitch evidence.
- **Group canvas layout** reuses FM1's `LAYOUT` grid; outside targets sit in a
  column to the right, labelled by a group node "Elsewhere".
- **No new dependency.** No Dataview, Bases file or Graph view settings are
  written; `.obsidian/` is T's.
- Dev routes get notes and a group canvas like any other group.

### Follow-ups (out of scope)

- A switchable coupling layer for Graph view.
- A `Features.base` (Obsidian Bases) table over the notes' frontmatter.
- A `/pitch` entry point from a `#needs-pitch` note (FM1 Follow-up).
- Reviewing which pitch flags are wrong (Rest, Village, Event likely have
  design history under other names; Settings, Saves and dev routes may never
  need one): an alias-table or rule change to FM1b, its own `/plot`.

### Chunk notes (the brief's phase blocks)

#### FM2d (chunk 130.4)

Measure: `docs/reports/feature-map-check.md` holds T's dated line for phone
and desktop.

Scope: T runs `/vault`, opens the overview on the phone and the desktop, clicks
through one group to one note, and opens Graph view filtered to
`path:Features`. The session records what worked and files anything that did
not as a CRITIQUE row. No code.

## Contracts

None beyond Design.

## Acceptance

- **A10** T opens the vault on the phone and on the desktop: the overview's
  blocks open their group canvases, a group canvas's cards open their notes,
  and Graph view filtered to `path:Features` shows the flow graph with
  `#needs-pitch` notes findable. Recorded as one dated line in
  `docs/reports/feature-map-check.md`.

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 1 open · 9 closed · next A11

- [ ] **130.4** T's look (attended) · S · closes A10 · needs — · alias: FM2d
