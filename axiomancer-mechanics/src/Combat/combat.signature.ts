/**
 * Signature Skills.
 *
 * A small, ALWAYS-available kit (independent of the shuffled deck) funded by
 * Conviction (◆) and granted only by worn signet relics. Each signature pays
 * its own Conviction price (`SignatureSkill.cost`); nothing assumes one price.
 *
 *   The Open Hand (the Suppliant's Ring, ◆4) — the befriend: it opens the
 *     mercy choice on a foe that can be befriended and is low enough.
 *   Crimson Return (the Crimson Circlet, ◆5) — your next SACRIFICE HEALs
 *     you by the VITAE it would have cost instead of costing it; it still
 *     counts as a SACRIFICE.
 *   Ruby Tithe (the Ruby Signet, ◆3) — your next SACRIFICE also adds LEECH
 *     to the foe equal to the VITAE paid, unscaled.
 *   Open Vein (the Bleeding Signet, ◆4) — HEAL 5, then trigger the foe's
 *     LEECH (it loses its potency now and you HEAL what it lost; no turn
 *     ticks off).
 *
 *   Thorn Mantle (the Thornback Signet, ◆5) — THORNS equal to your GUARD.
 *   Mirror Ward (the Mirror Brooch, ◆3) — REFLECT 50%.
 *   Hold the Line (the Carapace Belt, ◆4) — your GUARD is kept through the
 *     foe's next turn.
 *
 * The Blood Price and Defender names and descriptions are plain placeholders
 * [content] for T to rewrite; the costs are T's.
 *
 * `applySignatureSkill` is a pure transition; the engine wraps it in
 * `playSignatureSkill` to gate on `signatureCastBlock`, spend Conviction and
 * check for an immediate outcome. The module imports nothing from
 * `combat.engine` (no cycle).
 */

import { befriendHpGateOpen, isEnemyBefriendable } from '../Enemy/befriend';
import {
    programArmSacrifice, programSacrificeArmed, programSignatureHeal, programTriggerLeech,
    programSpikeSignature, programSpikeSignatureLive, programWeatherSignature, programWeatherSignatureLive,
} from './combat.card-program';
import type {
    CombatEncounterState, CombatEvent, CombatTransition, SignatureSkill,
    SignatureSkillId, PlayerArchetype,
} from './combat.encounter.types';

/** Open Vein's HEAL (mind-scaled, as a card's HEAL). */
export const OPEN_VEIN_HEAL = 5;

/** The signatures, keyed by id. */
export const SIGNATURE_SKILLS: Record<SignatureSkillId, SignatureSkill> = {
    'sig-disarming-plea': {
        id: 'sig-disarming-plea', name: 'The Open Hand', kind: 'mercy', cost: 4,
        description: 'Offer the foe mercy. A foe that can be befriended, once low enough, may be spared.',
    },
    'sig-crimson-circlet': {
        id: 'sig-crimson-circlet', name: 'Crimson Return', kind: 'sacrifice-heals', cost: 5,
        description: 'Your next SACRIFICE heals you instead of costing VITAE. It still counts as a SACRIFICE.',
    },
    'sig-ruby-signet': {
        id: 'sig-ruby-signet', name: 'Ruby Tithe', kind: 'sacrifice-leech', cost: 3,
        description: 'Your next SACRIFICE also gives the foe LEECH equal to the VITAE paid.',
    },
    'sig-bleeding-signet': {
        id: 'sig-bleeding-signet', name: 'Open Vein', kind: 'heal-trigger-leech', cost: 4,
        description: `HEAL ${OPEN_VEIN_HEAL}. Trigger the foe's LEECH: it loses its LEECH now and you HEAL what it lost.`,
    },
    'sig-elementalist-signet': {
        id: 'sig-elementalist-signet', name: 'Eye of the Storm', kind: 'clear-yours-trigger-storm', cost: 6,
        description: "Clear your INFERNO, then trigger the foe's STORM: it loses its STORM now, and the STORM does not grow.",
    },
    'sig-elementalist-brooch': {
        id: 'sig-elementalist-brooch', name: 'Kindle the Gale', kind: 'foe-inferno-to-storm', cost: 4,
        description: "Turn the foe's own INFERNO into STORM. INFERNO that burns you too stays.",
    },
    'sig-elementalist-belt': {
        id: 'sig-elementalist-belt', name: 'Thaw into Thunder', kind: 'blizzard-to-storm', cost: 3,
        description: 'Turn all BLIZZARD into STORM.',
    },
    'sig-defender-signet': {
        id: 'sig-defender-signet', name: 'Thorn Mantle', kind: 'guard-to-thorns', cost: 5,
        description: 'Gain THORNS equal to your GUARD.',
    },
    'sig-defender-brooch': {
        id: 'sig-defender-brooch', name: 'Mirror Ward', kind: 'reflect-half', cost: 3,
        description: 'Gain REFLECT 50%.',
    },
    'sig-defender-belt': {
        id: 'sig-defender-belt', name: 'Hold the Line', kind: 'hold-guard', cost: 4,
        description: "Your GUARD isn't lost at the end of the foe's next turn.",
    },
};

