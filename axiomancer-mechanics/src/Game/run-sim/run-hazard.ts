/**
 * A hazard round, one tap at a time (phase SM1e).
 *
 * `hazard.sim.ts` plays a whole round inside the engine; the run driver plays
 * the live minigame through the app's store actions, one tap per call, so it
 * needs the next tap rather than the next state. `nextHazardStep` reads the
 * session and names that tap under one of the three `hazard.sim.ts` policies:
 *
 *  - `greedy`       fire draw utilities, convert hex dice it can use, stage
 *                   every card that moves a meter (best first), scrap dead
 *                   weight, then power the best card while short;
 *  - `conservative` stage only high-value cards (at most three), scrap the
 *                   rest, and power one card with an exact die when well short;
 *  - `opportunist`  stage everything of value and power every card it can.
 *
 * It mirrors the round shapes in `hazard.sim.ts` (which stays unchanged and
 * keeps its own helpers private). `hazardRouteFor` names each policy's route:
 * safe for greedy and conservative, risk for the opportunist.
 */

import type { HazardPolicyId } from '../../World/Hazard/hazard.sim';
import type { HazardRouteKey, HazardSessionState } from '../../World/Hazard/hazard.types';
import { getHazardCardDef, getHazardDef } from '../../World/Hazard/hazard.content';
import { hazardCardValue, hazardProjectedProgress } from '../../World/Hazard/hazard.engine';

/** One tap in the playing phase. */
export type HazardStep =
    | { readonly kind: 'stage'; readonly uid: string }
    | { readonly kind: 'power'; readonly uid: string; readonly dieId: string }
    | { readonly kind: 'discard'; readonly uid: string }
    | { readonly kind: 'resolve' };

/** The route each policy crosses by. */
export function hazardRouteFor(policy: HazardPolicyId): HazardRouteKey {
    return policy === 'opportunist' ? 'risk' : 'safe';
}

function roundNeed(s: HazardSessionState): { needF: number; needE: number; combined: boolean } {
    const def = getHazardDef(s.hazardId);
    if (s.route === 'risk') {
        const [needF, needE] = def.risk.thresholds[s.round - 1] ?? [0, 0];
        return { needF, needE, combined: false };
    }
    return { needF: def.safe.thresholds[s.round - 1] ?? 0, needE: 0, combined: true };
}

function shortfall(s: HazardSessionState): number {
    const need = roundNeed(s);
    const p = hazardProjectedProgress(s);
    if (need.combined) return Math.max(0, need.needF - (p.force + p.escape));
    return Math.max(0, need.needF - p.force) + Math.max(0, need.needE - p.escape);
}

function freeValueToward(s: HazardSessionState, cardId: string): number {
    const def = getHazardCardDef(cardId);
    if (def.dead) return 0;
    const need = roundNeed(s);
    const p = hazardProjectedProgress(s);
    if (need.combined) return def.f + def.e;
    const fGap = Math.max(0, need.needF - p.force);
    const eGap = Math.max(0, need.needE - p.escape);
    return Math.min(def.f, fGap + 2) + Math.min(def.e, eGap + 2);
}

function availableDie(s: HazardSessionState, kind: string, allowGold: boolean): string | null {
    const exact = s.dice.find(d => d.kind === kind && d.state === 'available');
    if (exact) return exact.id;
    if (!allowGold) return null;
    return s.dice.find(d => d.kind === 'gold' && d.state === 'available')?.id ?? null;
}

