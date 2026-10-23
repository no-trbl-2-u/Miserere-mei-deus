# Phase FM2 — The modular feature map: a note per feature, canvases you zoom into

## Sources

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

## Outcome

T opens `Feature Map.canvas` and sees five blocks (Tabs, World routes,
Minigames, Engine areas, Dev routes) with the player-flow arrows between them.
Clicking a block opens that group's canvas: its features as cards with the flow
arrows between them. Clicking a card opens the feature's note: its flags, what
it leads to, and what it uses in code. Graph view over `Features/` shows the
same flow as a zoomable graph, coloured by group, with the features that need a
pitch tagged. All of it is generated from `features.json`, so it cannot drift.

## Acceptance

- **A1** The renderer writes one note per feature to
  `docs/feature-map/Features/<name>.md`; every `features.json` entry has
  exactly one note, file names are unique, and a name unsafe in a file name is
  made safe by one named rule.
- **A2** Each note's frontmatter carries `kind`, `group`, `reachable`,
  `driven`, `tested`, `needsPitch` (yes, no or unknown, from the FM1 flags),
  `source` (the feature's path), `generated: feature-map`, and `tags`:
  `feature-map/<group>`, plus `needs-pitch` when `needsPitch` is yes. A body
  line says the file is generated and names the generator.
- **A3** A "Leads to" section lists each player-flow target as a `[[wikilink]]`
  to its note, one line per target, from the same edge set the canvas draws
  (`drawnEdges`, shell-gate edges excluded); a feature opened by a shell gate
  says "Opens from any screen" instead. A feature with no outgoing flow edge
  says so.
- **A4** A "Uses" section lists each coupling target by name as plain text, not
  a link, so Graph view draws player flow only. When `needsPitch` is yes, the
  note names the missing evidence.
- **A5** The renderer writes one canvas per group to
  `docs/feature-map/Features/<group label>.canvas`: one `file` node per feature
  in the group pointing at `Features/<name>.md`, the flow edges between them
  (one per pair, an arrow at each end when linked both ways), and, for flow
  edges that leave the group, one `file` node per outside target in a column
  apart, so T can click through. No coupling edge is drawn.
- **A6** `docs/feature-map/Map.canvas` becomes the overview: one `file` node
  per group pointing at its group canvas, a legend node, and one flow edge per
  ordered pair of groups that have a flow edge between them. No feature node,
  no coupling edge.
- **A7** Every generated canvas passes `canvasProblems`, extended to check
  `file` nodes (a `file` string naming a generated note or canvas); the
  overview and group canvases are deterministic and are covered by
  `feature-map-render.mjs --check` in the root `npm test`.
- **A8** `node scripts/vault.mjs features` mirrors
  `docs/feature-map/Features/` to `vault/Features/`: it writes new and changed
  files, leaves matching files alone, and deletes a file in `vault/Features/`
  only when it carries `generated: feature-map` (a note) or is a group canvas
  the generator owns and the repo no longer has it. It still copies
  `Map.canvas` to `vault/Feature Map.canvas` and the table to
  `vault/02 Features.md`, and touches nothing else in the vault.
- **A9** `docs/vault.md` adds `Features/` to "The files", "Generated files" and
  "Write zones" (generated; only `node scripts/vault.mjs features` writes
  it); `.claude/commands/vault.md` says what the copy now covers.
- **A10** T opens the vault on the phone and on the desktop: the overview's
  blocks open their group canvases, a group canvas's cards open their notes,
  and Graph view filtered to `path:Features` shows the flow graph with
  `#needs-pitch` notes findable. Recorded as one dated line in
  `docs/reports/feature-map-check.md`.

Measure: after `/vault`, `vault/Feature Map.canvas` opens on T's phone as five
group blocks, and two clicks reach any feature's note.

## Decisions made upfront — DO NOT ASK

- **Notes + nested canvases; coupling separate and off the canvases** (T,
  2026-10-22).
- **Slot anytime** (T, 2026-10-22): after Phase BE2g, the last open row.
- **Coupling is plain text, not links** (T confirmed, 2026-10-22). Graph view cannot hide
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

## DoD

Every acceptance ID closed by its phase; the four rows ticked; the Measure line
met.

## Follow-ups (out of scope)

- A switchable coupling layer for Graph view.
- A `Features.base` (Obsidian Bases) table over the notes' frontmatter.
- A `/pitch` entry point from a `#needs-pitch` note (FM1 Follow-up).
- Reviewing which pitch flags are wrong (Rest, Village, Event likely have
  design history under other names; Settings, Saves and dev routes may never
  need one): an alias-table or rule change to FM1b, its own `/plot`.

## Phases

### FM2a — A note per feature · M · closes A1, A2, A3, A4 · requires nothing
Measure: `docs/feature-map/Features/` holds one note per `features.json`
entry and `node scripts/feature-map-render.mjs --check` passes in the root
`npm test`.

Scope: `scripts/feature-map-render.mjs` (a `renderNotes` pass, the file-name
rule, the generated-file set extended to the notes; `--check` also fails on a
stale extra note), `scripts/feature-map-render.test.mjs`, generated
`docs/feature-map/Features/*.md`. Consumers: none yet (FM2c copies them).
Save/schema: the note frontmatter keys in A2 are this phase's contract; FM2b
links to the note paths, FM2c deletes by `generated: feature-map`. Tests: one
note per feature on a fixture, name collision and unsafe characters, flow
links match `drawnEdges`, shell-gate target text, coupling as plain text,
pitch tag and missing evidence, determinism, `--check` on a stale and an extra
note. Verify gate: root `npm test`.

### FM2b — The nested canvases · M · closes A5, A6, A7 · requires FM2a
Measure: `docs/feature-map/Map.canvas` holds five group `file` nodes and each
`Features/<group>.canvas` passes `canvasProblems` with one `file` node per
member feature.

Scope: `renderCanvasObject` replaced by an overview and a per-group renderer in
`scripts/feature-map-render.mjs`; `canvasProblems` checks `file` nodes;
generated `Map.canvas` and `Features/*.canvas`; the README's lead lines name
the new picture. Consumers: `scripts/vault.mjs` (unchanged contract for
`Map.canvas`). Tests: overview has no feature node and no coupling edge; one
inter-group edge per ordered group pair; group canvas members, intra-group
edges, outside-target column; every `file` node names a generated file;
determinism. Verify gate: root `npm test`.

### FM2c — Into the vault · S · closes A8, A9 · requires FM2a
Measure: after `node scripts/vault.mjs features` against a temp vault,
`vault/Features/` matches `docs/feature-map/Features/` and a T-written file
beside them is untouched.

Scope: `scripts/vault.mjs` (`features` mirrors the folder, the delete rule),
`scripts/vault.test.mjs` against a temp vault, `docs/vault.md`,
`.claude/commands/vault.md`. Tests: new, changed and matching files; a stale
generated note deleted; a stale file without the marker kept; a stale group
canvas deleted; nothing outside `Features/` and the two FM1 files written;
the source folder missing (skipped with a message, exit 0). Verify gate: root
`npm test`.

### FM2d — T's look · S · (attended) · closes A10 · requires FM2b, FM2c
Measure: `docs/reports/feature-map-check.md` holds T's dated line for phone
and desktop.

Scope: T runs `/vault`, opens the overview on the phone and the desktop, clicks
through one group to one note, and opens Graph view filtered to
`path:Features`. The session records what worked and files anything that did
not as a CRITIQUE row. No code.
