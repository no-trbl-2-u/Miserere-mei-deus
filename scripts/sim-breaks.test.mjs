// scripts/sim-breaks.test.mjs — tests for the sim breaks filer (phase SM2d).
//
// Part of the root `npm test` suite. `gh` is stubbed: nothing here touches GitHub.
//
//   node --test scripts/sim-breaks.test.mjs

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MAX_NEW_ISSUES, bodyOf, fileBreaks, main, parseArgs, readBreaks, replayCommand, titleOf } from './sim-breaks.mjs'

const sink = () => {
  const s = { text: '', write: (chunk) => { s.text += chunk } }
  return s
}

function brk(kind = 'stuck', node = 'bw-t3', persona = 'rusher', seed = 4) {
  return {
    key: `${persona}:breakwater/${node}:${kind}`,
    kind,
    persona,
    characterId: 'the-chosen',
    seed,
    build: 'abc123',
    message: 'run stuck at breakwater/bw-t3',
    state: {
      map: 'breakwater', node, step: 12, screen: 'map', level: 3, vitae: 40, maxVitae: 60, deckSize: 14,
      quests: [{ name: 'the lighthouse', next: 'reach bw-l5 0/1' }],
      lastEvents: ['node-entered nodeId=bw-t3'],
    },
  }
}

const lines = (...bs) => bs.map((b) => JSON.stringify(b)).join('\n') + '\n'

/** A gh stub over a list of existing issues; records every call. */
function stubGh(issues = [], { failOn = null } = {}) {
  const calls = []
  const gh = (args) => {
    calls.push(args)
    const url = args.find((a) => a.startsWith('repos/')) ?? ''
    if (failOn && url.includes(failOn)) return { status: 1, stdout: '', stderr: 'HTTP 403' }
    if (url.includes('/issues?labels=sim-break')) return { status: 0, stdout: JSON.stringify(issues), stderr: '' }
    if (url.includes('/labels/')) return { status: 0, stdout: '{}', stderr: '' }
    return { status: 0, stdout: '{}', stderr: '' }
  }
  return { gh, calls }
}

const posts = (calls) => calls.filter((c) => c.includes('POST') && c.some((a) => a.endsWith('/issues')))
const issue = (b, state, extra = {}) => ({ number: 7, state, body: bodyOf(b), ...extra })

test('parseArgs reads the file, the repo, the cap and the dry run', () => {
  assert.deepEqual(parseArgs(['--file', 'b.jsonl']), { file: 'b.jsonl', repo: null, max: MAX_NEW_ISSUES, dryRun: false, help: false })
  assert.deepEqual(parseArgs(['--file=b', '--repo=o/r', '--max=2', '--dry-run']), { file: 'b', repo: 'o/r', max: 2, dryRun: true, help: false })
  assert.throws(() => parseArgs(['--nope']), /unknown argument/)
  assert.throws(() => parseArgs(['--max', 'x']), /non-negative/)
})

test('readBreaks keeps one line per key, the first seed that hit it', () => {
  const read = readBreaks(lines(brk('stuck', 'bw-t3', 'rusher', 1), brk('stuck', 'bw-t3', 'rusher', 2), brk('crash')))
  assert.equal(read.length, 2)
  assert.equal(read[0].seed, 1)
  assert.throws(() => readBreaks('{"a":1}\n'), /not a break line/)
})

test('the title, the hidden key and the replay command', () => {
  const b = brk('quest-unfinishable', 'bw-l5', 'explorer', 9)
  assert.equal(titleOf(b), 'sim break: quest-unfinishable at breakwater/bw-l5 (explorer)')
  assert.equal(replayCommand(b), 'npm run sim:run -- --policy explorer --runs 1 --seed 9')
  const body = bodyOf(b)
  assert.match(body, /<!-- sim-break-key: explorer:breakwater\/bw-l5:quest-unfinishable -->/)
  assert.match(body, /seed: 9/)
  assert.match(body, /build: abc123/)
  assert.match(body, /npm run sim:run -- --policy explorer --runs 1 --seed 9/)
  assert.match(body, /the lighthouse \(next: reach bw-l5 0\/1\)/)
})

test('a new key files one issue labelled bug and sim-break, never a triage or loop label', () => {
  const { gh, calls } = stubGh()
  const res = fileBreaks([brk()], 'o/r', { gh })
  assert.deepEqual(res.filed, ['rusher:breakwater/bw-t3:stuck'])
  const [post] = posts(calls)
  assert.ok(post.includes('title=sim break: stuck at breakwater/bw-t3 (rusher)'))
  assert.ok(post.includes('labels[]=bug') && post.includes('labels[]=sim-break'))
  assert.ok(!post.some((a) => /triage:|loop:opened/.test(a)))
})

