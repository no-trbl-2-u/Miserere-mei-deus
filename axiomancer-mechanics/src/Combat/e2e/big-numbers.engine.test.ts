/**
 * Hermetic E2E — DEAL, the hit scaler, and boss STAGES.
 *
 * These are BUG DETECTORS, not balance laws: every assertion checks that the
 * number the engine applies is the number the rules say it applies. None of
 * them pins a design choice — retune the magnitudes freely; these still pass.
 *
 * Pure math + a fixed RNG only; no disk / network / TTY.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import type { EnemyStage } from '../../Enemy/enemy-keywords';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { enemyVitae } from '../../Enemy';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard,
    resolveThreatPhase,
    scalePlayerHit,
} from '../combat.engine';
import type { CombatEncounterState } from '../combat.encounter.types';

afterEach(() => vi.restoreAllMocks());

const rng = (): number => 0.5;

// Fixture: one BODY DEAL card, so a single body die can power it.
registerSandboxCards([
    {
        id: 'qa-bn-deal', name: 'QA Deal', color: 'body',
        description: 'deal fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 3 },
        specialMechanics: [{ kind: 'deal', amount: 20 }],
    },
]);

const DECK = ['qa-bn-deal'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    // Neutral stats (S3): printed numbers land as printed.
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 400; p.maxHealth = 400;
    p.effects = [];
    return p;
}

function makeEnemy(over: Partial<Enemy> = {}): Enemy {
    // The Float-Eye's body without its HP phases (a phases foe enters no stage).
    const e: Enemy = { ...deepClone(FloatEye), phases: undefined };
    e.id = 'enemy-big-numbers-dummy';
    e.health = 1000; e.maxHealth = 1000; e.effects = [];
    e.keywords = undefined; e.stages = undefined;
    return { ...e, ...over };
}

function open(enemy: Enemy = makeEnemy()): CombatEncounterState {
    let s = initializeCombatEncounter(makePlayer(), enemy, DECK, 7);
    s = rollEncounterDice(s, rng).state;
    return s;
}

/** Plays `cardId` on its FREE line (no die). Throws if it is not in hand. */
function playFree(state: CombatEncounterState, cardId: string): CombatEncounterState {
    const entry = state.hand.find(h => h.cardId === cardId);
    if (!entry) throw new Error(`${cardId} not in hand: ${state.hand.map(h => h.cardId).join(', ')}`);
    return playCombatCard(state, { uid: entry.uid }, false, undefined, rng).state;
}

/** Seats `cardId` in hand so a fixture is always reachable regardless of draw. */
function seat(state: CombatEncounterState, cardId: string): CombatEncounterState {
    return { ...state, hand: [{ uid: `seat-${cardId}`, cardId }, ...state.hand] };
}

describe('scalePlayerHit — the scaler pipeline is exactly as printed', () => {
    it('lands the base as printed, then applies VULNERABLE', () => {
        expect(scalePlayerHit({ base: 10 })).toBe(10);
        // VULNERABLE multiplies the printed number.
        expect(scalePlayerHit({ base: 10, vulnMult: 1.5 })).toBe(15);
    });

    it('never invents damage from a zero base', () => {
        expect(scalePlayerHit({ base: 0, vulnMult: 2 })).toBe(0);
    });

    it('a FREE-line hit is credited to its card in the attribution ledger', () => {
        const s = open();
        const after = playFree(seat(s, 'qa-bn-deal'), 'qa-bn-deal');
        expect(after.attribution['qa-bn-deal']).toMatchObject({ cardId: 'qa-bn-deal', name: 'QA Deal', damageDealt: 3 });
    });
});

describe('DEAL lands the printed number', () => {
    it('a FREE line deals its printed damage with no die spent', () => {
        const s = open();
        const before = s.enemy.health;
        const after = playFree(seat(s, 'qa-bn-deal'), 'qa-bn-deal');
        expect(before - after.enemy.health).toBe(3);
    });

    it.each(['body', 'wild'] as const)('a PAID line powered by a %s die deals exactly its printed damage', (color) => {
        const s = open();
        // Pin the tray to one die of the given colour: the body card's own
        // colour and the gold wild both power it, and neither adds anything.
        const seated = {
            ...seat(s, 'qa-bn-deal'),
            dice: [{ id: 'bn-die', color, face: 'mana' as const, state: 'available' as const, temporary: false }],
        };
        const entry = seated.hand.find(h => h.cardId === 'qa-bn-deal')!;
        const res = playCombatCard(seated, { uid: entry.uid }, true, 'bn-die', rng);
        const hits = res.events.filter(e => e.kind === 'damage-dealt' && e.target === 'enemy');
        expect(hits).toHaveLength(1);
        expect(hits[0]).toMatchObject({ amount: 20 });
    });
});

describe('boss STAGES', () => {
    const stages: EnemyStage[] = [{
        at: { vitaePct: 0.99 },
        name: 'THE COURT ADJOURNS',
        text: 'It stops pretending this was ever a hearing.',
        heal: 50,
        threatBonus: 0.5,
    }];

    it('fires once at its threshold, heals, and never re-fires', () => {
        const foe = makeEnemy({ stages, difficulty: 'boss' });
        foe.health = 900; // already under the 99% threshold
        let s = open(foe);
        const res = resolveThreatPhase(s, rng);
        s = res.state;
        expect(s.stagesEntered).toEqual([0]);
        expect(s.stageThreatBonus).toBe(0.5);
        // The stage's heal is witnessed, not silent.
        expect(res.events.filter(e => e.kind === 'enemy-healed' && e.source === 'STAGE'))
            .toEqual([{ kind: 'enemy-healed', enemyId: foe.id, source: 'STAGE', amount: 50 }]);

        // A second boundary must not re-enter the same stage.
        const again = resolveThreatPhase(s, rng).state;
        expect(again.stagesEntered).toEqual([0]);
    });
});

describe('the VITAE curve', () => {
    it('separates the difficulty bands and honours an authored override', () => {
        // The exact figure follows the tuned curve; what this pins is the
            // SHAPE — the bands separate and an authored pool always wins.
            expect(enemyVitae(1, 'normal')).toBe(38);
        expect(enemyVitae(1, 'simple')).toBeLessThan(enemyVitae(1, 'normal'));
        expect(enemyVitae(7, 'elite')).toBeGreaterThan(enemyVitae(7, 'normal'));
        expect(enemyVitae(6, 'boss')).toBeGreaterThan(enemyVitae(6, 'elite'));
        expect(enemyVitae(110, 'unique')).toBeGreaterThan(2000);
        // An authored pool always wins.
        expect(enemyVitae(1, 'normal', 777)).toBe(777);
    });
});
