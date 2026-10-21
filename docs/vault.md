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

## Write zones

- T owns the body of `00 Goal.md` and appends to `Inbox.md`.
- Claude removes an Inbox item only by filing it: to a thread, with the Map
  updated in the same commit.
- In `Threads/`, Claude adds notes and Obsidian question callouts and never
  rewrites T's prose.
- `01 Map.md` and `Map.canvas` are Claude-maintained.

Claude never writes a goal of its own. When the goal is empty or has moved,
Claude asks T and writes T's words.

## How a session commits

1. `node scripts/vault.mjs ensure` clones `vault/` when it is missing and
   fast-forwards it when present. It stops, and says why, on a dirty tree or a
   diverged branch; it never merges, rebases or stashes. From a linked
   worktree it still uses the main checkout's `vault/`.
2. Edit the notes inside the write zones.
3. `git -C vault add -A` and `git -C vault commit -m "vault: <summary>"`.
4. `git -C vault push`. If the push is rejected, run `ensure` again; if it
   reports divergence, stop and tell T.

`node scripts/vault.mjs status` prints the head commit, ahead/behind against
the last fetch, and whether the tree is dirty.

The `/vault` command runs a whole session this way (`.claude/commands/vault.md`).

## Cloud sessions

A cloud session has no `vault/` until `ensure` clones it, and it can only
clone the private repo once `no-trbl-2-u/miserere-vault` is attached to the
session (`add_repo`). Attach it first, then run `ensure`.
