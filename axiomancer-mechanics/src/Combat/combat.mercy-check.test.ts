/**
 * The mercy check at the lethal blow (D?mercy-at-the-blow, spec 187 A1, A2).
 *
 * Pins: a blow that would kill a normal or elite foe, with the check drawn,
 * leaves it at 1 VITAE with the check open and `finalOutcome` null, whether the
 * blow is a card's FREE line, a die-powered PAID line, or a status tick (the
 * card-played clock on your turn, and the round's tick). While it is open
 * nothing moves: no play, no roll, no turn for the foe, no tick. A boss never
 * asks and draws nothing. FINISH lands on exactly the state of the same blow
 * with no check; SPARE is a win with the foe at 1 VITAE. Payment waits on the
 * answer (`mercyCheckSettled`).
 */

import { afterEach, describe, it, expect, vi } from 'vitest';

import {
    MERCY_CHECK_CHANCE, canAskMercy, chooseMercyCheck, mercyCheckOpen, mercyCheckSettled, offerMercyAtBlow,
} from './combat.mercy-check';
import {
    buildCombatSummary, discardCombatCard, endTurn, playCombatCard, playSignatureSkill, processBetweenPhases,
    resolveCombatPhase, resolveThreatPhase, startTurn, payTheToll, overheatSpentDie,
} from './combat.engine';
import type { CombatEncounterState, CombatManaDie } from './combat.encounter.types';
import type { ActiveEffect } from '../Effects/types';
import type { EnemyDifficulty } from '../Enemy/types';
import { buildFixtureState } from '../test-utils/card-fixture';
import { mockSequentialRng } from '../test-utils/rng';

afterEach(() => vi.restoreAllMocks());

const DIE = 'fx-mercy-die';

/** A clean fight with `cardId` in hand and one wild die, the foe at `vitae`. */
function fight(
    vitae: number, difficulty: EnemyDifficulty, chance: number, cardId = 'grey-strike',
): CombatEncounterState {
    const s = buildFixtureState({ clean: true });
    const die: CombatManaDie = { id: DIE, color: 'wild', state: 'available', temporary: false, face: 'mana' };
    return {
        ...s,
        enemy: { ...s.enemy, health: vitae, difficulty },
        hand: [{ uid: 'under-test', cardId }],
        dice: [die],
        mercyCheckChance: chance,
    };
}

/** The same fight with a status on the foe. */
function withStatus(s: CombatEncounterState, effectId: string, intensity = 1): CombatEncounterState {
    const effect: ActiveEffect = { effectId, remainingDuration: 4, intensity, appliedAt: 0, tier: 1 };
    return { ...s, enemy: { ...s.enemy, effects: [effect] } };
}

interface Source {
    name: string;
    vitae: number;
    setup: (s: CombatEncounterState) => CombatEncounterState;
    blow: (s: CombatEncounterState) => CombatEncounterState;
}

/** Each lethal source, as a function from a fight to the state after the blow. */
const SOURCES: readonly Source[] = [
    {
        name: 'a card (FREE line)',
        vitae: 2,
        setup: s => s,
        blow: s => playCombatCard(s, { uid: 'under-test' }, false).state,
    },
    {
        name: 'a die (PAID line)',
        vitae: 5,
        setup: s => s,
        blow: s => playCombatCard(s, { uid: 'under-test' }, true, DIE).state,
    },
    {
        name: 'a status tick on your turn (POISON on the card-played clock)',
        vitae: 1,
        setup: s => withStatus({ ...s, hand: [{ uid: 'under-test', cardId: 'grey-ward' }] }, 'debuff_poison', 2),
        blow: s => playCombatCard(s, { uid: 'under-test' }, false).state,
    },
    {
        name: 'a status tick at the round\'s end',
        vitae: 1,
        setup: s => withStatus(s, 'debuff_creeping_doom', 2),
        blow: s => processBetweenPhases(s).state,
    },
];

/** Everything but the check's own bookkeeping. */
function sansCheck(s: CombatEncounterState): Omit<CombatEncounterState, 'mercyCheck' | 'mercyCheckChance'> {
    const { mercyCheck: _a, mercyCheckChance: _b, ...rest } = s;
    return rest;
}

