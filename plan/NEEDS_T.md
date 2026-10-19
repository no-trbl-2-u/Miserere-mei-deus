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

- **verify-gate-ruleset** · once phase RV1a's PR merges, run the `gh api -X POST .../rulesets` command in `.github/workflows/README.md` ("The `verify-gate` ruleset") to require `verify-gate` on `main` in evaluate mode (A4) · blocks: Rule Insights evidence for the RV1 Stage 0 table · workaround: none; `verify-gate` still reports on every PR · seen 1× · last 2026-10-16
- **pr-review-stage-2** · after 20 shadow-reviewed `loop:pr` merges, read the Part 4 table (`docs/reports/pr-review-research.md`; regenerate with `node scripts/eval/escape-ledger.mjs && node scripts/eval/miss-rates.mjs`); if it passes, accept D95, require `review` in the ruleset, turn on `allow_auto_merge`, and have a phase wire the `risk:low` `gh pr merge --auto` branch · blocks: Stage 2 (risk:low auto-merge) · workaround: none needed; T merges by hand (D86) · seen 1× · last 2026-10-17
