/**
 * The run driver's seeded world (phase SM1e): one seed pins every source of
 * chance a run can reach.
 *
 * The engine draws from its global stream (`setSeed`); a few app paths still
 * call `Math.random` (reward rolls, the minigame seed fallback) or mix in
 * `Date.now` (that fallback, the hazard tombstone flag). While a run plays,
 * `Math.random` draws from the engine's seeded stream and `Date.now` is a
 * counter, so the same seed and policy give the same run. Both are restored
 * when the run ends, thrown or not.
 */

import { getRng, setSeed } from '@mechanics';

/** A fixed epoch the clock counts up from, one millisecond per read. */
const SIM_EPOCH_MS = Date.UTC(2026, 0, 1);

/**
 * Run `body` with every source of chance pinned to `seed`.
 *
 * @param seed - The run's seed.
 * @param body - The run; whatever it returns is returned.
 */
export function withSeededRun<T>(seed: number, body: () => T): T {
    const realRandom = Math.random;
    const realNow = Date.now;
    let clock = SIM_EPOCH_MS;
    setSeed(`sim-run:${seed}`);
    Math.random = () => getRng().random();
    Date.now = () => ++clock;
    try {
        return body();
    } finally {
        Math.random = realRandom;
        Date.now = realNow;
    }
}
