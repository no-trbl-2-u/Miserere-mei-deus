/**
 * Hermetic E2E — the keep causeway's two elites (phase EN1l, A18 and A19).
 *
 * The Toll-Keeper plays the Appendix's three phases with its TOLL as fight
 * state (`enemyRiders.tollOwed`), rising 1 each foe turn; you pay the toll
 * on your own turn (`payTheToll`) as a SACRIFICE equal to the TOLL through
 * the card-program path, which resets it and returns any distrained card.
 *
 * The Tide-Gate plays its three phases with its TIDE (`enemyRiders.tide`,
 * 0 to 5), rising 1 each foe turn (2 in its last loop), and is VULNERABLE 25% at
 * TIDE 0-1.
 *
 * Both fight at `bw-w5`'s level 8, so every number is the Appendix's scaled
 * with `scaleMoveNumber` from the elite's authored level 3. Counts (TOLL,
 * TIDE, hits, BARNACLE) stay as printed. Fixed RNG; no disk / network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import { ENEMY_REGISTRY, TideGate, TollKeeper } from '../enemy.library';
import { PHASES_AUTHORED_LEVEL } from '../enemy-phases';
import { enemyVitae } from '../index';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import {
    initializeCombatEncounter, payTheToll, playCombatCard, rollEncounterDice, resolveThreatPhase, threatHits,
    tollPayBlock, tollPayCost, tollPayShortfall, TOLL_SOURCE,
} from '../../Combat/combat.engine';
import { initProgramLedger, SACRIFICE_FLOOR_REASON } from '../../Combat/combat.card-program';
import { scaleMoveNumber } from '../../Combat/combat.threat';
import { getDamageTakenMultiplier } from '../../Combat/effects';
import { cursesCarried, tideOf, tollOwed, TIDE_MAX } from '../../Combat/combat.enemy-riders';
import type { CombatEncounterState, CombatEvent } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-en1l-free', name: 'QA Causeway', color: 'body',
        description: 'causeway fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 1 },
    },
]);
const DECK = ['qa-en1l-free'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

const keeper: Enemy = { ...scaleEnemyToLevel(TollKeeper, 8), effects: [] };
const gate: Enemy = { ...scaleEnemyToLevel(TideGate, 8), effects: [] };

/** The fight with `foe` about to play `move` (in `phase`, 0 = the opening loop). */
function at(foe: Enemy, move: string, phase = 0): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), foe, DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx, `${foe.name} has no ${move} in phase ${phase}`).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], guard: 0 };
}

/** The foe's turn: what the player lost, and the state after. */
function foeTurn(s: CombatEncounterState): { lost: number; next: CombatEncounterState; events: CombatEvent[] } {
    const res = resolveThreatPhase(s, rng);
    return { lost: s.player.health - res.state.player.health, next: res.state, events: res.events };
}

const s8 = (n: number) => scaleMoveNumber(n, 8, PHASES_AUTHORED_LEVEL.elite);
const withRiders = (s: CombatEncounterState, r: NonNullable<CombatEncounterState['enemyRiders']>): CombatEncounterState =>
    ({ ...s, enemyRiders: { ...s.enemyRiders, ...r } });
const shapeOf = (foe: Enemy) => (foe.phases ?? []).map(p => ({
    danger: p.danger && `${p.danger.kind} ${p.danger.name}`,
    moves: p.moves.map(m => `${m.kind} ${m.name}`),
}));
const vulnerableOn = (e: Enemy): number => e.effects.find(ae => ae.effectId === 'debuff_vulnerable')?.intensity ?? 0;

describe('A18 — the Toll-Keeper plays exactly the Appendix', () => {
    it('three phases: Compound Interest at 60%, Seize the Causeway at 30%', () => {
        expect(shapeOf(TollKeeper)).toEqual([
            { danger: undefined, moves: ['attack Levy', 'defend Strongbox', 'status Writ'] },
            { danger: 'danger Compound Interest', moves: ['attack Levy', 'attack Distrain'] },
            { danger: 'danger Seize the Causeway', moves: ['attack Levy', 'attack Distrain'] },
        ]);
    });

    it('is a registered level-8 elite with its own id, portrait key and VITAE', () => {
        expect(ENEMY_REGISTRY['toll-keeper']).toBe(TollKeeper);
        expect(TollKeeper).toMatchObject({
            id: 'enemy-toll-keeper', portraitAsset: 'toll-keeper', name: 'The Toll-Keeper', difficulty: 'elite', level: 8,
            description: 'Nobody crosses the causeway without paying. He has never once been paid in coin.',
        });
        expect(keeper.maxHealth).toBe(enemyVitae(8, 'elite'));
    });
});

