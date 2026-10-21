---
description: A brainstorm-and-plot session in T's Obsidian vault — fast-forward vault/, check the one-sentence goal (sharpen it with T if it is empty or moved, in T's words), file the Inbox into threads, update the Map, commit `vault: <summary>` and push. Attended only; never fired by the loop.
---

You are running a vault session with T. Read `docs/vault.md` end to end
first: it is the single source of truth for the vault's files, write zones
and commit flow. This command is attended only; no loop verb, cron or
workflow fires it.

Argument handling:
- no argument → the full session, steps 1-7.
- `inbox` → steps 1, 4 and 6 only: file the Inbox, nothing else.
- `<thread name>` → steps 1-3, then push on that one thread (step 5 for it
  alone), then 6-7.

Steps:

1. **Sync.** Run `node scripts/vault.mjs ensure`. If it exits non-zero
   (dirty tree, diverged branch, failed clone), stop and show T its message;
   never merge, rebase or stash to get past it. In a cloud session the vault
   repo must be attached (`add_repo` for `no-trbl-2-u/miserere-vault`) before
   `ensure` can clone it.
2. **The goal.** Read `vault/00 Goal.md`. If the goal sentence is empty, or
   T says it has moved, ask T at most three questions with `AskUserQuestion`
   (shaped per `docs/asking-well.md`) to sharpen it, then write T's own
   words as the goal. Never write a goal of your own, and never reword T's.
   Otherwise state the goal back in one line and keep every later step
   pointed at it.
3. **The map.** Read `vault/01 Map.md` so you see every open thread and its
   status (`seed`, `growing`, `decided`, `parked`) before touching anything.
4. **The Inbox.** For each item in `vault/Inbox.md`: file it into a
   `vault/Threads/<name>.md` note (an existing thread if it belongs there,
   else a new one), add or update that thread's row in `01 Map.md` with a
   status and a one-line next step, and remove the item from the Inbox. All
   three changes land in one commit, so an item is never lost between
   Inbox and thread.
5. **Push back.** In the threads you touched, add your pushback, questions
   and next steps as Obsidian question callouts (a blockquote opening with
   the `question` callout type) below T's text. Add notes; never rewrite T's
   prose. Keep `Map.canvas` in step with the Map when you change a thread's
   status.
6. **Commit and push.** `git -C vault add -A`,
   `git -C vault commit -m "vault: <summary>"`, `git -C vault push`. If the
   push is rejected, run `ensure` again and retry once; if it reports
   divergence, stop and tell T.
7. **Close.** Tell T in two or three lines what moved on the Map and which
   questions are waiting in which threads; they will be on the phone by the
   next sync. If the session produced buildable direction for Miserere,
   offer `/plot` or `/messy` in one question (AGENTS.md rule 8).

Hard rules:
- Write only inside the zones in `docs/vault.md`. `00 Goal.md`'s body is T's.
- Never write to Miserere from this command except through `/plot` or
  `/messy`; the vault is a separate repo.
- No emojis, no attribution trailers in vault commits.

Argument: $ARGUMENTS