/** The player's archetype from their dominant base stat (body > mind > heart
 *  tiebreak). It only flavours the mobile portrait. */
export function playerArchetype(player: { baseStats: { heart: number; body: number; mind: number } }): PlayerArchetype {
    const { heart, body, mind } = player.baseStats;
    if (body >= heart && body >= mind) return 'body';
    if (mind >= heart && mind >= body) return 'mind';
    return 'heart';
}

export const SIGNATURE_SKILL_LIST: readonly SignatureSkill[] = Object.freeze(Object.values(SIGNATURE_SKILLS));

export function getSignatureSkill(id: string): SignatureSkill | undefined {
    return SIGNATURE_SKILLS[id as SignatureSkillId];
}

/**
 * Why this signature can't be cast right now, or null when it can. The engine
 * refuses on it and the signature bar prints it, so the two never disagree.
 * A refused cast spends nothing. A signature that would do nothing is refused
 * here with a reason; Open Vein never is (its HEAL always lands).
 */
export function signatureCastBlock(state: CombatEncounterState, skill: SignatureSkill): string | null {
    if (state.conviction < skill.cost) return `Need ${skill.cost} ◆ Conviction`;
    switch (skill.kind) {
        case 'mercy':
            if (state.mercyChoiceActive) return 'Mercy is already offered';
            if (!isEnemyBefriendable(state.enemy)) return `${state.enemy.name} will not be befriended`;
            if (!befriendHpGateOpen(state.enemy)) return `${state.enemy.name} is not yet low enough to spare`;
            return null;
        case 'sacrifice-heals':
            return programSacrificeArmed(state, 'heals') ? 'Your next SACRIFICE already heals you' : null;
        case 'sacrifice-leech':
            return programSacrificeArmed(state, 'leech') ? 'Your next SACRIFICE already adds LEECH' : null;
        case 'heal-trigger-leech':
            return null;
        case 'clear-yours-trigger-storm':
            return programWeatherSignatureLive(state, skill.kind) ? null : 'No INFERNO on you and no STORM to trigger';
        case 'foe-inferno-to-storm':
            return programWeatherSignatureLive(state, skill.kind) ? null : 'The foe has no INFERNO of its own to turn';
        case 'blizzard-to-storm':
            return programWeatherSignatureLive(state, skill.kind) ? null : 'No BLIZZARD to turn';
        case 'guard-to-thorns':
            return programSpikeSignatureLive(state, skill.kind) ? null : 'No GUARD to turn into THORNS';
        case 'reflect-half':
            return null;
        case 'hold-guard':
            return programSpikeSignatureLive(state, skill.kind) ? null : 'Your GUARD is already held';
    }
}

/**
 * Applies a signature skill to the encounter. Pure: returns the new state +
 * events; the engine handles the gate, the Conviction spend and outcomes.
 */
export function applySignatureSkill(
    state: CombatEncounterState,
    skill: SignatureSkill,
): CombatTransition {
    switch (skill.kind) {
        case 'mercy': {
            const events: CombatEvent[] = [
                { kind: 'mercy-opened', message: `${state.enemy.name} falters — spare or exploit?` },
            ];
            // `mercy-choice` is the phase the board opens the spare/exploit
            // modal on; `selectMercyChoice` resolves it.
            return { state: { ...state, phase: 'mercy-choice', mercyChoiceActive: true }, events };
        }
        case 'sacrifice-heals':
            return { state: programArmSacrifice(state, 'heals'), events: [] };
        case 'sacrifice-leech':
            return { state: programArmSacrifice(state, 'leech'), events: [] };
        case 'heal-trigger-leech': {
            const healed = programSignatureHeal(state, OPEN_VEIN_HEAL, skill.id);
            const triggered = programTriggerLeech(healed.state);
            return { state: triggered.state, events: [...healed.events, ...triggered.events] };
        }
        case 'clear-yours-trigger-storm':
        case 'foe-inferno-to-storm':
        case 'blizzard-to-storm':
            return programWeatherSignature(state, skill.kind);
        case 'guard-to-thorns':
        case 'reflect-half':
        case 'hold-guard':
            return programSpikeSignature(state, skill.kind);
    }
}
