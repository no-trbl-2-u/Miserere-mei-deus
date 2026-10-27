# Card ledger

One ledger per card family (`rehearsal-<family>.md`), the ballot T votes on
(`rehearsal-<family>.ballot.html`), and the pages that serve the ballots:

- `index.html` lists every ballot, one entry per family, from its `BALLOTS`
  array.
- `ballot-shell.html` is the page a new ballot is copied from (phase BV3):
  sample candidates, live kept counts and a Generate text; no candidate
  carries a colour (phase CL1).
- `ballot-kit.js` is the shared ballot kit (phases BV1b, BV2b, BV3): it autosaves
  every tick and note on the device, restores them on a reload, clears the
  draft, saves the ballot unfinished online (Save, a `draft` row), loads the
  newest online save when it is newer than the device's draft, and submits the
  verdict (Submit, a `final` row) to the `miserere-api` Worker
  (`POST /v1/ballot-verdicts`, `backend/src/index.ts`).

The `axiomancer-ballots` Cloudflare Pages project serves this directory as it
stands on `main`, with branch previews (`docs/external-architecture.md`).
A ballot also works opened straight from disk; it can then Generate and Copy,
but the Worker does not answer a page with no web address, so Save, Submit and
the load from the save need the Pages site.

## Adding the next ballot

1. **The data file.** Copy the ballot shell, `ballot-shell.html` (phase
   BV3), to `rehearsal-<family>.ballot.html` and replace its `TABS`, `SLOTS`
   and `CARDS` data and its header copy. Keep
   the DOM the kit reads: `.pick` checkboxes whose value is the candidate id
   (`P-01a`), `[data-note]` inputs whose attribute is the slot id (`P-01`),
   `#general`, `#gen`, `#copy` and `#out`.
2. **No colours.** Give no candidate a `job`, `color` or `colour` (D110): T
   votes on the text, and colours are split after the picks, at the
   revisions step (`docs/lane-creator.md` "Colours after the picks").
3. **The kit tag.** Keep `<script src="ballot-kit.js"></script>` in the head,
   set `const BALLOT_ID = '<family>-<YYYY-MM-DD>';` (lowercase letters, digits
   and hyphens, 3 to 64), and end the script with
   `BallotKit.mount({ ballotId: BALLOT_ID, sheet, onChange: refresh });`.
4. **The `BALLOTS` entry.** Add `{ id, family, file, ledger, status: 'open',
   date }` to `index.html`, with `id` equal to the page's `BALLOT_ID`. When
   the family's verdicts are written into its ledger, set `status: 'closed'`.

`node --test scripts/ballot-kit.test.mjs` (in the root `npm test`) fails when a
ballot file has no `BALLOTS` entry, an open ballot does not load the kit
under its index id, or an open ballot has a candidate carrying a colour. The
Blood Price and Elementalist ballots, voted before CL1, are exempt and stand as
voted.

The whole flow a ballot sits in is `docs/lane-creator.md` (lane-creator v1, D102).

## Reading a verdict back

Every Save and every Submit appends a row; nothing is overwritten. The verdict
in force is the **newest `final` row** for a ballot id: read it with
`GET /v1/ballot-verdicts?ballot=<id>&status=final` (the bearer token) or the D1
query tool on database `miserere`, table `ballot_verdicts`, `WHERE status =
'final'`. A `draft` row is progress, never a verdict, even when it is newer
than the last `final` one (T is revising). The session running the ballot
writes the ledger's Verdicts section from it by hand.

On load, a ballot fetches the newest row of either status for its id and
applies it when it was received after the device's draft was saved; the status
line says whether it loaded a save or a submitted verdict.

On the device, the draft lives in `localStorage` under
`ballot:<ballotId>:draft` (stamped `savedAt`), and the API URL and token under
`ballot:api`, shared by every ballot. A 401 forgets the token, so the next Save
or Submit asks for it again.
