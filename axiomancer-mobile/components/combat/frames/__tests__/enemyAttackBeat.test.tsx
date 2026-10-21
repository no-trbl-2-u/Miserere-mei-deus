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
        expect(isEnemyAttackBeat({ playerDamage: 7, threatFired: false, intentDamage: 7 })).toBe(true);
    });

    it('is the beat when the threat fired and was denied — the swing still happened', () => {
        expect(isEnemyAttackBeat({ playerDamage: 0, threatFired: true, intentDamage: 6 })).toBe(true);
    });

    it('is NOT the beat when the threat that fired was never an attack', () => {
        // A heal, a buff, a cleanse: the enemy's turn, but not its swing. The
        // same gate the pane's DENIED flourish already uses, so the two cannot
        // disagree about what an attack is.
        expect(isEnemyAttackBeat({ playerDamage: 0, threatFired: true, intentDamage: 0 })).toBe(false);
    });

    it('is the beat when the player took damage from something that fired no threat', () => {
        expect(isEnemyAttackBeat({ playerDamage: 3, threatFired: false, intentDamage: 0 })).toBe(true);
    });

    it('is not the beat when the resolution was the player\'s own', () => {
        expect(isEnemyAttackBeat({ playerDamage: 0, threatFired: false, intentDamage: 6 })).toBe(false);
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
