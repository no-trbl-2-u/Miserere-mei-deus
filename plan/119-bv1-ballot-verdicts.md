# 119 — Ballots on the phone, verdicts in D1

> T opens a ballot on the phone from a link, votes over as many sittings as it takes without losing a tick, and presses Submit; the verdict lands in D1, and a session reads it back with no copy-paste.

Carried from the v1 brief `phase_BV1_ballot_verdicts.md` at the nexus v2 cut-over (phase NX1d, 2026-11-01). The brief's own words follow under these headings, its shipped phases left out; the whole v1 brief is `git show fd21d04ab:plan/phases/phase_BV1_ballot_verdicts.md`. Each chunk keeps its v1 row id as its `alias:`, so deadlines, D-entries and PRs that name the old id still resolve.

## Why

### Sources

- `/plot` from T, 2026-10-23 (attended). T works mainly on a phone and cannot open the ballot sheets the sessions
  write (`plan/card-ledger/*.ballot.html`), and the verdict currently travels by copy-paste. T asked for "a
  dedicated webpage hosted on cloudflare with a tab for each lane", then whether the decisions and notes made on
  the page could be saved or sent; of the two routes offered (the `miserere-api` Worker, or a pre-filled GitHub
  issue) T chose the Worker: "I love #2! Let's plot it!"
- T's calls in the same session: slot **asap**; BV1 **waits for BE2a** and builds on its router (migration
  `0003`); the page sends the existing **`PUZZLE_API_TOKEN`**, no new secret.
