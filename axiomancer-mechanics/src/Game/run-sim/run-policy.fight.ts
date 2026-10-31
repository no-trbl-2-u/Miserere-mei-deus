/**
 * The archetype bots' fight rankings (phase SM1f): one `CombatSimPolicy` per
 * lane, played by the sim's own phase player (`upgradeablePlayPhase`).
 *
 * Each ranking starts from the greedy witness's per-card score and adds what
 * its lane knows:
 *
 * - Blood Price spends VITAE (a SACRIFICE card) when a worn signature pays it
 *   back or while it is above its VITAE threshold, and holds it otherwise.
 * - The Defender guards first against an ATTACK or DANGER intent (or any
 *   telegraphed hit).
 * - The Merciful drives to befriend: mercy lines first, and it spares.
 * - The Elementalist chains its elements (a line that puts a new element on
 *   the foe first) and refuses a PAID line whose self-burn would end it.
 *
 * Every rule reads the card's lane, keywords, verbs and the foe's intent from
 * the data, never a card id. A policy's `id` is the witness it refines (the
 * witness id union is closed in `combat.sim-policies.ts`); its `name` says
 * which lane it plays.
 */

import { playCombatCard, PROGRAM_KIT, threatHits } from '../../Combat/combat.engine';
import { programLineVerbs } from '../../Combat/combat.card-program';
import { foeInferno, yourInferno } from '../../Combat/combat.elements';
import type {
    CombatCard, CombatEncounterState, CombatIntentType, SignatureSkillKind,
} from '../../Combat/combat.encounter.types';
import { getSignatureSkill, SIGNATURE_SKILL_LIST } from '../../Combat/combat.signature';
import { COMBAT_SIM_POLICIES, type CombatSimPolicy } from '../../Combat/combat.sim-policies';
import { cardKeywords, cardLaneId, laneKeywords } from './run-policy.lanes';

/**
 * A tiebreak for the lane's own cards (and, at half, for cards printing its
 * keywords): under the greedy witness's effect band, so the witness's
 * ordering stands and the lane only decides between near equals.
 */
const BAND_LANE = 5e3;
/** A lane rule's play (a paid-back SACRIFICE, a new element): above the greedy witness's new-status band. */
const BAND_RULE = 2e8;
/** The lane's first call (a guard against a hit, a mercy line): above everything else. */
const BAND_FIRST = 5e11;
/** The greedy witness's befriend-when-low band, which a mercy line matches. */
const BAND_BEFRIEND = 1e12;

/** The intents a Defender guards against. */
const HIT_INTENTS: ReadonlySet<CombatIntentType> = new Set(['attack', 'danger', 'damage', 'combo']);

/** Every signature kind the game defines, read from the signature list. */
const EVERY_SIGNATURE: readonly SignatureSkillKind[] = Object.freeze([...new Set(SIGNATURE_SKILL_LIST.map(sig => sig.kind))]);

/** Every signature kind but the mercy one: the killers do not open mercy. */
const KILLER_SIGNATURES: readonly SignatureSkillKind[] = Object.freeze(EVERY_SIGNATURE.filter(kind => kind !== 'mercy'));

/** The signatures that pay a SACRIFICE back (heal it, or turn it into LEECH). */
const SACRIFICE_PAYBACK: ReadonlySet<SignatureSkillKind> = new Set(['sacrifice-heals', 'sacrifice-leech']);

const greedy = COMBAT_SIM_POLICIES.greedy;

/** Each card's verbs, read once: a line calls the same verbs whatever the board (its numbers change, not its verbs). */
const VERB_CACHE = new Map<string, ReadonlySet<string>>();

/**
 * The verbs a card's lines use (both lines), read off the engine's value run
 * on the first board it is seen on; empty for a card with no program.
 */
export function cardVerbs(s: CombatEncounterState, cardId: string): ReadonlySet<string> {
    const known = VERB_CACHE.get(cardId);
    if (known) return known;
    const verbs = new Set<string>();
    for (const paid of [false, true]) {
        for (const v of programLineVerbs(s, cardId, paid, PROGRAM_KIT)) verbs.add(v);
    }
    VERB_CACHE.set(cardId, verbs);
    return verbs;
}

/** The foe's telegraph this phase: its intent, and whether it is a DANGER move. */
export function foeIntent(s: CombatEncounterState): { intent: CombatIntentType | undefined; danger: boolean } {
    const phases = s.threatPhases ?? [];
    const phase = phases[Math.min(s.currentPhaseIndex ?? 0, phases.length - 1)];
    return { intent: phase?.intentType, danger: phase?.enemyMove?.danger === true };
}

/** True when the foe means to hit this phase: an ATTACK or DANGER intent, or a telegraphed hit. */
export function foeMeansToHit(s: CombatEncounterState): boolean {
    const { intent, danger } = foeIntent(s);
    if (danger || (intent !== undefined && HIT_INTENTS.has(intent))) return true;
    return threatHits(s).length > 0;
}

/** True when the player wears a signature that pays a SACRIFICE back. */
export function sacrificePaysBack(s: CombatEncounterState): boolean {
    return s.signatures.some(id => {
        const kind = getSignatureSkill(id)?.kind;
        return kind !== undefined && SACRIFICE_PAYBACK.has(kind);
    });
}

/** The die that would power this card now (the sim's own source order), or undefined. */
function poweringDie(s: CombatEncounterState, card: CombatCard): string | undefined {
    const live = [
        ...s.dice.filter(d => d.state === 'available' && d.color !== 'x' && (d.floating || d.face === 'special' || d.face === 'mana')),
        ...(s.reserve ?? []),
    ];
    return live.find(d => d.color === 'wild' || card.stance === 'any' || d.color === card.stance)?.id;
}

