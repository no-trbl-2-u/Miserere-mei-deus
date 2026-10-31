// scripts/lib/feature-map-drive.mjs
//
// The pass/fail rule of the reachability drive (phase FM1d,
// `scripts/feature-map-e2e.mjs`), kept apart from the browser so
// `scripts/feature-map-drive.test.mjs` pins it against fake visit lists.
//
// Input is `docs/feature-map/features.json` (phases FM1a and FM1b). The drive
// never works out reachability itself: it reads each route's
// `reachable.value` and refuses a map that does not carry one.
//
// The rule (brief A10): every non-dev route the map marks reachable must be
// reached; a reachable route not reached fails; a reached path the map has no
// route for fails, and so does a route the map marks unreachable that the
// drive reached by play. A11: every flow edge is listed crossed or uncrossed,
// and an uncrossed edge is never a failure.

import { readFileSync } from 'node:fs'

/** The id of the entry route. */
export const ENTRY_ROUTE = 'route:index'

/** A map that breaks the input contract. The drive exits 2 on one. */
export class FeatureMapContractError extends Error {
    constructor(message) {
        super(message)
        this.name = 'FeatureMapContractError'
    }
}

/**
 * Checks the input contract and returns the map. Throws a
 * `FeatureMapContractError` naming what is missing.
 * @example validateFeatureMap({ version: 1, features: [], edges: [] }) // the map
 */
export function validateFeatureMap(map) {
    if (!map || typeof map !== 'object') throw new FeatureMapContractError('features.json is not an object')
    if (map.version !== 1) throw new FeatureMapContractError(`features.json version is ${map.version}, the drive reads version 1`)
    if (!Array.isArray(map.features)) throw new FeatureMapContractError('features.json has no features array')
    if (!Array.isArray(map.edges)) throw new FeatureMapContractError('features.json has no edges array')
    const routes = map.features.filter((f) => f.kind === 'route')
    const bare = routes.filter((f) => typeof f.reachable?.value !== 'boolean')
    if (bare.length) {
        throw new FeatureMapContractError(
            `${bare.length} of ${routes.length} routes carry no \`reachable.value\` (first: ${bare[0].id}). `
            + 'The evidence pass (phase FM1b) writes it; this drive never computes reachability itself. '
            + 'Regenerate the map with `node scripts/feature-map.mjs` once that pass has landed.',
        )
    }
    return map
}

/** Reads and validates a features.json file. */
export function loadFeatureMap(path) {
    let text
    try {
        text = readFileSync(path, 'utf8')
    } catch (err) {
        throw new FeatureMapContractError(`cannot read ${path}: ${err.message}`)
    }
    let map
    try {
        map = JSON.parse(text)
    } catch (err) {
        throw new FeatureMapContractError(`${path} is not JSON: ${err.message}`)
    }
    return validateFeatureMap(map)
}

/**
 * Routes whose web URL differs from their file path: the SETTINGS tab is served
 * at `/settings-tab` (see `lib/platform/router.ts`) so `/settings` stays the main
 * menu's full-screen route.
 */
const URL_OVERRIDES = { 'route:(tabs)/settings': '/settings-tab' }

/**
 * The URL path a route id is served at on the web build: route groups such
 * as `(tabs)` do not appear in the URL, and `index` is the root.
 * @example routePathForId('route:(tabs)/deck') // '/deck'
 * @example routePathForId('route:index') // '/'
 */
export function routePathForId(id) {
    if (URL_OVERRIDES[id]) return URL_OVERRIDES[id]
    const rest = id.replace(/^route:/, '')
    const segments = rest.split('/').filter((s) => s && !/^\(.*\)$/.test(s) && s !== 'index')
    return `/${segments.join('/')}`
}

/**
 * Normalises a browser pathname: no trailing slash except the root, no
 * trailing `/index`, no `.html`.
 * @example normalisePath('/deck/') // '/deck'
 */
export function normalisePath(pathname) {
    let p = pathname.replace(/\.html$/, '').replace(/\/index$/, '')
    if (p.length > 1) p = p.replace(/\/+$/, '')
    return p || '/'
}

/**
 * A lookup from URL path to the map's route feature (routes and dev routes).
 * @example routeIndex(map).get('/deck') // { id: 'route:(tabs)/deck', ... }
 */
export function routeIndex(map) {
    const index = new Map()
    for (const f of map.features) {
        if (f.kind === 'route' || f.kind === 'dev-route') index.set(routePathForId(f.id), f)
    }
    return index
}

/** The non-dev routes the drive must reach: those the map marks reachable. */
export function requiredRoutes(map) {
    return map.features.filter((f) => f.kind === 'route' && f.reachable.value === true).map((f) => f.id).sort()
}

/**
 * Judges a drive. `visits` is every path the drive saw, each with `via`
 * (`'play'` when reached through the game as a player does, `'seam'` when a
 * dev seam provoked it).
 *
 * Returns `{ ok, reached, missing, offMap, unexpected, seamOnly, failures }`:
 * - `missing`: reachable routes never reached (fails);
 * - `offMap`: paths with no route on the map (fails);
 * - `unexpected`: routes the map marks unreachable that play reached (fails);
 * - `seamOnly`: reached routes no play leg reached (reported, not failed);
 * - `reached`: route ids reached, any via, sorted.
 */