describe('TOLL: rises 1 each foe turn', () => {
    it('starts at 0 and rises 1 at the end of every foe turn, whatever the move', () => {
        let s = at(keeper, 'Levy');
        expect(tollOwed(s)).toBe(0);
        for (const owed of [1, 2, 3, 4]) {
            s = foeTurn(s).next;
            expect(tollOwed(s)).toBe(owed);
        }
    });

    it('Levy: 5 damage + TOLL, and the third phase\'s Levy adds double TOLL', () => {
        const s = withRiders(at(keeper, 'Levy'), { tollOwed: 3 });
        expect(threatHits(s)).toEqual([s8(5) + 3 * s8(1)]);
        expect(foeTurn(s).lost).toBe(s8(5) + 3 * s8(1));
        expect(threatHits(withRiders(at(keeper, 'Levy', 2), { tollOwed: 3 }))).toEqual([s8(5) + 3 * s8(2)]);
    });

    it('Strongbox: WARD 10. Writ: a BARNACLE Curse into your hand', () => {
        expect(foeTurn(at(keeper, 'Strongbox')).next.enemyWords?.ward).toBe(s8(10));
        expect(foeTurn(at(keeper, 'Writ')).next.hand.filter(h => h.cardId === BARNACLE_ID)).toHaveLength(1);
    });

    it('Compound Interest: 4 damage per Curse in your hand, draw pile and discard', () => {
        const base = at(keeper, 'Compound Interest', 1);
        const s: CombatEncounterState = {
            ...base,
            hand: [{ uid: 'b1', cardId: BARNACLE_ID }],
            drawPile: [BARNACLE_ID, 'qa-en1l-free'],
            discard: [BARNACLE_ID],
        };
        expect(cursesCarried(s)).toBe(3);
        expect(threatHits(s)).toEqual([3 * s8(4)]);
        expect(foeTurn(s).lost).toBe(3 * s8(4));
        expect(threatHits({ ...base, drawPile: [], discard: [] })).toEqual([]);
    });

    it('Distrain: 4 damage and takes a random card (never a Curse) from your hand', () => {
        const s: CombatEncounterState = {
            ...at(keeper, 'Distrain', 1),
            hand: [{ uid: 'b1', cardId: BARNACLE_ID }, { uid: 'h1', cardId: 'qa-en1l-free' }],
        };
        const fired = foeTurn(s);
        expect(fired.lost).toBe(s8(4));
        expect(fired.next.enemyRiders?.distrained).toEqual([{ uid: 'h1', cardId: 'qa-en1l-free' }]);
        expect(fired.next.hand.some(h => h.uid === 'h1')).toBe(false);
        expect(fired.events).toContainEqual({ kind: 'enemy-rider', rider: 'distrain', amount: 1 });
    });

    it('Seize the Causeway: TOLL doubles, then 2 damage per TOLL, then the turn end adds 1', () => {
        const s = withRiders(at(keeper, 'Seize the Causeway', 2), { tollOwed: 3 });
        const hurt = { ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * 0.25) } };
        expect(threatHits(hurt)).toEqual([6 * s8(2)]);
        const fired = foeTurn(hurt);
        expect(fired.lost).toBe(6 * s8(2));
        expect(tollOwed(fired.next)).toBe(7);
    });
});

