// Tests for plan/card-ledger/ballot-kit.js (phases BV1b, BV2b): the kit's pure parts,
// loaded in a vm the way a browser loads a classic script, plus the index and
// the ballots it lists.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, 'plan/card-ledger');

function loadKit() {
  const context = vm.createContext({});
  vm.runInContext(readFileSync(join(LEDGER, 'ballot-kit.js'), 'utf8'), context);
  return context.BallotKit;
}

const kit = loadKit();
// Values made in the vm carry its prototypes; compare them as plain JSON.
const plain = (v) => JSON.parse(JSON.stringify(v));

test('loads as a classic script without a DOM and exposes BallotKit', () => {
  assert.equal(typeof kit.mount, 'function');
  assert.equal(kit.API_KEY, 'ballot:api');
  assert.equal(kit.draftKey('elementalist-2026-10-22'), 'ballot:elementalist-2026-10-22:draft');
});

test('a draft round trips, dropping blank notes', () => {
  const draft = { kept: ['P-01a', 'E-03c'], notes: { 'P-01': ' TWEAK 3 ', 'P-02': '  ' }, general: 'more frost' };
  const back = plain(kit.restoreDraft(kit.serialiseDraft(draft)));
  assert.deepEqual(back, { kept: ['P-01a', 'E-03c'], notes: { 'P-01': 'TWEAK 3' }, general: 'more frost', savedAt: null });
});

test('a draft round trips its savedAt stamp', () => {
  const draft = { kept: ['P-01a'], notes: {}, general: '', savedAt: '2026-10-23T10:00:00.000Z' };
  const stored = JSON.parse(kit.serialiseDraft(draft));
  assert.equal(stored.savedAt, '2026-10-23T10:00:00.000Z');
  assert.equal(kit.restoreDraft(JSON.stringify(stored)).savedAt, '2026-10-23T10:00:00.000Z');
});

test('a draft from before BV2b, with no savedAt, still restores', () => {
  const old = JSON.stringify({ v: 1, kept: ['P-01a'], notes: { 'P-01': 'x' }, general: 'g' });
  assert.deepEqual(plain(kit.restoreDraft(old)), { kept: ['P-01a'], notes: { 'P-01': 'x' }, general: 'g', savedAt: null });
  assert.equal(kit.restoreDraft(JSON.stringify({ v: 1, kept: [], savedAt: 'not a time' })).savedAt, null);
});

test('an absent or unreadable draft restores as null', () => {
  assert.equal(kit.restoreDraft(null), null);
  assert.equal(kit.restoreDraft(''), null);
  assert.equal(kit.restoreDraft('{not json'), null);
  assert.equal(kit.restoreDraft(JSON.stringify({ v: 2, kept: [] })), null);
});

test('a draft with wrong-typed fields restores the readable parts', () => {
  const back = plain(kit.restoreDraft(JSON.stringify({ v: 1, kept: ['P-01a', 7], notes: { 'P-01': 'x', 'P-02': 3 }, general: 5 })));
  assert.deepEqual(back, { kept: ['P-01a'], notes: { 'P-01': 'x' }, general: '', savedAt: null });
});

test('the payload has the shape the Worker validates', () => {
  const payload = plain(kit.buildPayload({
    ballotId: 'elementalist-2026-10-22',
    verdictText: 'REHEARSAL BALLOT\nP-01: KEEP P-01a',
    kept: ['P-01a'],
    notes: { 'P-01': ' merge ', 'P-02': '' },
    general: '   ',
    client: 'Mozilla/5.0',
  }));
  assert.deepEqual(Object.keys(payload).sort(), ['ballotId', 'client', 'general', 'kept', 'notes', 'status', 'verdictText']);
  assert.deepEqual(payload, {
    ballotId: 'elementalist-2026-10-22',
    verdictText: 'REHEARSAL BALLOT\nP-01: KEEP P-01a',
    kept: ['P-01a'],
    notes: { 'P-01': 'merge' },
    general: null,
    client: 'Mozilla/5.0',
    status: 'final',
  });
  assert.equal(kit.buildPayload({ ballotId: 'x-1', verdictText: 't', client: 'a'.repeat(900) }).client.length, 500);
});

