/**
 * The room the foe's name has beside the VITAE shield.
 *
 * The shield crest rises through the middle of the name row, so the name has only
 * the room left of the crest; a longer name steps its font down (`FitText`).
 *
 * Input: the name row's width. Output: the room left of the crest, in points.
 */

/** The shield crest's width (the Svg in `EnemyHpBar`). */
export const CREST_WIDTH = 62;

/** Air kept between the name and the crest's edge. */
export const CREST_GAP = 8;

export function enemyNameRoom(rowWidth: number): number {
    return Math.max(0, rowWidth / 2 - CREST_WIDTH / 2 - CREST_GAP);
}
