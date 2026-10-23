# Card ledger

One ledger per card family (`rehearsal-<family>.md`), the ballot T votes on
(`rehearsal-<family>.ballot.html`), and the pages that serve the ballots:

- `index.html` lists every ballot, one entry per family, from its `BALLOTS`
  array.
- `ballot-kit.js` is the shared ballot kit (phase BV1b): it autosaves every
  tick and note on the device, restores them on a reload, clears the draft,
  and submits the verdict to the `miserere-api` Worker
  (`POST /v1/ballot-verdicts`, `backend/src/index.ts`).

The `axiomancer-ballots` Cloudflare Pages project serves this directory as it
stands on `main`, with branch previews (`docs/external-architecture.md`).
A ballot also works opened straight from disk; it can then Generate and Copy,
but the Worker does not answer a page with no web address, so Submit needs the
Pages site.

## Adding the next ballot

1. **The data file.** Copy the newest open ballot (today
   `rehearsal-elementalist.ballot.html`) to `rehearsal-<family>.ballot.html`
   and replace its `TABS`, `SLOTS` and `CARDS` data and its header copy. Keep
   the DOM the kit reads: `.pick` checkboxes whose value is the candidate id
   (`P-01a`), `[data-note]` inputs whose attribute is the slot id (`P-01`),
   `#general`, `#gen`, `#copy` and `#out`.
2. **The kit tag.** Keep `<script src="ballot-kit.js"></script>` in the head,
   set `const BALLOT_ID = '<family>-<YYYY-MM-DD>';` (lowercase letters, digits
   and hyphens, 3 to 64), and end the script with
   `BallotKit.mount({ ballotId: BALLOT_ID, sheet, onChange: refresh });`.
3. **The `BALLOTS` entry.** Add `{ id, family, file, ledger, status: 'open',
   date }` to `index.html`, with `id` equal to the page's `BALLOT_ID`. When
   the family's verdicts are written into its ledger, set `status: 'closed'`.

`node --test scripts/ballot-kit.test.mjs` (in the root `npm test`) fails when a
ballot file has no `BALLOTS` entry, or an open ballot does not load the kit
under its index id.

The whole flow a ballot sits in is `docs/lane-creator.md` (lane-creator v1, D102).

## Reading a verdict back

Every Submit appends a row; the newest row for a ballot id is the verdict in
force. Read it with `GET /v1/ballot-verdicts?ballot=<id>` (the bearer token) or
the D1 query tool on database `miserere`, table `ballot_verdicts`. The session
running the ballot writes the ledger's Verdicts section from it by hand.

On the device, the draft lives in `localStorage` under
`ballot:<ballotId>:draft`, and the API URL and token under `ballot:api`, shared
by every ballot. A 401 forgets the token, so the next Submit asks for it again.
