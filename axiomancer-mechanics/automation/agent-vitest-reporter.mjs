/**
 * automation/agent-vitest-reporter.mjs — Phase 39 (+ Phase 40 diff).
 *
 * Custom Vitest reporter that emits two artefacts at the end of a run:
 *
 *   1. JSON file at `automation/last-verify-report.json`:
 *      - `failures: [{file, name, message, location}]` — flat list
 *        across every failed test (Phase 40).
 *      - `rollup`: totals, slowest5, plus `diff: { addedTests,
 *        removedTests, flippedToFail, flippedToPass,
 *        durationDeltaSlowest5 } | null` (Phase 40 — compares
 *        against the prior report on disk).
 *      - `files[].tests[]`: per-test details.
 *   2. Delimited markdown block on stdout (between `## Verify summary`
 *      and `## End summary`) listing totals, failed tests with
 *      `file:line — message`, slowest 5, and a "Changes since last
 *      run" section when the diff is non-empty.
 *
 * Wire via `npm run verify:agent` (which passes
 * `--reporter=./automation/agent-vitest-reporter.mjs` to `vitest run`).
 *
 * The default `npm run verify` script is NOT modified — this is an
 * additive surface so the deploy gate's expectations stay stable.
 *
 * Schema details and design decisions live in
 * `plan/phases/phase_39_agent_verify_report.md` and
 * `plan/phases/phase_40_prior_run_diff.md`.
 */

// @ts-check
//
// iterate (critique-16 path a) — `// @ts-check` enables IDE-time
// TypeScript checking on this `.mjs` file. The verify gate is
// unaffected because `tsconfig.json` `rootDir: ./src` excludes
// `automation/` from `tsc --noEmit`. JSDoc `@param`/`@returns`
// annotations on the helpers below give editors enough signal to
// catch typos and shape drift at edit time.
import fs from 'fs';
import path from 'path';
// iterate (Phase 39 self-critique → critique-16) —
// `experimental_getRunnerTask` exposes the underlying runner task
// object, which carries `location: { line, column }` when vitest is
// run with `includeTaskLocation: true` (set in vitest.config.ts).
// The `experimental_*` prefix means signature drift is possible.
// Loaded via lazy `await import()` so a Vitest minor that renames
// or removes the export degrades at runtime (location stays
// undefined) rather than crashing at module-load — a static import
// would throw `SyntaxError: missing export` before any test runs.

const DEFAULT_JSON_PATH = 'automation/last-verify-report.json';
const MARKDOWN_START = '## Verify summary';
const MARKDOWN_END = '## End summary';
const SLOWEST_LIMIT = 5;

export default class AgentVitestReporter {
    constructor(opts = {}) {
        this.jsonOutputPath = opts.jsonOutputPath ?? DEFAULT_JSON_PATH;
        this.markdownStream = opts.markdownStream ?? process.stdout;
        this.rootDir = opts.rootDir ?? process.cwd();
    }

    onInit(ctx) {
        if (ctx?.config?.root) this.rootDir = ctx.config.root;
    }

    async onTestRunEnd(testModules, unhandledErrors, reason) {
        await resolveGetRunnerTask();
        const report = this.buildReport(testModules ?? [], unhandledErrors ?? [], reason ?? 'passed');
        // Phase 40 — diff against the prior report BEFORE writing the new
        // one, otherwise we'd be diffing against our own freshly-written
        // output on the next run.
        const target = this.resolveOutputPath();
        const prior = await readPriorReport(target);
        report.rollup.diff = prior ? computeDiff(report, prior) : null;
        // iterate (Phase 39 self-critique) — precompute notable patterns so an
        // LLM consumer reading just the JSON doesn't have to derive them.
        report.rollup.callouts = computeCallouts(report);
        await this.writeJson(report, target);
        this.writeMarkdown(report);
    }

    resolveOutputPath() {
        return path.isAbsolute(this.jsonOutputPath)
            ? this.jsonOutputPath
            : path.join(this.rootDir, this.jsonOutputPath);
    }

