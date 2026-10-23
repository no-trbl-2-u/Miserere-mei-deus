# Phase BV2 — Save a ballot unfinished, and pick it up from the save

## Sources

- `/plot` from T, 2026-10-23 (attended): "One thing I want to change about the ballot, a 'Save' button. it'll save
  the row, but it can be marked incomplete. Furthermore, when that ballot is loaded, it'll load from the save. It's
  just a lot of cards and I'd like to do it little by little."
- Phase BV1 (`plan/phases/phase_BV1_ballot_verdicts.md`; BV1a #831, BV1b #834): `ballot_verdicts` in D1
  (migration `0003`), `POST`/`GET /v1/ballot-verdicts` behind the bearer token with per-route CORS, and the ballot
  kit (`plan/card-ledger/ballot-kit.js`), which already autosaves every tick and note to the phone's
  `localStorage` and restores it on a reload. BV1's decision "every submit is a new row; the newest row for a
  `ballot_id` is the verdict in force" stands, narrowed below to final rows.
- `plan/card-ledger/README.md` "Reading a verdict back"; the lane-creator v1 flow (D-number in the same session's
  plan PR), whose verdict step this changes.
- Code read while shaping this: `backend/src/ballot.ts` (the contract and validator, `BallotVerdictPost` has no
  status), `backend/src/ballot-verdicts.ts` (the table module), `backend/src/index.ts` (the router),
  `backend/migrations/0003_ballot_verdicts.sql`; `ballot-kit.js` `mount`, `read`, `apply`, `restoreDraft`,
  `askApi`, `submitVerdict`; `scripts/ballot-kit.test.mjs`.

## Outcome

T votes on a ballot over several sittings: Save stores the progress online marked incomplete, the ballot opens
from the newest save on any device, and Submit marks it final. Agents read only final rows as the verdict.

## Acceptance

- **A1** Migration `backend/migrations/0004_ballot_verdict_status.sql` adds `status` (`draft` or `final`, not
  null, default `final`) to `ballot_verdicts`; every existing row reads `final`. `0001`-`0003` are unchanged.
- **A2** The ballot contract accepts an optional `status` (`draft` | `final`, default `final`; anything else is a
  400 naming it), stores it, and returns it on every row. `GET /v1/ballot-verdicts` takes an optional `status=`
  filter, exact; without it, rows of both kinds come back newest first, as today.
- **A3** The kit adds a **Save** button beside Submit. Save posts the current ticks and notes with `status: draft`,
  asking for the API URL and token the first time exactly as Submit does, and says "Saved, not submitted: #N at
  <time>". Submit posts `status: final` and keeps its current words.
- **A4** On load, when the device holds the API URL and token, the kit fetches the newest row (either status) for
  the page's `BALLOT_ID` and applies it if it is newer than the local draft (the local draft gains a `savedAt`
  stamp; a draft from before this phase, with none, counts as older). The status line says what was loaded:
  "Loaded your save from <time> (not submitted)" or "Loaded your submitted verdict from <time>". With no API on
  the device, or offline, the local draft loads as today and the line says the online save could not be reached.
- **A5** A failed Save or load (offline, 401, 400, 413) shows the reason in words, as Submit's failures do, and
  never discards the on-screen ticks.
- **A6** `plan/card-ledger/README.md` "Reading a verdict back" says the verdict in force is the newest `final` row
  (`?status=final`); `draft` rows are progress, never a verdict. The memory pointer and the lane-creator flow doc
  say the same.

Measure: T saves a ballot part-done on the phone, reopens it later (another device or a cleared browser), finds
every tick and note back, and the agent's `?status=final` read ignores the save until T submits.

## Scope

- `backend/`: migration `0004`; `ballot.ts` (status in the post, row and validator); `ballot-verdicts.ts` (insert,
  select, the `status` filter); tests.
- `plan/card-ledger/`: `ballot-kit.js` (Save, load from the save, `savedAt`), `README.md`.
- Root: `scripts/ballot-kit.test.mjs` cases.
- No ballot content change. No change to the puzzle or play-log routes.

## Consumers to update

- The Worker header comment (`backend/src/index.ts`).
- `plan/card-ledger/README.md`; `docs/external-architecture.md` only if its ballot line names "every submit".

## Save / schema contracts

- D1 `ballot_verdicts.status`: `TEXT NOT NULL DEFAULT 'final' CHECK (status IN ('draft', 'final'))`, indexed with
  `ballot_id`.
- Device: the draft at `ballot:<ballotId>:draft` gains `savedAt` (ISO). `restoreDraft` accepts a draft without it.
  No game save change.

## Decisions made upfront — DO NOT ASK

- **A save is a row, not an overwrite.** Save appends a `draft` row like Submit appends a `final` one; the newest
  row of either kind is what the page loads. No update or delete route, so the history of saves is kept.
- **Newest wins on load**, by the server's `receivedAt` against the local `savedAt`. No merge of two drafts.
- **The verdict in force is the newest `final` row.** A `draft` saved after a Submit is loaded by the page (T is
  revising) but is not the verdict until T submits again.
- **Autosave to the device stays** and still runs on every change; Save is the explicit online checkpoint T asked
  for, not a replacement.
- **The token prompt is shared**: whichever of Save or Submit runs first asks for it.

## Tests matrix

- Backend (Workers pool, local D1): `0004` on a table holding a BV1 row (it reads `final`); a post with `status:
  draft`, with no status (stored `final`), with `status: maybe` (400); the `status=` filter; rows carry `status`.
- Root (`node --test`): draft round trip with and without `savedAt`; the newer-wins choice both ways; the load
  status words; the Save payload carries `status: draft` and Submit's `final`.
- Manual in the phase's Playwright run (evidence in the PR, not a gate): tick, Save, clear site storage, reload
  with the API set, ticks back.

## Verify gate

`npm run verify -w backend`, the root `npm test`, `node scripts/check-deadlines.mjs`. The deploy workflow applies
`0004` on merge.

## Commit body template

```
<phase id> — <title>

Closes <A-ids> of plan/phases/phase_BV2_ballot_save.md.
<what changed, by package>
Verify: <commands and results>
```

## DoD

Every acceptance ID closed by its phase; the Measure met on T's next ballot sitting.

## Follow-ups (out of scope)

- A per-ballot "in progress / submitted" badge on `index.html` (needs the token on the index page).
- The lane-creator v2 automation: when a `final` verdict lands, a session records it, runs the sims and opens the
  trial-set `plot` PR for T to merge.

## Phases

### BV2a — Status on the verdict rows · S · closes A1, A2 · requires nothing
Measure: `npm run verify -w backend`; the backend cases pass against a local D1.
- Scope: migration `0004`; `ballot.ts`; `ballot-verdicts.ts`; tests; the Worker header comment.
- Verify gate: backend verify, root `npm test`. The deploy workflow applies `0004` on merge.

### BV2b — Save, and load from the save · M · closes A3, A4, A5, A6 · requires BV2a
Measure: the root `npm test` passes the kit's new cases, and the phase's Playwright run shows ticks back after
clearing site storage.
- Scope: `ballot-kit.js`; `scripts/ballot-kit.test.mjs`; `plan/card-ledger/README.md`.
- Verify gate: root `npm test`.