test('a Save payload carries status draft, a Submit payload final', () => {
  const base = { ballotId: 'x-1', verdictText: 't', kept: [], notes: {}, general: '' };
  assert.equal(kit.buildPayload({ ...base, status: 'draft' }).status, 'draft');
  assert.equal(kit.buildPayload({ ...base, status: 'final' }).status, 'final');
  assert.equal(kit.buildPayload(base).status, 'final');
  assert.equal(kit.buildPayload({ ...base, status: 'maybe' }).status, 'final');
});

test('the API URL is normalised, and junk is refused', () => {
  assert.equal(kit.normaliseApiUrl('https://miserere-api.example.dev/'), 'https://miserere-api.example.dev');
  assert.equal(kit.normaliseApiUrl('miserere-api.example.dev'), 'https://miserere-api.example.dev');
  assert.equal(kit.normaliseApiUrl('http://localhost:8787'), 'http://localhost:8787');
  assert.equal(kit.normaliseApiUrl(''), null);
  assert.equal(kit.normaliseApiUrl('https://x.dev/?token=1'), null);
});

test('each failure reads in words and keeps the draft', () => {
  const offline = kit.errorWords({ offline: true });
  assert.match(offline, /could not reach the server/i);
  assert.match(offline, /offline/);

  const unauthorised = kit.errorWords({ status: 401, body: { error: 'unauthorized' } });
  assert.match(unauthorised, /refused the token \(401\)/);

  const rejected = kit.errorWords({ status: 400, body: { error: 'invalid', reasons: ['kept[0]: expected a candidate id like P-01a', 'notes: expected an object'] } });
  assert.match(rejected, /rejected the verdict \(400\): kept\[0\]: expected a candidate id like P-01a; notes: expected an object/);

  const tooLarge = kit.errorWords({ status: 413, body: { error: 'body too large' } });
  assert.match(tooLarge, /too large .*\(413\)/);

  for (const words of [offline, unauthorised, rejected, tooLarge, kit.errorWords({ status: 500, body: {} })]) {
    assert.match(words, /Your draft is kept on this device\./);
  }
});

test('Save and load failures name what failed', () => {
  assert.match(kit.errorWords({ status: 400, body: { reasons: ['status: x'] } }, 'save'), /rejected the save \(400\): status: x/);
  assert.match(kit.errorWords({ status: 413, body: {} }, 'save'), /The save is too large .*\(413\): shorten the notes and save again/);
  assert.match(kit.errorWords({ status: 400, body: {} }, 'load'), /rejected the request \(400\)/);
  assert.match(kit.errorWords({ status: 401, body: {} }, 'save'), /press Save or Submit to type it again/);
  assert.match(kit.errorWords({ status: 413, body: {} }), /The verdict is too large .* submit again/);
});

function fakeResponse(status, body) {
  return { status, text: async () => (body === undefined ? '' : JSON.stringify(body)) };
}

test('submit posts the payload with the bearer token and reads the 201', async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push({ url, init }); return fakeResponse(201, { id: 7, receivedAt: '2026-10-23T10:00:00.000Z' }); };
  const payload = kit.buildPayload({ ballotId: 'elementalist-2026-10-22', verdictText: 'v', kept: [], notes: {}, general: '' });
  const result = plain(await kit.submitVerdict(fetchFn, { url: 'https://api.example.dev', token: 'secret' }, payload));
  assert.deepEqual(result, { ok: true, id: 7, receivedAt: '2026-10-23T10:00:00.000Z' });
  assert.equal(calls[0].url, 'https://api.example.dev/v1/ballot-verdicts');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), plain(payload));
  assert.ok(!calls[0].url.includes('secret'), 'the token is never in the URL');
});

