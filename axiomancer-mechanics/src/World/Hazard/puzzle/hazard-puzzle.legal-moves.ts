/**
 * Hazard puzzle — the legal moves of a session.
 *
 * The one move generator the solver's exhaustive walk and the bots share
 * (HP6a), so a bot can never play a move the solver does not know. It lists
 * the moves worth trying, one per interchangeable choice:
 *  - stage: one per distinct hand card;
 *  - power: one per distinct unpowered staged card and die kind that can
 *    power it (the first available die of that kind);
 *  - apply: one per distinct staged card and die kind with a utility.
 * Unstaging is left out (staging has no side effect, so it reaches nothing
 * new), as is applying a card with no utility (confirm applies it). Confirm
 * is not a move: it is the session's own `confirmHazardPuzzle`.
 */

import { getHazardCardDef } from '../hazard.content';
import { dieCanPowerCard } from '../hazard.engine';
import type { HazardDieKind } from '../hazard.types';
import type { HazardPuzzleMove, HazardPuzzleSession } from './hazard-puzzle.types';

/** The moves worth trying from a session; none once it is resolved. */
export function hazardPuzzleLegalMoves(session: HazardPuzzleSession): HazardPuzzleMove[] {
    if (session.phase !== 'playing') return [];
    const b = session.board;
    const moves: HazardPuzzleMove[] = [];
    const seenHand = new Set<string>();
    for (const h of b.hand) {
        if (seenHand.has(h.cardId)) continue;
        seenHand.add(h.cardId);
        moves.push({ type: 'stage', uid: h.uid });
    }
    const firstDieOfKind = new Map<HazardDieKind, string>();
    for (const d of b.dice) {
        if (d.state === 'available' && !firstDieOfKind.has(d.kind)) firstDieOfKind.set(d.kind, d.id);
    }
    const dieKind = new Map(b.dice.map((d) => [d.id, d.kind]));
    const seenPower = new Set<string>();
    const seenApply = new Set<string>();
    for (const p of b.play) {
        if (p.applied) continue;
        const def = getHazardCardDef(p.cardId);
        if (p.dieId === null && !def.dead && !seenPower.has(p.cardId)) {
            seenPower.add(p.cardId);
            for (const [kind, dieId] of firstDieOfKind) {
                if (dieCanPowerCard(kind, def)) {
                    moves.push({ type: 'power', uid: p.uid, dieId });
                }
            }
        }
        const applyKey = `${p.cardId}:${p.dieId ? dieKind.get(p.dieId) : '-'}`;
        if (def.effect && !def.dead && !seenApply.has(applyKey)) {
            seenApply.add(applyKey);
            moves.push({ type: 'apply', uid: p.uid });
        }
    }
    return moves;
}
