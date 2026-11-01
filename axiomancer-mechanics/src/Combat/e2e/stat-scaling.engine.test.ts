/**
 * Hermetic E2E — stat scaling.
 *
 * Pins, through the real engine:
 *   - the formula (`scaleAmount`): one-shot `base × stat ÷ 5`, repeating at
 *     half rate, flat never scales, floored, never below 1;
 *   - the worked numbers: A Plain Blow, A Plain Ward, A Plain
 *     Word's VULNERABLE, and a Blow on a marked foe, at four builds;
 *   - VULNERABLE: lasts 2 turns, adds up and refreshes, uncapped;
 *   - the guard: every mechanic kind, rider field and payload key has a
 *     family / scaling kind, and every status a player card applies resolves.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { mockSequentialRng } from '../../test-utils/rng';
import { buildFixtureState } from '../../test-utils/card-fixture';
import { playCombatCard, handCards } from '../combat.engine';
import { cardLibrary } from '../../Cards/cards.library';
import { CARD_SPECIAL_MECHANIC_KINDS } from '../../Cards/types';
import { lookupEffect, applyEffect } from '../../Effects';
import { getDamageTakenMultiplier } from '../effects';
import {
    scaleAmount, MECHANIC_SCALING, RIDER_SCALING, PAYLOAD_SCALING,
    effectScaling, effectFamily, NEUTRAL_STAT, scaleCardForStats,
} from '../stat-scaling';
import { getCardById } from '../../Cards/cards.library';
import type { BaseStats } from '../../Character/types';
import type { CombatEncounterState, CombatManaDie } from '../combat.encounter.types';
import type { ActiveEffect } from '../../Effects/types';

afterEach(() => vi.restoreAllMocks());

const DIE = 'fx-s3-die';

/** Clean fixture, `cardId` in hand, one wild die, the player at `body/mind/heart`. */
function stateFor(cardId: string, [body, mind, heart]: [number, number, number], enemyEffects: ActiveEffect[] = []): CombatEncounterState {
    const s = buildFixtureState({ clean: true });
    const die: CombatManaDie = { id: DIE, color: 'wild', state: 'available', temporary: false, face: 'mana' };
    const stats: BaseStats = { body, mind, heart };
    return {
        ...s,
        player: { ...s.player, baseStats: stats },
        enemy: { ...s.enemy, keywords: [], effects: enemyEffects },
        hand: [{ uid: 'under-test', cardId }],
        dice: [die],
        guard: 0,
    };
}

function paid(cardId: string, build: [number, number, number], enemyEffects: ActiveEffect[] = []) {
    mockSequentialRng(0.5);
    return playCombatCard(stateFor(cardId, build, enemyEffects), { uid: 'under-test' }, true, DIE);
}

function free(cardId: string, build: [number, number, number]) {
    mockSequentialRng(0.5);
    return playCombatCard(stateFor(cardId, build), { uid: 'under-test' }, false);
}

function hitOf(res: ReturnType<typeof playCombatCard>): number | undefined {
    const e = res.events.find(ev => ev.kind === 'damage-dealt' && ev.target === 'enemy');
    return e && 'amount' in e ? e.amount : undefined;
}

function vulnOf(res: ReturnType<typeof playCombatCard>): ActiveEffect | undefined {
    return res.state.enemy.effects.find(a => a.effectId === 'debuff_vulnerable');
}

const vuln = (intensity: number, remainingDuration = 2): ActiveEffect =>
    ({ effectId: 'debuff_vulnerable', intensity, remainingDuration, appliedAt: 0, tier: 1 });

describe('S3 — the formula', () => {
    it('one-shot is base × stat ÷ 5; 5 is neutral', () => {
        expect(scaleAmount(5, NEUTRAL_STAT, 'one-shot')).toBe(5);
        expect(scaleAmount(5, 6, 'one-shot')).toBe(6);
        expect(scaleAmount(5, 47, 'one-shot')).toBe(47);
        expect(scaleAmount(25, 19, 'one-shot')).toBe(95);
    });

    it('repeating is half rate: base × (1 + (stat − 5) ÷ 10)', () => {
        expect(scaleAmount(4, 5, 'repeating')).toBe(4);
        expect(scaleAmount(4, 15, 'repeating')).toBe(8);
        expect(scaleAmount(4, 26, 'repeating')).toBe(12); // 12.4, floored
    });

    it('flat never scales; a positive base never scales below 1', () => {
        expect(scaleAmount(2, 40, 'flat')).toBe(2);
        expect(scaleAmount(2, 1, 'one-shot')).toBe(1);
        expect(scaleAmount(0, 40, 'one-shot')).toBe(0);
    });
});

