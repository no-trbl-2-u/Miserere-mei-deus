/**
 * Phase AN5e - every enemy with a portrait animates, as a test.
 *
 * The Measure of AN5 ("`ENEMY_FRAME_SETS` has a valid entry for every key in
 * `ENEMY_ART_BY_KEY`") would otherwise be a count somebody re-checks by hand.
 * Here a new portrait added without a set is a visible red that names the key
 * and says what to do (install a set, or exempt it explicitly), rather than a
 * quiet static enemy in a roster where everything else moves.
 */
import { ENEMY_ART_KEYS } from '../index';
import {
    ENEMY_FRAME_SETS,
    FRAME_SET_EXEMPTIONS,
    portraitsWithoutAValidSet,
    type EnemyFrameSet,
} from '../frames';

describe('every portrait has a valid frame set', () => {
    it('enumerates the real registries, and all seventeen keys pass', () => {
        // The parse-free guard against a vacuous pass: the roster is the one
        // AN5 was planned against.
        expect(ENEMY_ART_KEYS.length).toBe(17);
        expect(portraitsWithoutAValidSet(ENEMY_ART_KEYS)).toEqual([]);
    });

    it('needs no exemption today: every key animates', () => {
        expect(FRAME_SET_EXEMPTIONS).toEqual({});
        for (const key of ENEMY_ART_KEYS) {
            expect(Object.prototype.hasOwnProperty.call(ENEMY_FRAME_SETS, key)).toBe(true);
        }
    });

    it('goes red on a fixture portrait with no set, naming the key and the two ways out', () => {
        const problems = portraitsWithoutAValidSet([...ENEMY_ART_KEYS, 'fixture-portrait']);
        expect(problems).toHaveLength(1);
        expect(problems[0]).toMatch(/^fixture-portrait: has a portrait but no frame set/);
        expect(problems[0]).toMatch(/a portrait needs a set in ENEMY_FRAME_SETS or an explicit exemption/);
    });

    it('an explicit exemption clears that key, and only that key', () => {
        const keys = [...ENEMY_ART_KEYS, 'fixture-portrait'];
        const exemptions = { 'fixture-portrait': 'portrait swapped; awaiting its new sheet' };
        expect(portraitsWithoutAValidSet(keys, ENEMY_FRAME_SETS, exemptions)).toEqual([]);
    });

    it('a stale exemption, naming no portrait, is reported', () => {
        const problems = portraitsWithoutAValidSet(ENEMY_ART_KEYS, ENEMY_FRAME_SETS, { 'gone': 'retired' });
        expect(problems).toEqual(['gone: is exempted from a frame set but has no portrait; drop the exemption']);
    });

    it('a set that exists but fails validation is not a set', () => {
        const broken: EnemyFrameSet = {
            ...ENEMY_FRAME_SETS['tide-gate'],
            frames: ENEMY_FRAME_SETS['tide-gate'].frames.slice(0, 23),
        };
        const problems = portraitsWithoutAValidSet(
            ['tide-gate'], { ...ENEMY_FRAME_SETS, 'tide-gate': broken }, {},
        );
        expect(problems).toHaveLength(1);
        expect(problems[0]).toMatch(/^tide-gate: its frame set is invalid \(.*23 frame file\(s\) for a 8x3 manifest/);
    });
});