- The process this serves: the card-family rehearsal (`plan/card-ledger/rehearsal-blood-price.md`, and the
  Elementalist run opened in PR #809, `plan/card-ledger/rehearsal-elementalist.md`). T will lock that process in
  if the Elementalist run succeeds; a ballot T can vote on from the phone is part of it (B5's ruled shape,
  `docs/card-spec.md` §15: the skill "renders an HTML artifact").
- Phase BE1 (`plan/phases/phase_BE1_solve_time_backend.md`): the `miserere-api` Worker, D1 `miserere`, the bearer
  token, the `/v1/` versioning rule, numbered migrations never edited. Phase BE2
  (`plan/phases/phase_BE2_card_combat_logging.md`): BE2a turns `backend/src/index.ts` into a router and takes
  migration `0002`.
- D84-D87, D95/D101 (code lands by PR on a green review; T merges `plot` PRs), D93 (`/plot` lands by a `plot`
  PR), D99 (cards are ordinary content: this phase carries verdicts about cards and edits none).
- Code read while shaping this:
  - `backend/src/index.ts`: one path, `PUZZLE_ATTEMPTS_PATH`; 401 before method dispatch; no CORS handling at
    all (the only caller today is the native app, which sends no preflight). A browser page on another origin
    sends an `OPTIONS` preflight because of the `Authorization` header, so CORS is new work here.
  - `backend/src/auth.ts` `isAuthorized` (timing-safe bearer compare); `backend/src/http.ts` `json`/`error`;
    `backend/test/` (Workers pool, local D1 via `apply-migrations.ts`); `backend/wrangler.toml` (no `[vars]`).
  - `.github/workflows/backend-deploy.yml`: on a push to `main` touching `backend/**`, applies migrations
    remotely and deploys.
  - `plan/card-ledger/rehearsal-blood-price.ballot.html`: the ballot shell. Self-contained, "no network, no
    storage"; the verdict is built by `sheet()` from the DOM and copied by hand. A reload loses every tick.
  - `docs/external-architecture.md`: Cloudflare Pages projects are created at the dashboard; the repo holds no
    Cloudflare token and no Pages config (the `axiomancer-devlog` precedent).

### Outcome

T opens a ballot on the phone from a link, votes over as many sittings as it takes without losing a tick, and
presses Submit; the verdict lands in D1, and a session reads it back with no copy-paste.

## Design

### Scope

- `backend/`: migration `0003_ballot_verdicts.sql`; the ballot contract and validator (`src/ballot.ts`, backend
  only: no app shares it, so it does not go through `axiomancer-mechanics`); the table module; the two routes on
  BE2a's router; `src/cors.ts`; `BALLOT_ORIGINS` under `[vars]` in `wrangler.toml`; tests.
- `plan/card-ledger/`: `ballot-kit.js`, `index.html`, `README.md`; the Elementalist ballot gains one `<script
  src>` tag and a `BALLOT_ID`, and its inline Generate/Copy wiring moves into the kit.
- Root: `scripts/ballot-kit.test.mjs` in the root `npm test` list.
- Docs per A9.
- No card, keyword or ballot content change. No change to `puzzle_attempts`, the play-log tables or their routes.

### Consumers to update

- BE2a's router (`backend/src/index.ts` after BE2a): two more routes.
- `package.json` root `test` script (the kit's test).
- `docs/external-architecture.md`, `AGENTS.md` (`backend/` line), `plan/card-ledger/README.md`.

### Decisions made upfront — DO NOT ASK

- **The token is `PUZZLE_API_TOKEN`** (T). It is typed once on the device; it is never in a committed file, a
  URL or a query string.
- **CORS is per route, not global.** Only the ballot routes answer a preflight. The native app's routes stay
  exactly as they are.
- **`BALLOT_ORIGINS` is a `[vars]` entry, not a secret**: `https://axiomancer-ballots.pages.dev,
  https://*.axiomancer-ballots.pages.dev`. If T names the project differently in BV1c, BV1c edits the var.
- **Every submit is a new row.** Resubmitting a ballot appends; the newest row for a `ballot_id` is the verdict
  in force, and the older rows stay as history. No update or delete route.
- **The kit is a classic script** exposing `window.BallotKit`, its pure parts (draft serialise and restore,
  payload build, error-to-words) testable in Node by loading the file in `vm`. A module script would break a
  ballot opened from disk.
- **Each ballot stays its own page.** The index links them; the sub-lane tabs inside a ballot are unchanged. One
  page per family keeps each Submit one family's verdict.
- **The Blood Price ballot is not retrofitted.** Its verdicts were recorded on 2026-10-11; it is listed as
  closed.
- **Reading verdicts back** is the D1 query tool or `GET`; no report, no notification, no ledger auto-write. The
  session that runs the ballot still writes the ledger's Verdicts section by hand, as with Blood Price.

### Tests matrix

- Backend (Workers pool, local D1): A2's 201, 401, 400 (each rule), 413; A3 order and filter; A4 preflight from an
  allowed exact origin, an allowed preview subdomain, a disallowed origin, and a puzzle-route request carrying an
  `Origin` header (unchanged response).
- Root (`node --test`): the kit's draft round trip, payload shape, and the words for offline, 401, 400 and 413.
- Manual in the phase's own Playwright run (evidence in the PR, not a gate): the Elementalist ballot at 390 px,
  tick, reload, ticks restored; Submit against a local `wrangler dev` returns an id.

### Verify gate

`npm run verify -w backend`, the root `npm test`, `node scripts/check-deadlines.mjs`. The deploy workflow applies
`0003` on merge.

### Commit body template

```
<phase id> — <title>

Closes <A-ids> of plan/phases/phase_BV1_ballot_verdicts.md.
<what changed, by package>
Verify: <commands and results>
```

### Follow-ups (out of scope)

- B5, the card-creator skill, writes its ballots on the kit and adds the `BALLOTS` entry itself.
- A Generate-side link that opens the ledger's Verdicts section pre-filled, if hand-writing it stays a chore.
- Cloudflare Access in front of the ballot site, if T wants it private (the repo is public, so the ballots
  already are).

### Chunk notes (the brief's phase blocks)

#### BV1c (chunk 119.3)

Measure: T's phone verdict is read back from D1 word for word (the phase Measure above).
- Scope: T creates the `axiomancer-ballots` Pages project at the dashboard (connect the repo, no build command,
  output directory `plan/card-ledger`, branch previews on); the session edits `BALLOT_ORIGINS` if the name
  differs; T submits from the production URL and from a preview URL; the session reads both rows back.
- Consumers: none.
- Tests: none (the round trip is the test).
- Verify gate: the two rows in D1, quoted in the PR.

## Contracts

- **No game save change.** The draft lives in the browser's `localStorage`, key `ballot:<ballotId>:draft`; the
  API URL and token under `ballot:api` (one per device, shared by every ballot).
- D1 `ballot_verdicts`: `id` integer primary key, `received_at` (ISO, set by the Worker), `ballot_id` (text, e.g.
  `elementalist-2026-10-22`), `verdict_text` (the Generate text, verbatim), `kept_json` (array of kept candidate
  ids), `notes_json` (object, slot id to note), `general` (text, nullable), `client` (user agent, nullable).
  Indexed on `ballot_id`.
- Body caps: `verdict_text` 32 KiB, the whole body 64 KiB; `ballot_id` matches `^[a-z0-9-]{3,64}$`; every id in
  `kept_json` matches `^[A-Z]-\d{2}[a-z]$`.

## Acceptance

- **A10** (attended) The `axiomancer-ballots` Pages project exists, serving `plan/card-ledger/` from `main` with
  branch previews; T submits one real verdict from the phone on the production URL and one from a branch preview
  URL, and a session reads both back from D1 (the D1 query tool or `GET`).

## Open questions

(None. A call the brief left open is accepted at merge: AGENTS.md § Building a phase, "Calls left open".)

## Chunks

Measure: 1 open · 9 closed · next A11

- [ ] **119.3** The site goes up, and T's first verdict (attended) · S · closes A10 · needs — · alias: BV1c
