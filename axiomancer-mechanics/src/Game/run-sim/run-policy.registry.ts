/**
 * The run policies a driver can be asked for by id (phase SM1e). SM1f adds
 * the four archetypes beside the `wanderer` baseline.
 */

import type { RunPolicy } from './run-policy.types';
import { WANDERER_POLICY } from './run-policy.wanderer';

/** Every run policy, keyed by id, in listing order. */
export const RUN_POLICIES: Readonly<Record<string, RunPolicy>> = Object.freeze({
    wanderer: WANDERER_POLICY,
});

/** The policy ids, in listing order. */
export const RUN_POLICY_IDS: readonly string[] = Object.freeze(Object.keys(RUN_POLICIES));

/**
 * Looks a run policy up by id.
 *
 * @param id - A policy id (`wanderer`, …).
 * @returns The policy, or undefined for an id no policy carries.
 */
export function getRunPolicy(id: string): RunPolicy | undefined {
    return Object.prototype.hasOwnProperty.call(RUN_POLICIES, id) ? RUN_POLICIES[id] : undefined;
}
