# The vault

T's Obsidian notes, shared with every Claude session. It exists for T's two
named pains: "hard to see the whole" and "a hard time setting a clear goal".
So it holds one goal sentence, checked at the start of every session, and one
map of every open thread with its status. Brief:
`plan/phases/phase_OV1_obsidian_vault.md`.

## How it flows

```
phone <-> Obsidian Sync <-> desktop folder Miserere-mei-deus/vault/
      <-> Obsidian Git (desktop, every 5 minutes) <-> github no-trbl-2-u/miserere-vault
      <-> Claude sessions (local: the folder directly; cloud: clone/pull)
```

- The vault is its own private repo, `no-trbl-2-u/miserere-vault`. Its
  working copy is `vault/` at the root of the main Miserere checkout, ignored
  by Miserere (`/vault/` in `.gitignore`). Nothing in Miserere's build, tests
  or CI reads it.
- The phone never runs git. Obsidian Sync carries notes between phone and
  desktop; Obsidian Git on the desktop commits, pulls and pushes.
- Links from the vault to Miserere files are GitHub permalinks, not
  wiki-links.

## The files

| File | What it is |
|---|---|
| `00 Goal.md` | One goal sentence and a "Not doing" list. |
| `01 Map.md` | A table of threads: name, status (`seed`, `growing`, `decided`, `parked`), one-line next step. |
| `Inbox.md` | T's rough ideas, newest at the bottom. |
| `Threads/` | One note per thread. |
| `Map.canvas` | The map as an Obsidian canvas. |
| `Feature Map.canvas` | Generated: every feature of the game and how they connect, copied from the repo's `docs/feature-map/Map.canvas`. |
| `02 Features.md` | Generated: the feature table (name, flags, needs a pitch), copied from the repo's `docs/feature-map/README.md`. |

## Generated files

`Feature Map.canvas` and `02 Features.md` are generated in the repo and
copied in by `node scripts/vault.mjs features` (phase FM1e; brief
`plan/phases/phase_FM1_feature_map.md`). They are Claude-owned: T should not
edit them, because every `/vault` session overwrites both. The copy touches
those two files and nothing else, and leaves them alone when they already
match. To change what they say, change the code the map is generated from.

- `Feature Map.canvas` is `docs/feature-map/Map.canvas`, byte for byte.
- `02 Features.md` is one header line ("Generated from the repo's feature
  map ...; do not edit"), a blank line, then the lines of
  `docs/feature-map/README.md` between the marker lines
  `<!-- feature-table:start -->` and `<!-- feature-table:end -->`, verbatim.

The marker lines are the contract with the generator
(`scripts/feature-map.mjs`): each appears exactly once, on a line of its own,
start before end. A README that breaks it makes `features` exit 1 and copy
nothing. A source file that does not exist yet is skipped with a message and
`features` exits 0, so `/vault` runs on before the map is first generated.
`features` exits 1 when `vault/` is not cloned. It reads the feature map from
the checkout it runs in and writes the main checkout's `vault/`.

## Write zones

- T owns the body of `00 Goal.md` and appends to `Inbox.md`.
- Claude removes an Inbox item only by filing it: to a thread, with the Map
  updated in the same commit.
- In `Threads/`, Claude adds notes and Obsidian question callouts and never
  rewrites T's prose.
- `01 Map.md` and `Map.canvas` are Claude-maintained.
- `Feature Map.canvas` and `02 Features.md` are generated; only
  `node scripts/vault.mjs features` writes them.

Claude never writes a goal of its own. When the goal is empty or has moved,
Claude asks T and writes T's words.

## How a session commits

1. `node scripts/vault.mjs ensure` clones `vault/` when it is missing and
   fast-forwards it when present. It stops, and says why, on a dirty tree or a
   diverged branch; it never merges, rebases or stashes. From a linked
   worktree it still uses the main checkout's `vault/`.
2. `node scripts/vault.mjs features` refreshes the two generated files
   (above).
3. Edit the notes inside the write zones.
4. `git -C vault add -A` and `git -C vault commit -m "vault: <summary>"`.
5. `git -C vault push`. If the push is rejected, run `ensure` again; if it
   reports divergence, stop and tell T.

`node scripts/vault.mjs status` prints the head commit, ahead/behind against
the last fetch, and whether the tree is dirty.

The `/vault` command runs a whole session this way (`.claude/commands/vault.md`).

## Cloud sessions

A cloud session has no `vault/` until `ensure` clones it, and it can only
clone the private repo once `no-trbl-2-u/miserere-vault` is attached to the
session (`add_repo`). Attach it first, then run `ensure`.