describe('S3 — the worked numbers (brief §3)', () => {
    // [body, mind, heart] → Blow, Ward, Mark %, Blow on a foe marked by that Mark
    const ROWS: [[number, number, number], number, number, number, number][] = [
        [[5, 5, 5], 5, 5, 25, 6],
        [[32, 5, 5], 32, 5, 25, 40],
        [[47, 5, 5], 47, 5, 25, 59],
        [[19, 19, 19], 19, 19, 95, 37],
        [[26, 5, 26], 26, 5, 130, 60],
    ];

    for (const [build, blow, ward, mark, marked] of ROWS) {
        const label = build.join('/');
        it(`${label}: Blow ${blow}, Ward ${ward}, Mark +${mark}%, marked Blow ${marked}`, () => {
            expect(hitOf(paid('grey-strike', build))).toBe(blow);

            const w = paid('grey-ward', build);
            expect(w.state.guard ?? 0).toBe(ward);

            const m = vulnOf(paid('grey-word', build));
            expect(m?.intensity).toBe(mark);
            expect(m?.remainingDuration).toBe(2);

            expect(hitOf(paid('grey-strike', build, [vuln(mark)]))).toBe(marked);
        });
    }

    it('the FREE lines scale too: Blow 2, Ward 2, Word +10% for 1 turn at 5/5/5; doubled at 10', () => {
        expect(hitOf(free('grey-strike', [5, 5, 5]))).toBe(2);
        expect(hitOf(free('grey-strike', [10, 5, 5]))).toBe(4);
        expect(free('grey-ward', [5, 10, 5]).state.guard ?? 0).toBe(4);
        const w = vulnOf(free('grey-word', [5, 5, 10]));
        expect(w?.intensity).toBe(20);
        expect(w?.remainingDuration).toBe(1);
    });

    it('a stat only scales its own family', () => {
        expect(hitOf(paid('grey-strike', [5, 40, 40]))).toBe(5);
        expect(paid('grey-ward', [40, 5, 40]).state.guard ?? 0).toBe(5);
        expect(vulnOf(paid('grey-word', [40, 40, 5]))?.intensity).toBe(25);
    });
});

describe('S3 — VULNERABLE (D43)', () => {
    const def = lookupEffect('debuff_vulnerable')!;

    it('+25 intensity is +25% damage taken', () => {
        const bearer = { effects: [vuln(25)] } as unknown as Parameters<typeof getDamageTakenMultiplier>[0];
        expect(getDamageTakenMultiplier(bearer)).toBeCloseTo(1.25, 10);
    });

    it('re-applying adds up and refreshes the duration, never extends it', () => {
        const once = applyEffect([], def, 1, { intensityDelta: 25, durationMode: 'additive', durationDelta: 2, uncapped: true });
        const ticked = once.activeEffects.map(a => ({ ...a, remainingDuration: 1 }));
        const twice = applyEffect(ticked, def, 2, { intensityDelta: 25, durationMode: 'additive', durationDelta: 2, uncapped: true });
        expect(twice.activeEffects[0].intensity).toBe(50);
        expect(twice.activeEffects[0].remainingDuration).toBe(2);
        // a shorter application (the FREE line's 1 turn) doesn't cut the clock
        const free1 = applyEffect(twice.activeEffects, def, 3, { intensityDelta: 10, durationMode: 'additive', durationDelta: 1, uncapped: true });
        expect(free1.activeEffects[0].intensity).toBe(60);
        expect(free1.activeEffects[0].remainingDuration).toBe(2);
    });

    it('is uncapped: +130% stacks past the old ×2.0 ceiling and past the intensity clamp', () => {
        const once = paid('grey-word', [5, 5, 26], [vuln(130)]);
        expect(vulnOf(once)?.intensity).toBe(260);
        expect(hitOf(paid('grey-strike', [5, 5, 5], [vuln(260)]))).toBe(18); // 5 × 3.6
    });

    it("a card's own VULNERABLE never boosts that card's hit", () => {
        // Blow lands against the pre-card multiplier, so an unmarked foe takes exactly 5.
        expect(hitOf(paid('grey-strike', [5, 5, 5]))).toBe(5);
    });
});

