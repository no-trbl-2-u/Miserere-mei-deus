/**
 * The ground behind a foe's figure on the fight reveal (FR1a), one colour per
 * tier. T retunes a ground here and nowhere else. Fixed across themes: the
 * fight and elite start as the settled shot's cold sea-green, the boss as its
 * warm brown.
 */
export type RevealGroundTier = 'fight' | 'elite' | 'boss';

export const REVEAL_GROUND: Readonly<Record<RevealGroundTier, string>> = {
    fight: '#2f5a55',
    elite: '#2f5a55',
    boss: '#6b4424',
};
