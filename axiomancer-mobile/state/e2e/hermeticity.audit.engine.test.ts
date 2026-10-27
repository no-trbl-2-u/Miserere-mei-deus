/**
 * Hermetic E2E Tests — hermeticity guard.
 *
 * Enforces the testing standard (agents.md rule 6, docs/testing.md)
 * mechanically instead of by convention. Like the route-tree guard,
 * this suite reads COMMITTED repo sources — a sanctioned exception to
 * the no-disk-I/O rule: the inputs are deterministic, versioned, and
 * self-contained.
 *
 * What it pins:
 *  1. No focused tests (`.only`) ever land — a focused suite silently
 *     skips the rest of the gate.
 *  2. The minigame engines and every presenter stay PURE: no direct
 *     `Math.random()` outside the store-action seams that mint session
 *     seeds (those are non-deterministic by design and test-overridable
 *     via the `__AXM_*` dev hooks).
 *  3. Tests don't import disk modules except the pinned guard
 *     allowlist. Growing the allowlist is a deliberate, reviewed act.
 *  4. Tests that install spies restore them.
 */

import { describe, expect, it } from '@jest/globals';
import { readdirSync, readFileSync, statSync } from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');

/** Directories holding app + engine + test sources (skips node_modules). */
const SCAN_DIRS = ['app', 'components', 'hooks', 'lib', 'state', 'scripts'];

function walk(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
    }
    return out;
}

const ALL_FILES = SCAN_DIRS.flatMap((d) => walk(path.join(REPO_ROOT, d))).map((f) => ({
    rel: path.relative(REPO_ROOT, f).replace(/\\/g, '/'),
    text: readFileSync(f, 'utf8'),
}));

const TEST_FILES = ALL_FILES.filter((f) => /\.test\.(ts|tsx)$/.test(f.rel));

/** Strip line + block comments so doc references don't trip code checks. */
function stripComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('hermeticity guard: test conventions', () => {
    it('no focused tests (.only) are committed', () => {
        const offenders = TEST_FILES.filter((f) =>
            /\b(?:it|test|describe)\.only\s*\(/.test(stripComments(f.text)),
        ).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });

    it('spies are restored (no mock leaks across files)', () => {
        const offenders = TEST_FILES.filter((f) => {
            const code = stripComments(f.text);
            if (!code.includes('jest.spyOn(')) return false;
            return !/restoreAllMocks|mockRestore|resetAllMocks/.test(code);
        }).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });
});

describe('hermeticity guard: engine purity', () => {
    /**
     * The store-action seam mints wall-clock seeds by design (overridable
     * in tests via `__AXM_HAZARD_SEED__`), and the dev deck-randomizer is
     * a dev tool. Everything else in the minigame directories and the
     * presenters must thread seeded RNG state.
     */
    const RANDOM_ALLOWLIST = new Set([
        'state/hazard/store-actions.ts',
    ]);

    const PURE_DIRS = ['state/hazard/', 'state/presenters/'];

    it('minigame engines and presenters never call Math.random()', () => {
        const offenders = ALL_FILES.filter(
            (f) =>
                PURE_DIRS.some((d) => f.rel.startsWith(d)) &&
                !f.rel.includes('__tests__/') &&
                !RANDOM_ALLOWLIST.has(f.rel) &&
                /Math\.random\s*\(\s*\)/.test(stripComments(f.text)),
        ).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });

    it('minigame engines and presenters never read the wall clock', () => {
        const offenders = ALL_FILES.filter(
            (f) =>
                PURE_DIRS.some((d) => f.rel.startsWith(d)) &&
                !f.rel.includes('__tests__/') &&
                !RANDOM_ALLOWLIST.has(f.rel) &&
                /Date\.now\s*\(\s*\)|new Date\s*\(\s*\)/.test(stripComments(f.text)),
        ).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });
});

describe('hermeticity guard: isolation (no disk in tests)', () => {
    /**
     * Tests that may read the filesystem, each for a pinned reason:
     *  - the route guards read the committed `app/` tree (that IS the
     *    feature under test);
     *  - the script suites test the build/deploy scripts themselves;
     *  - this guard reads committed sources.
     */
    const FS_ALLOWLIST = new Set([
        'state/e2e/route-tree.engine.test.ts',
        'state/e2e/route-registration.engine.test.ts',
        'state/e2e/hermeticity.audit.engine.test.ts',
        // The Expo-decouple boundary guard reads committed sources
        // the same way this guard does, for the same reason.
        'lib/platform/__tests__/boundary.test.ts',
        'scripts/__tests__/deploy-check.test.ts',
        // hermes-ui-playtest.test.ts + playtest-card.test.ts were card-contract
        // tests for the playtest cards; those cards were restructured into the
        // monorepo root .claude/commands, and the tests moved to /archive.
        'scripts/__tests__/smoke-bundler.test.ts',
        'scripts/__tests__/smoke-screens.test.ts',
        // the combat card-detail guard (findings 3/5/6) pins what the overlay's
        // JSX contains and in what ORDER. That shape IS the feature under test,
        // the same standing as the route guards above; mounting the whole
        // encounter panel to rediscover it would test the fixture instead.
        'components/combat/encounter/__tests__/CombatEncounterPanel.card-detail.test.ts',
        // The enemy frame engine's reduced-motion guard (phase AN1b, A4) reads
        // the engine's committed sources to prove it never asks the platform
        // for a preference the caller already holds — the same standing as the
        // boundary guard above, and unprovable by rendering.
        'components/combat/frames/__tests__/reducedMotionSource.test.ts',
        // The worn-state guard (phase EQ1a, A1) reads the committed mobile
        // sources to prove no screen or action reads the inventory-order
        // convention; an import is a source fact, unprovable by rendering.
        'state/__tests__/worn-state-source.test.ts',
        // The node blurb guard (phase AW1b) reads the committed plan/AUDIT.md
        // to prove each pinned mismatch names a row filed for T.
        'state/exploration-maps/__tests__/node-blurb-event.test.ts',
        // The drop-chance guard (phase ER1, A12) reads every committed
        // `*.copy.ts` to prove none says the elite relic drop chance; a copy
        // module added later is swept with no edit to the test.
        'state/presenters/__tests__/elite-drop-chance-hidden.ER1.test.tsx',
    ]);

    const FS_PATTERN =
        /from\s+'(?:node:)?(?:fs|fs\/promises|child_process|http|https|net)'|require\(\s*'(?:node:)?(?:fs|child_process|http|https|net)'\s*\)/;

    it('only allowlisted tests import disk / network / subprocess modules', () => {
        const offenders = TEST_FILES.filter(
            (f) => !FS_ALLOWLIST.has(f.rel) && FS_PATTERN.test(stripComments(f.text)),
        ).map((f) => f.rel);
        expect(offenders).toEqual([]);
    });

    it('the FS allowlist carries no dead entries', () => {
        const present = new Set(TEST_FILES.map((f) => f.rel));
        const dead = [...FS_ALLOWLIST].filter((entry) => !present.has(entry));
        expect(dead).toEqual([]);
    });
});