/** The best die to spend on a staged card: the largest gain toward the round's need. */
function bestPower(s: HazardSessionState, policy: HazardPolicyId): HazardStep | null {
    const need = roundNeed(s);
    const p = hazardProjectedProgress(s);
    let best: { uid: string; dieId: string; delta: number } | null = null;
    for (const e of s.play) {
        if (e.dieId) continue;
        const def = getHazardCardDef(e.cardId);
        if (def.dead) continue;
        const dieId = availableDie(s, def.kind, policy !== 'conservative');
        if (!dieId) continue;
        const free = hazardCardValue(e);
        const powered = { force: def.fp ?? def.f, escape: def.ep ?? def.e };
        let delta = powered.force + powered.escape - (free.force + free.escape);
        if (policy === 'greedy' && !need.combined) {
            const fGap = Math.max(0, need.needF - p.force);
            const eGap = Math.max(0, need.needE - p.escape);
            delta = Math.min(powered.force - free.force, fGap) + Math.min(powered.escape - free.escape, eGap);
        }
        const floor = policy === 'conservative' ? 2 : 1;
        if (delta >= floor && (!best || delta > best.delta)) best = { uid: e.uid, dieId, delta };
    }
    return best ? { kind: 'power', uid: best.uid, dieId: best.dieId } : null;
}

/**
 * The next tap of a hazard round under `policy`, or `resolve` when the round
 * is ready to judge. A round with nothing staged stages the first card in hand
 * first, so the engine always has something to judge (as `hazard.sim.ts` does).
 *
 * @param s      - The live session, in its `playing` phase.
 * @param policy - The hazard policy the run policy chose.
 * @returns One tap for the driver to make through the store's hazard actions.
 */
export function nextHazardStep(s: HazardSessionState, policy: HazardPolicyId): HazardStep {
    // 1. Draw utilities first: more options.
    for (const h of s.hand) {
        if (getHazardCardDef(h.cardId).effect === 'draw') return { kind: 'stage', uid: h.uid };
    }
    // 2. Convert hex dice (greedy and opportunist) when a card of that colour is held.
    if (policy !== 'conservative' && s.dice.some(d => d.kind === 'hex' && d.state === 'available')) {
        for (const h of s.hand) {
            const def = getHazardCardDef(h.cardId);
            if (def.effect !== 'convert') continue;
            const holdsColour = s.hand.some(x => {
                const d = getHazardCardDef(x.cardId);
                return !d.effect && !d.dead && d.kind === def.kind;
            });
            if (policy === 'opportunist' || holdsColour) return { kind: 'stage', uid: h.uid };
        }
    }
    // 3. Stage value cards, best first.
    const floor = policy === 'conservative' ? 3 : 1;
    const room = policy !== 'conservative' || s.play.length < 3;
    if (room) {
        const best = s.hand
            .map(h => ({ h, v: freeValueToward(s, h.cardId) }))
            .filter(c => c.v >= floor)
            .sort((a, b) => b.v - a.v)[0];
        if (best) return { kind: 'stage', uid: best.h.uid };
    }
    // 4. Scrap dead weight (the opportunist scraps only dead cards).
    const anyHex = s.dice.some(d => d.kind === 'hex');
    for (const h of s.hand) {
        const def = getHazardCardDef(h.cardId);
        if (policy === 'opportunist') {
            if (def.dead) return { kind: 'discard', uid: h.uid };
            continue;
        }
        const worthless = def.dead || (!def.effect && freeValueToward(s, h.cardId) === 0);
        const staleUtility = policy === 'greedy' && ((def.effect === 'convert' && !anyHex) || def.effect === 'recast');
        if (worthless || staleUtility || (policy === 'conservative' && freeValueToward(s, h.cardId) === 0)) {
            return { kind: 'discard', uid: h.uid };
        }
    }
    // 5. Spend dice: greedy while short, conservative once when well short, opportunist always.
    const powered = s.play.some(e => e.dieId !== null);
    const wantsPower =
        policy === 'opportunist' ||
        (policy === 'greedy' && shortfall(s) > 0) ||
        (policy === 'conservative' && !powered && shortfall(s) > 2);
    if (wantsPower) {
        const step = bestPower(s, policy);
        if (step) return step;
    }
    // 6. Nothing staged: stage the first card so the round can be judged.
    if (s.play.length === 0 && s.hand.length > 0) return { kind: 'stage', uid: s.hand[0]!.uid };
    return { kind: 'resolve' };
}
