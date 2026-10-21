/**
 * WHEN THE ENEMY IS HIT — the other half of the beat vocabulary.
 *
 * `enemyAttackBeat` answers "was that the enemy acting on the player?"; this
 * answers the mirror question, "was that the player's blow landing?". They are
 * deliberately separate signals rather than one three-way verdict: both can be
 * true of a single resolution (the player strikes, the enemy's threat fires),
 * and a function that had to pick one of them would be making a presentation
 * decision inside what is meant to be arithmetic. Which clip wins is
 * `useEnemyClipSelection`'s call, and it has the timing to make it with.
 *
 * Like its sibling it does NOT walk `fx.events`. The pane walks the stream once
 * per resolution and already separates damage it dealt from damage it took; a
 * second walk would be a second reading, free to drift from the first.
 */
import type { EnemyFrameSet } from '@/assets/images/enemies/frames';

/** The clip a frame set names for taking a hit. */
export const STRUCK_CLIP = 'struck';

/** What the pane's single walk of `fx.events` already produced, enemy side. */
export interface EnemyStruckSignals {
    /** Damage the ENEMY took this resolution (`damage-dealt`, target not self). */
    enemyDamage: number;
    /** Damage the enemy took from its own lingering effects (`dot-tick`). */
    enemyDotDamage: number;
}

/**
 * True when the enemy took damage this resolution, from any source.
 *
 * A damage-over-time tick counts. The pane already floats a `-N` over the foe
 * for one, so the stream plainly regards it as the enemy being hurt; an enemy
 * that flinches from a blade and ignores the poison eating it would be saying
 * the tick is not real damage, which it is. Zero-damage status applications do
 * NOT count: nothing struck the enemy, and `struck` is a flinch, not a
 * general-purpose "something happened to you".
 */
export function isEnemyStruckBeat({ enemyDamage, enemyDotDamage }: EnemyStruckSignals): boolean {
    return enemyDamage > 0 || enemyDotDamage > 0;
}

/** The struck clip of a set, or null when the set has none (or there is no set). */
export function struckClipOf(frameSet: EnemyFrameSet | null | undefined) {
    return frameSet?.manifest.clips?.[STRUCK_CLIP] ?? null;
}