describe('the check at the lethal blow (A1)', () => {
    describe.each(SOURCES)('$name', ({ vitae, setup, blow }) => {
        it.each(['normal', 'elite'] as const)('a %s foe stands at 1 VITAE and asks; nothing has ended', (difficulty) => {
            mockSequentialRng(0.5);
            const asked = blow(setup(fight(vitae, difficulty, 1)));
            expect(asked.mercyCheck).toBe('offered');
            expect(mercyCheckOpen(asked)).toBe(true);
            expect(asked.enemy.health).toBe(1);
            expect(asked.finalOutcome).toBeNull();
            expect(asked.phase).toBe('mercy-check');
            expect(asked.log.some(e => e.kind === 'combat-ended')).toBe(false);
            expect(mercyCheckSettled(asked)).toBe(false);
        });

        it('with the check not drawn, the blow kills', () => {
            mockSequentialRng(0.5);
            const killed = blow(setup(fight(vitae, 'normal', 0)));
            expect(killed.finalOutcome).toBe('victory');
            expect(killed.mercyCheck).toBe('none');
            expect(killed.enemy.health).toBeLessThanOrEqual(0);
            expect(mercyCheckSettled(killed)).toBe(true);
        });

        it.each(['boss', 'unique', 'simple'] as const)('a %s foe never asks, even forced', (difficulty) => {
            mockSequentialRng(0.5);
            const killed = blow(setup(fight(vitae, difficulty, 1)));
            expect(killed.finalOutcome).toBe('victory');
            expect(killed.mercyCheck).toBe('none');
        });

        it('FINISH lands on exactly the state of the same blow with no check (A2)', () => {
            mockSequentialRng(0.5);
            const killed = blow(setup(fight(vitae, 'elite', 0)));
            mockSequentialRng(0.5);
            const finished = chooseMercyCheck(blow(setup(fight(vitae, 'elite', 1))), 'finish');
            expect(finished.mercyCheck).toBe('finished');
            expect(sansCheck(finished)).toEqual(sansCheck(killed));
            expect(buildCombatSummary(finished).headline).toBe(buildCombatSummary(killed).headline);
        });

        it('SPARE ends it as a win with the foe at 1 VITAE (A2)', () => {
            mockSequentialRng(0.5);
            const spared = chooseMercyCheck(blow(setup(fight(vitae, 'normal', 1))), 'spare');
            expect(spared.finalOutcome).toBe('victory');
            expect(spared.mercyCheck).toBe('spared');
            expect(spared.phase).toBe('complete');
            expect(spared.enemy.health).toBe(1);
            expect(spared.log[spared.log.length - 1]).toEqual({ kind: 'combat-ended', outcome: 'victory' });
            expect(mercyCheckSettled(spared)).toBe(true);
            expect(buildCombatSummary(spared).headline).toMatch(/spared/);
        });
    });

    it('a blow that leaves the foe standing asks nothing', () => {
        mockSequentialRng(0.5);
        const hit = playCombatCard(fight(10, 'normal', 1), { uid: 'under-test' }, false).state;
        expect(hit.enemy.health).toBe(8);
        expect(hit.mercyCheck).toBeUndefined();
        expect(hit.finalOutcome).toBeNull();
    });
});

