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

// Phase BV3: every candidate pitched in a colour, derived from its job.

/** The CARDS array a ballot page declares. */
function ballotCards(html) {
  const match = html.match(/const CARDS = (\[[\s\S]*?\n\]);/);
  assert.ok(match, 'the ballot declares a CARDS array');
  return plain(vm.runInNewContext(match[1]));
}

// Ballots opened before BV3 keep their faces as they stand (BV3 A6): T's
// sittings are recorded against them, and their keepers are pitched colours
// at the revisions step instead.
const PRE_COLOUR_BALLOTS = ['elementalist-2026-10-22'];

/** The pitch problems the ballot test holds an index entry to: none for a closed or pre-colour ballot. */
function openBallotProblems(entry, html) {
  if (entry.status !== 'open' || PRE_COLOUR_BALLOTS.includes(entry.id)) return [];
  return kit.pitchProblems(ballotCards(html));
}

/** A fixture of coloured candidates: n red hits, n blue walls, n purple afflictions. */
function fixtureCards(red, blue, purple, extra = []) {
  const cards = [];
  const add = (count, job) => { for (let i = 0; i < count; i++) cards.push({ id: `P-${String(cards.length + 1).padStart(2, '0')}a`, job }); };
  add(red, 'hit');
  add(blue, 'wall');
  add(purple, 'affliction');
  return [...cards, ...extra];
}

test('one job-to-colour table, Blood Price\'s split, onto the four colours', () => {
  assert.deepEqual(plain(kit.JOB_COLORS), {
    hit: 'body', wall: 'mind', heal: 'mind', utility: 'mind', affliction: 'heart', colourless: 'any',
  });
  for (const color of Object.values(kit.JOB_COLORS)) {
    assert.ok(['body', 'mind', 'heart', 'any'].includes(color), `${color} is one of the four colours`);
  }
  assert.deepEqual(plain(kit.COLOR_TINTS), { body: 'red', mind: 'blue', heart: 'purple', any: 'grey' });
  assert.equal(kit.colorOf('hit'), 'body');
  assert.equal(kit.colorOf('heal'), 'mind');
  assert.equal(kit.colorOf('toString'), null, 'only the table\'s own jobs');
  assert.equal(kit.colorOf(undefined), null);
  assert.equal(kit.colorLabel('heart'), 'purple (heart)');
});

test('the docs print the same job-to-colour table', () => {
  const doc = readFileSync(join(ROOT, 'docs/lane-creator.md'), 'utf8');
  for (const [job, color] of Object.entries(kit.JOB_COLORS)) {
    const row = new RegExp(`\\|\\s*\`${job}\`\\s*\\|\\s*${kit.COLOR_TINTS[color]}\\s*\\|\\s*\`${color}\`\\s*\\|`);
    assert.match(doc, row, `docs/lane-creator.md names ${job} -> ${kit.COLOR_TINTS[color]} (${color})`);
  }
});

test('the kept tally counts per colour and reads in words', () => {
  const cards = [
    { id: 'P-01a', job: 'hit' }, { id: 'P-01b', job: 'wall' }, { id: 'P-01c', job: 'affliction' },
    { id: 'P-02a', job: 'hit' }, { id: 'P-02b', job: 'colourless' }, { id: 'P-02c', job: 'heal' },
  ];
  const tally = plain(kit.colorTally(cards, ['P-01a', 'P-02a', 'P-01c', 'P-02c']));
  assert.deepEqual(tally, { body: 2, mind: 1, heart: 1, any: 0 });
  assert.equal(kit.tallyWords(tally), '2 red · 1 blue · 1 purple');
  assert.equal(kit.tallyWords(kit.colorTally(cards, ['P-02b'])), '0 red · 0 blue · 0 purple · 1 grey');
  assert.equal(kit.tallyWords(kit.colorTally(cards, [])), '0 red · 0 blue · 0 purple');
});

test('a candidate with no job, or a job outside the table, fails the pitch', () => {
  const missing = kit.pitchProblems([...fixtureCards(30, 30, 30), { id: 'M-10c' }]);
  assert.deepEqual(plain(missing), ['M-10c has no job']);
  const unknown = kit.pitchProblems([...fixtureCards(30, 30, 30), { id: 'M-10c', job: 'hits' }]);
  assert.deepEqual(plain(unknown), ['M-10c has job "hits", which is not in JOB_COLORS']);
});

test('colours more than 10% off an equal share fail; within it they pass', () => {
  const lopsided = plain(kit.pitchProblems(fixtureCards(40, 25, 25)));
  assert.equal(lopsided.length, 3, 'red over, blue and purple under');
  assert.match(lopsided[0], /^red has 40 of 90 coloured candidates/);
  assert.deepEqual(plain(kit.pitchProblems(fixtureCards(30, 30, 30))), []);
  assert.deepEqual(plain(kit.pitchProblems(fixtureCards(33, 29, 28))), []);
  assert.deepEqual(plain(kit.pitchProblems(fixtureCards(27, 33, 30))), [], 'the band edges are in');
  assert.equal(kit.pitchProblems(fixtureCards(34, 28, 28)).length, 1, 'one past the edge is out');
});

test('colourless candidates are not counted in the balance', () => {
  const grey = Array.from({ length: 12 }, (_, i) => ({ id: `M-${String(i + 1).padStart(2, '0')}a`, job: 'colourless' }));
  assert.deepEqual(plain(kit.pitchProblems(fixtureCards(30, 30, 30, grey))), []);
});

test('an open ballot is held to the pitch; a closed or pre-colour one is not', () => {
  const unpitched = 'const CARDS = [\n  { id: \'P-01a\', type: \'Attack\' },\n];';
  assert.deepEqual(plain(openBallotProblems({ id: 'next-2026-11-01', status: 'open' }, unpitched)), ['P-01a has no job']);
  assert.deepEqual(openBallotProblems({ id: 'next-2026-11-01', status: 'closed' }, unpitched), []);
  assert.deepEqual(openBallotProblems({ id: 'elementalist-2026-10-22', status: 'open' }, unpitched), []);
  for (const b of indexBallots()) {
    const html = readFileSync(join(LEDGER, b.file), 'utf8');
    assert.deepEqual(plain(openBallotProblems(b, html)), [], `${b.file} pitches every candidate a colour`);
  }
});

test('the ballot shell pitches every sample by job and wires the colours', () => {
  const html = readFileSync(join(LEDGER, 'ballot-shell.html'), 'utf8');
  const cards = ballotCards(html);
  assert.deepEqual(plain(kit.pitchProblems(cards)), []);
  assert.ok(!/\bcolou?r\s*:/.test(html.match(/const CARDS = (\[[\s\S]*?\n\]);/)[1]), 'no candidate types its colour by hand');
  assert.ok(html.includes('<script src="ballot-kit.js"></script>'), 'the shell loads the kit');
  assert.match(html, /BallotKit\.mount\(\{ ballotId: BALLOT_ID/);
  assert.match(html, /BallotKit\.colorOf\(card\.job\)/, 'the face colour comes from the job');
  assert.match(html, /data-tally=/, 'each tab keeps a live colour tally');
  assert.match(html, /KEEP \$\{withColor/, 'the Generate text names each kept card\'s colour');
});
