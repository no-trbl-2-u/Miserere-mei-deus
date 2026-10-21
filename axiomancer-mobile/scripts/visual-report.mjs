#!/usr/bin/env node
// scripts/visual-report.mjs
//
// The visual smoke run's record: what `smoke-screens.mjs` writes to
// `screenshots/visual-summary.json` and `$GITHUB_STEP_SUMMARY`, and what the
// CI re-stamp job reads back from the run's artifact. Pure functions, no
// dependencies, so the re-stamp job runs it without `npm ci`.
//
//   node scripts/visual-report.mjs restamp <summary.json>   # routes to re-stamp, one per line
//   node scripts/visual-report.mjs comment <summary.json> <artifact-url> <sha>   # the PR comment
//
// Pinned by the root `scripts/visual-report.test.mjs`.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The marker the one PR comment carries, so a later run updates it. */
export const COMMENT_MARKER = '<!-- visual-smoke -->'

/**
 * The run's summary: one row per route shot, the counts, the phase timings.
 * A route that failed to load is `load-failed`; it has no capture to keep.
 *
 * @param {{ matched: object[], differing: object[], missing: object[], consoleErrors: object[], runs?: number, nondeterministic?: string[] }} result
 * @param {{ exportMs: number, exportReused: boolean, captureMs: number, compareMs: number }} timings
 * @param {number} exitCode the run's exit code.
 * @example buildVisualSummary({ matched: [{ route: 'root', ratio: 0 }], differing: [], missing: [], consoleErrors: [] }, t, 0).counts.matched // 1
 */
export function buildVisualSummary(result, timings, exitCode) {
    const nondeterministic = result.nondeterministic ?? []
    const routes = [
        ...result.matched.map((m) => ({ route: m.route, verdict: 'matched', ratio: m.ratio })),
        ...result.differing.map((d) => ({
            route: d.route,
            verdict: d.reason === 'load-failed' ? 'load-failed' : 'differing',
            ratio: d.ratio ?? null,
            reason: d.reason,
        })),
        ...result.missing.map((m) => ({ route: m.route, verdict: 'missing', ratio: null })),
    ].map((r) => ({ ...r, nondeterministic: nondeterministic.includes(r.route) }))
    return {
        exitCode,
        runs: result.runs ?? 1,
        counts: {
            matched: result.matched.length,
            differing: result.differing.length,
            missing: result.missing.length,
            nondeterministic: nondeterministic.length,
            consoleErrors: result.consoleErrors.length,
        },
        timings,
        routes,
    }
}

const pct = (ratio) => (ratio === null || ratio === undefined ? '-' : `${(ratio * 100).toFixed(3)}%`)
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`

/**
 * The step-summary markdown: the counts, the timings, the route table.
 * @example renderStepSummary(summary).startsWith('### Visual smoke') // true
 */
export function renderStepSummary(summary) {
    const { counts, timings } = summary
    const lines = [
        '### Visual smoke (report-only)',
        '',
        `exit ${summary.exitCode} · matched ${counts.matched} · differing ${counts.differing} · missing ${counts.missing}`
            + ` · nondeterministic ${counts.nondeterministic} (${summary.runs} runs per route) · console errors ${counts.consoleErrors}`,
        '',
        `export ${timings.exportReused ? 'stamp hit' : 'built'} ${secs(timings.exportMs)} · capture ${secs(timings.captureMs)} · compare ${secs(timings.compareMs)}`,
        '',
        '| route | verdict | ratio |',
        '| --- | --- | --- |',
    ]
    for (const r of summary.routes) {
        const verdict = r.nondeterministic ? `${r.verdict}, nondeterministic` : r.verdict
        lines.push(`| ${r.route} | ${verdict} | ${pct(r.ratio)} |`)
    }
    return lines.join('\n') + '\n'
}

/**
 * The routes whose new capture goes over the baseline: every differing or
 * missing route that has a capture and shot the same pixels on every run.
 * @example restampRoutes({ routes: [{ route: 'root', verdict: 'differing', nondeterministic: false }] }) // ['root']
 */
export function restampRoutes(summary) {
    return summary.routes
        .filter((r) => (r.verdict === 'differing' || r.verdict === 'missing') && !r.nondeterministic)
        .map((r) => r.route)
}

/**
 * The one PR comment: the re-stamped routes with their ratios, anything left
 * out and why, and the artifact link.
 * @example renderPrComment(summary, 'https://x', 'abc1234').startsWith(COMMENT_MARKER) // true
 */
export function renderPrComment(summary, artifactUrl, sha) {
    const restamped = new Set(restampRoutes(summary))
    const lines = [
        COMMENT_MARKER,
        '### Visual smoke: this PR changes pixels',
        '',
        `CI (the renderer of record) re-stamped ${restamped.size} route(s) from \`${sha.slice(0, 7)}\` in one \`visual: re-stamp\` commit on this branch.`
            + ' Read the image diff in **Files changed** before merging; merging approves the new baselines.',
        '',
        '| route | verdict | ratio |',
        '| --- | --- | --- |',
    ]
    for (const r of summary.routes.filter((r) => restamped.has(r.route))) {
        lines.push(`| ${r.route} | ${r.verdict} | ${pct(r.ratio)} |`)
    }
    const held = summary.routes.filter((r) => r.verdict !== 'matched' && !restamped.has(r.route))
    if (held.length > 0) {
        lines.push('', 'Not re-stamped:')
        for (const r of held) lines.push(`- ${r.route}: ${r.nondeterministic ? 'captures differ across runs' : r.verdict}`)
    }
    lines.push('', `Captures and diffs: [visual-smoke artifact](${artifactUrl}).`)
    return lines.join('\n') + '\n'
}

function main(argv) {
    const [cmd, file, ...rest] = argv
    const summary = JSON.parse(readFileSync(file, 'utf8'))
    if (cmd === 'restamp') {
        for (const route of restampRoutes(summary)) process.stdout.write(`${route}\n`)
    } else if (cmd === 'comment') {
        process.stdout.write(renderPrComment(summary, rest[0], rest[1]))
    } else {
        throw new Error(`unknown command '${cmd}' (restamp | comment)`)
    }
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
    try { main(process.argv.slice(2)) } catch (err) {
        console.error(`visual-report: ${err.message}`)
        process.exit(2)
    }
}
