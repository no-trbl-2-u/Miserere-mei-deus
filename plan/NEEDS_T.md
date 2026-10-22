# Needs T

> Things only T can fix, found by the loop (D94). Written by the
> **Retro** step (`skills/march.md` §3 "Retro") when a trap's fix is
> T's move, not the loop's: rotate or renew a token or secret, finish
> an OAuth, a console click, a tool on T's machine. These are never
> lessons: they don't climb the `plan/lessons.md` ladder, never become
> a `PHASE_CANDIDATES` automation row, and the loop ships no code to
> work around them. Plan-only: a tick pushes its row to `main` (or it
> rides the tick's PR).
>
> Every `/march` tick lists the open rows in its output beside
> "waiting on T"; `/oversight` asks about them first. A tick that hits
> one bumps its `seen` and `last`, uses the row's workaround if there
> is one, and says so in its report. **T clears a row by deleting it**
> once it's done (git history keeps it).
>
> **Format.** One bullet per item, one line, ≤500 bytes; slugs are
> lowercase-kebab, unique, and never also a slug in `lessons.md`
> (linted by `scripts/check-lessons.mjs`):
>
> `- **<slug>** · <what T does> · blocks: <what it stops> · workaround: <how ticks get by, or none> · seen <N>× · last <YYYY-MM-DD>`

## Open

- **ruleset-bypass-for-t** · put T on the bypass list of ruleset 25469169 with the `gh api -X PUT .../rulesets/25469169` call in `.github/workflows/README.md` ("The `verify-gate` ruleset") · blocks: every direct push to `main` on T's token (plan-only ticks incl. `/critique`, telemetry, `fix-ci`); the merge job has its own `verify-gate` check, not blocked · workaround: open a PR from a throwaway branch instead of pushing `main`, and let `verify-gate` pass it · seen 6× · last 2026-10-22
- **rotate-env-gh-token** · rotate the `GH_TOKEN` PAT in `.env` (and the `GH_PAT` secret if it is the same token): the 2026-10-21 `/march` tick (ship VE1c) printed it in plain text in its own log through a status echo that expanded the variable · blocks: nothing yet; the token may be readable in that run's log · workaround: none needed to keep ticking · seen 1× · last 2026-10-21
- **an3-jelly-source** · copy `Jelly A.png` (torio pack, catalog slug `green-jelly`) out of `Potential Assets/` into the tree, e.g. `art-department/masters/enemies/green-jelly.source.png`, then clear AN3a's `[blocked: …]` · blocks: AN3a (A5, the portrait) and so AN3b; the trove is gitignored and absent on every runner · workaround: none; the loop skips the row · seen 1× · last 2026-10-22
