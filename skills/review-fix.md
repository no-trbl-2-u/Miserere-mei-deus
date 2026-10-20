# Skill: review-fix

> **The fixer** (D95, T 2026-10-20). When the adversarial review posts a
> `not-pass` on a PR, this skill, in a separate run from the reviewer,
> fixes the HIGH findings on the PR's branch and pushes one commit. That
> push is the PR's second and last automated review pass (`MAX_PASSES`
> in `scripts/pr-review.mjs`). The reader and the writer are never the
> same run: the reviewer cannot edit or push, and this skill cannot
> comment, label, merge or close.

## 1. Invocation

Only the `fix` job in `.github/workflows/pr-review.yml` runs this,
after the `merge` job held a PR on `verdict not-pass`, once per PR
(`scripts/pr-review.mjs fix-wanted`: an open, non-draft, same-repo,
non-plan, non-pipeline PR whose latest trusted verdict for its head is
`not-pass` and that carries no `<!-- pr-review-fix:attempt -->` comment
yet). The prompt names the PR, the branch and the head the verdict is
for: "fix the not-pass on PR #<n>, branch <branch>, head <sha>."

The job's `pre_run` copies `main`'s `skills/review-fix.md` to
`.review-tooling/` and restores `.claude/`, `CLAUDE.md`, `AGENTS.md`
and `.mcp.json` from `main`, so a PR cannot rewrite the instructions
that fix it. You are reading the copy.

## 2. What you have

- **Tools:** `Read`, `Edit`, `Write`, `Grep`, `Glob`, and Bash for
  `git` (fetch, switch, pull, add, commit, push), `npm test`,
  `node --test`, `npm run verify`, and `gh pr view` / `gh pr diff`
  (read only).
- **No** `gh pr comment`, `gh pr edit`, `gh pr merge`, `gh pr close`,
  `gh api`, force-push, rebase, or merging `main` into the branch
  (`pr-resolve` does that). The job denies them; do not look for a
  way round the deny list.

## 3. Procedure

1. **Sync the branch, not main:** `git fetch origin && git switch
   <branch> && git pull --ff-only`. If the PR's head is no longer
   `<sha>`, exit with no commit: the verdict is for a head that moved.
2. **Read the verdict:** `gh pr view <n> --json comments`, the last
   comment carrying `<!-- pr-review:verdict not-pass -->` and
   `<!-- pr-review:head <sha> ... -->`. The HIGH rows are the work; the
   MED rows are optional (step 4).
3. **Fix every HIGH at its root.** Read the file and line the row
   names, understand why the reader called it HIGH, and fix the cause,
   not the symptom: no skipped test, no loosened assertion, no
   `--no-verify`, no new content (D88). Keep the fix inside what the
   PR already touches where possible. If a HIGH is wrong (the line does
   not do what the row says), leave it and say so in the commit body;
   the second review decides.
4. **MEDs:** fix a MED when it sits in a file you already changed for a
   HIGH and the fix is a few lines; leave the rest.
5. **Verify in the foreground:** run the test beside each file you
   changed (`node --test <file>` for `scripts/`, the package's
   `npm run verify` for `axiomancer-*`), and the root `npm test` when
   you touched `scripts/`, `.github/` or `skills/`. A red test is yours
   to fix or your change to revert; never push red.
6. **Ship one commit:** stage only the files you changed for the fix
   (`git add <path>...`, never `-A` or `.`): the job lays `main`'s
   `.claude/`, `CLAUDE.md`, `AGENTS.md` and `.mcp.json` over the branch
   as unstaged changes, and they must stay unstaged. Commit as
   `fix(review): <the HIGH, in one line>`, body
   listing each row fixed as `HIGH <path:line>: <what changed>` and
   each row left as `left <path:line>: <why>`. End the body with the
   line `<!-- pr-review-fix:attempt -->`. Then `git push origin
   <branch>`. One commit, one push, then stop.
7. **Nothing to fix** (the head moved, every HIGH is wrong, or the
   fix needs a decision only T can make): exit with no commit and print
   one line saying which. The PR then waits for T.

## 4. Hard rules

1. **Write, never judge.** No comment, label, verdict marker, merge or
   close. The second review is the only judge of your fix.
2. **One commit, one push, no history edits.** Never force-push,
   rebase, amend a pushed commit, or merge `main` in.
3. **Root cause, never suppression** (as `skills/fix-ci.md` §4).
4. **Never touch `main`,** another branch, repository settings, or
   `plan/` queues. A fix that needs any of them is T's: exit and say so.
5. **No emojis**, plain prose, no attribution trailers.