export function judgeVisits(map, visits) {
    const index = routeIndex(map)
    const reachedBy = new Map()
    const offMap = new Set()
    for (const { path, via } of visits) {
        const feature = index.get(normalisePath(path))
        if (!feature) {
            offMap.add(normalisePath(path))
            continue
        }
        if (!reachedBy.has(feature.id)) reachedBy.set(feature.id, new Set())
        reachedBy.get(feature.id).add(via)
    }
    const byId = new Map(map.features.map((f) => [f.id, f]))
    const missing = requiredRoutes(map).filter((id) => !reachedBy.has(id))
    const unexpected = []
    const seamOnly = []
    for (const [id, vias] of reachedBy) {
        const f = byId.get(id)
        if (f.kind !== 'route') continue
        if (f.reachable.value === false && vias.has('play')) unexpected.push(id)
        if (!vias.has('play')) seamOnly.push(id)
    }
    const failures = [
        ...missing.map((id) => `reachable route not reached: ${id}`),
        ...[...offMap].sort().map((p) => `reached a path the map has no route for: ${p}`),
        ...unexpected.sort().map((id) => `reached by play a route the map marks unreachable: ${id}`),
    ]
    return {
        ok: failures.length === 0,
        reached: [...reachedBy.keys()].sort(),
        missing,
        offMap: [...offMap].sort(),
        unexpected: unexpected.sort(),
        seamOnly: seamOnly.sort(),
        failures,
    }
}

/**
 * Splits the map's flow edges into crossed and uncrossed. `sessions` is one
 * ordered path list per browser context; consecutive distinct routes in a
 * session are a crossing. Edges are reported once per `from -> to` pair,
 * with every file that declares it.
 * @example crossEdges(map, [['/', '/saves']]).crossed // [{ from: 'route:index', to: 'route:saves', files: [...] }]
 */
export function crossEdges(map, sessions) {
    const index = routeIndex(map)
    const steps = new Set()
    for (const paths of sessions) {
        let prev = null
        for (const path of paths) {
            const f = index.get(normalisePath(path))
            if (!f) continue
            if (prev && prev !== f.id) steps.add(`${prev}\u0000${f.id}`)
            prev = f.id
        }
    }
    const pairs = new Map()
    for (const e of map.edges) {
        if (e.kind !== 'flow') continue
        const key = `${e.from}\u0000${e.to}`
        if (!pairs.has(key)) pairs.set(key, { from: e.from, to: e.to, files: [] })
        if (e.file && !pairs.get(key).files.includes(e.file)) pairs.get(key).files.push(e.file)
    }
    const all = [...pairs.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    const crossed = all.filter(([k]) => steps.has(k)).map(([, v]) => v)
    const uncrossed = all.filter(([k]) => !steps.has(k)).map(([, v]) => v)
    const unmapped = [...steps].filter((k) => !pairs.has(k)).sort().map((k) => {
        const [from, to] = k.split('\u0000')
        return { from, to }
    })
    return { crossed, uncrossed, unmapped }
}

/**
 * The report as markdown: the verdict, the routes, then every flow edge.
 * `legs` is `[{ name, via, ok, error? }]`.
 */
export function formatReport({ judgement, edges, legs = [] }) {
    const lines = []
    lines.push('## Feature map reachability drive')
    lines.push('')
    lines.push(judgement.ok && legs.every((l) => l.ok) ? '**PASS**' : '**FAIL**')
    lines.push('')
    if (legs.length) {
        lines.push('### Legs')
        for (const l of legs) lines.push(`- ${l.ok ? 'ok' : 'FAILED'} ${l.name} (${l.via})${l.error ? `: ${l.error}` : ''}`)
        lines.push('')
    }
    if (judgement.failures.length) {
        lines.push('### Failures')
        for (const f of judgement.failures) lines.push(`- ${f}`)
        lines.push('')
    }
    lines.push(`### Routes reached (${judgement.reached.length})`)
    for (const id of judgement.reached) lines.push(`- ${id}${judgement.seamOnly.includes(id) ? ' (dev seam or state fixture only, no play leg)' : ''}`)
    lines.push('')
    lines.push(`### Flow edges: ${edges.crossed.length} crossed, ${edges.uncrossed.length} uncrossed`)
    lines.push('')
    lines.push('Uncrossed edges are listed, never failed.')
    lines.push('')
    lines.push('Crossed:')
    for (const e of edges.crossed) lines.push(`- ${e.from} -> ${e.to}`)
    lines.push('')
    lines.push('Uncrossed:')
    for (const e of edges.uncrossed) lines.push(`- ${e.from} -> ${e.to}`)
    if (edges.unmapped.length) {
        lines.push('')
        lines.push('Steps the drive took that the map has no flow edge for (reported, not failed):')
        for (const e of edges.unmapped) lines.push(`- ${e.from} -> ${e.to}`)
    }
    return `${lines.join('\n')}\n`
}
