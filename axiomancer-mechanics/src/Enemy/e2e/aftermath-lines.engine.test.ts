/**
 * Per-foe aftermath narrative lines.
 *
 * Pins the registration shape (`finalBlowLines` + `causeLines` on the
 * authored set; `pactLines` only on befriendable enemies that carry a
 * `friendshipReward`); voice signatures spot-checked on the Green Jelly;
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
import {
    // Befriendable — full line set incl. pactLines.
    GreenJelly,
    // Sweep — finalBlowLines + causeLines (no pactLines).
    FloatEye,
    DeathBeholder,
    // Un-authored regression — test sandbox.
    Sandbag_01,
} from '../enemy.library';

describe('per-foe aftermath narrative lines (art-driven roster)', () => {
    const befriendable = [GreenJelly];
    const sweepOnly = [FloatEye, DeathBeholder];
    const authored = [...befriendable, ...sweepOnly];

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

            // pactLines is only meaningful alongside a friendshipReward — assert
            // presence/shape when carried, but don't require it (most enemies
            // are not befriendable).
            if (enemy.friendshipReward) {
                expect(enemy.pactLines, `${enemy.id} pactLines (has friendshipReward)`).toBeDefined();
                expect(enemy.pactLines!.quiet).toMatch(/\S/);
                expect(enemy.pactLines!.setDown).toMatch(/\S/);
                expect(enemy.pactLines!.heavy).toMatch(/\S/);
            }
        }
    });

    it('no roster aftermath line uses the archaic thee/thou/thy/thine/ye register (DELIVERY_REGISTER.md)', () => {
        const archaic = /\b(thee|thou|thy|thine|ye)\b/i;
        for (const enemy of EnemyLibrary) {
            const lines = [
                ...(enemy.finalBlowLines ? Object.values(enemy.finalBlowLines) : []),
                ...(enemy.causeLines ? Object.values(enemy.causeLines) : []),
                ...(enemy.pactLines ? Object.values(enemy.pactLines) : []),
            ];
            for (const line of lines) {
                expect(line, `${enemy.id}: "${line}"`).not.toMatch(archaic);
            }
        }
    });

    it('pactLines only on the befriendable enemies', () => {
        for (const enemy of befriendable) {
            expect(enemy.pactLines, `${enemy.id} pactLines`).toBeDefined();
            expect(enemy.pactLines!.quiet).toMatch(/\S/);
            expect(enemy.pactLines!.setDown).toMatch(/\S/);
            expect(enemy.pactLines!.heavy).toMatch(/\S/);
        }
        for (const enemy of sweepOnly) {
            expect(enemy.pactLines, `${enemy.id} pactLines should be absent`).toBeUndefined();
        }
    });

    it('befriendable enemies carry pactLines + journalEntry voice pairs', () => {
        expect(GreenJelly.pactLines!.heavy).toMatch(/sold my face/);
        expect(GreenJelly.journalEntry!.title).toMatch(/Face Broker/);
    });

    it('un-authored enemies (Sandbag_01 — test sandbox per Phase 74 D1) have all three fields undefined', () => {
        expect(Sandbag_01.finalBlowLines).toBeUndefined();
        expect(Sandbag_01.pactLines).toBeUndefined();
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
