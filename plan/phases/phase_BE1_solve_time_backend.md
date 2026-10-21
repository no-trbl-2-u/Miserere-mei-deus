# Phase BE1 — The solve-time backend (Cloudflare Workers + D1)

## Sources

- `/plot asap` from T's `/pitch`, 2026-10-21 (attended). The pitch, its rulings and its prior art are in
  `braindump/2026-10-21-solve-time-backend.md`. In T's words: "How difficult would it be to just create a
  dedicated backend with a db (yes that means the game would be partially 'online', that's fine)? It would open
  other doors as well. But for now, this would be the first use case."
- D84–D87 and D95 (code lands by PR and merges on a green adversarial review; a plan merges by T's hand), D93
  (`/plot` lands by a `plot` PR), D37 / D88 (no card, keyword or art work; this phase touches none).
- `plan/deadlines.md` W1, "Hazard puzzles locked": HP4e times T's solves of the thirty, and HP4f/HP4g and the
  later card-and-puzzle set read those times.
- Code read while shaping this:
  - `axiomancer-mobile/state/presenters/hazard-puzzle-log.engine.ts`: the HP2c move log. An attempt has a solver,
    a layout, a route, timed moves, and an `end` with `ms` (the solve time, from the moment the opening roll
    settles) and `cleared`. It is pure reducers with no I/O.
  - `axiomancer-mobile/lib/clipboard.ts`: today's only export (copy as JSON).
  - `axiomancer-mobile/lib/buildProfile.ts:9` `isDevToolsEnabled()`: true in preview builds, false in production.
  - `axiomancer-mobile/app/devpuzzle/index.tsx` and `components/hazard/puzzle/` (HP4d, #699): the candidate board.
  - `axiomancer-mechanics/src/World/Hazard/puzzle/hazard-puzzle.candidates.ts` (HP4c, #701):
    `cand-<band>-01..10`.
  - `.github/workflows/preview-build.yml`: the manual EAS preview build.
  - Cloudflare account (MCP, 2026-10-20): Workers `kb-mcp`, `estate-view`, `martial-havoc`; no D1 databases.
    `kb-mcp` is the bearer-token Worker pattern this follows.

## Outcome

Each finished `/devpuzzle` attempt in a preview build is stored in a D1 database behind a small Worker. T and
the authoring agents read per-puzzle solve times with one command and no manual export.

## Acceptance

- **A1** A new workspace package, `backend/`, is listed in the root `workspaces`. It holds the Worker
  (`wrangler.toml`), the D1 schema as numbered migrations under `backend/migrations/`, and a GitHub Action,
  `.github/workflows/backend-deploy.yml`, that applies migrations and deploys on a push to `main` touching
  `backend/**`. The Worker is live at a `*.workers.dev` URL recorded in `docs/dev-tools.md`.
- **A2** `POST /v1/puzzle-attempts` stores one move-log attempt: solver, layout id, route, intended band (null
  for a demo), moves, end kind, end ms, cleared, and app build. It returns 401 without the bearer token and 400
  on a body the shared validator rejects. `GET /v1/puzzle-attempts` (optional `?layout=<id>`) returns the stored
  rows, newest first. The request and response types and the validator live in one module that both the app and
  the Worker import.
- **A3** In a build where `isDevToolsEnabled()` is true and the API URL and token are set, each attempt that
  reaches an `end` on `/devpuzzle` is posted exactly once. A failed post is dropped with a dev-only console
  warning, with no retry, no queue and no UI change. A production build, or a build with no URL or token, makes
  no network call.
- **A4** `npm run puzzle:times` (root) reads the GET endpoint and prints a table: candidates grouped by intended
  band, then demos, with the attempt count, solve count, solve rate and median solve time in seconds over
  cleared attempts. `--solver <name>` filters by solver, and `--json` prints the rows as JSON.
- **A5** The Worker's tests run in the Workers runtime against a local D1. They cover a 401 without the token,
  a 400 on a malformed body, a POST followed by a GET that returns the same row, and `?layout=` filtering.

**Measure:** T solves one candidate on a preview APK; `npm run puzzle:times` then lists that attempt under its
candidate with its solve time.

## Scope

- New workspace `backend/` (TypeScript, `wrangler`, `@cloudflare/vitest-pool-workers`).
- The shared contract module in `axiomancer-mechanics`, beside the puzzle module, holding pure types and the
  validator with no I/O, exported through the barrel so `@mechanics` carries it to both sides.
- `axiomancer-mobile`: one poster module plus its call from the `/devpuzzle` attempt-end path.
- Root: the `puzzle:times` script under `scripts/`, the `workspaces` entry, and `.github/workflows/backend-deploy.yml`.
- `.github/workflows/preview-build.yml`: passes the two `EXPO_PUBLIC_` values from repo secrets to the EAS build.

## Consumers to update

- `@mechanics` barrel (the contract module).
- `axiomancer-mobile/docs/dev-tools.md`: the endpoint, the env names, and `puzzle:times`.
- `AGENTS.md` package layout: one line for `backend/`.
- The `cross-package` job in `verify-mechanics.yml` if its workspace list is not derived from the root.

## Save / schema contracts

- No save-data change. Nothing about the attempt touches `Game/` or the save.
- D1 table `puzzle_attempts`: `id` (integer primary key), `received_at` (ISO text, set by the Worker), `solver`,
  `layout_id`, `route`, `intended_band` (nullable), `end_kind`, `end_ms`, `cleared` (0/1), `moves_json`,
  `app_build`. Indexed on `layout_id`. Migration `0001_puzzle_attempts.sql`; every later change is a new
  numbered migration, never an edit.
- The API is versioned under `/v1/`. An old APK keeps posting to `/v1/` forever, so a breaking change takes
  `/v2/`.

## Decisions made upfront — DO NOT ASK

- **Host:** Cloudflare Workers + D1, on T's existing account (T, pitch t4).
- **Identity:** the move log's typed SOLVER name only, with one shared dev bearer token. There are no device IDs
  and no accounts (T, pitch t4). The Worker reads the token from a Worker secret, `PUZZLE_API_TOKEN`. The app
  reads `EXPO_PUBLIC_PUZZLE_API_URL` and `EXPO_PUBLIC_PUZZLE_API_TOKEN`.
- **Offline:** a failed post is dropped; there is no outbox (T, pitch t4).
- **Builds:** only builds where `isDevToolsEnabled()` is true ever post (pitch).
- **Solve time:** the move log's existing `end.ms`. This phase adds no timer. The visible count-up timer is a
  separate row (pitch, prior session).
- **No new runtime dependency in the app.** It uses the platform `fetch`.
- **Read access:** the GET endpoint uses the same token. Agents may also query D1 directly through the
  Cloudflare MCP, so there is no admin UI.
- **Worker name** `miserere-api`, **D1 database** `miserere`: one database, no separate dev and prod, until a
  second use case needs it. [T to confirm]
- **The token ships in the preview APK** as an `EXPO_PUBLIC_` build-time value. That is accepted as low risk
  for dev-only puzzle times; rotating it means a new secret and a rebuild. [T to confirm]
- **Out of scope:** remote config and content, playtester telemetry, device IDs, an outbox, accounts, and the
  visible timer.

## Tests matrix

- `backend/test/*.test.ts` (Workers pool, local D1): the A5 cases.
- Mechanics: contract validator unit tests, covering an accepted attempt, a missing field, a wrong type, and an
  unknown end kind.
- Mobile: a poster test with mocked `fetch`. It covers one call per ended attempt, no call when dev tools are
  off, no call with the env unset, and a rejected fetch that only warns.
- Root: `puzzle:times` formatting over fixture rows (the median, a band group, demos last, `--solver`, `--json`).

## Verify gate

Per phase, below. The root `npm test` runs in every phase.

## Commit body template

```
<what shipped, one paragraph>

Closes A<n>[, A<m>] of plan/phases/phase_BE1_solve_time_backend.md.
Measure: <the phase's Measure line and its result>.
```

## DoD

A1–A5 ticked, each by the phase that closes it.

## Follow-ups (out of scope)

- Remote config and content over the same Worker, read-only for the app (T, pitch t3).
- Playtester telemetry, which needs anonymous device IDs and a privacy note before the APK leaves T's hands
  (T, pitch t3).
- An offline outbox, if dropped solves visibly thin the medians.
- A separate dev and prod database once a second use case writes to D1.

## Phases

### BE1a — The attempt contract and the Worker · M · closes A2, A5 · requires nothing
Measure: `npm test -w backend` passes the A5 cases against a local D1; `npm run verify -w axiomancer-mechanics`
passes with the contract exported.
- Scope: the `backend/` package (Worker, `wrangler.toml` with a placeholder database id, `0001` migration,
  tests), the root `workspaces` entry, and the contract module plus its barrel export in mechanics. No deploy and
  no workflow.
- Consumers: the `@mechanics` barrel; the `AGENTS.md` package line.
- Tests: the A5 Worker tests; the validator unit tests.
- Verify gate: `npm test -w backend`; mechanics verify; root `npm test`.

### BE1b — Live on Cloudflare (attended) · S · closes A1 · requires BE1a
Measure: from T's machine, a `curl` POST with no token returns 401, a POST with the token returns 201, and a GET
returns the posted row from the deployed `*.workers.dev` URL.
- Attended because T makes a Cloudflare API token with Workers and D1 edit rights and adds the repo secrets
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PUZZLE_API_TOKEN`, `EXPO_PUBLIC_PUZZLE_API_URL` and
  `EXPO_PUBLIC_PUZZLE_API_TOKEN`.
- Scope: create the D1 database `miserere`, put its id in `wrangler.toml`, `backend-deploy.yml` (migrations
  apply, then deploy, then `wrangler secret put PUZZLE_API_TOKEN` from the repo secret), and the URL in
  `docs/dev-tools.md`.
- Tests: none new; the Measure is the live check.
- Verify gate: root `npm test`; the deploy workflow's first run is green.

### BE1c — Preview builds post each attempt · M · closes A3 · requires BE1a
Measure: `npm run verify -w axiomancer-mobile` passes with the poster tests; the next preview build, once BE1b
is live, posts an attempt that `GET` returns.
- Scope: the poster module and its call where the `/devpuzzle` attempt ends (`HazardPuzzleDemo` / the log
  panel's end path); `preview-build.yml` passes the two `EXPO_PUBLIC_` secrets as build env.
- Consumers: `axiomancer-mobile/docs/dev-tools.md`.
- Tests: the mobile poster tests.
- Verify gate: mobile verify; root `npm test`.

### BE1d — `npm run puzzle:times` · S · closes A4 · requires BE1a
Measure: `npm run puzzle:times` against fixture rows prints the A4 table; against the live URL (once BE1b is
live) it prints T's attempts.
- Scope: `scripts/puzzle-times.mjs` and its root `package.json` script. It reads `PUZZLE_API_URL` and
  `PUZZLE_API_TOKEN` from the environment and fails with a one-line message naming the missing variable.
- Consumers: `axiomancer-mobile/docs/dev-tools.md`.
- Tests: the formatting tests over fixtures, in the root `npm test`.
- Verify gate: root `npm test`.
