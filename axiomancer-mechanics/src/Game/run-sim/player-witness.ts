/**
 * The player witness (phase SM2b, chunk 135.2; A6 of
 * `plan/135-sm2-sim-follow-ups.md`): how a run sim plays a fight when it
 * plays like a player who wants to grow.
 *
 * It is the greedy witness (`COMBAT_SIM_POLICIES.greedy`: new statuses
 * first, payoffs on time, strikes last) with the mercy signature off and a
 * Befriend's opening exploited, never spared. Since every foe can be
 * befriended (BUG1j) and a befriend pays no XP and no card, a bot that spares
 * stays at level 1; this one kills every foe it can, so a run earns XP and
 * drafts.
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
    name: 'Player (greedy, never spares)',
    description: 'The greedy witness with the mercy signature off and every Befriend opening exploited: kills every foe, so a run grows.',
    signatureKinds: Object.freeze(greedy.signatureKinds.filter(kind => kind !== 'mercy')),
    mercyChoice: 'exploit',
});
