/**
 * The run policies a driver can be asked for by id: the `wanderer` baseline
 * (phase SM1e) and the four archetypes that know the game (phase SM1f).
 */

import {
    BLOOD_PRICE_POLICY,
    DEFENDER_POLICY,
    ELEMENTALIST_POLICY,
    MERCIFUL_POLICY,
} from './run-policy.archetypes';
import type { RunPolicy } from './run-policy.types';
import { WANDERER_POLICY } from './run-policy.wanderer';

/** Every run policy, keyed by id, in listing order. */
export const RUN_POLICIES: Readonly<Record<string, RunPolicy>> = Object.freeze({
    wanderer: WANDERER_POLICY,
    'blood-price': BLOOD_PRICE_POLICY,
    defender: DEFENDER_POLICY,
    merciful: MERCIFUL_POLICY,
    elementalist: ELEMENTALIST_POLICY,
});

/** The policy ids, in listing order. */
export const RUN_POLICY_IDS: readonly string[] = Object.freeze(Object.keys(RUN_POLICIES));

/**
 * Looks a run policy up by id.
 *
 * @param id - A policy id (`wanderer`, `blood-price`, …).
 * @returns The policy, or undefined for an id no policy carries.
 */
export function getRunPolicy(id: string): RunPolicy | undefined {
    return Object.prototype.hasOwnProperty.call(RUN_POLICIES, id) ? RUN_POLICIES[id] : undefined;
}
