// Tests for plan/card-ledger/ballot-kit.js (phase BV1b): the kit's pure parts,
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
  assert.deepEqual(back, { kept: ['P-01a', 'E-03c'], notes: { 'P-01': 'TWEAK 3' }, general: 'more frost' });
});

test('an absent or unreadable draft restores as null', () => {
  assert.equal(kit.restoreDraft(null), null);
  assert.equal(kit.restoreDraft(''), null);
  assert.equal(kit.restoreDraft('{not json'), null);
  assert.equal(kit.restoreDraft(JSON.stringify({ v: 2, kept: [] })), null);
});

test('a draft with wrong-typed fields restores the readable parts', () => {
  const back = plain(kit.restoreDraft(JSON.stringify({ v: 1, kept: ['P-01a', 7], notes: { 'P-01': 'x', 'P-02': 3 }, general: 5 })));
  assert.deepEqual(back, { kept: ['P-01a'], notes: { 'P-01': 'x' }, general: '' });
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
  assert.deepEqual(Object.keys(payload).sort(), ['ballotId', 'client', 'general', 'kept', 'notes', 'verdictText']);
  assert.deepEqual(payload, {
    ballotId: 'elementalist-2026-10-22',
    verdictText: 'REHEARSAL BALLOT\nP-01: KEEP P-01a',
    kept: ['P-01a'],
    notes: { 'P-01': 'merge' },
    general: null,
    client: 'Mozilla/5.0',
  });
  assert.equal(kit.buildPayload({ ballotId: 'x-1', verdictText: 't', client: 'a'.repeat(900) }).client.length, 500);
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
