/**
 * Combat sim policies — the playtest roster of scripted witnesses.
 *
 * A `CombatSimPolicy` bundles every decision seam of the encounter sim
 * (`combat.encounter.sim.ts`): how to rank candidate powered plays, which
 * Signature Skills to fund, when to spend Conviction, and how a mercy choice
 * resolves. The sim driver stays
 * one loop; the policies make it a matrix.
 *
 * HP is the sole win condition. The roster was built to witness status play: `dot-weaver` and `control-lock` play the doctrinal game,
 * `aggro-brute` is the deliberately weak basic-attack baseline (its
 * underperformance IS the design), and `greedy`/`blind` remain the tuned
 * balance witnesses.
 *
 * Behavior guarantee: `greedy` and `blind`'s `rankCard`/`bestSignature`
 * ordering encodes EXACTLY the per-card score (Befriend-at-lowHp,
 * new-status-first,
 * status-over-strike, damage preview) — never consumes rng, so the seeded
 * engine stream is untouched there. `greedy` and `blind` play identically;
 * `blind` is kept so the playtest matrix keeps its column.
 */

import type {
    CombatCard, CombatEncounterState, SignatureSkill, SignatureSkillKind,
} from './combat.encounter.types';
import { getPendingDotTotal } from './effects';

/** Every scripted witness the sim can drive. */
export type CombatSimPolicyId =
    | 'greedy' | 'blind'
    | 'dot-weaver' | 'control-lock' | 'aggro-brute' | 'turtle' | 'chaos' | 'mercy-seeker';

/**
 * A scripted witness: the full decision surface of one sim player.
 * `rankCard` scores candidate powered plays (highest wins; ties resolve to the
 * earliest card in hand order, a stable sort).
 */
export interface CombatSimPolicy {
    id: CombatSimPolicyId;
    name: string;
    /** One line, doctrine-aware: what this witness proves about status play. */
    description: string;
    /** Rank candidate powered plays; highest first. Receives the same candidate
     *  info for every policy. Only `chaos` consumes `rng`. */
    rankCard(state: CombatEncounterState, card: CombatCard, rng: () => number): number;
    /** Signature kinds this witness will fund (checked in `state.signatures` order). */
    signatureKinds: readonly SignatureSkillKind[];
    /** Cast a signature when `conviction >= this`. */
    convictionThreshold: number;
    /** How a Befriend-opened mercy choice resolves. */
    mercyChoice: 'spare' | 'exploit';
    /**
     * OPTIONAL (extension beyond the base contract): rank affordable signatures;
     * highest wins. When absent the sim takes the FIRST affordable signature in
     * `state.signatures` order whose kind is in `signatureKinds` — the
     * behavior `greedy`/`blind` rely on. Only `chaos` uses this (random pick).
     */
    rankSignature?(state: CombatEncounterState, signature: SignatureSkill, rng: () => number): number;
}

// ─── Score bands ─────────────────────────────────────────────────────────────
// Additive bands keep the per-card score a faithful encoding of a lexicographic
// sort: each band dwarfs everything below it (bottomDamagePreview stays well
// under BAND_EFFECT).
const BAND_BEFRIEND_LOW_HP = 1e12;
const BAND_PRIMARY = 2e8;
const BAND_SECONDARY = 1e7;
const BAND_NEW_STATUS = 1e8;
const BAND_EFFECT = 1e4;
const BAND_UTILITY_LIVE = 1e6;

/** Low-HP gate for the Befriend/mercy turn. */
const LOW_HP_FRACTION = 0.30;

function enemyLowHp(s: CombatEncounterState): boolean {
    return s.enemy.health <= s.enemy.maxHealth * LOW_HP_FRACTION;
}

function isNewStatus(s: CombatEncounterState, card: CombatCard): boolean {
    if (!card.primaryEffectId) return false;
    return !s.enemy.effects.some(e => e.effectId === card.primaryEffectId);
}

function isControlClass(card: CombatCard): boolean {
    return card.verbClass === 'direct-control' || card.verbClass === 'stat-debuff';
}

function isUtilityClass(card: CombatCard): boolean {
    return card.verbClass === 'defend' || card.verbClass === 'buff-self';
}

/**
 * The greedy ordering as a pure per-card score (an argmax): Befriend when the foe is low, then new-status > any-status >
 * damage preview.
 */
function greedyRankCard(s: CombatEncounterState, card: CombatCard): number {
    let score = card.bottomDamagePreview;
    if (enemyLowHp(s) && card.verbClass === 'befriend') score += BAND_BEFRIEND_LOW_HP;
    if (isNewStatus(s, card)) score += BAND_NEW_STATUS;
    if (card.effectKind !== 'none') score += BAND_EFFECT;
    return score;
}

/** Every signature kind: The Open Hand and the three Blood Price signatures. */
const ALL_SIGNATURE_KINDS: readonly SignatureSkillKind[] = Object.freeze([
    'mercy', 'sacrifice-heals', 'sacrifice-leech', 'heal-trigger-leech',
    'clear-yours-trigger-storm', 'foe-inferno-to-storm', 'blizzard-to-storm',
]);

/** The killers never offer mercy, and no other signature is left to cast. */
const NO_SIGNATURES: readonly SignatureSkillKind[] = Object.freeze([]);

