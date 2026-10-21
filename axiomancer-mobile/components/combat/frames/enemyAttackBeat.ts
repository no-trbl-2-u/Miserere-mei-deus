/**
 * WHEN THE ENEMY SWINGS — the pure half of the combat wiring.
 *
 * The combat pane already walks `fx.events` once per resolution and already
 * knows, from that single walk, how much damage the player took and whether a
 * threat fired. This module turns those two facts into one question — "was that
 * the enemy's beat?" — so the answer is a function a test can ask directly
 * rather than something only a rendered pane can be interrogated about.
 *
 * It deliberately does NOT walk the events itself. A second walk would be a
 * second reading of the same stream, free to drift from the first; the pane
 * passes what it already counted.
 */
import type { EnemyFrameSet } from '@/assets/images/enemies/frames';

/** The clip a frame set names for its attack. AN1c grows the other two. */
export const ATTACK_CLIP = 'attacking';

/**
 * Milliseconds from the resolution frame to the impact apex: the beat the
 * player medallion delays its recoil by, the board's shake and flash are
 * handed, and the enemy's swing starts on. It was the same literal `100` in
 * three places before this module existed; now it is one constant those three
 * read, so the beat cannot be retuned by halves.
 */
export const ENEMY_ATTACK_IMPACT_MS = 100;

/** What the pane's single walk of `fx.events` already produced. */
export interface EnemyBeatSignals {
    /** Damage the player took this resolution (`damage-dealt`, target self). */
    playerDamage: number;
    /** Whether the enemy's threat fired this resolution (`threat-fired`). */
    threatFired: boolean;
    /** The telegraphed damage of the intent that fired (`enemy.intent.damage`). */
    intentDamage: number;
}

/**
 * True when this resolution was the enemy SWINGING at the player.
 *
 * Damage the player took counts on its own, because not every source of it
 * fires a threat event. A fired threat counts even when the player took
 * nothing — the swing happened and was denied, and an enemy that mimes nothing
 * on the turn its attack is guarded reads as a bug rather than as a block —
 * but only when the intent was an attack at all. A threat that heals or buffs
 * the enemy is its turn, not its swing. That is the same gate the pane's own
 * DENIED flourish already uses, and the two must not disagree about what an
 * attack is.
 */
export function isEnemyAttackBeat(
    { playerDamage, threatFired, intentDamage }: EnemyBeatSignals,
): boolean {
    return playerDamage > 0 || (threatFired && intentDamage > 0);
}

/** The attack clip of a set, or null when the set has none (or there is no set). */
export function attackClipOf(frameSet: EnemyFrameSet | null | undefined) {
    return frameSet?.manifest.clips?.[ATTACK_CLIP] ?? null;
}