describe('A18 — paying the toll, through the SACRIFICE path', () => {
    /** Your turn against the keeper with `owed` TOLL. */
    const owing = (owed: number, extra: Partial<CombatEncounterState> = {}): CombatEncounterState =>
        ({ ...withRiders(at(keeper, 'Levy'), { tollOwed: owed }), phase: 'phase-play', ...extra });

    it('a SACRIFICE equal to the TOLL: VITAE paid, the ledger counts it, TOLL back to 0', () => {
        const s = owing(4);
        expect(tollPayBlock(s)).toBeNull();
        expect(tollPayCost(s)).toBe(4);
        const paid = payTheToll(s);
        expect(paid.state.player.health).toBe(s.player.health - 4);
        expect(paid.events).toContainEqual({ kind: 'vitae-sacrificed', cardId: TOLL_SOURCE, amount: 4, counted: 4 });
        expect(paid.state.program?.sacrificeCount).toBe(1);
        expect(paid.state.program?.sacrificePaid).toBe(4);
        expect(tollOwed(paid.state)).toBe(0);
    });

    it('returns every distrained card to your hand', () => {
        const taken = [{ uid: 'h1', cardId: 'qa-en1l-free' }, { uid: 'h2', cardId: 'qa-en1l-free' }];
        const s = withRiders(owing(2, { hand: [] }), { distrained: taken });
        const paid = payTheToll(s).state;
        expect(paid.hand).toEqual(taken);
        expect(paid.enemyRiders?.distrained).toBeUndefined();
    });

    it('TETHER fires on it: the foe takes DEAL equal to the VITAE paid', () => {
        const s = owing(3, { program: { ...initProgramLedger(), tetherUntil: 99, tetherCardId: 'qa-en1l-free' } });
        const paid = payTheToll(s).state;
        expect(s.enemy.health - paid.enemy.health).toBe(3);
    });

    it('a WAIVE makes it cost nothing, and it still counts', () => {
        const s = owing(5, { program: { ...initProgramLedger(), waives: 1 } });
        expect(tollPayCost(s)).toBe(0);
        const paid = payTheToll(s);
        expect(paid.state.player.health).toBe(s.player.health);
        expect(paid.state.program?.sacrificeCount).toBe(1);
        expect(paid.state.program?.waives).toBe(0);
        expect(tollOwed(paid.state)).toBe(0);
    });

    it('is refused loudly with no TOLL owed, and changes nothing', () => {
        const s = owing(0);
        expect(tollPayBlock(s)).toMatch(/no toll is owed/);
        expect(tollPayShortfall(s)).toBeNull();
        const r = payTheToll(s);
        expect(r.events).toEqual([{ kind: 'effect-fizzled', cardId: TOLL_SOURCE, effectId: '', message: tollPayBlock(s) }]);
        expect(r.state.player.health).toBe(s.player.health);
    });

    it('is refused at the SACRIFICE floor: VITAE must be above the TOLL', () => {
        const base = owing(6);
        const low = { ...base, player: { ...base.player, health: 6 } };
        expect(tollPayBlock(low)).toBe(SACRIFICE_FLOOR_REASON);
        expect(tollPayShortfall(low)).toEqual({ cost: 6, vitae: 6 });
        const r = payTheToll(low);
        expect(r.state.player.health).toBe(6);
        expect(tollOwed(r.state)).toBe(6);
        const enough = { ...base, player: { ...base.player, health: 7 } };
        expect(tollPayBlock(enough)).toBeNull();
        expect(tollPayShortfall(enough)).toBeNull();
    });

    it('is refused in a fight with no toll', () => {
        const s = { ...at(gate, 'Wash Over'), phase: 'phase-play' as const };
        expect(tollPayBlock(s)).toMatch(/no toll/);
        expect(payTheToll(s).state.player.health).toBe(s.player.health);
    });

    it('is not a card play: TANGLE does not stop it', () => {
        const s = owing(2, { enemyWords: { ward: 0, brine: 0, leechTurns: 0, leechPotency: 0, tangle: 2 } });
        expect(tollOwed(payTheToll(s).state)).toBe(0);
        // A card's FREE line is still refused under the same TANGLE.
        const card = playCombatCard({ ...s, hand: [{ uid: 'h1', cardId: 'qa-en1l-free' }] }, { uid: 'h1' }, false);
        expect(card.events[0]).toMatchObject({ kind: 'effect-fizzled' });
    });
});

describe('A19 — the Tide-Gate plays exactly the Appendix', () => {
    it('three phases: Spring Tide at 60%, The Gate Opens at 30%', () => {
        expect(shapeOf(TideGate)).toEqual([
            { danger: undefined, moves: ['attack Wash Over', 'defend Sluice', 'status Undertow'] },
            { danger: 'danger Spring Tide', moves: ['attack Wash Over', 'defend Sluice'] },
            { danger: 'danger The Gate Opens', moves: ['attack Wash Over'] },
        ]);
    });

    it('is a registered level-8 elite with its own id, portrait key and VITAE', () => {
        expect(ENEMY_REGISTRY['tide-gate']).toBe(TideGate);
        expect(TideGate).toMatchObject({
            id: 'enemy-tide-gate', portraitAsset: 'tide-gate', name: 'The Tide-Gate', difficulty: 'elite', level: 8,
            description: 'The causeway floods twice a day. The gate decides when.',
        });
        expect(gate.maxHealth).toBe(enemyVitae(8, 'elite'));
    });
});