/** The scripted witness roster. */
export const COMBAT_SIM_POLICIES: Record<CombatSimPolicyId, CombatSimPolicy> = {
    greedy: {
        id: 'greedy',
        name: 'Greedy (omniscient witness)',
        description: 'The tuned balance witness: plays the status game — new DoTs first, payoffs on time, strikes last.',
        rankCard: (s, card) => greedyRankCard(s, card),
        signatureKinds: ALL_SIGNATURE_KINDS,
        convictionThreshold: 7,
        mercyChoice: 'spare',
    },
    blind: {
        id: 'blind',
        name: 'Blind (player-feel witness)',
        description: 'The same status-first play as greedy. Its hidden-stance difference died with the draft (D7); kept so the playtest matrix keeps its column.',
        rankCard: (s, card) => greedyRankCard(s, card),
        signatureKinds: ALL_SIGNATURE_KINDS,
        convictionThreshold: 7,
        mercyChoice: 'spare',
    },
    'dot-weaver': {
        id: 'dot-weaver',
        name: 'DoT Weaver',
        description: 'All-in on erosion: fresh DoTs above all; utility only once the foe is already bleeding.',
        rankCard: (s, card) => {
            const pendingDot = getPendingDotTotal(s.enemy).total;
            if (card.verbClass === 'direct-dot') {
                return (isNewStatus(s, card) ? BAND_PRIMARY : BAND_SECONDARY) + card.bottomDamagePreview;
            }
            // Utility only when the enemy already carries a ticking DoT.
            if (isUtilityClass(card)) return pendingDot > 0 ? BAND_UTILITY_LIVE : 1;
            if (card.effectKind !== 'none') return BAND_EFFECT + card.bottomDamagePreview;
            return 100 + card.bottomDamagePreview;
        },
        signatureKinds: NO_SIGNATURES,
        convictionThreshold: 7,
        mercyChoice: 'exploit',
    },
    'control-lock': {
        id: 'control-lock',
        name: 'Control Lock',
        description: 'Denial play: control and stat-debuff locks first (fresh ones for the combo), aiming to erase the enemy\'s telegraphed turns.',
        rankCard: (s, card) => {
            if (isControlClass(card)) {
                return (isNewStatus(s, card) ? BAND_PRIMARY : BAND_SECONDARY)
                    + card.bottomDamagePreview;
            }
            if (card.verbClass === 'direct-dot') return BAND_EFFECT * 10 + card.bottomDamagePreview;
            if (card.verbClass === 'defend') return BAND_EFFECT;
            return 100 + card.bottomDamagePreview;
        },
        signatureKinds: NO_SIGNATURES,
        convictionThreshold: 8,
        mercyChoice: 'spare',
    },
    'aggro-brute': {
        id: 'aggro-brute',
        name: 'Aggro Brute',
        description: 'The doctrine\'s weak baseline: raw damage preview, no payoff timing, no status game — its underperformance IS the design.',
        rankCard: (_s, card) => card.bottomDamagePreview,
        signatureKinds: NO_SIGNATURES,
        convictionThreshold: 7,
        mercyChoice: 'exploit',
    },
    turtle: {
        id: 'turtle',
        name: 'Turtle',
        description: 'Outlast play: guard/barrier walls first, DoT erosion second — status still does the killing, just from behind a shield.',
        rankCard: (s, card) => {
            if (card.verbClass === 'defend') return BAND_PRIMARY + card.bottomDamagePreview;
            if (card.verbClass === 'buff-self') return BAND_PRIMARY / 2 + card.bottomDamagePreview;
            if (card.verbClass === 'direct-dot') {
                return (isNewStatus(s, card) ? BAND_SECONDARY : BAND_SECONDARY / 10) + card.bottomDamagePreview;
            }
            if (card.effectKind !== 'none') return BAND_EFFECT + card.bottomDamagePreview;
            return 100 + card.bottomDamagePreview;
        },
        signatureKinds: NO_SIGNATURES,
        convictionThreshold: 9,
        mercyChoice: 'spare',
    },
    chaos: {
        id: 'chaos',
        name: 'Chaos',
        description: 'A seeded coin-flipper: uniform-random plays and signatures (blind) — the floor any deliberate status play must beat.',
        rankCard: (_s, _card, rng) => rng(),
        signatureKinds: ALL_SIGNATURE_KINDS,
        convictionThreshold: 7,
        mercyChoice: 'exploit',
        rankSignature: (_s, _sig, rng) => rng(),
    },
    'mercy-seeker': {
        id: 'mercy-seeker',
        name: 'Mercy Seeker',
        description: 'The spare path: control status to survive, Befriend at the first opening, and always choose mercy over the kill.',
        rankCard: (s, card) => {
            if (card.verbClass === 'befriend') return BAND_BEFRIEND_LOW_HP;
            if (isControlClass(card)) {
                return (isNewStatus(s, card) ? BAND_PRIMARY : BAND_SECONDARY) + card.bottomDamagePreview;
            }
            if (card.verbClass === 'defend') return BAND_UTILITY_LIVE;
            return 100 + card.bottomDamagePreview;
        },
        signatureKinds: ALL_SIGNATURE_KINDS,
        convictionThreshold: 6,
        mercyChoice: 'spare',
    },
};

/** Canonical roster order for CLIs and reports. */
export const COMBAT_SIM_POLICY_ORDER: readonly CombatSimPolicyId[] = Object.freeze([
    'greedy', 'blind', 'dot-weaver', 'control-lock', 'aggro-brute', 'turtle', 'chaos', 'mercy-seeker',
]);

/** Looks up a policy by id (undefined when unknown). */
export function getSimPolicy(id: string): CombatSimPolicy | undefined {
    return (COMBAT_SIM_POLICIES as Record<string, CombatSimPolicy>)[id];
}

/** All policies in canonical roster order. */
export function listSimPolicies(): CombatSimPolicy[] {
    return COMBAT_SIM_POLICY_ORDER.map(id => COMBAT_SIM_POLICIES[id]);
}
