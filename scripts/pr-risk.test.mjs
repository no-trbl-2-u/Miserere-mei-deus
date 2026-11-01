// scripts/pr-risk.test.mjs — pins the risk-tier rules of `scripts/pr-risk.mjs`
// (phase RV1a A2a, A3): one test per rule line of the Part 3 table in
// `docs/reports/pr-review-research.md`, six of the 60 replayed PRs with their
// recorded file lists, and the label edit `verify-gate` makes.
//
//   node --test scripts/pr-risk.test.mjs

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  addedDependencies, deriveRisk, isLowPath, planRiskLabel, raisedTier, renderReplay, spliceReplay,
  REPLAY_END, REPLAY_START,
} from './pr-risk.mjs'

const f = (path, additions = 1, deletions = 0) => ({ path, additions, deletions })
const tier = (files, labels = [], newDependencies = []) => deriveRisk({ files, labels, newDependencies }).tier

// --- risk:low ---------------------------------------------------------------

test('low: every path is plan, docs, telemetry, devlog entries, CLAUDE.md or AGENTS.md', () => {
  for (const p of ['plan/CRITIQUE.md', 'docs/game-model.md', 'telemetry/2026-10-16_x.md', 'devlog/entries/DIGEST_x.md', 'CLAUDE.md', 'AGENTS.md']) {
    assert.ok(isLowPath(p), p)
    assert.equal(tier([f(p)]), 'risk:low', p)
  }
  for (const p of ['devlog/index.html', 'scripts/x.mjs', 'axiomancer-mobile/a.ts', 'README.md', 'skills/march.md']) assert.ok(!isLowPath(p), p)
})

test('low has no size cap: a 4000-line plot PR labelled size:L stays low', () => {
  assert.equal(tier([f('plan/phases/phase_X.md', 4000)], ['plot', 'size:L', 'review:plan-only']), 'risk:low')
})

test('low drops to high on review:needs-T', () => {
  assert.equal(tier([f('plan/x.md')], ['review:needs-T']), 'risk:high')
})

test('one code path makes a plan diff medium', () => {
  assert.equal(tier([f('plan/x.md'), f('axiomancer-mobile/a.tsx')]), 'risk:medium')
})

// --- risk:high, one test per rule line ---------------------------------------

test('high: review:rules-change', () => {
  assert.equal(tier([f('axiomancer-mechanics/src/x.ts')], ['review:rules-change']), 'risk:high')
})

test('high: any path under .github/workflows/ or .claude/', () => {
  assert.equal(tier([f('.github/workflows/x.yml')]), 'risk:high')
  assert.equal(tier([f('.claude/hooks/telemetry.mjs')]), 'risk:high')
  assert.equal(tier([f('.github/ISSUE_TEMPLATE/x.md')]), 'risk:medium', 'only workflows under .github/')
})

test('high: scripts/pr-resolve.mjs or scripts/loop-issue.mjs', () => {
  assert.equal(tier([f('scripts/pr-resolve.mjs')]), 'risk:high')
  assert.equal(tier([f('scripts/loop-issue.mjs')]), 'risk:high')
  assert.equal(tier([f('scripts/check-lexicon.mjs'), f('scripts/check-lexicon.test.mjs')]), 'risk:medium')
})

test('high: more than 20 changed lines under skills/, 20 exactly is medium', () => {
  assert.equal(tier([f('skills/march.md', 10, 10)]), 'risk:medium')
  assert.equal(tier([f('skills/march.md', 11, 10)]), 'risk:high')
  assert.equal(tier([f('skills/march.md', 15, 0), f('skills/iterate.md', 6, 0)]), 'risk:high', 'summed across skills/')
})

test('high: size:L or more than 1000 changed lines outside the low path set', () => {
  assert.equal(tier([f('axiomancer-mobile/a.tsx')], ['size:L']), 'risk:high')
  assert.equal(tier([f('axiomancer-mobile/a.tsx', 600, 400)]), 'risk:medium', '1000 exactly')
  assert.equal(tier([f('axiomancer-mobile/a.tsx', 600, 401)]), 'risk:high')
  assert.equal(tier([f('axiomancer-mobile/a.tsx', 900), f('plan/x.md', 200)]), 'risk:high', 'plan lines count once code is in the diff')
})

test('high: a new dependency', () => {
  assert.equal(tier([f('package.json')], [], ['left-pad']), 'risk:high')
  assert.deepEqual(addedDependencies('{"dependencies":{"a":"1"}}', '{"dependencies":{"a":"2","b":"1"},"devDependencies":{"c":"1"}}'), ['b', 'devDependencies:c'])
  assert.deepEqual(addedDependencies('{"dependencies":{"a":"1"}}', '{"dependencies":{"a":"2"}}'), [], 'a version bump is not new')
  assert.deepEqual(addedDependencies(null, '{"dependencies":{"a":"1"}}'), ['a'], 'a new package.json')
  assert.deepEqual(addedDependencies('{"dependencies":{"a":"1"}}', null), [], 'a deleted package.json')
})

test('medium: code with no high rule; a risk:* label already on the PR is ignored', () => {
  assert.equal(tier([f('axiomancer-mechanics/src/x.ts'), f('axiomancer-mechanics/src/x.test.ts')], ['loop:pr', 'size:M', 'risk:high']), 'risk:medium')
  assert.equal(tier([]), 'risk:medium', 'an empty diff is not low')
})

