/**
 * HOW LONG THE BOARD'S CARDS TAKE TO MOVE — the durations the combat board's
 * card transitions run for, in one leaf module so something other than the
 * board can wait for them without importing the board.
 *
 * The board reads these for its own builders (the fan and staged-row
 * `entering`, the fan's slide-together `layout`). The enemy's frame engine
 * reads `CARD_MOTION_SETTLE_MS` to hold the flinch until a played card has
 * finished leaving the battlefield, so the hit reaction plays on a clear board
 * rather than behind the cards. One number for both, so retuning the board's
 * motion moves the wait with it instead of leaving a stale copy behind.
 */

/** A card arriving — in the hand fan, or staged over the battlefield. */
export const CARD_ENTER_MS = 180;

/** The fan closing the gap a card left (native only; web drops it). */
export const CARD_LAYOUT_MS = 160;

/** When the board's card motion from one commit has finished: its longest leg. */
export const CARD_MOTION_SETTLE_MS = Math.max(CARD_ENTER_MS, CARD_LAYOUT_MS);
