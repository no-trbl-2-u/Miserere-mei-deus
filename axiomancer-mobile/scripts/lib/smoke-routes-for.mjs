// scripts/lib/smoke-routes-for.mjs
//
// Which visual routes a local `verify:visual` shoots, from the paths the
// branch changed (phase VE1d). Fails closed: a path no rule names, a rule
// that says "all", or no `origin/main` to diff against selects every route.
// CI never reaches this: it passes `SMOKE_ROUTES=all`.
//
// Paths are repo-relative, as `git diff --name-only` prints them.

import { spawnSync } from 'node:child_process'

export const ALL = 'all'

const HAZARD = ['hazard-board', 'devpuzzle-list', 'devpuzzle-board', 'devpuzzle-outcome']
// The fixture shots boot on /exploration and wait for the screen its
// event gate pushes, so the exploration tab is under each of them.
const VIA_EXPLORATION = ['exploration', 'dialogue', 'village', 'cutscene', 'travel', 'hazard-board']

/**
 * Paths that cannot change a pixel: tests, prose, plans, tooling outside the
 * app. Checked before the route rules, so a test beside a screen selects
 * nothing rather than the screen.
 */
export const NO_RENDER = [
    /(^|\/)__(tests|snapshots)__\//,
    /\.(test|spec)\.[cm]?[jt]sx?$/,
    /\.md$/,
    /^(plan|telemetry|docs|devlog|vault|skills|\.github|\.claude)\//,
    /^scripts\//,
    /^axiomancer-mobile\/(design|docs|reference-images|specs)\//,
    /^axiomancer-mobile\/screenshots\/(current|diff)\//,
    /^axiomancer-mechanics\/(docs|specs)\//,
]

/**
 * Route rules, first match wins. A path under a route's own screen or
 * component folder selects that route (and any shot screen that imports from
 * it); app-wide code selects all. The gates (`CombatGate`, `HazardGate`, …)
 * mount in the root layout, so they are app-wide.
 */