    /**
     * Aggregate one Vitest run into the JSON report shape.
     *
     * @param {ReadonlyArray<*>} testModules - Vitest test-module objects emitted by `onTestRunEnd`.
     * @param {ReadonlyArray<*>} unhandledErrors - Errors not attributable to any test.
     * @param {string} reason - Run termination reason ('passed' / 'failed' / 'interrupted').
     * @returns {{
     *   rollup: {
     *     total: number, passed: number, failed: number, skipped: number,
     *     reason: string, unhandledErrors: number,
     *     slowest5: Array<{name: string, file: string, durationMs: number}>,
     *     slowestFailures: Array<{name: string, file: string, durationMs: number, status: string}>,
     *     diff: object | null,
     *     callouts: string[],
     *   },
     *   failures: Array<{file: string, name: string, message: string, diff?: *, actual?: *, expected?: *, location?: string}>,
     *   files: Array<{path: string, status: string, durationMs: number, tests: Array<*>}>,
     * }}
     */
    buildReport(testModules, unhandledErrors, reason) {
        const files = [];
        const allTests = [];
        const failures = [];
        let total = 0, passed = 0, failed = 0, skipped = 0;

        for (const mod of testModules) {
            const tests = [];
            const filePath = this.relativize(mod.moduleId);
            const cases = collectTestCases(mod);
            for (const testCase of cases) {
                const result = testCase.result();
                const diag = safeDiagnostic(testCase);
                const status = result?.state ?? 'pending';
                const sourceLocation = locationFromRunner(testCase, filePath);
                const entry = {
                    name: testCase.fullName,
                    status,
                    durationMs: Math.round(diag?.duration ?? 0),
                    location: sourceLocation,
                };
                if (status === 'failed' && Array.isArray(result?.errors) && result.errors.length > 0) {
                    const err = result.errors[0];
                    entry.failure = {
                        message: err?.message ?? '(no message)',
                        diff: err?.diff,
                        actual: err?.actual,
                        expected: err?.expected,
                        location: locationFromError(err),
                    };
                    // Phase 40 — flat top-level failures[] so consumers don't
                    // have to walk files[].tests[] to answer "what failed?".
                    // iterate (critique-16) — carry diff/actual/expected
                    // through so the flat list is self-sufficient for the
                    // snapshot-diff use case (no cross-reference back to
                    // files[].tests[] required).
                    failures.push({
                        file:     filePath,
                        name:     testCase.fullName,
                        message:  entry.failure.message,
                        diff:     entry.failure.diff,
                        actual:   entry.failure.actual,
                        expected: entry.failure.expected,
                        location: entry.failure.location,
                    });
                }
                tests.push(entry);
                allTests.push({ ...entry, file: filePath });
                total += 1;
                if (status === 'passed') passed += 1;
                else if (status === 'failed') failed += 1;
                else if (status === 'skipped') skipped += 1;
            }
            const modDiag = safeDiagnostic(mod);
            files.push({
                path: filePath,
                status: moduleStatus(mod),
                durationMs: Math.round(modDiag?.duration ?? 0),
                tests,
            });
        }

        const slowest5 = [...allTests]
            .filter(t => t.status === 'passed')
            .sort((a, b) => b.durationMs - a.durationMs)
            .slice(0, SLOWEST_LIMIT)
            .map(t => ({ name: t.name, file: t.file, durationMs: t.durationMs }));

        // Phase 39 self-critique row (LOW, agent-ux / reporter): slow tests
        // that *failed* (often a timeout / hang) were invisible because
        // slowest5 filters to passed-only. Surface them as a parallel
        // top-5 — same shape, different filter, with status included so
        // consumers can tell which terminal state caused the slowness.
        const slowestFailures = [...allTests]
            .filter(t => t.status === 'failed' || t.status === 'skipped')
            .sort((a, b) => b.durationMs - a.durationMs)
            .slice(0, SLOWEST_LIMIT)
            .map(t => ({ name: t.name, file: t.file, durationMs: t.durationMs, status: t.status }));

        return {
            rollup: {
                total,
                passed,
                failed,
                skipped,
                reason,
                unhandledErrors: unhandledErrors.length,
                slowest5,
                slowestFailures,
                diff: null,
                callouts: [],
            },
            failures,
            files,
        };
    }