describe('TIDE 0-5: rises 1 each foe turn, VULNERABLE 25% at TIDE 0-1', () => {
    it('opens at TIDE 0, VULNERABLE 25%', () => {
        const s = at(gate, 'Wash Over');
        expect(tideOf(s)).toBe(0);
        expect(vulnerableOn(s.enemy)).toBe(25);
        expect(getDamageTakenMultiplier(s.enemy)).toBeCloseTo(getDamageTakenMultiplier({ ...s.enemy, effects: [] }) * 1.25);
    });

    it('rises 1 a turn to 5 and holds there; VULNERABLE only while it is 0 or 1', () => {
        let s = at(gate, 'Wash Over');
        const seen: [number, number][] = [];
        for (let k = 0; k < 7; k++) {
            s = foeTurn({ ...s, enemy: { ...s.enemy, health: s.enemy.maxHealth } }).next;
            seen.push([tideOf(s), vulnerableOn(s.enemy)]);
        }
        expect(seen).toEqual([[1, 25], [2, 0], [3, 0], [4, 0], [5, 0], [5, 0], [5, 0]]);
        expect(tideOf(s)).toBe(TIDE_MAX);
    });

    it('Wash Over: 4 damage + TIDE', () => {
        expect(threatHits(withRiders(at(gate, 'Wash Over'), { tide: 3 }))).toEqual([s8(4) + 3 * s8(1)]);
    });

    it('in phase 2 Wash Over hits twice at TIDE 4+', () => {
        expect(threatHits(withRiders(at(gate, 'Wash Over', 1), { tide: 3 }))).toEqual([s8(4) + 3 * s8(1)]);
        expect(threatHits(withRiders(at(gate, 'Wash Over', 1), { tide: 4 }))).toEqual([s8(4) + 4 * s8(1), s8(4) + 4 * s8(1)]);
    });

    it('Sluice: WARD 3 per TIDE, none at TIDE 0', () => {
        expect(foeTurn(withRiders(at(gate, 'Sluice'), { tide: 2 })).next.enemyWords?.ward).toBe(2 * s8(3));
        expect(foeTurn(at(gate, 'Sluice')).next.enemyWords?.ward ?? 0).toBe(0);
    });

    it('Undertow: UNDERTOW on the Mind die', () => {
        expect(foeTurn(at(gate, 'Undertow')).next.enemyWords?.undertow).toBe('mind');
    });

    it('Spring Tide: TIDE jumps to 5, then 3 damage per TIDE, and does not rise that turn', () => {
        const s = withRiders(at(gate, 'Spring Tide', 1), { tide: 2 });
        const hurt = { ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * 0.5) } };
        expect(threatHits(hurt)).toEqual([5 * s8(3)]);
        const fired = foeTurn(hurt);
        expect(fired.lost).toBe(5 * s8(3));
        expect(tideOf(fired.next)).toBe(5);
    });

    it('The Gate Opens: TIDE to 0 and 18 damage, then VULNERABLE 50% for 2 turns (the low tide does not stack on it)', () => {
        const s = withRiders(at(gate, 'The Gate Opens', 2), { tide: 5 });
        const hurt = { ...s, enemy: { ...s.enemy, effects: [], health: Math.floor(s.enemy.maxHealth * 0.25) } };
        const fired = foeTurn(hurt);
        expect(fired.lost).toBe(s8(18));
        expect(tideOf(fired.next)).toBe(0);
        expect(vulnerableOn(fired.next.enemy)).toBe(50);
        // Your two turns: the 50% holds through both, then the low tide is back to 25%.
        const next = foeTurn(fired.next).next;
        expect(tideOf(next)).toBe(2);
        expect(vulnerableOn(next.enemy)).toBe(50);
        expect(vulnerableOn(foeTurn(next).next.enemy)).toBe(0);
    });

    it('in phase 3 the TIDE rises 2 a turn', () => {
        const s = withRiders(at(gate, 'Wash Over', 2), { tide: 0 });
        const hurt = { ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth * 0.2) } };
        expect(tideOf(foeTurn(hurt).next)).toBe(2);
    });
});
