/**
 * The player witness (phase SM2b, chunk 135.2; A6 of
 * `plan/135-sm2-sim-follow-ups.md`): how a run sim plays a fight when it
 * plays like a player who wants to grow.
 *
 * It is the greedy witness (`COMBAT_SIM_POLICIES.greedy`: new statuses
 * first, payoffs on time, strikes last) with the mercy signature off: The Open
 * Hand heals the foe it is cast on, and this one means to kill every foe it can,
 * so a run earns XP and drafts.
 *
 * `COMBAT_SIM_POLICIES.greedy` itself is untouched: `measured-truth` plays
 * it. The witness keeps greedy's `id` (the `CombatSimPolicyId` union lives in
 * `combat.sim-policies.ts`, which this chunk leaves alone); its `name` says
 * which it is.
 */

import { COMBAT_SIM_POLICIES, type CombatSimPolicy } from '../../Combat/combat.sim-policies';

const greedy = COMBAT_SIM_POLICIES.greedy;

/** The greedy witness that never spares (see the file header). */
export const PLAYER_WITNESS: CombatSimPolicy = Object.freeze<CombatSimPolicy>({
    ...greedy,
    name: 'Player (greedy, finishes)',
    description: 'The greedy witness with the mercy signature off, finishing at every mercy check: a run grows.',
    signatureKinds: Object.freeze(greedy.signatureKinds.filter(kind => kind !== 'mercy')),
});

/**
 * The player witness that spares at every mercy check that fires. Identical to
 * `PLAYER_WITNESS` in every other seam, the Open Hand included (off for both),
 * so a spare-all against finish-all run differs only in the check's answer.
 */
export const SPARE_ALL_WITNESS: CombatSimPolicy = Object.freeze<CombatSimPolicy>({
    ...PLAYER_WITNESS,
    name: 'Player (greedy, spares at every mercy check)',
    description: 'The player witness that answers every mercy check that fires with Spare.',
    mercyCheck: 'spare',
});