    relativize(absPath) {
        if (!absPath) return absPath;
        try {
            const rel = path.relative(this.rootDir, absPath);
            // Normalize to POSIX separators so the emitted test ids
            // (`src/X/e2e/x.engine.test.ts`) are stable across platforms —
            // `path.relative` yields backslashes on Windows, which would
            // otherwise leak `src\X\...` into the report and every consumer
            // (diff keys, prefixes, snapshots) that assumes `/`.
            return rel === '' ? absPath : rel.split(path.sep).join('/');
        } catch {
            return absPath;
        }
    }

    async writeJson(report, target) {
        const resolved = target ?? this.resolveOutputPath();
        await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
        await fs.promises.writeFile(resolved, JSON.stringify(report, null, 2) + '\n');
    }

    writeMarkdown(report) {
        const r = report.rollup;
        const lines = [];
        lines.push('');
        lines.push(MARKDOWN_START);
        lines.push('');
        lines.push(`- total: ${r.total}`);
        lines.push(`- passed: ${r.passed}`);
        lines.push(`- failed: ${r.failed}`);
        lines.push(`- skipped: ${r.skipped}`);
        if (r.unhandledErrors > 0) lines.push(`- unhandled errors: ${r.unhandledErrors}`);
        lines.push(`- reason: ${r.reason}`);

        if (r.failed > 0) {
            lines.push('');
            lines.push('### Failed tests');
            for (const file of report.files) {
                for (const t of file.tests) {
                    if (t.status !== 'failed') continue;
                    const loc = t.failure?.location ?? file.path;
                    const msg = t.failure?.message ?? '(no message)';
                    lines.push(`- ${loc} — ${t.name}: ${msg}`);
                }
            }
        }

        if (r.slowest5.length > 0) {
            lines.push('');
            lines.push('### Slowest 5 (passed)');
            for (const slow of r.slowest5) {
                lines.push(`- ${slow.durationMs.toFixed(0)}ms — ${slow.file}: ${slow.name}`);
            }
        }

        if (r.slowestFailures && r.slowestFailures.length > 0) {
            lines.push('');
            lines.push('### Slowest 5 (failed / skipped)');
            for (const slow of r.slowestFailures) {
                lines.push(`- ${slow.durationMs.toFixed(0)}ms (${slow.status}) — ${slow.file}: ${slow.name}`);
            }
        }

        if (r.callouts && r.callouts.length > 0) {
            lines.push('');
            lines.push('### Call-outs');
            for (const c of r.callouts) lines.push(`- ${c}`);
        }

        if (r.diff && diffHasContent(r.diff)) {
            lines.push('');
            lines.push('### Changes since last run');
            if (r.diff.addedTests.length > 0) {
                lines.push('');
                lines.push('#### Added tests');
                for (const key of r.diff.addedTests) lines.push(`- ${key}`);
            }
            if (r.diff.removedTests.length > 0) {
                lines.push('');
                lines.push('#### Removed tests');
                for (const key of r.diff.removedTests) lines.push(`- ${key}`);
            }
            if (r.diff.flippedToFail.length > 0) {
                lines.push('');
                lines.push('#### Flipped to fail');
                for (const f of r.diff.flippedToFail) lines.push(`- ${f.file}: ${f.name}`);
            }
            if (r.diff.flippedToPass.length > 0) {
                lines.push('');
                lines.push('#### Flipped to pass');
                for (const f of r.diff.flippedToPass) lines.push(`- ${f.file}: ${f.name}`);
            }
            if (r.diff.durationDeltaSlowest5.length > 0) {
                lines.push('');
                lines.push('#### Largest duration deltas');
                for (const d of r.diff.durationDeltaSlowest5) {
                    const sign = d.deltaMs >= 0 ? '+' : '';
                    lines.push(`- ${d.file}: ${d.name} — ${d.prevMs.toFixed(0)}ms → ${d.currMs.toFixed(0)}ms (Δ ${sign}${d.deltaMs.toFixed(0)}ms)`);
                }
            }
        }

        lines.push('');
        lines.push(MARKDOWN_END);
        lines.push('');
        this.markdownStream.write(lines.join('\n'));
    }
}

