/**
 * Hermetic E2E: the review fixes carried into phase EN1h from the EN1g PR's
 * not-pass verdict. Each case fails on the code before its fix:
 *   - the Brine-Widow's strip leaves the foe's own INFERNO burning,
 *   - Reflection throws back only the LEECH potency the last play added,
 *   - a hindered foe turn does not reset the curfew's play count,
 *   - a Green Jelly staged as an elite hits exactly as the normal does.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import { BrineWidow, CurfewRinger, GreenJelly } from '../enemy.library';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { sourceAtTier } from '../../World/encounter-tier';
import {
    initializeCombatEncounter, resolveThreatPhase, rollEncounterDice, threatHits,
} from '../../Combat/combat.engine';
import { riderAfterPlay, riderBeforeMove, riderTurnEnd } from '../../Combat/combat.enemy-riders';
import { initProgramLedger } from '../../Combat/combat.card-program';
import { foeInferno, initElementState, yourInferno } from '../../Combat/combat.elements';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;
const DECK = ['grey-strike'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

function at(foe: Enemy, move: string, phase = 0): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), { ...foe, effects: [] }, DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], guard: 0 };
}

describe('EN1g review fixes', () => {
    it('Throw the Salt strips your INFERNO but the foe keeps burning', () => {
        const s = at(scaleEnemyToLevel(BrineWidow, 4), 'Throw the Salt', 1);
        const el = { ...initElementState(), infShared: 4, infFoe: 1, infSelf: 2, upShared: true };
        const armed = { ...s, program: { ...initProgramLedger(), el } };
        expect(foeInferno(el)).toBe(5);
        const rider = armed.threatPhases[armed.currentPhaseIndex].threatAction.rider;
        const after = riderBeforeMove(armed, rider).state.program!.el!;
        expect(yourInferno(after)).toBe(0);
        expect(foeInferno(after)).toBe(5);
    });

    it('Reflection copies the LEECH the last play added, not the whole stack', () => {
        const s = at(scaleEnemyToLevel(GreenJelly, 5), 'Reflection');
        const had = { ...s, program: { ...initProgramLedger(), leechTurns: 2, leechPotency: 3 } };
        const more = { ...s, program: { ...initProgramLedger(), leechTurns: 4, leechPotency: 5 } };
        expect(riderAfterPlay(had, more).state.enemyRiders?.lastStatus).toEqual({ kind: 'leech', turns: 2, potency: 2 });
    });

    it('a hindered foe turn keeps the curfew\'s play count; a real turn resets it', () => {
        expect(riderTurnEnd({ curfew: 2, played: 2 }, 9, true)).toEqual({ curfew: 2, played: 2, dealtMark: 9 });
        expect(riderTurnEnd({ curfew: 2, played: 2 }, 9)).toEqual({ curfew: 2, dealtMark: 9 });
        const s = at(scaleEnemyToLevel(CurfewRinger, 5), 'Toll');
        const petrified = {
            ...s,
            enemyRiders: { curfew: 2, played: 2 },
            enemy: {
                ...s.enemy,
                effects: [{ effectId: 'debuff_petrify', remainingDuration: 2, intensity: 1, appliedAt: 1, tier: 1 as const }],
            },
        };
        const res = resolveThreatPhase(petrified, rng);
        expect(res.state.enemyRiders?.played).toBe(2);
    });

    it('a Green Jelly staged as an elite hits exactly as the normal does', () => {
        const normal = scaleEnemyToLevel(GreenJelly, 5);
        const elite = scaleEnemyToLevel(sourceAtTier(GreenJelly, 'elite'), 5);
        expect(elite.difficulty).toBe('elite');
        for (const move of ['Engulf', 'Show You Your Face']) {
            expect(threatHits(at(elite, move))).toEqual(threatHits(at(normal, move)));
        }
        expect(threatHits(at(elite, 'Engulf')).length).toBeGreaterThan(0);
    });
});
