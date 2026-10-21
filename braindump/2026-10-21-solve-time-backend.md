# Solve-time backend (Workers + D1) — 2026-10-21

## Surface question
"let's store the solve times . what are my options? Any easy cloudflare options? Or am I finally going to
have to create a backend?" Then: "How difficult would it be to just create a dedicated backend with a db
(yes that means the game would be partially 'online', that's fine)? It would open other doors as well. But
for now, this would be the first use case."

## Better question surfaced
The solve time is already measured. HP2c's move log records each attempt's moves and its solve time
(`end.ms`, from roll-settle to CONFIRM), but only in memory, with a copy-as-JSON button. The real question was
where that record should live so that T and the authoring agents (HP4f patterns, HP4g clocks, the later
card+puzzle set) can read per-puzzle medians without a manual export. T chose a small dedicated backend that
later use cases can grow into, rather than a one-off store.

## Path taken this session
1. Opened in diverge. The mechanism (Cloudflare) was half-named and no problem was stated. Evidence showed
   the timing instrument already exists.
2. t1 GOAL: keep dev-board attempts durable and readable as per-puzzle averages. Options offered: on-phone
   only, Worker + D1, both, Sentry.
3. t2 GOAL rewritten (scope widened): a dedicated backend with a database, solve times as its first use case.
4. t3: later doors named (remote config/content, playtester telemetry), both ruled out of scope for this phase.
5. t4: host, identity and offline behaviour ruled. Converged. T confirmed the reflected goal at t5.
6. Parked: on-phone-only storage and Sentry (superseded at t2), and the later doors (follow-ups).

## Raw material read
- `axiomancer-mobile/state/presenters/hazard-puzzle-log.engine.ts`: pure reducers over an attempt: solver,
  layout, route, moves with ms, and `end` with `ms` (the solve time) and `cleared`. The clock starts when the
  opening roll settles.
- `axiomancer-mobile/lib/clipboard.ts`: the existing copy-as-JSON export. No persistence was found anywhere.
- `axiomancer-mobile/package.json`: AsyncStorage 2.2.0 and @sentry/react-native ~7.2.0 are already installed.
- HP4d (#699): the candidate board runs the move log in preview builds (`isDevToolsEnabled()`). HP4c (#701):
  thirty candidates `cand-<band>-01..10`.
- Cloudflare account (MCP, 2026-10-20): Workers `kb-mcp`, `estate-view`, `martial-havoc`; KV `BOOKINGS`; no D1
  databases. The Cloudflare MCP in this workspace exposes `d1_database_query`.

## Measured
| Finding | Data |
|---|---|
| Solve times stored today | 0 (the log is in memory only) |
| Solve-time distribution | not measurable before build: T has not played the thirty yet and nothing persists |

## Prior art consulted
- **Slay the Spire — opt-in run-data upload:** runs were sent to Mega Crit and informed balance patches. No
  confident read on player reception.
- **GameAnalytics / Unity Analytics — design events with a numeric value:** the standard shape for "one timed
  attempt", keyed by an event id. Widely used; no confident read on reception.
- **`kb-mcp` (this workspace):** a bearer-token Cloudflare Worker running since 2026-08-31. It shows the auth
  and deploy pattern works on this account.

## Rulings (T, this session)
- The game may be partially online; a dedicated backend with a DB is wanted, solve times first (t2).
- Later doors are remote config/content and playtester telemetry. Both are out of scope for this phase, and
  no accounts are implied (t3).
- Host: Cloudflare Workers + D1 (t4).
- Identity: the typed SOLVER name only, behind one shared dev token baked into preview builds (t4).
- Offline: a failed post is dropped; no outbox (t4).
- The visible count-up timer is separate, earlier work. The backend reads the move log's existing `end.ms`
  (prior session).

## Directions considered
### Option A — On-phone only *(AsyncStorage + export)*
No server. **Trade-off:** every read needs a manual export. **Telltale failure mode:** a reinstall wipes the
times.
### Option B — Workers + D1 *(kb-mcp pattern)* — chosen, grown into a `backend/` package
**Trade-off:** API versioning and migrations from now on. **Telltale failure mode:** solves made offline are
missing from the medians.
### Option C — Sentry events
No new infrastructure. **Trade-off:** aggregates are awkward to query. **Telltale failure mode:** sampling or
retention quietly drops attempts.

## What proves it (not T, not the agent)
Solve one candidate on a preview APK, then run `npm run puzzle:times`: the attempt shows up under its candidate
with its solve time, and the medians cover every stored attempt.

## Handoff to /plot
Task: Add a `backend/` workspace package (a Cloudflare Worker with a D1 database) that preview builds post each
finished `/devpuzzle` attempt to, so T and the authoring agents can read per-puzzle solve times without a manual
export.
Source: this file
Acceptance:
- A1 A `backend/` workspace package holds the Worker, the D1 schema as versioned migrations, and a GitHub
  Action that deploys it on merge to `main` (new repo secret `CLOUDFLARE_API_TOKEN`).
- A2 `POST /v1/puzzle-attempts` accepts one move-log attempt (solver, candidate id, route, band, moves, end ms,
  cleared, app build). It rejects requests without the dev bearer token and rejects malformed bodies.
  `GET /v1/puzzle-attempts` returns stored rows, optionally for one candidate. The request and response types
  live in one shared module that both the app and the Worker import.
- A3 Preview builds (`isDevToolsEnabled()`) post each finished attempt once. A failed post is dropped with a
  dev-only warning. Production builds never send.
- A4 `npm run puzzle:times` prints, for each candidate and grouped by band, the attempt count, the median solve
  time and the solve rate.
- A5 Worker tests cover the auth rejection, a malformed body, and an insert followed by a read.
Measure: solve one candidate on a preview APK; `npm run puzzle:times` lists that attempt with its solve time.
Decisions made upfront: Workers + D1; the typed SOLVER name plus one shared dev token; drop on failure, no
outbox; preview builds only; the solve time is the move log's existing `end.ms`.
Out of scope: remote config/content; playtester telemetry; device IDs; an offline outbox; accounts or login;
the visible count-up timer (its own row).
To confirm: the token travels in the APK as a build-time env var (`EXPO_PUBLIC_*`) and is accepted as low risk
for dev-only data [T to confirm]; one D1 database (no separate dev and prod) until a second use case
[T to confirm].
Suggested slot: asap — T's solves of the thirty start now, and HP4f/HP4g read these times.