describe('S3 — the guard: every keyword has a family', () => {
    it('every PAID mechanic kind has a family and a scaling kind', () => {
        for (const kind of CARD_SPECIAL_MECHANIC_KINDS) {
            const row = MECHANIC_SCALING[kind];
            expect(row, kind).toBeDefined();
            expect(['body', 'mind', 'heart', 'grey']).toContain(row.family);
            expect(['one-shot', 'repeating', 'flat']).toContain(row.scaling);
        }
    });

    it('every rider field has a family and a scaling kind', () => {
        for (const [field, row] of Object.entries(RIDER_SCALING)) {
            expect(['body', 'mind', 'heart', 'grey', 'by-target'], field).toContain(row.family);
            expect(['one-shot', 'repeating', 'flat'], field).toContain(row.scaling);
        }
    });

    it('every status a player card applies resolves to a family and a scaling kind', () => {
        for (const card of cardLibrary) {
            const applied: { id: string; self: boolean }[] = [
                ...(card.combatEffects ?? []).map(p => ({ id: p.effectId, self: p.appliedTo === 'self' })),
                ...(card.free?.applyEffect ? [{ id: card.free.applyEffect.effectId, self: card.free.applyEffect.to === 'self' }] : []),
            ];
            for (const { id, self } of applied) {
                const def = lookupEffect(id);
                expect(def, `${card.id} → ${id}`).toBeDefined();
                for (const key of Object.keys(def!.payload)) {
                    expect(PAYLOAD_SCALING[key as keyof typeof PAYLOAD_SCALING], `${id}.${key}`).toBeDefined();
                }
                expect(['one-shot', 'repeating', 'flat']).toContain(effectScaling(def!));
                expect(['mind', 'heart', 'grey']).toContain(effectFamily(def!, self));
            }
        }
    });

    it('the survivors of the purge sit in their D40 families', () => {
        expect(MECHANIC_SCALING.deal).toEqual({ family: 'body', scaling: 'one-shot' });
        expect(MECHANIC_SCALING.guard).toEqual({ family: 'mind', scaling: 'one-shot' });
        const v = lookupEffect('debuff_vulnerable')!;
        expect(effectFamily(v, false)).toBe('heart');
        expect(effectScaling(v)).toBe('one-shot');
        expect(effectScaling(lookupEffect('debuff_poison')!)).toBe('repeating');
        expect(effectScaling(lookupEffect('debuff_bleed')!)).toBe('repeating');
        expect(effectScaling(lookupEffect('debuff_petrify')!)).toBe('flat');
    });
});

describe('S3 — the hand prints final numbers (display only)', () => {
    it('handCards builds each card from its stat-scaled copy', () => {
        const hand = (build: [number, number, number]) =>
            handCards(stateFor('grey-strike', build))[0].card.bottomActionText;
        expect(hand([5, 5, 5])).toMatch(/DEAL 5\./);
        expect(hand([47, 5, 5])).toMatch(/Deal 47\b/);
    });

    it('scaleCardForStats is the identity at neutral stats and never mutates the library card', () => {
        const blow = getCardById('grey-strike')!;
        expect(scaleCardForStats(blow, { body: 5, mind: 5, heart: 5 })).toBe(blow);
        const big = scaleCardForStats(blow, { body: 20, mind: 5, heart: 5 });
        expect(big.specialMechanics).toEqual([{ kind: 'deal', amount: 20 }]);
        expect(big.free?.damage).toBe(8);
        expect(blow.specialMechanics).toEqual([{ kind: 'deal', amount: 5 }]);
    });

    it('play still executes the library card: a scaled face never double-scales', () => {
        // 47 body: the face prints 47 and the hit lands 47, not 47 × 9.4.
        expect(hitOf(paid('grey-strike', [47, 5, 5]))).toBe(47);
    });
});
