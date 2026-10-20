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

- **ruleset-bypass-for-t** · run `gh api -X PUT repos/no-trbl-2-u/Miserere-mei-deus/rulesets/25469169 --input -` with `{ "bypass_actors": [{ "actor_id": 5, "actor_type": "RepositoryRole", "bypass_mode": "always" }] }` (the command is in `.github/workflows/README.md`, "The `verify-gate` ruleset") · blocks: every direct push to `main` on T's token (plan-only ticks, telemetry rows, `fix-ci`) while the ruleset has no bypass; the merge job carries its own `verify-gate` check and is not blocked · workaround: none; a refused push is a red tick until this is done · seen 1× · last 2026-10-20

