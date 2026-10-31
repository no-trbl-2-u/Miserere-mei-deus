/**
 * Hermeticity guard — enforces the testing standard (docs/testing.md,
 * AGENTS.md standing rule 4) mechanically instead of by convention.
 *
 * Like the public-surface snapshot, this suite reads COMMITTED repo
 * sources (a sanctioned exception to the no-disk-I/O rule: the inputs
 * are deterministic, versioned, and self-contained — the same carve-out
 * mobile's route-tree guard uses).
 *
 * What it pins:
 *  1. Every test file imports from 'vitest' (no stray jest/mocha).
 *  2. No focused tests (`.only`) ever land — a focused suite silently
 *     skips the rest of the gate.
 *  3. Production engine code never calls `Math.random()` directly —
 *     all randomness flows through the seedable singletons
 *     (`src/Utils/rng.ts`) or the minigames' embedded mulberry32 state.
 *  4. Tests don't reach for disk / network / subprocesses except the
 *     pinned allowlist (node-target adapters, CLI harnesses, artifact
 *     writers). Growing the allowlist is a deliberate, reviewed act.
 *  5. Tests that install spies restore them (`restoreAllMocks` /
 *     `mockRestore`) so no mock leaks across files.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SRC_ROOT = resolve(__dirname, '..', '..');

/** Walk src/ collecting .ts files (skips node_modules/dist by rooting at src). */
function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (entry.endsWith('.ts')) out.push(full);
    }
    return out;
}

const ALL_FILES = walk(SRC_ROOT).map((f) => ({
    rel: relative(SRC_ROOT, f).replace(/\\/g, '/'),
    text: readFileSync(f, 'utf8'),
}));

const TEST_FILES = ALL_FILES.filter((f) => f.rel.endsWith('.test.ts'));
const ENGINE_FILES = ALL_FILES.filter(
    (f) =>
        !f.rel.endsWith('.test.ts') &&
        !f.rel.startsWith('CLI/') &&
        !f.rel.startsWith('test-utils/'),
);

/** Strip line + block comments so doc references don't trip code checks. */
function stripComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('hermeticity guard: test conventions', () => {
    it('every test file imports from vitest', () => {
        const offenders = TEST_FILES.filter((f) => !f.text.includes("from 'vitest'")).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });

    it('no focused tests (.only) are committed', () => {
        const offenders = TEST_FILES.filter((f) =>
            /\b(?:it|test|describe)\.only\s*\(/.test(stripComments(f.text)),
        ).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });

    it('spies are restored (no mock leaks across files)', () => {
        // The test-utils/rng helpers install a Math.random spy internally,
        // so files that call them install spies without ever writing
        // `vi.spyOn(` themselves — treat them the same.
        const INSTALLS_SPY =
            /vi\.spyOn\(|mockFixedRng\s*\(|mockAlternatingRng\s*\(|mockSequentialRng\s*\(/;
        const offenders = TEST_FILES.filter((f) => {
            const code = stripComments(f.text);
            if (!INSTALLS_SPY.test(code)) return false;
            return !/restoreAllMocks|mockRestore/.test(code);
        }).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });
});

describe('hermeticity guard: determinism', () => {
    it('engine code never calls Math.random() directly', () => {
        // The two sanctioned owners of raw randomness:
        //  - Utils/rng.ts — the seedable singleton's default backing
        // (test-utils/rng.ts is excluded from ENGINE_FILES already).
        const allowed = new Set(['Utils/rng.ts']);
        const offenders = ENGINE_FILES.filter(
            (f) => !allowed.has(f.rel) && /Math\.random\s*\(\s*\)/.test(stripComments(f.text)),
        ).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });
});

describe('hermeticity guard: isolation (no disk / network / subprocess)', () => {
    /**
     * Tests that may touch node built-ins, each for a pinned reason:
     *  - CLI harnesses drive readline/TTY seams (CLI is excluded from
     *    the build; its tests exercise the IO boundary on purpose);
     *  - the node persistence adapter IS a disk feature;
     *  - the vitest-reporter test exercises the reporter's file output;
     *  - this guard reads committed sources;
     *  - the curated-library strike gate reads cards.library.ts to assert
     *    the banned strings basePower/chipHp never reappear;
     *  - the trial-set removal guard reads committed sources to assert no
     *    code outside a trial set names its card ids;
     *  - the card-rules fence reads the keyword atlas and reads (and, when
     *    seeding, writes) its committed exemptions fixture.
     * Add to this list only when the FEATURE under test is the
     * disk/process seam itself.
     */
    const IO_ALLOWLIST = new Set([
        'CLI/e2e/game.cli.engine.test.ts',
        'CLI/e2e/io.engine.test.ts',
        'CLI/e2e/hazard.cli.engine.test.ts',
        'CLI/e2e/combat.cli.engine.test.ts',
        'CLI/e2e/game.cli.route-hazard.engine.test.ts',
        'CLI/e2e/game.cli.route-audit.engine.test.ts',
        'CLI/e2e/cli.docs-examples.engine.test.ts',
        'CLI/e2e/cli.process-smoke.engine.test.ts',
        'CLI/e2e/puzzle-audit.cli.engine.test.ts',
        'Game/persistence/node.adapter.test.ts',
        'test-utils/e2e/agent-vitest-reporter.engine.test.ts',
        'test-utils/e2e/hermeticity.audit.test.ts',
        'Combat/e2e/terminology-boundary.engine.test.ts',
        'Cards/e2e/curated-library.engine.test.ts',
        'Cards/e2e/trial-set-removal.engine.test.ts',
        'Cards/e2e/card-rules.engine.test.ts',
        // Read-only source scan: the old relic-slot words stay out of the code.
        'Items/e2e/no-old-slot-words.engine.test.ts',
        // Read-only source scan: the run policies name no card id.
        'Game/run-sim/run-policy.no-card-id.test.ts',
    ]);

    const IO_PATTERN =
        /from\s+'(?:node:)?(?:fs|fs\/promises|http|https|net|child_process|worker_threads)'|require\(\s*'(?:node:)?(?:fs|http|https|net|child_process)'\s*\)/;

    it('only allowlisted tests import disk / network / subprocess modules', () => {
        const offenders = TEST_FILES.filter(
            (f) => !IO_ALLOWLIST.has(f.rel) && IO_PATTERN.test(stripComments(f.text)),
        ).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });

    it('the IO allowlist carries no dead entries', () => {
        const present = new Set(TEST_FILES.map((f) => f.rel));
        const dead = [...IO_ALLOWLIST].filter((entry) => !present.has(entry));
        expect(dead).toEqual([]);
    });
});