test('every raise is named in the reasons', () => {
  const { reasons } = deriveRisk({ files: [f('.claude/x.json'), f('skills/a.md', 30)], labels: ['review:rules-change'] })
  assert.equal(reasons.length, 3)
  assert.match(reasons.join('\n'), /rules-change[\s\S]*\.claude\/x\.json[\s\S]*30 changed lines under skills/)
})

// --- six of the 60 replayed PRs ----------------------------------------------

const REPLAYED = [
  { pr: 567, tier: 'risk:low', labels: ['plot', 'size:multi-phase', 'area:combat', 'area:mobile', 'review:plan-only'],
    files: [f('plan/phases/phase_CR1_combat_route.md', 262), f('plan/steps/01_build_plan.md', 4)] },
  { pr: 535, tier: 'risk:medium', labels: ['loop:pr'],
    files: [f('axiomancer-mobile/components/combat/encounter/CombatFooterDock.tsx', 13, 4), f('axiomancer-mobile/components/combat/encounter/__tests__/CombatBoard.footer-dock.test.tsx', 17, 1), f('plan/CRITIQUE.md', 38, 209), f('plan/lessons.md', 1), f('skills/march.md', 6)] },
  { pr: 553, tier: 'risk:medium', labels: ['loop:pr', 'size:S', 'area:ui', 'area:mobile'],
    files: [f('axiomancer-mobile/app/(tabs)/exploration/index.tsx', 48, 31), f('axiomancer-mobile/components/event/EncounterModalOverlay.tsx', 10, 2), f('axiomancer-mobile/components/event/__tests__/EncounterModalOverlay.test.tsx', 80), f('axiomancer-mobile/state/e2e/map-under-combat-modes.engine.test.tsx', 101), f('axiomancer-mobile/state/e2e/map-under-combat.engine.test.tsx', 149), f('plan/lessons.md', 2), f('plan/steps/01_build_plan.md', 1, 1), f('telemetry/2026-10-14_875292b3.md', 18)] },
  { pr: 526, tier: 'risk:high', labels: ['loop:pr'],
    files: [f('.github/workflows/README.md', 1, 1), f('.github/workflows/pr-resolve.yml', 46, 13), f('plan/AUDIT.md', 2, 1), f('plan/PHASE_CANDIDATES.md', 9), f('plan/lessons.md', 1, 2), f('scripts/loop-pr.test.mjs', 13)] },
  { pr: 571, tier: 'risk:high', labels: ['loop:pr', 'size:M', 'area:combat', 'area:ui', 'area:loop', 'review:rules-change'],
    files: [f('axiomancer-mechanics/src/Character/experience.ts', 44, 9), f('axiomancer-mechanics/src/Game/game.migrate.ts', 47, 9), f('docs/game-model.md', 12, 5)] },
  { pr: 501, tier: 'risk:high', labels: [],
    files: [f('.github/workflows/march.yml', 4), f('.github/workflows/night.yml', 4), f('plan/bearings.md', 6), f('plan/revamp/loop.md', 3, 1)] },
]

for (const r of REPLAYED) {
  test(`replayed #${r.pr} is ${r.tier}`, () => assert.equal(tier(r.files, r.labels), r.tier))
}

// --- the label edit -----------------------------------------------------------

test('planRiskLabel sets the derived tier and drops a stale one', () => {
  assert.deepEqual(planRiskLabel({ derived: 'risk:medium', current: ['loop:pr'] }), { tier: 'risk:medium', add: ['risk:medium'], remove: [] })
  assert.deepEqual(planRiskLabel({ derived: 'risk:low', current: ['risk:high'] }), { tier: 'risk:low', add: ['risk:low'], remove: ['risk:high'] })
  assert.deepEqual(planRiskLabel({ derived: 'risk:low', current: ['risk:low'] }), { tier: 'risk:low', add: [], remove: [] })
})

test('planRiskLabel never lowers a reviewer raise, and the derived tier wins once it is higher', () => {
  assert.deepEqual(planRiskLabel({ derived: 'risk:medium', current: ['risk:high'], raised: 'risk:high' }), { tier: 'risk:high', add: [], remove: [] })
  assert.deepEqual(planRiskLabel({ derived: 'risk:high', current: ['risk:medium'], raised: 'risk:medium' }), { tier: 'risk:high', add: ['risk:high'], remove: ['risk:medium'] })
})

test('raisedTier reads the highest raise marker in the comments', () => {
  assert.equal(raisedTier(['no marker here']), null)
  assert.equal(raisedTier(['<!-- pr-review:raised risk:medium -->', 'x <!-- pr-review:raised risk:high --> y']), 'risk:high')
  assert.equal(raisedTier([null, undefined]), null)
})

// --- the replay block -----------------------------------------------------------

test('the replay block lists every tier and splices between its markers', () => {
  const block = renderReplay({ stamp: { commit: 'abc', date: '2026-10-16' }, before: 'T', rows: [{ number: 2, tier: 'risk:low', reasons: [] }, { number: 3, tier: 'risk:high', reasons: [] }] })
  assert.match(block, /\| `risk:low` \| 1 \| #2 \|/)
  assert.match(block, /\| `risk:medium` \| 0 \| none \|/)
  const report = '# R\n\n### Stage 0: gate\n'
  const once = spliceReplay(report, block)
  assert.ok(once.indexOf(REPLAY_START) < once.indexOf('### Stage 0:'))
  const twice = spliceReplay(once, block.replace('#2', '#9'))
  assert.equal(twice.split(REPLAY_END).length, 2, 'replaced, not appended')
  assert.match(twice, /#9/)
})