/**
 * Read the prior `last-verify-report.json` for run-to-run diffing.
 * Silent on ENOENT (fresh-repo); warns once on stderr otherwise.
 *
 * @param {string} absPath - Absolute path to the prior report.
 * @returns {Promise<object | null>} Parsed prior report, or `null` on missing / malformed / shape-mismatch.
 */
async function readPriorReport(absPath) {
    let raw;
    try {
        raw = await fs.promises.readFile(absPath, 'utf-8');
    } catch (err) {
        // ENOENT (fresh-repo / first-run) is silent — no warning.
        if (err && err.code === 'ENOENT') return null;
        process.stderr.write(`[agent-vitest-reporter] prior report ignored: read failed (${err?.message ?? err})\n`);
        return null;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch (err) {
        process.stderr.write(`[agent-vitest-reporter] prior report ignored: JSON parse failed (${err?.message ?? err})\n`);
        return null;
    }
    if (!parsed || typeof parsed.rollup !== 'object' || parsed.rollup === null || !Array.isArray(parsed.files)) {
        process.stderr.write(`[agent-vitest-reporter] prior report ignored: shape mismatch (missing rollup or files)\n`);
        return null;
    }
    return parsed;
}

/**
 * Build a `<file>::<name>` keyed map of every test in a report,
 * used by `computeDiff` for set-comparison across runs.
 *
 * @param {*} report - Either current or prior report.
 * @returns {Map<string, {file: string, name: string, status: string, durationMs: number}>}
 */
function indexTestsByKey(report) {
    const index = new Map();
    if (!Array.isArray(report?.files)) return index;
    for (const file of report.files) {
        if (!file || !Array.isArray(file.tests)) continue;
        for (const test of file.tests) {
            const key = `${file.path}::${test.name}`;
            index.set(key, { file: file.path, name: test.name, status: test.status, durationMs: test.durationMs ?? 0 });
        }
    }
    return index;
}

/**
 * Compare current run against the prior on-disk report.
 *
 * @param {*} current - The just-built current run report.
 * @param {*} prior - The prior report read from disk.
 * @returns {{
 *   addedTests: string[],
 *   removedTests: string[],
 *   flippedToFail: Array<{file: string, name: string, prevStatus: string, currStatus: string}>,
 *   flippedToPass: Array<{file: string, name: string, prevStatus: string, currStatus: string}>,
 *   durationDeltaSlowest5: Array<{file: string, name: string, prevMs: number, currMs: number, deltaMs: number}>,
 * }}
 */
function computeDiff(current, prior) {
    const currIndex = indexTestsByKey(current);
    const priorIndex = indexTestsByKey(prior);

    const addedTests = [];
    const removedTests = [];
    const flippedToFail = [];
    const flippedToPass = [];
    const deltas = [];

    for (const [key, curr] of currIndex) {
        const prev = priorIndex.get(key);
        if (!prev) { addedTests.push(key); continue; }
        if (prev.status === 'passed' && curr.status === 'failed') {
            flippedToFail.push({ file: curr.file, name: curr.name, prevStatus: prev.status, currStatus: curr.status });
        } else if (prev.status === 'failed' && curr.status === 'passed') {
            flippedToPass.push({ file: curr.file, name: curr.name, prevStatus: prev.status, currStatus: curr.status });
        }
        const deltaMs = curr.durationMs - prev.durationMs;
        deltas.push({
            file:    curr.file,
            name:    curr.name,
            prevMs:  prev.durationMs,
            currMs:  curr.durationMs,
            deltaMs,
        });
    }
    for (const key of priorIndex.keys()) {
        if (!currIndex.has(key)) removedTests.push(key);
    }

    const durationDeltaSlowest5 = deltas
        .sort((a, b) => Math.abs(b.deltaMs) - Math.abs(a.deltaMs) || b.currMs - a.currMs)
        .slice(0, SLOWEST_LIMIT);

    return { addedTests, removedTests, flippedToFail, flippedToPass, durationDeltaSlowest5 };
}

const SLOW_TEST_THRESHOLD_MS = 50;

/**
 * Precompute notable-pattern strings the consumer would otherwise have
 * to derive from `rollup.diff` / `failures` / `files`.
 *
 * @param {*} report - The fully-built current report (after `diff` is set).
 * @returns {string[]} Human-readable call-out lines (e.g. "3 tests > 50ms").
 */
function computeCallouts(report) {
    const out = [];
    const r = report.rollup;

    if (r.failed > 0) {
        const topFile = topFailureFile(report.failures);
        out.push(topFile
            ? `${r.failed} test${r.failed === 1 ? '' : 's'} failed (top file: ${topFile})`
            : `${r.failed} test${r.failed === 1 ? '' : 's'} failed`);
    }
    if (r.unhandledErrors > 0) {
        out.push(`${r.unhandledErrors} unhandled error${r.unhandledErrors === 1 ? '' : 's'}`);
    }
    if (r.skipped > 0) {
        out.push(`${r.skipped} test${r.skipped === 1 ? '' : 's'} skipped`);
    }
    const slowCount = countSlowTests(report.files, SLOW_TEST_THRESHOLD_MS);
    if (slowCount > 0) {
        out.push(`${slowCount} test${slowCount === 1 ? '' : 's'} exceeded ${SLOW_TEST_THRESHOLD_MS}ms`);
    }

    // Phase 40 diff-aware callouts (only when a prior report was readable).
    if (r.diff) {
        if (r.diff.addedTests.length > 0) {
            out.push(`${r.diff.addedTests.length} test${r.diff.addedTests.length === 1 ? '' : 's'} added since last report`);
        }
        if (r.diff.removedTests.length > 0) {
            out.push(`${r.diff.removedTests.length} test${r.diff.removedTests.length === 1 ? '' : 's'} removed since last report`);
        }
        if (r.diff.flippedToFail.length > 0) {
            out.push(`${r.diff.flippedToFail.length} test${r.diff.flippedToFail.length === 1 ? '' : 's'} flipped pass → fail`);
        }
        if (r.diff.flippedToPass.length > 0) {
            out.push(`${r.diff.flippedToPass.length} test${r.diff.flippedToPass.length === 1 ? '' : 's'} flipped fail → pass`);
        }
    }

    return out;
}

/**
 * Pick the file that contributed the most failures (for the
 * "1 test failed in src/Combat" call-out).
 *
 * @param {Array<{file: string}>} failures - The top-level flat failures list.
 * @returns {string | null} Path of the file with the most failures, or `null`.
 */
function topFailureFile(failures) {
    if (!Array.isArray(failures) || failures.length === 0) return null;
    const counts = new Map();
    for (const f of failures) counts.set(f.file, (counts.get(f.file) ?? 0) + 1);
    let topFile = null;
    let topCount = 0;
    for (const [file, count] of counts) {
        if (count > topCount) { topFile = file; topCount = count; }
    }
    return topFile;
}

/**
 * Count tests across all files whose `durationMs` exceeds `thresholdMs`.
 *
 * @param {Array<{tests?: Array<{durationMs?: number}>}>} files - `files[]` block from the report.
 * @param {number} thresholdMs - Inclusive lower bound (e.g. `50`).
 * @returns {number} Number of tests above the threshold.
 */
function countSlowTests(files, thresholdMs) {
    let n = 0;
    if (!Array.isArray(files)) return n;
    for (const file of files) {
        if (!file || !Array.isArray(file.tests)) continue;
        for (const t of file.tests) if ((t.durationMs ?? 0) > thresholdMs) n += 1;
    }
    return n;
}

/**
 * Returns true if any of the diff arrays carries at least one entry.
 *
 * @param {{addedTests: Array<*>, removedTests: Array<*>, flippedToFail: Array<*>, flippedToPass: Array<*>, durationDeltaSlowest5: Array<*>}} diff
 * @returns {boolean}
 */
function diffHasContent(diff) {
    return diff.addedTests.length > 0
        || diff.removedTests.length > 0
        || diff.flippedToFail.length > 0
        || diff.flippedToPass.length > 0
        || diff.durationDeltaSlowest5.length > 0;
}

/**
 * Walk a Vitest `TestModule`'s child collection and flatten to test cases.
 *
 * @param {*} testModule - A Vitest TestModule (carries `.children.allTests()`).
 * @returns {Array<*>} Flat list of TestCase objects.
 */
function collectTestCases(testModule) {
    const out = [];
    const collection = testModule?.children;
    if (!collection || typeof collection.allTests !== 'function') return out;
    for (const tc of collection.allTests()) out.push(tc);
    return out;
}

/**
 * Defensive wrapper around the Vitest `target.diagnostic()` method.
 *
 * @param {*} target - Either a `TestCase` or a `TestModule`.
 * @returns {*} The diagnostic object, or `undefined` on missing / throw.
 */
function safeDiagnostic(target) {
    if (!target || typeof target.diagnostic !== 'function') return undefined;
    try { return target.diagnostic(); } catch { return undefined; }
}

/**
 * Resolve a Vitest `TestModule`'s terminal status, with fallback for
 * older Vitest APIs that expose `mod.ok()` instead of `mod.state()`.
 *
 * @param {*} mod - The TestModule object.
 * @returns {string} `'passed'` / `'failed'` / etc.
 */
function moduleStatus(mod) {
    if (typeof mod?.state === 'function') {
        try { return mod.state(); } catch { /* fall through */ }
    }
    return typeof mod?.ok === 'function' && mod.ok() ? 'passed' : 'failed';
}

/**
 * Extract `<file>:<line>:<column>` from the first frame of a Vitest
 * error's `stacks` array (when available).
 *
 * @param {*} err - The Vitest error object.
 * @returns {string | undefined} Source location string, or undefined.
 */
function locationFromError(err) {
    const first = err?.stacks?.[0];
    if (!first) return undefined;
    return `${first.file}:${first.line}:${first.column}`;
}

let cachedGetRunnerTask;
let getRunnerTaskResolved = false;

/**
 * Lazily resolve Vitest's `experimental_getRunnerTask` helper via
 * dynamic import. Caches once per process. Degrades silently if the
 * export is renamed / removed in a future Vitest minor.
 *
 * @returns {Promise<((tc: *) => *) | undefined>} The cached helper, or undefined.
 */
async function resolveGetRunnerTask() {
    if (getRunnerTaskResolved) return cachedGetRunnerTask;
    try {
        const mod = await import('vitest/node');
        cachedGetRunnerTask = mod?.experimental_getRunnerTask;
    } catch {
        // Vitest renamed / removed the export, or `vitest/node` no longer
        // exists — degrade silently. The reporter shouldn't crash the
        // entire test run because a single optional field can't be
        // populated.
        cachedGetRunnerTask = undefined;
    }
    getRunnerTaskResolved = true;
    return cachedGetRunnerTask;
}

/**
 * Stamp `<file>:<line>:<column>` on a TestCase using the resolved
 * `experimental_getRunnerTask` helper. Falls back to undefined if the
 * helper or its `location` field is unavailable.
 *
 * @param {*} testCase - A Vitest TestCase.
 * @param {string} filePath - Project-relative file path for the prefix.
 * @returns {string | undefined}
 */
function locationFromRunner(testCase, filePath) {
    try {
        if (typeof cachedGetRunnerTask !== 'function') return undefined;
        const runnerTask = cachedGetRunnerTask(testCase);
        const loc = runnerTask?.location;
        if (!loc) return undefined;
        return `${filePath}:${loc.line}:${loc.column}`;
    } catch {
        return undefined;
    }
}
