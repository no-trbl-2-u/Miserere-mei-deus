/**
 * The attack beat, away from the pane: what counts as the enemy acting.
 *
 * What is then PLAYED, and for how long, is `useEnemyClipSelection`'s and has
 * its own suite — these two questions were one file while there was only one
 * clip to select.
 */
import {
    ATTACK_CLIP, attackClipOf, isEnemyAttackBeat,
} from '../enemyAttackBeat';
import { SYNTHETIC_FRAME_SET } from '../syntheticFrameSet';

describe('isEnemyAttackBeat', () => {
    it('is the beat when the enemy damaged the player', () => {
        expect(isEnemyAttackBeat({ playerDamage: 7, threatFired: false })).toBe(true);
    });

    it('is the beat when the threat fired and was denied — the swing still happened', () => {
        expect(isEnemyAttackBeat({ playerDamage: 0, threatFired: true })).toBe(true);
    });

    it('is not the beat when the resolution was the player\'s own', () => {
        expect(isEnemyAttackBeat({ playerDamage: 0, threatFired: false })).toBe(false);
    });
});

describe('attackClipOf', () => {
    it('finds the attack clip of a set that names one', () => {
        expect(attackClipOf(SYNTHETIC_FRAME_SET)).toBe(SYNTHETIC_FRAME_SET.manifest.clips[ATTACK_CLIP]);
    });

    it('is null for a static enemy, which is every enemy while the registry is empty', () => {
        expect(attackClipOf(null)).toBeNull();
    });
});