export const RULES = [
    { test: /^axiomancer-mobile\/app\/index\.tsx$/, routes: ['root'] },
    { test: /^axiomancer-mobile\/components\/TitleScreen\.tsx$/, routes: ['root'] },
    { test: /^axiomancer-mobile\/app\/\(tabs\)\/character\//, routes: ['character'] },
    { test: /^axiomancer-mobile\/app\/\(tabs\)\/inventory\//, routes: ['inventory'] },
    { test: /^axiomancer-mobile\/components\/inventory\//, routes: ['inventory'] },
    { test: /^axiomancer-mobile\/app\/\(tabs\)\/exploration\//, routes: VIA_EXPLORATION },
    { test: /^axiomancer-mobile\/components\/exploration\//, routes: VIA_EXPLORATION },
    { test: /^axiomancer-mobile\/app\/\(tabs\)\/memoir\//, routes: ['memoir'] },
    { test: /^axiomancer-mobile\/app\/combat-encounter\//, routes: ['combat-encounter'] },
    { test: /^axiomancer-mobile\/components\/combat\//, routes: ['combat-encounter'] },
    { test: /^axiomancer-mobile\/app\/labyrinth\//, routes: ['labyrinth'] },
    { test: /^axiomancer-mobile\/components\/labyrinth\//, routes: ['labyrinth'] },
    { test: /^axiomancer-mobile\/app\/dialogue\//, routes: ['dialogue'] },
    { test: /^axiomancer-mobile\/app\/village\//, routes: ['village'] },
    { test: /^axiomancer-mobile\/app\/cutscene\//, routes: ['cutscene'] },
    { test: /^axiomancer-mobile\/app\/travel\//, routes: ['travel'] },
    { test: /^axiomancer-mobile\/app\/death-return\//, routes: ['death-return'] },
    { test: /^axiomancer-mobile\/app\/game-over\//, routes: ['game-over'] },
    { test: /^axiomancer-mobile\/app\/(hazard|devpuzzle)\//, routes: HAZARD },
    // The combat board draws two hazard glyphs.
    { test: /^axiomancer-mobile\/components\/hazard\//, routes: [...HAZARD, 'combat-encounter'] },
    // Everything else the bundle reads: the root layout, the tab bar,
    // shared components, state, lib, hooks, assets, config, the engine,
    // the lockfile and the capture scripts themselves.
    { test: /^axiomancer-mobile\//, routes: ALL },
    { test: /^axiomancer-mechanics\//, routes: ALL },
    { test: /^package(-lock)?\.json$/, routes: ALL },
]

const BASELINE_PNG = /^axiomancer-mobile\/screenshots\/baseline\/([^/]+)\.png$/

/**
 * The routes `paths` select, as a sorted list of names, or `ALL`.
 *
 * @param {string[]} paths repo-relative changed paths.
 * @param {string[]} routeNames every `ROUTES` name.
 * @returns {{ routes: string[] | 'all', reason: string }}
 * @example routesForPaths(['axiomancer-mobile/app/(tabs)/memoir/index.tsx'], names)
 *   // { routes: ['memoir'], reason: '1 changed path' }
 */
export function routesForPaths(paths, routeNames) {
    const picked = new Set()
    let considered = 0
    for (const path of new Set(paths.map((p) => p.trim()).filter(Boolean))) {
        const baseline = BASELINE_PNG.exec(path)
        if (baseline) {
            if (!routeNames.includes(baseline[1])) return { routes: ALL, reason: `${path} is not a known route's baseline` }
            picked.add(baseline[1])
            considered++
            continue
        }
        if (NO_RENDER.some((re) => re.test(path))) continue
        considered++
        const rule = RULES.find((r) => r.test.test(path))
        if (!rule) return { routes: ALL, reason: `${path} matches no rule` }
        if (rule.routes === ALL) return { routes: ALL, reason: `${path} can reach every route` }
        for (const name of rule.routes) picked.add(name)
    }
    if (picked.size === 0) return { routes: ALL, reason: 'no rendered path changed' }
    return { routes: [...picked].sort(), reason: `${considered} changed path${considered === 1 ? '' : 's'}` }
}

function git(repoRoot, args) {
    const r = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    return r.status === 0 ? r.stdout : null
}

/**
 * Paths changed since the merge-base with `origin/main`: committed, staged,
 * unstaged and untracked. `null` when there is no `origin/main` (a detached
 * CI checkout) or no git, which the caller reads as "all".
 */
export function changedPaths(repoRoot) {
    const base = git(repoRoot, ['merge-base', 'HEAD', 'origin/main'])
    if (base === null) return null
    const diff = git(repoRoot, ['diff', '--name-only', '--no-renames', '-z', base.trim()])
    const untracked = git(repoRoot, ['ls-files', '--others', '--exclude-standard', '-z'])
    if (diff === null || untracked === null) return null
    return [...diff.split('\0'), ...untracked.split('\0')].filter(Boolean)
}

/**
 * The routes a run shoots, in `ROUTES` order, and the log line saying why.
 * `SMOKE_ONLY` wins, then `SMOKE_ROUTES=all`, then the diff. Any other
 * `SMOKE_ROUTES` value throws, so a typo never narrows a run silently.
 *
 * @param {{ name: string }[]} routes every visual route.
 * @param {{ only?: string, routesEnv?: string, changed: () => string[] | null }} opts
 * @returns {{ names: string[] | null, log: string }} `names` null means all
 *   (or, under `SMOKE_ONLY`, whatever `selectRoutes` keeps).
 */
export function chooseRoutes(routes, { only, routesEnv, changed }) {
    if ((only ?? '').trim()) return { names: null, log: `routes: SMOKE_ONLY=${only}` }
    const mode = (routesEnv ?? '').trim()
    if (mode === ALL) return { names: null, log: 'routes: all (SMOKE_ROUTES=all)' }
    if (mode) throw new Error(`SMOKE_ROUTES must be "all" or unset, not "${mode}"`)
    const paths = changed()
    if (paths === null) return { names: null, log: 'routes from diff: all (no origin/main to diff against)' }
    const picked = routesForPaths(paths, routes.map((r) => r.name))
    if (picked.routes === ALL) return { names: null, log: `routes from diff: all (${picked.reason})` }
    const names = routes.map((r) => r.name).filter((n) => picked.routes.includes(n))
    return { names, log: `routes from diff: ${names.join(', ')} (${picked.reason}; SMOKE_ROUTES=all shoots every route)` }
}