/**
 * True when powering this card would leave the player's own INFERNO enough to
 * end them at their next turn start, before the foe burns down: the
 * Elementalist's self-burn refusal. Read off a preview of the play itself.
 */
export function selfBurnWouldEnd(s: CombatEncounterState, card: CombatCard): boolean {
    // Only a line that lays INFERNO can burn you; nothing else is previewed.
    if (!cardVerbs(s, card.id).has('inferno')) return false;
    const entry = s.hand.find(h => h.cardId === card.id);
    const dieId = entry ? poweringDie(s, card) : undefined;
    if (!entry || dieId === undefined) return false;
    let after: CombatEncounterState;
    try {
        after = playCombatCard(s, { uid: entry.uid }, true, dieId, () => 0.5).state;
    } catch {
        // A play the engine refuses outright burns no one.
        return false;
    }
    if (after.finalOutcome || after.enemy.health <= 0) return false;
    if (after.player.health <= 0) return true;
    const el = after.program?.el;
    if (!el) return false;
    if (foeInferno(el) + el.storm >= after.enemy.health) return false;
    const before = s.program?.el ? yourInferno(s.program.el) : 0;
    return yourInferno(el) > before && yourInferno(el) >= after.player.health;
}

/**
 * How many elements a card's lines would add that the foe does not carry yet
 * (the chain), read from its verbs and the board's weather.
 */
export function newElements(s: CombatEncounterState, verbs: ReadonlySet<string>): number {
    const el = s.program?.el;
    const carried: Record<string, boolean> = {
        inferno: el ? foeInferno(el) > 0 : false,
        blizzard: el ? el.blizzard > 0 : false,
        storm: el ? el.storm > 0 : false,
    };
    return Object.keys(carried).filter(v => verbs.has(v) && !carried[v]).length;
}

/** The greedy score plus a lane band for the lane's own cards and its vocabulary. */
function laneScore(s: CombatEncounterState, card: CombatCard, laneId: string, keywords: ReadonlySet<string>): number {
    let score = greedy.rankCard(s, card, () => 0);
    if (cardLaneId(card.id) === laneId) score += BAND_LANE;
    else if (cardKeywords(card.id).some(k => keywords.has(k))) score += BAND_LANE / 2;
    return score;
}

/** The share of VITAE below which Blood Price holds its SACRIFICE cards with nothing to pay them back. */
export const BLOOD_PRICE_SPEND_FLOOR = 0.5;

/**
 * The lane-aware fight ranking for a lane bot.
 *
 * @param laneId - `blood-price`, `defender`, `merciful` or `elementalist`; any
 *                 other lane plays the plain lane-first ranking.
 */
export function laneFightPolicy(laneId: string): CombatSimPolicy {
    const keywords = laneKeywords(laneId);
    switch (laneId) {
        case 'blood-price':
            return {
                ...greedy,
                name: 'Blood Price (lane bot)',
                description: 'Spends VITAE when a signature pays it back or it can afford to; its own lane first.',
                rankCard: (s, card) => {
                    const score = laneScore(s, card, laneId, keywords);
                    if (!cardKeywords(card.id).includes('SACRIFICE')) return score;
                    const afford = s.player.health >= s.player.maxHealth * BLOOD_PRICE_SPEND_FLOOR;
                    return sacrificePaysBack(s) || afford ? score + BAND_RULE : -Infinity;
                },
                signatureKinds: KILLER_SIGNATURES,
                mercyChoice: 'exploit',
            };
        case 'defender':
            return {
                ...COMBAT_SIM_POLICIES.turtle,
                name: 'Defender (lane bot)',
                description: 'Guards first against an ATTACK or DANGER intent; its own lane first otherwise.',
                rankCard: (s, card) => {
                    const score = laneScore(s, card, laneId, keywords);
                    const verbs = cardVerbs(s, card.id);
                    const guards = card.verbClass === 'defend' || verbs.has('guard') || verbs.has('holdGuard');
                    return guards && foeMeansToHit(s) ? score + BAND_FIRST : score;
                },
                signatureKinds: KILLER_SIGNATURES,
                mercyChoice: 'exploit',
            };
        case 'merciful':
            return {
                ...COMBAT_SIM_POLICIES['mercy-seeker'],
                name: 'Merciful (lane bot)',
                description: 'Drives to befriend: mercy lines first, its own lane next, and it spares.',
                rankCard: (s, card) => {
                    const score = laneScore(s, card, laneId, keywords);
                    const verbs = cardVerbs(s, card.id);
                    const mercy = card.verbClass === 'befriend' || [...verbs].some(v => v.toLowerCase().includes('mercy'));
                    return mercy ? score + BAND_BEFRIEND : score;
                },
                signatureKinds: EVERY_SIGNATURE,
                mercyChoice: 'spare',
            };
        case 'elementalist':
            return {
                ...COMBAT_SIM_POLICIES['dot-weaver'],
                name: 'Elementalist (lane bot)',
                description: 'Chains its elements onto the foe and refuses a self-burn that would end it.',
                rankCard: (s, card) => {
                    if (selfBurnWouldEnd(s, card)) return -Infinity;
                    const score = laneScore(s, card, laneId, keywords);
                    const adds = newElements(s, cardVerbs(s, card.id));
                    return adds > 0 ? score + BAND_RULE * adds : score;
                },
                signatureKinds: KILLER_SIGNATURES,
                mercyChoice: 'exploit',
            };
        default:
            return {
                ...greedy,
                name: `${laneId} (lane bot)`,
                description: 'Its own lane first, then the greedy witness.',
                rankCard: (s, card) => laneScore(s, card, laneId, keywords),
            };
    }
}
