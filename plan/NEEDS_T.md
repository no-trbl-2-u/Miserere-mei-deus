# Needs T

> Things only T can fix, found by the loop (D94). Written by the
> **Retro** step (`skills/march.md` §3 "Retro") when a trap's fix is
> T's move, not the loop's: rotate or renew a token or secret, finish
> an OAuth, a console click, a tool on T's machine. These are never
> lessons: they don't climb the `plan/lessons.md` ladder, never become
> a `CANDIDATES` automation row, and the loop ships no code to
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

- **local-api-token-stale** · copy the repo's `PUZZLE_API_TOKEN` secret into `~/.config/miserere/puzzle-api.env` on this machine · blocks: `npm run api -- signature-usage` and `card-usage` locally (401 from the Worker) · workaround: read D1 `miserere` directly through the Cloudflare connector · seen 1× · last 2026-10-31
- **ruleset-bypass-for-t** · put T on the bypass list of ruleset 25469169 with the `gh api -X PUT .../rulesets/25469169` call in `.github/workflows/README.md` ("The `verify-gate` ruleset") · blocks: every direct push to `main` on T's token (plan-only ticks, telemetry, `fix-ci`, the `measured-truth` report commit) · workaround: open a PR from a throwaway branch instead of pushing `main`, and let `verify-gate` pass it · seen 14× · last 2026-10-31
- **anim-temp-untracked** · commit, ignore or delete the untracked `axiomancer-mobile/assets/images/enemies/anim-temp/` · blocks: `npm run assets:check` (asset-provenance test) in the local mobile verify on this machine · workaround: move the dir outside the repo for the run, then back (CI is unaffected) · seen 1× · last 2026-10-31