test('creates the labels when they are missing', () => {
  const calls = []
  const gh = (args) => {
    calls.push(args)
    const url = args.find((a) => a.startsWith('repos/')) ?? ''
    if (url.includes('/issues?')) return { status: 0, stdout: '[]', stderr: '' }
    if (url.includes('/labels/')) return { status: 1, stdout: '', stderr: 'HTTP 404' }
    return { status: 0, stdout: '{}', stderr: '' }
  }
  fileBreaks([brk()], 'o/r', { gh })
  const made = calls.filter((c) => c.includes('POST') && c.some((a) => a.endsWith('/labels')))
  assert.equal(made.length, 2)
})

test('a key with an open issue files nothing', () => {
  const b = brk()
  const { gh, calls } = stubGh([issue(b, 'open')])
  const res = fileBreaks([b], 'o/r', { gh })
  assert.deepEqual(res.open, [b.key])
  assert.equal(posts(calls).length, 0)
})

test('a key closed as completed is reopened with a comment naming the new seed and build', () => {
  const b = brk('stuck', 'bw-t3', 'rusher', 31)
  const { gh, calls } = stubGh([issue(b, 'closed', { state_reason: 'completed' })])
  const res = fileBreaks([b], 'o/r', { gh })
  assert.deepEqual(res.reopened, [b.key])
  const comment = calls.find((c) => c.some((a) => a.endsWith('/issues/7/comments')))
  assert.ok(comment.some((a) => a.includes('seed 31') && a.includes('abc123')))
  assert.ok(calls.some((c) => c.includes('PATCH') && c.includes('state=open')))
  assert.equal(posts(calls).length, 0)
})

test('a key closed as not planned stays closed', () => {
  const b = brk()
  const { gh, calls } = stubGh([issue(b, 'closed', { state_reason: 'not_planned' })])
  const res = fileBreaks([b], 'o/r', { gh })
  assert.deepEqual(res.left, [b.key])
  assert.equal(calls.filter((c) => c.includes('PATCH') || c.includes('POST')).length, 0)
})

test('pull requests and unmarked issues never count as a key\'s issue', () => {
  const b = brk()
  const { gh } = stubGh([{ number: 3, state: 'open', body: bodyOf(b), pull_request: {} }, { number: 4, state: 'open', body: 'no marker' }])
  assert.deepEqual(fileBreaks([b], 'o/r', { gh }).filed, [b.key])
})

test('files at most the cap in new issues and lists the rest', () => {
  const many = Array.from({ length: 13 }, (_, i) => brk('stuck', `bw-n${i}`))
  const { gh, calls } = stubGh()
  const res = fileBreaks(many, 'o/r', { gh })
  assert.equal(res.filed.length, 10)
  assert.equal(res.deferred.length, 3)
  assert.equal(posts(calls).length, 10)
})

test('a dry run sends nothing', () => {
  const { gh, calls } = stubGh()
  const res = fileBreaks([brk()], 'o/r', { gh, dryRun: true })
  assert.equal(res.filed.length, 1)
  assert.equal(calls.filter((c) => c.includes('POST')).length, 0)
})

test('main files from a file, says so when there are none, and exits 1 only on a refused call', () => {
  const out = sink()
  const err = sink()
  const { gh } = stubGh()
  assert.equal(main(['--file', 'b'], { stdout: out, stderr: err, gh, env: { GITHUB_REPOSITORY: 'o/r' }, exists: () => true, read: () => lines(brk()) }), 0)
  assert.match(out.text, /1 filed, 0 reopened/)

  const none = sink()
  assert.equal(main(['--file', 'b'], { stdout: none, stderr: err, gh, env: { GITHUB_REPOSITORY: 'o/r' }, exists: () => false }), 0)
  assert.match(none.text, /no breaks to file/)

  const refused = stubGh([], { failOn: '/issues?labels' })
  const e2 = sink()
  assert.equal(main(['--file', 'b'], { stdout: sink(), stderr: e2, gh: refused.gh, env: { GITHUB_REPOSITORY: 'o/r' }, exists: () => true, read: () => lines(brk()) }), 1)
  assert.match(e2.text, /listing issues failed/)

  assert.equal(main([], { stdout: sink(), stderr: err, env: {} }), 2)
  assert.equal(main(['--file', 'b'], { stdout: sink(), stderr: err, env: {} }), 2)
})