test('submit turns offline, 401, 400 and 413 into words', async () => {
  const api = { url: 'https://api.example.dev', token: 't' };
  const offline = await kit.submitVerdict(async () => { throw new TypeError('Failed to fetch'); }, api, {});
  assert.equal(offline.ok, false);
  assert.equal(offline.status, 0);
  assert.match(offline.words, /could not reach the server/i);

  const thrown = await kit.submitVerdict(() => { throw new TypeError('sync'); }, api, {});
  assert.equal(thrown.status, 0);

  for (const [status, body, pattern] of [
    [401, { error: 'unauthorized' }, /401/],
    [400, { error: 'invalid ballot verdict', reasons: ['ballotId: expected 3 to 64 lowercase letters, digits or hyphens'] }, /400\): ballotId/],
    [413, { error: 'body too large' }, /413/],
  ]) {
    const result = await kit.submitVerdict(async () => fakeResponse(status, body), api, {});
    assert.equal(result.ok, false);
    assert.equal(result.status, status);
    assert.match(result.words, pattern);
  }

  const notJson = await kit.submitVerdict(async () => ({ status: 502, text: async () => '<html>' }), api, {});
  assert.match(notJson.words, /answered 502/);
});

function indexBallots() {
  const html = readFileSync(join(LEDGER, 'index.html'), 'utf8');
  const match = html.match(/const BALLOTS = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'index.html declares a BALLOTS array');
  return plain(vm.runInNewContext(match[1]));
}

