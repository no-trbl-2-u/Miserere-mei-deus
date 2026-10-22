# art-department

Tooling that makes art, and the masters it makes.

## The rule

**A tool in here may be written in whatever language and toolchain suits the
job** (T, attended, 2026-10-21). Python, Rust, Go, a shell script, a C program
with a Makefile — the repo's two npm workspaces do not get a vote here. Art
tooling is batch image work, and the right library for it is rarely the one
that happens to be on npm.

That freedom is bounded by exactly two constraints, and they are what make it
safe to grant:

1. **Nothing in here is imported by the app.** No file under `art-department/`
   is resolved by `axiomancer-mobile`, `axiomancer-mechanics`, root `scripts/`,
   any config, or CI. A tool that needs something from a package reads it by
   path at build time; nothing reads back the other way.
2. **Nothing in here ships.** The tree is excluded from the EAS build archive.
   What ships is whatever a tool *produces and a phase deliberately copies* into
   `axiomancer-mobile/assets/`, with a provenance record — never a file from
   here.

Those two sentences are the whole contract. They are the same boundary the repo
puts on `Potential Assets/` (AGENTS.md rule 9), for the same reason: a boundary
nobody checks is a boundary that leaks.

So both sentences are checked, by `scripts/art-department-sealed.test.mjs` in
the root suite (`npm test`). It fails if any tracked file outside this tree
resolves a path into it, if the mobile build config so much as names the tree,
if the tree becomes a declared workspace or is reached through
`npm --workspace`, if `.easignore` stops excluding `/art-department/`, or if a
spritesheet master reappears under `axiomancer-mobile/assets/`.

The rule it applies to executable code (`.ts .tsx .js .jsx .mjs .cjs .py .sh`)
is deliberately blunt: **running code outside this tree may not name the tree
as a path at all.** Enumerating call shapes was the first attempt and it
leaked — a dynamic `import('art-department/…')` and a nested
`join(baseDir(), 'art-department/x')` both slipped past it. Naming the tree in
a comment is free, so prose about the boundary costs nothing. JSON and YAML are
not scanned that way, because they execute nothing and their two legitimate
mentions — the root `art:doctor` / `art:test` / `art:rig` scripts, which reach
the tree **by path**, and `verify-art-department.yml`, which owns the path —
each have their own allowlisted assertion that fails on any mention not on the
list. A tool in here reading a shipped painting out of
`axiomancer-mobile/assets/` as its source is inside-out and is exempt along
with the rest of the tree. A file that genuinely must resolve inward goes in
the guard's `RESOLVERS_ALLOWED` map with its reason, so the exception stays a
list rather than a habit.

## Not an npm workspace, deliberately

`art-department/` is **absent** from the root `package.json` `workspaces` array,
and that absence is load-bearing. `.easignore`'s own keep-list records why: `npm
ci` resolves every declared workspace, so a declared workspace **must** be
uploaded to EAS. This tree exists partly to hold large build-time masters that
must never reach a build, so declaring it would defeat its purpose.

It is therefore reached **by path**, never by `npm --workspace`:

```bash
npm run art:doctor     # or: python art-department/doctor.py
npm run art:test       # or: python art-department/run-tests.py
npm run art:rig -- --enemy float-eye
npm run art:rig -- --enemy death-beholder
```

## What is here

| Path | What it is |
|---|---|
| `requirements.txt` | The Python toolchain's declared dependencies, pinned. |
| `doctor.py` | Reports every missing dependency **by name** and exits non-zero. |
| `run-tests.py` | Runs this tree's own suite. |
| `tools/rig-spritesheet.py` | Rigs a shipped enemy painting into an animation spritesheet by affine transforms. No image model, no API spend. One `RIGS` row per enemy: the float-eye (two layers, its eye lifted out) and the death-beholder (one matted layer; its attack is pure scale). |
| `tools/split-spritesheet.py` | Cuts a sheet master into one lossless PNG cell per frame, row-major, for the app ingest to encode. It does the geometry; the encode recipe and the provenance record stay in `axiomancer-mobile/scripts/ingest-art.mjs`, which has one copy of both. |
| `tests/` | The suite: the doctor names what is missing; the rig reproduces each master byte for byte; the beholder's attack keeps its 40% swell. |
| `masters/` | The large build-time artifacts the tools produce. Committed (they are the regeneration source of truth and what a reviewer compares against), never shipped. |

## Adding a tool in another language

Nothing here is Python-specific except the files that say Python on them. A
Rust or Go tool is welcome, and to land it you satisfy the same four things the
Python toolchain does:

1. **Declare your dependencies in a manifest** that lives in this tree
   (`Cargo.toml`, `go.mod`, whatever your toolchain calls it).
2. **Ship a `doctor`** — some entrypoint that reports every missing dependency
   by name and exits non-zero. A newcomer must learn what they are missing from
   a sentence, not from a stack trace.
3. **Ship tests, and a runner reachable by path.** If your output is a binary
   artifact that a reviewer will compare against, pin it byte for byte: these
   tools are deterministic, so the strict test is available and cheap.
4. **Extend `.github/workflows/verify-art-department.yml`** so CI installs your
   toolchain and runs your doctor and your tests. That workflow is the filter
   that owns this path; a tool it does not run is a tool nothing checks.

And the two constraints above still hold: nothing here is imported by the app,
and nothing here ships.

## Masters

`masters/` holds what the tools produce: large, lossless, build-time. They are
**committed**, because they are the regeneration source of truth and the thing a
reviewer diffs against, and the byte-for-byte test needs them present. Staying
out of the *bundle* is a different question from staying out of version control,
and `.easignore` answers it.

A master's licence travels with it: `masters/<kind>/provenance.json` records
where every file came from, how it was made, and what is still unresolved about
it.
