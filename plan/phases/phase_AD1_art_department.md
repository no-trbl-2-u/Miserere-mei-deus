# Phase AD1 — `art-department`: a home for art tooling and the masters it makes

## Sources

- **T's ruling, attended, 2026-10-21.** Shown that `rig-spritesheet.py` is Python sitting inside a JS/TS
  workspace, T ruled: "We can have another package at the top level called `art-department` and it can use
  any tooling/languages it wants." The same conversation settled the build-size question: generated
  spritesheet masters never ship — they are build-time artifacts, and AN1d splits them into per-cell WebP.
- `axiomancer-mobile/scripts/art/rig-spritesheet.py` (committed 18b5a9df3) — the tool that forces the
  question. Python 3.14 + Pillow 12.3 + numpy 2.5.4, no image model, no npm dependency. It rigs a shipped
  enemy painting into a 24-frame sheet by affine transforms of two separated layers.
- `axiomancer-mobile/assets/images/enemies/anim/` (same commit) — the master it produced: a 2048x768 PNG
  (798 KB), its WebP, a manifest and a review flipbook. All four sit under `assets/`, which is the app's
  bundled tree, and none of them is a shipped asset.
- **Root `package.json`** — `workspaces: ["axiomancer-mechanics", "axiomancer-mobile"]`, and every root
  script reaches a package through `npm --workspace`.
- **`.easignore`** — the binding constraint, and it is explicit about it: Section 2's keep-list says to
  KEEP "all three workspace directories (`npm ci` resolves every declared workspace)". A declared npm
  workspace therefore **cannot** be excluded from the EAS archive without breaking `npm ci`. The file also
  demands that each Section 2 entry be checked before it is added, not assumed.
- **`.github/workflows/verify-*.yml`** — `verify-mechanics`, `verify-mobile`, `verify-prose`,
  `verify-drift`, each with explicit `paths:` filters. There is no `verify-gate` yet (LG1b plots one that
  fails on a changed path no filter owns). A new top-level tree with no filter is unguarded today and
  becomes a gate failure once LG1b lands.
- `axiomancer-mobile/scripts/asset-provenance.test.mjs` — the guard that holds asset directories to a
  `provenance.json`. It is a consumer of any decision about where art files live.
- AGENTS.md "Per-package guides", "Verify", and rule 9 (D96, `Potential Assets/` is a store never a
  source) — the doctrine a new top-level tree has to fit into.

## Outcome

Art tooling has a home that matches what it is: a place where a tool may be written in whatever language
suits the job, where the large masters it produces are kept and version-controlled, and where neither the
tool nor its masters can reach the shipped app bundle.

Measure: `npm test` green at the root; `art-department`'s own check runs in CI on a change under it; the
rig tool regenerates the float-eye sheet from its new home byte-for-byte; and no file under
`art-department/` is reachable from app code or present in the EAS archive.

## Acceptance

- **A1 (not an npm workspace)** `art-department/` exists at the repo root and is **absent** from root
  `package.json` `workspaces`. The `.easignore` keep-list is the reason and the brief says so: a declared
  workspace must be uploaded to EAS because `npm ci` resolves it, and this tree must not be. Root access
  is by path (a root script invoking the tool directly), never `npm --workspace`.
- **A2 (the toolchain rule is written down)** `art-department/README.md` states the rule T gave — any
  language or toolchain — and the two constraints that bound it: nothing here is imported by the app, and
  nothing here ships. A reader who wants to add a Rust or Go tool learns from this file what they must
  satisfy.
- **A3 (dependencies are declared and checked)** The Python toolchain declares its dependencies in a
  manifest, and a `doctor` entrypoint reports every missing one **by name** and exits non-zero. A checkout
  without Pillow must fail saying so, not fail inside an import trace.
- **A4 (CI owns the tree)** A `verify-art-department` workflow runs on changes under `art-department/**`
  and on its own file, runs `doctor` and the package's tests, and is the filter that owns this path when
  LG1b's gate arrives.
- **A5 (the tool moves and proves it still works)** `rig-spritesheet.py` lives under `art-department/` and
  nothing under `axiomancer-mobile/scripts/art/` is Python any more. A test regenerates the float-eye sheet
  and asserts it matches the committed master **byte for byte**, so the move is proven rather than assumed.
- **A6 (masters live here, not in `assets/`)** The four files committed in 18b5a9df3 under
  `axiomancer-mobile/assets/images/enemies/anim/` move to `art-department/masters/enemies/`, their
  provenance record following them. `assets/images/enemies/anim/` is left absent, not empty — AN1d creates
  what ships, per cell, through the existing `RECIPE`.
- **A7 (the boundary is a test, not a convention)** A test asserts that no path under `art-department/` is
  resolved by app code, mechanics, scripts, config or CI — the same shape of guard AGENTS.md rule 9 puts on
  `Potential Assets/` — and that `.easignore` excludes `/art-department/`.
- **A8 (docs)** AGENTS.md names the tree and its rule where a reader will meet it, and `.easignore`'s
  Section 2 entry carries the "checked before it went here" justification that file requires.

Measure: A5's byte-comparison green from the new home; A7's boundary test green; `verify-art-department`
green on a change under the tree; root `npm test` green.

## Scope

- `art-department/` (new): README, the Python toolchain and its manifest, `doctor`, the rig tool, masters,
  and the package's own tests.