describe('while the check is open, nothing moves (A1)', () => {
    /** A fight held on the check, with a second card still in hand. */
    function open(): CombatEncounterState {
        mockSequentialRng(0.5);
        const s = fight(2, 'normal', 1);
        const withMore = { ...s, hand: [...s.hand, { uid: 'second', cardId: 'grey-strike' }] };
        const asked = playCombatCard(withMore, { uid: 'under-test' }, false).state;
        expect(mercyCheckOpen(asked)).toBe(true);
        return asked;
    }

    it('no card plays, FREE or PAID, and none scraps', () => {
        const asked = open();
        expect(playCombatCard(asked, { uid: 'second' }, false).state).toBe(asked);
        expect(playCombatCard(asked, { uid: 'second' }, true, DIE).state).toBe(asked);
        expect(discardCombatCard(asked, 'second').state).toBe(asked);
    });

    it('no roll, no turn end, no signature, no toll, no overheat', () => {
        const asked = { ...open(), conviction: 9 };
        expect(startTurn(asked).state).toBe(asked);
        expect(endTurn(asked).state).toBe(asked);
        expect(playSignatureSkill(asked, 'sig-crimson-circlet').state).toBe(asked);
        expect(payTheToll(asked).state).toBe(asked);
        expect(overheatSpentDie(asked, DIE).state).toBe(asked);
    });

    it('the foe takes no turn and no tick fires on either side', () => {
        const asked = withStatus(open(), 'debuff_creeping_doom', 2);
        expect(resolveThreatPhase(asked).state).toBe(asked);
        expect(processBetweenPhases(asked).state).toBe(asked);
    });

    it('a batch of plays stops at the check, and the foe does not move', () => {
        mockSequentialRng(0.5);
        const s = fight(2, 'normal', 1);
        const withMore = { ...s, hand: [...s.hand, { uid: 'second', cardId: 'grey-strike' }] };
        const r = resolveCombatPhase(withMore, [
            { uid: 'under-test', cardId: 'grey-strike', useBottom: false },
            { uid: 'second', cardId: 'grey-strike', useBottom: false },
        ]);
        expect(mercyCheckOpen(r.state)).toBe(true);
        expect(r.state.hand.some(h => h.uid === 'second')).toBe(true);
        expect(r.state.round).toBe(withMore.round);
    });

    it('answers once: an answered check does not answer again, and a kill has none to answer', () => {
        const spared = chooseMercyCheck(open(), 'spare');
        expect(chooseMercyCheck(spared, 'finish')).toBe(spared);
        const killed = playCombatCard(fight(2, 'normal', 0), { uid: 'under-test' }, false).state;
        expect(chooseMercyCheck(killed, 'spare')).toBe(killed);
    });
});

describe('the draw', () => {
    /** A fight just dealt its lethal blow, not yet ended. */
    function atBlow(difficulty: EnemyDifficulty | undefined): CombatEncounterState {
        const s = buildFixtureState({ clean: true });
        return { ...s, enemy: { ...s.enemy, health: 0, difficulty } };
    }

    function seededRng(seed: number): () => number {
        let state = seed % 2147483647 || 1;
        return () => {
            state = (state * 48271) % 2147483647;
            return state / 2147483647;
        };
    }

    it('asks about as often as the chance, over seeded blows', () => {
        const rng = seededRng(144);
        const runs = 4000;
        let asked = 0;
        for (let i = 0; i < runs; i++) if (offerMercyAtBlow(atBlow('normal'), rng)) asked++;
        expect(asked / runs).toBeGreaterThan(MERCY_CHECK_CHANCE - 0.02);
        expect(asked / runs).toBeLessThan(MERCY_CHECK_CHANCE + 0.02);
    });

    it('splits at the chance: just under asks, at the chance does not', () => {
        expect(offerMercyAtBlow(atBlow('elite'), () => MERCY_CHECK_CHANCE - 0.001)?.mercyCheck).toBe('offered');
        expect(offerMercyAtBlow(atBlow('elite'), () => MERCY_CHECK_CHANCE)).toBeNull();
    });

    it.each(['normal', 'elite'] as const)('a %s foe draws exactly once', (difficulty) => {
        let draws = 0;
        offerMercyAtBlow(atBlow(difficulty), () => { draws++; return 0.5; });
        expect(draws).toBe(1);
        expect(canAskMercy({ difficulty })).toBe(true);
    });

    it.each(['simple', 'boss', 'unique', undefined] as const)('a %s foe never asks and draws nothing', (difficulty) => {
        let draws = 0;
        expect(offerMercyAtBlow(atBlow(difficulty), () => { draws++; return 0; })).toBeNull();
        expect(draws).toBe(0);
        expect(canAskMercy({ difficulty })).toBe(false);
    });

    it('a fight already ended or already asked draws nothing', () => {
        let draws = 0;
        const rng = () => { draws++; return 0; };
        expect(offerMercyAtBlow({ ...atBlow('normal'), finalOutcome: 'victory' }, rng)).toBeNull();
        expect(offerMercyAtBlow({ ...atBlow('normal'), mercyCheck: 'offered' }, rng)).toBeNull();
        expect(draws).toBe(0);
    });
});

describe('mercyCheckSettled', () => {
    it('holds nothing on any other end, and a fight still going is not settled', () => {
        const s = buildFixtureState({ clean: true });
        expect(mercyCheckSettled({ ...s, finalOutcome: 'defeat' })).toBe(true);
        expect(mercyCheckSettled({ ...s, finalOutcome: 'retreat' })).toBe(true);
        expect(mercyCheckSettled({ ...s, finalOutcome: null })).toBe(false);
    });
});
