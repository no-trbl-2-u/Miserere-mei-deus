/**
 * Per-foe aftermath narrative lines.
 *
 * Pins the registration shape (`finalBlowLines` + `causeLines` on the
 * authored set; `mercyLines` on every normal foe);
 * voice signatures spot-checked on the Green Jelly;
 * the Sandbag_01 regression pins that the fields stay strictly undefined
 * for the un-authored test sandbox so the consumer-side fallback path
 * stays intact.
 *
 * The 'every roster entry carries finalBlowLines + causeLines' test below
 * sweeps the full `EnemyLibrary` (not a hand-picked subset) so a future
 * enemy landing without aftermath prose fails CI immediately.
 */
import { describe, it, expect } from 'vitest';
import { EnemyLibrary } from '../enemy.library';
import { createGameStore } from '../../Game/store';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import {
    // A spare story: its flag and a journal entry.
    GreenJelly,
    // Sweep — finalBlowLines + causeLines.
    FloatEye,
    DeathBeholder,
    // Un-authored regression — test sandbox.
    Sandbag_01,
} from '../enemy.library';

describe('per-foe aftermath narrative lines (art-driven roster)', () => {
    const withStory = [GreenJelly];
    const sweepOnly = [FloatEye, DeathBeholder];
    const authored = [...withStory, ...sweepOnly];

    it('all authored enemies carry finalBlowLines + causeLines shape', () => {
        for (const enemy of authored) {
            expect(enemy.finalBlowLines, `${enemy.id} finalBlowLines`).toBeDefined();
            expect(enemy.finalBlowLines!.brutal).toMatch(/\S/);
            expect(enemy.finalBlowLines!.quiet).toMatch(/\S/);
            expect(enemy.finalBlowLines!.ironic).toMatch(/\S/);

            expect(enemy.causeLines, `${enemy.id} causeLines`).toBeDefined();
            expect(enemy.causeLines!.brutal).toMatch(/\S/);
            expect(enemy.causeLines!.broken).toMatch(/\S/);
            expect(enemy.causeLines!.quiet).toMatch(/\S/);
        }
    });

    // Chapter 1's new normals ship with their one-line description only (the EN1
    // brief, "Prose"); the board falls back to its own lines until T writes theirs.
    const DESCRIPTION_ONLY = new Set([
        'enemy-gallows-crow', 'enemy-net-mender', 'enemy-crane-hook',
        'enemy-brine-widow', 'enemy-lamprey-knot', 'enemy-curfew-ringer',
        'enemy-wreck-picker', 'enemy-smokehouse-gutter', 'enemy-tithe-collector',
        'enemy-cave-choir',
        'enemy-lamplighter', 'enemy-wrecker',
        'enemy-toll-keeper', 'enemy-tide-gate',
    ]);

    it('Chapter 1\'s description-only foes carry no aftermath prose yet', () => {
        for (const id of DESCRIPTION_ONLY) {
            const enemy = EnemyLibrary.find(e => e.id === id);
            expect(enemy, id).toBeDefined();
            expect(enemy!.finalBlowLines, id).toBeUndefined();
            expect(enemy!.causeLines, id).toBeUndefined();
        }
    });

    it('every other EnemyLibrary entry carries finalBlowLines + causeLines (full-roster regression guard)', () => {
        for (const enemy of EnemyLibrary.filter(e => !DESCRIPTION_ONLY.has(e.id))) {
            expect(enemy.finalBlowLines, `${enemy.id} finalBlowLines`).toBeDefined();
            expect(enemy.finalBlowLines!.brutal).toMatch(/\S/);
            expect(enemy.finalBlowLines!.quiet).toMatch(/\S/);
            expect(enemy.finalBlowLines!.ironic).toMatch(/\S/);

            expect(enemy.causeLines, `${enemy.id} causeLines`).toBeDefined();
            expect(enemy.causeLines!.brutal).toMatch(/\S/);
            expect(enemy.causeLines!.broken).toMatch(/\S/);
            expect(enemy.causeLines!.quiet).toMatch(/\S/);
        }
    });

    it('no roster aftermath line uses the archaic thee/thou/thy/thine/ye register (DELIVERY_REGISTER.md)', () => {
        const archaic = /\b(thee|thou|thy|thine|ye)\b/i;
        for (const enemy of EnemyLibrary) {
            const lines = [
                ...(enemy.finalBlowLines ? Object.values(enemy.finalBlowLines) : []),
                ...(enemy.causeLines ? Object.values(enemy.causeLines) : []),
                ...(enemy.mercyLines ? Object.values(enemy.mercyLines) : []),
            ];
            for (const line of lines) {
                expect(line, `${enemy.id}: "${line}"`).not.toMatch(archaic);
            }
        }
    });

    it('every difficulty normal foe has a Spare and a Finish line, and no other foe has either', () => {
        // The library has no normal foe outside the approved table, so none is exempt.
        // A new normal foe without both lines fails here.
        const NO_APPROVED_LINE = new Set<string>();
        const normals = EnemyLibrary.filter(e => e.difficulty === 'normal' && !NO_APPROVED_LINE.has(e.id));
        expect(normals.length).toBeGreaterThan(0);
        for (const enemy of normals) {
            expect(enemy.mercyLines?.spare, `${enemy.id} Spare line`).toMatch(/\S/);
            expect(enemy.mercyLines?.finish, `${enemy.id} Finish line`).toMatch(/\S/);
        }
        for (const enemy of EnemyLibrary.filter(e => e.difficulty !== 'normal')) {
            expect(enemy.mercyLines, `${enemy.id} mercyLines should be absent`).toBeUndefined();
        }
    });

    it('a foe with a spare story carries its journal entry voice', () => {
        expect(GreenJelly.journalEntry!.title).toMatch(/Face Broker/);
    });

    it('sparing a foe with a spare story sets its flag and unlocks its journal entry, and finishing it does neither', () => {
        const withSpareStory = EnemyLibrary.filter(e => e.spareStory);
        expect(withSpareStory.map(e => e.id)).toContain(GreenJelly.id);
        for (const enemy of withSpareStory) {
            const fight = (spared: boolean) => {
                const store = createGameStore(nullAdapter);
                store.getState().startCombat({ ...enemy, difficulty: 'normal' });
                const report = store.getState().endCombat('victory', undefined, { spared });
                return { state: store.getState(), report };
            };
            const spared = fight(true);
            expect(spared.state.flags, `${enemy.id} flag`).toContain(enemy.spareStory!.flagSet);
            expect(enemy.journalEntry, `${enemy.id} journalEntry`).toBeDefined();
            expect(spared.state.codex.unlockedEntries, `${enemy.id} entry`).toContain(enemy.journalEntry!.id);
            expect(spared.report.journalEntryUnlocked?.title, `${enemy.id} title`).toBe(enemy.journalEntry!.title);

            const finished = fight(false);
            expect(finished.state.flags, `${enemy.id} flag on finish`).not.toContain(enemy.spareStory!.flagSet);
            expect(finished.state.codex.unlockedEntries).not.toContain(enemy.journalEntry!.id);
        }
    });

    it('un-authored enemies (Sandbag_01 — test sandbox per Phase 74 D1) have all three fields undefined', () => {
        expect(Sandbag_01.finalBlowLines).toBeUndefined();
        expect(Sandbag_01.mercyLines).toBeUndefined();
        expect(Sandbag_01.causeLines).toBeUndefined();
    });

    // Engine does NO variant selection between the three slots. The variant
    // pick lives entirely on the consumer (mobile presenter, CLI, etc.) based
    // on the outcome shape. This case documents the intended consumption
    // pattern with an inline mock-consumer helper.
    it('consumer-side variant selection — mock pickFinalBlowVariant pattern', () => {
        const pickFinalBlowVariant = (report: {
            overkillRatio?: number;
            sourceIsSelf?: boolean;
        }): 'brutal' | 'quiet' | 'ironic' => {
            if (report.sourceIsSelf) return 'ironic';
            if (report.overkillRatio !== undefined && report.overkillRatio >= 2) return 'brutal';
            return 'quiet';
        };

        // Drive each variant against Float-Eye's authored lines.
        expect(FloatEye.finalBlowLines![pickFinalBlowVariant({ overkillRatio: 3 })])
            .toMatch(/does not reopen/); // brutal
        expect(FloatEye.finalBlowLines![pickFinalBlowVariant({ overkillRatio: 1 })])
            .toMatch(/blinks once/);     // quiet
        expect(FloatEye.finalBlowLines![pickFinalBlowVariant({ sourceIsSelf: true })])
            .toMatch(/disagreed/);       // ironic
    });
});