- `.github/workflows/verify-art-department.yml` (new).
- `.easignore`: one Section 2 entry.
- `AGENTS.md`: the tree and its rule.
- `axiomancer-mobile/`: deletions only — the Python script and the `anim/` masters leave.
- Root `package.json`: a script that reaches the tool by path, if one is wanted. **No `workspaces` entry.**
- Not touched: `generate-art.mjs`, `ingest-art.mjs`, `adapter.mjs` and the rest of the JS art route. AN1d
  extends those in the mobile package and does not depend on this phase.

## Consumers to update

- `AGENTS.md` — "Per-package guides" and "Verify".
- `.easignore` — Section 2.
- `axiomancer-mobile/scripts/asset-provenance.test.mjs` — if it enumerates `assets/images/*` directories,
  the departure of `anim/` must leave it green.
- `plan/bearings.md` — D98 (below).

## Save / schema contracts

None. No runtime code, no persisted state, no asset the app loads.

## Decisions made upfront — DO NOT ASK

- **D98 — `art-department/` is a top-level tree, not an npm workspace (T, attended, 2026-10-21).** The
  language freedom T granted is only real if the tree escapes the npm toolchain, and `.easignore` makes
  the cost of a workspace explicit: `npm ci` resolves every declared workspace, so a declared one must be
  uploaded to EAS. A plain directory with its own toolchain, excluded from the archive and reached by
  path, gets the freedom without the coupling.
- **Nothing here ships, and that is a test (A7), not a habit.** The repo already learned this shape on
  `Potential Assets/` (rule 9, D96): a boundary nobody checks is a boundary that leaks.
- **Masters are committed, not gitignored.** They are the regeneration source of truth and they are what a
  reviewer compares against; A5's byte-comparison needs them present. They stay out of the *bundle* via
  `.easignore`, which is a different question from version control.
- **Python first, because Python is what is installed.** Pillow 12.3 and numpy 2.5.4 are on the box; no
  `sharp` is installed anywhere in the repo. A2's rule keeps the door open for other toolchains without
  this phase having to pick one.
- **The byte-for-byte comparison, not a visual check** (A5). A move that silently changes output is the
  failure mode worth catching, and the rig is deterministic, so the strict test is available and cheap.
- **Slot: anytime.** It blocks nothing. AN1a–AN1c are mobile-side engine work, and AN1d extends
  `generate-art.mjs`, which is JavaScript and stays in the mobile package — so no AN1 row waits on this.

## Tests matrix

- `art-department/`'s own suite: `doctor` names a missing dependency and exits non-zero; the rig
  regenerates the float-eye sheet and matches the committed master byte for byte (A3, A5).
- Root `npm test`: the boundary guard — no repo path resolves into `art-department/`, and `.easignore`
  excludes it (A7).
- No change to the intent of any existing suite; `verify-mobile` must stay green across the deletions.

## Verify gate

Root `npm test`, plus `verify-art-department`, plus `npm run verify -w axiomancer-mobile` for the
deletions.

## Commit body template

```
art-department: a home for art tooling and its masters

A Python rig tool and a 798 KB spritesheet master were living inside
axiomancer-mobile, a JS/TS presentation-layer workspace whose verifier
cannot check Python and whose assets tree is bundled into the app. Both
move to a top-level art-department, which is deliberately NOT an npm
workspace: .easignore's keep-list records that npm ci resolves every
declared workspace, so declaring one would force EAS to upload the
masters this phase exists to keep out. The tree is excluded from the
archive and a test asserts nothing in the repo resolves a path into it.
The move is proven by regenerating the float-eye sheet byte for byte.
```

## DoD

A1–A8 ticked.

## Phases

### AD1a — The tree, the toolchain rule, and the tool's new home (Size: M)

Closes A1, A2, A3, A4, A5, A8. Requires nothing. Attended: no.

The package exists, declares and checks its own dependencies, owns a CI filter, and holds the rig tool,
proven by the byte-for-byte regeneration. Masters have not moved yet, so the tool still reads and writes
the paths it reads and writes today.

Measure: `verify-art-department` green; `doctor` names a missing dependency by name; the regeneration test
matches the committed master byte for byte.

### AD1b — The masters move, and the boundary becomes a test (Size: S)

Closes A6, A7. Requires AD1a. Attended: no.

The four `anim/` files leave `axiomancer-mobile/assets/` for `art-department/masters/enemies/` with their
provenance, `.easignore` gains its Section 2 entry, and the boundary guard lands in the root suite.

Measure: the boundary guard green; `npm run verify -w axiomancer-mobile` green across the deletions; the
regeneration test still byte-identical from the new master path.

## Follow-ups (not in this phase)

- **A second toolchain is still unproven.** A2 writes the rule down; nothing exercises it until a non-Python
  tool arrives. The first one should be expected to tighten `doctor` and the CI job.
- **`sharp` versus Pillow.** If the JS art route and the rig ever need to share post-processing, running the
  same `RECIPE` through two imaging libraries will drift. Worth a decision before AN1d's splitter is written,
  not after.
- **The float-eye master's licence is unresolved**, inherited from the source painting
  (`assets/images/enemies/provenance.json`). T believes the source came from a set called "javadry"; that
  name appears nowhere in the repo or the trove and is unverified. Moving the master does not change its
  status and this phase does not try to.
