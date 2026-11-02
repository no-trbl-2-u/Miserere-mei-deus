/**
 * The action beat, away from the pane: what counts as the enemy acting.
 *
 * What is then PLAYED, and for how long, is `useEnemyClipSelection`'s and has
 * its own suite — these two questions were one file while there was only one
 * clip to select.
 */
import {
    ATTACK_CLIP, attackClipOf, isEnemyActionBeat,
} from '../enemyAttackBeat';
import { SYNTHETIC_FRAME_SET } from '../syntheticFrameSet';

describe('isEnemyActionBeat', () => {
    it('is the beat when the threat fired, whatever the move did', () => {
        // A blow, a denied blow, a heal, a buff: the engine fires the same
        // event for each, and every one of them is the enemy's action.
        expect(isEnemyActionBeat({ threatFired: true })).toBe(true);
    });

    it('is not the beat when no threat fired: a hindered turn, or the player\'s own', () => {
        expect(isEnemyActionBeat({ threatFired: false })).toBe(false);
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
