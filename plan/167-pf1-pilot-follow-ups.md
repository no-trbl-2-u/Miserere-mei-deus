# 167 — Follow-ups from the 163-166 pilot

> The 2026-11-09 pilot on specs 163-166 merged six PRs. Their reviews found that the production APK posts nothing, and left tests and small fixes owed. This spec makes the production APK post what testers play, then pays the rest in one cleanup chunk.

## Why

### Sources

- **T, 2026-11-09, at the pilot's end gate:** plot a chunk that lets the production APK post, gating 163.3 on it ("Plot it, gate 163.3"); bake the production token for Android only; "One cleanup chunk" for the owed review findings; confirm D184.
- **T, 2026-11-09, earlier in the same session:** preview stays T's; testers get the production APK with no DEV TOOLS; their rows post as `human`; a release carries the production APK only (spec 163, 163.4).
- **The reviews:** #1553 (163.4: the production APK posts nothing), #1549 (163.1), #1550 (164.1, three passes), #1551 (165.1).
- **Why a new spec and not an `## Add` to 163:** settle's `nextChunkNumber` (`scripts/plan/settle.mjs`) reads archived ids with ` · (\d{2,}\.\w+) · `, which misses archive lines that carry `(alias: …)`, so an Add to 163 would be numbered 163.4 again (163.4 is TK1d, archived). 167.2 fixes that.

### What exists today (read 2026-11-09, at 1c63a1891)

- **The posting gate:** `puzzleApiConfig()` (`axiomancer-mobile/lib/puzzleAttempts.ts`) and `playLogConfig()` (`lib/playLog.ts`) both return null when `isDevToolsEnabled()` is false. The production profile turns DEV TOOLS off (163.4), so the tester APK sends nothing, though it carries the URL, the token and the `human` stamp.
- **The dev switch:** `playLogging` in `state/dev/dev-settings.ts` defaults to true; dev settings are hydrated only when DEV TOOLS are on.
- **The bake:** `preview-build.yml` writes the puzzle API values into the dispatched profile's env, for both platforms when `platform: all`, so a production `all` run puts the token in the iOS App Store build.
- **Settle's retire** (D184, `scripts/plan/retire-local.mjs`), the Rules Glossary sort (`settings.engine.ts`), the tester-token docs: as each owed item below says.

## Design

- **A build posts when it carries the puzzle API URL and token.** DEV TOOLS no longer gate it. Where DEV TOOLS are on, the dev menu's play-log switch still applies; where they are off, there is no switch and the build posts.
- **The production token is baked for Android only.** `all` with `production` is refused before a build is spent.
- **Cleanup:** tests first, each shown red against the mutation its review named; docs say what the code does now; no new behaviour.

### Decisions made upfront (do not ask)

- No in-app consent screen or opt-out for testers' play data in this spec.
- The `settledView` gap is fixed by retiring the spec in the view the way settle does, not by holding the file again.

### Out of scope

- 163.3's guard and release script (spec 163).
- Rate limits on the tester token's routes (spec 163's out of scope).

## Acceptance

- **A4** `nextChunkNumber` counts archived ids written with `(alias: …)`; a test adds to a spec whose highest chunk is archived with an alias and gets the next free number.
- **A5** `settledView` retires a spec whose absorbing close's `## Edit` strips its last chunk line, so `plan-check` agrees with settle; the hold message names `absorb:` only when the emptying close lacks it; tests pin `retireSpec`'s root README row, queue-file Phase line, title fallback and nested Follow-ups headings; `followUpsRow` shifts fenced `#` lines consistently and a `- proposed:` body line does not trip `lintQueue`.
- **A6** A `pr-resolve` test asserts the missing-`absorb:` hold text; `skills/next/land.md`'s hand-absorb bullets no longer fire on settle's own retire note; `/next`'s close step says a spec's last close needs `absorb:`.
- **A7** The Rules Glossary test stubs an unsorted registry and expects alphabetical output; `SettingsBody.test.tsx` checks each term appears once; the comment at `state/combat/keywords.ts` no longer says the glossary lists only VULNERABLE and DISCARD.
- **A8** `.github/workflows/README.md` and `axiomancer-mobile/docs/dev-tools.md` name `PUZZLE_TESTER_TOKEN`; `scripts/backend-deploy.test.mjs` runs the tester-secret step's shell for the missing-secret case, and its `wrangler.toml` check ignores comments.

## Open questions

none

## Chunks

Measure: 5 open · 3 closed · next A9

- [ ] **167.2** Pay the pilot's review debt · M · closes A4, A5, A6, A7, A8 · needs — · alias: RD1a
  - Settle: `scripts/plan/settle.mjs` (`nextChunkNumber`, marked `// Miserere:` per `docs/nexus-deviations.md` if the kit owns it), `scripts/plan/settled.mjs`, `retire-local.mjs`, `scripts/pr-merge.test.mjs`, `scripts/pr-resolve.test.mjs` (keep `COPIED_SCRIPTS` in step), `skills/next/land.md`, `skills/next.md`.
  - Glossary: `state/presenters/__tests__/settings.engine.test.ts`, `components/settings/__tests__/SettingsBody.test.tsx`, `state/combat/keywords.ts`.
  - Token: `.github/workflows/README.md`, the tester-token lines of `axiomancer-mobile/docs/dev-tools.md` (167.1 owns its posting lines, hence `needs 167.1`), `scripts/backend-deploy.test.mjs`.
  - Measure: each new test shown red on the mutation its review named; `node scripts/check-comments.mjs`; the root `npm test`; `npx jest --maxWorkers=1` on the two mobile test files.
