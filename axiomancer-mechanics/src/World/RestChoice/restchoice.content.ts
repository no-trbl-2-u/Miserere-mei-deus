/**
 * Rest-choice encounter — tuning.
 *
 * A rest node offers exactly two things — a free heal, or one card upgraded —
 * and locks after one is chosen. A village's paid rest heals the same fraction. `restHealFraction` is a design choice, not an
 * economy number. Do not tune it elsewhere.
 */
export const RESTCHOICE_TUNING = Object.freeze({
    /**
     * `rest` heals this fraction of MAX vitae, flat — no shelter-class
     * distinction. Max, not missing or current health, is the reading that
     * does not punish a player for being nearly dead.
     */
    restHealFraction: 0.25,
});