test('the index lists every ballot file once, one entry per family', () => {
  const ballots = indexBallots();
  const files = readdirSync(LEDGER).filter((f) => f.endsWith('.ballot.html')).sort();
  assert.deepEqual(ballots.map((b) => b.file).sort(), files);
  assert.equal(new Set(ballots.map((b) => b.family)).size, ballots.length);
  assert.equal(new Set(ballots.map((b) => b.id)).size, ballots.length);
  for (const b of ballots) {
    assert.match(b.id, /^[a-z0-9-]{3,64}$/, `${b.id} is a valid ballotId`);
    assert.ok(['open', 'closed'].includes(b.status), `${b.id} status`);
    assert.match(b.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(existsSync(join(LEDGER, b.ledger)), `${b.ledger} exists`);
  }
});

test('an open ballot loads the kit and mounts with its index id; a closed one is untouched', () => {
  for (const b of indexBallots()) {
    const html = readFileSync(join(LEDGER, b.file), 'utf8');
    const loadsKit = html.includes('<script src="ballot-kit.js"></script>');
    if (b.status === 'open') {
      assert.ok(loadsKit, `${b.file} loads the kit`);
      assert.ok(html.includes(`const BALLOT_ID = '${b.id}';`), `${b.file} declares BALLOT_ID ${b.id}`);
      assert.match(html, /BallotKit\.mount\(\{ ballotId: BALLOT_ID/);
    } else {
      assert.ok(!loadsKit, `${b.file} is closed and does not load the kit`);
    }
  }
});

test('newest wins: the online row replaces the device draft only when it is newer', () => {
  const row = { receivedAt: '2026-10-23T12:00:00.000Z', status: 'draft' };
  assert.equal(kit.rowIsNewer(row, { savedAt: '2026-10-23T11:59:59.000Z' }), true);
  assert.equal(kit.rowIsNewer(row, { savedAt: '2026-10-23T12:00:01.000Z' }), false);
  assert.equal(kit.rowIsNewer(row, { savedAt: '2026-10-23T12:00:00.000Z' }), false, 'a tie keeps the device draft');
  assert.equal(kit.rowIsNewer(row, { savedAt: null }), true, 'a draft with no stamp counts as older');
  assert.equal(kit.rowIsNewer(row, null), true, 'no draft at all');
  assert.equal(kit.rowIsNewer(null, { savedAt: null }), false, 'no row');
  assert.equal(kit.rowIsNewer(null, null), false);
});

test('a row from the Worker applies as a draft stamped with its receivedAt', () => {
  const row = { id: 3, ballotId: 'x-1', kept: ['P-01a', 4], notes: { 'P-01': 'tweak', 'P-02': 7 }, general: null, status: 'draft', receivedAt: '2026-10-23T12:00:00.000Z' };
  assert.deepEqual(plain(kit.rowToDraft(row)), { kept: ['P-01a'], notes: { 'P-01': 'tweak' }, general: '', savedAt: '2026-10-23T12:00:00.000Z' });
});

test('the load and save words say what happened', () => {
  assert.equal(kit.formatTime('2026-10-23T12:05:09.000Z'), '2026-10-23 12:05 UTC');
  assert.equal(kit.loadedWords({ status: 'draft', receivedAt: '2026-10-23T12:05:09.000Z' }), 'Loaded your save from 2026-10-23 12:05 UTC (not submitted).');
  assert.equal(kit.loadedWords({ status: 'final', receivedAt: '2026-10-23T12:05:09.000Z' }), 'Loaded your submitted verdict from 2026-10-23 12:05 UTC.');
  assert.equal(kit.savedWords({ id: 9, receivedAt: '2026-10-23T12:05:09.000Z' }), 'Saved, not submitted: #9 at 2026-10-23 12:05 UTC.');
  assert.match(kit.loadFailedWords(true, null), /^Draft restored from this device\. The online save could not be reached: this device has no API token yet/);
  assert.match(kit.loadFailedWords(false, null), /^The online save could not be reached/);
  const offline = kit.loadFailedWords(true, { words: kit.errorWords({ offline: true }, 'load') });
  assert.match(offline, /could not be reached\. Could not reach the server/);
  assert.match(offline, /Your draft is kept on this device\./);
});

test('a Save posts status draft and reads the 201 like a Submit', async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push({ url, init }); return fakeResponse(201, { id: 8, receivedAt: '2026-10-23T12:00:00.000Z' }); };
  const api = { url: 'https://api.example.dev', token: 'secret' };
  const base = { ballotId: 'x-1', verdictText: 'v', kept: [], notes: {}, general: '' };
  const saved = plain(await kit.submitVerdict(fetchFn, api, kit.buildPayload({ ...base, status: 'draft' })));
  assert.deepEqual(saved, { ok: true, id: 8, receivedAt: '2026-10-23T12:00:00.000Z' });
  assert.equal(JSON.parse(calls[0].init.body).status, 'draft');
  await kit.submitVerdict(fetchFn, api, kit.buildPayload(base));
  assert.equal(JSON.parse(calls[1].init.body).status, 'final');

  const rejected = await kit.submitVerdict(async () => fakeResponse(400, { reasons: ['notes: expected an object'] }), api, kit.buildPayload({ ...base, status: 'draft' }));
  assert.match(rejected.words, /rejected the save \(400\)/);
});

test('the load fetches the newest row of either status for the ballot', async () => {
  const calls = [];
  const rows = [
    { id: 5, status: 'draft', receivedAt: '2026-10-23T12:00:00.000Z' },
    { id: 4, status: 'final', receivedAt: '2026-10-23T11:00:00.000Z' },
  ];
  const fetchFn = async (url, init) => { calls.push({ url, init }); return fakeResponse(200, { ballotVerdicts: rows }); };
  const api = { url: 'https://api.example.dev', token: 'secret' };
  const result = plain(await kit.fetchNewest(fetchFn, api, 'elementalist-2026-10-22'));
  assert.deepEqual(result, { ok: true, row: rows[0] });
  assert.equal(calls[0].url, 'https://api.example.dev/v1/ballot-verdicts?ballot=elementalist-2026-10-22');
  assert.ok(!calls[0].url.includes('status='), 'either status');
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer secret');
  assert.ok(!calls[0].url.includes('secret'), 'the token is never in the URL');

  const empty = plain(await kit.fetchNewest(async () => fakeResponse(200, { ballotVerdicts: [] }), api, 'x-1'));
  assert.deepEqual(empty, { ok: true, row: null });
});

test('a failed load turns offline, 401, 400 and 413 into words', async () => {
  const api = { url: 'https://api.example.dev', token: 't' };
  const offline = await kit.fetchNewest(async () => { throw new TypeError('Failed to fetch'); }, api, 'x-1');
  assert.equal(offline.ok, false);
  assert.equal(offline.status, 0);
  assert.match(offline.words, /could not reach the server/i);
  for (const [status, pattern] of [[401, /401/], [400, /400/], [413, /413/]]) {
    const result = await kit.fetchNewest(async () => fakeResponse(status, { error: 'x' }), api, 'x-1');
    assert.equal(result.ok, false);
    assert.equal(result.status, status);
    assert.match(result.words, pattern);
    assert.match(result.words, /Your draft is kept on this device\./);
  }
});

// Phase CL1: a ballot pitches no colour (T, 2026-10-26: "don't have it pitch a
// color for the cards. Instead, I pick the cards, then afterwards, it can split
// the colors up evenly"). Colours are proposed at the revisions step.

/** The CARDS array a ballot page declares. */
function ballotCards(html) {
  const match = html.match(/const CARDS = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'the ballot declares a CARDS array');
  return plain(vm.runInNewContext(match[1]));
}

/** Candidates that carry a colour of any kind: a `job`, `color` or `colour` field. */
function colouredCandidates(cards) {
  return cards.filter((c) => 'job' in c || 'color' in c || 'colour' in c).map((c) => c.id);
}

// Ballots opened before CL1 keep the faces T voted on (Blood Price predates
// colours; the Elementalist was voted before BV3).
const VOTED_BEFORE_CL1 = ['blood-price-2026-09-30', 'elementalist-2026-10-22'];

test('the kit carries no colour table, tally or pitch check', () => {
  for (const name of ['JOB_COLORS', 'COLOR_TINTS', 'colorOf', 'colorLabel', 'colorTally', 'tallyWords', 'pitchProblems']) {
    assert.equal(kit[name], undefined, `${name} is gone`);
  }
});

test('a candidate with a colour fails an open ballot', () => {
  const pitched = 'const CARDS = [\n  { id: \'P-01a\', type: \'Attack\', job: \'hit\' },\n  { id: \'P-01b\', color: \'mind\' },\n];';
  assert.deepEqual(colouredCandidates(ballotCards(pitched)), ['P-01a', 'P-01b']);
  for (const b of indexBallots()) {
    if (VOTED_BEFORE_CL1.includes(b.id)) continue;
    const html = readFileSync(join(LEDGER, b.file), 'utf8');
    assert.deepEqual(colouredCandidates(ballotCards(html)), [], `${b.file} pitches no colour`);
  }
});

test('the ballot shell pitches no colour and prints none', () => {
  const html = readFileSync(join(LEDGER, 'ballot-shell.html'), 'utf8');
  assert.deepEqual(colouredCandidates(ballotCards(html)), []);
  assert.ok(html.includes('<script src="ballot-kit.js"></script>'), 'the shell loads the kit');
  assert.match(html, /BallotKit\.mount\(\{ ballotId: BALLOT_ID/);
  assert.doesNotMatch(html, /BallotKit\.(colorOf|colorLabel|colorTally|tallyWords|COLOR_TINTS)/);
  assert.doesNotMatch(html, /data-tally=/, 'no tab keeps a colour tally');
  assert.match(html, /`KEEP \$\{keep\[0\]\}`/, 'the Generate text names the kept card alone');
});

test('the docs say colours come after the picks', () => {
  const doc = readFileSync(join(ROOT, 'docs/lane-creator.md'), 'utf8');
  assert.match(doc, /## Colours after the picks/);
  assert.doesNotMatch(doc, /## Pitching a colour/);
});
