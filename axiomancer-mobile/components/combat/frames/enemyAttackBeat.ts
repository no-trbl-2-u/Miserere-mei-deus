/**
 * WHEN THE ENEMY ACTS — the pure half of the combat wiring.
 *
 * The combat pane already walks `fx.events` once per resolution and already
 * knows, from that single walk, whether a threat fired. This module turns that
 * fact into one question — "was that the enemy's beat?" — so the answer is a
 * function a test can ask directly rather than something only a rendered pane
 * can be interrogated about.
 *
 * It deliberately does NOT walk the events itself. A second walk would be a
 * second reading of the same stream, free to drift from the first; the pane
 * passes what it already counted.
 */
import type { EnemyFrameSet } from '@/assets/images/enemies/frames';

/** The clip a frame set names for the enemy's action: every move, not only a hit. */
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
    /** Whether the enemy's threat fired this resolution (`threat-fired`). */
    threatFired: boolean;
}

/**
 * True when this resolution was the enemy taking its turn.
 *
 * `threat-fired` is the one signal. The engine emits it for any move that was
 * not hindered, whatever the move does, so a heal or a buff is an action as much
 * as a blow, and a stunned enemy fires nothing and acts out nothing.
 */
export function isEnemyActionBeat({ threatFired }: EnemyBeatSignals): boolean {
    return threatFired;
}

/** The attack clip of a set, or null when the set has none (or there is no set). */
export function attackClipOf(frameSet: EnemyFrameSet | null | undefined) {
    return frameSet?.manifest.clips?.[ATTACK_CLIP] ?? null;
}
