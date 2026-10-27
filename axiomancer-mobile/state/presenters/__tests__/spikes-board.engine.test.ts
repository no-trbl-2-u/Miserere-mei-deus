/**
 * The spikes on the board — the presenter half (Phase DF1c, acceptance A5).
 *
 * Pins, against the REAL engine with test cards in the sandbox registry (the
 * Defender trial set itself lands in DF1d, so no trial id is named):
 *   · THORNS (its number) and REFLECT (its %, with its turns left) show on
 *     you as badges, each with its keyword's popup, and follow the spikes as
 *     they stack and drift;
 *   · the log narrates each hit back, each rise, fall and expiry, a random
 *     discard and a RETRIEVE;
 *   · card faces print THORNS, REFLECT and RETRIEVE as tokens with a
 *     silhouette, and the glossary resolves them and "GUARD holds";
 *   · the play VM carries the engine's unpayable random discard.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
    clearSandboxCards, playCombatCard, registerSandboxCards, resolveThreatPhase, rollEncounterDice, spikeReading,
    type Card, type CombatEncounterState, type CombatEvent,
} from '@mechanics';
import type { ProgramCtx } from '@mechanics/Cards/card-program.types';

import {
    buildCombatViewModel, effectChipA11y, selectCombatLogHistory, selectCombatLogLines, spikeChips,
} from '../combat-encounter.engine';
import { programFreeCell, programHeadline, programPlayVM } from '../card-program.engine';
import { glyphShapeFor } from '@/components/combat/glyphShapes';
import { keywordGloss, keywordsInText, systemTermsForCard } from '@/state/combat/keywords';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

function card(id: string, free: (c: ProgramCtx) => void, paid: (c: ProgramCtx) => void = free): Card {
    return {
        id, name: id, color: 'any', description: 'A spikes board test card.',
        tier: 1, rank: 1, cardType: 'skill', targetType: 'enemy',
        program: { free: { text: 'TEST.', run: free }, paid: { text: 'TEST.', run: paid } },
    };
}

const CARDS: Card[] = [
    card('sb-thorns', (c) => { c.thorns(3, { exact: true }); }),
    card('sb-reflect', (c) => c.reflect(50)),
    card('sb-discard', (c) => { c.thorns(1, { exact: true }); }, (c) => { c.discardRandom(2); c.thorns(1, { exact: true }); }),
    card('sb-retrieve', (c) => c.retrieve(1)),
];

beforeAll(() => registerSandboxCards(CARDS));
afterAll(() => clearSandboxCards());

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

function encounter(hand: string[]): CombatEncounterState {
    const deck = [...hand, 'grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];
    const { combat } = startRealFight(
        realFightFixture({ level: 1, baseStats: { heart: 5, body: 5, mind: 5 } }),
        { deck, seed: 5 },
    );
    const s = rollEncounterDice(combat).state;
    return {
        ...s,
        enemy: { ...s.enemy, health: 400, maxHealth: 400 },
        hand: hand.map((cardId, i) => ({ uid: `h${i}`, cardId })),
        player: { ...s.player, health: 100 },
        dice: [{ ...WILD }],
    };
}

const free = (s: CombatEncounterState, uid: string): CombatEncounterState =>
    playCombatCard(s, { uid }, false).state;
const paid = (s: CombatEncounterState, uid: string) =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, true, 'w');

const byId = (chips: { effectId: string; intensity: number }[]): Record<string, number> =>
    Object.fromEntries(chips.map((c) => [c.effectId, c.intensity]));

describe('the spikes on the board', () => {
    it('no spikes, no badges', () => {
        expect(spikeChips(encounter(['sb-thorns']))).toEqual([]);
        expect(buildCombatViewModel(encounter(['sb-thorns'])).player.effects.filter((c) => c.effectId.startsWith('spike-'))).toEqual([]);
    });

    it('shows THORNS and REFLECT on you, with REFLECT as a % with its turns left, each with its popup', () => {
        let s = encounter(['sb-thorns', 'sb-reflect']);
        s = free(s, 'h0');
        s = free(s, 'h1');
        const chips = buildCombatViewModel(s).player.effects.filter((c) => c.effectId.startsWith('spike-'));
        const thorns = chips.find((c) => c.effectId === 'spike-thorns')!;
        const reflect = chips.find((c) => c.effectId === 'spike-reflect')!;
        expect(thorns).toMatchObject({ intensity: 3, duration: 0 });
        expect(thorns.unit).toBeUndefined();
        expect(reflect).toMatchObject({ intensity: 50, unit: '%', duration: 2 });
        for (const c of chips) expect(c.gloss).toBeTruthy();
        expect(effectChipA11y(thorns)).toBe('Thorns, intensity 3, drops by 1 each round');
        expect(effectChipA11y(reflect)).toBe('Reflect, intensity 50%, 2 turns left');
    });

    it("the badges follow the spikes: stacking adds, the foe's turn runs REFLECT down", () => {
        let s = encounter(['sb-thorns', 'sb-thorns', 'sb-reflect']);
        s = free(s, 'h0');
        s = free(s, 'h1');
        s = free(s, 'h2');
        expect(byId(spikeChips(s))).toEqual({ 'spike-thorns': 6, 'spike-reflect': 50 });
        const after = resolveThreatPhase(s).state;
        const r = spikeReading(after.program!.spikes);
        const chips = spikeChips(after);
        expect(chips.find((c) => c.effectId === 'spike-reflect')?.duration).toBe(1);
        expect(r['reflect-turns']).toBe(1);
        expect(byId(chips)['spike-thorns']).toBe(r.thorns);
        // Gone spikes leave no badge behind.
        const gone = { ...after, program: { ...after.program!, spikes: { ...after.program!.spikes, thorns: 0, reflect: 0, reflectTurns: 0 } } };
        expect(spikeChips(gone)).toEqual([]);
    });
});

describe('the spikes in the log', () => {
    const line = (e: CombatEvent) => selectCombatLogLines([e])[0];

    it('narrates each hit back, with its number floating over the foe', () => {
        expect(line({ kind: 'spike-struck', spike: 'thorns', amount: 3 }))
            .toMatchObject({ side: 'enemy', text: 'THORNS deals 3 back to the foe.', float: 'THORNS −3' });
        expect(line({ kind: 'spike-struck', spike: 'reflect', amount: 5 }))
            .toMatchObject({ side: 'enemy', text: 'REFLECT deals 5 back to the foe.', float: 'REFLECT −5' });
    });

    it('narrates the spikes rising, falling and going, on your side and log-only', () => {
        expect(line({ kind: 'spikes-changed', spike: 'thorns', from: 0, to: 3 }))
            .toMatchObject({ side: 'player', text: 'Your THORNS 3.', float: null });
        expect(line({ kind: 'spikes-changed', spike: 'thorns', from: 3, to: 2 }))
            .toMatchObject({ text: 'Your THORNS falls to 2.' });
        expect(line({ kind: 'spikes-changed', spike: 'thorns', from: 1, to: 0 }))
            .toMatchObject({ text: 'Your THORNS is gone.' });
        expect(line({ kind: 'spikes-changed', spike: 'reflect', from: 25, to: 75 }))
            .toMatchObject({ text: 'Your REFLECT rises to 75%.' });
        expect(line({ kind: 'spikes-changed', spike: 'reflect', from: 0, to: 50 }))
            .toMatchObject({ text: 'Your REFLECT 50%.' });
        expect(line({ kind: 'spikes-changed', spike: 'reflect-turns', from: 2, to: 1 }))
            .toMatchObject({ text: 'Your REFLECT has 1 turn left.' });
        // A refresh rides the % line; the expiry is REFLECT's own "is gone".
        expect(selectCombatLogLines([{ kind: 'spikes-changed', spike: 'reflect-turns', from: 1, to: 2 }])).toEqual([]);
        expect(selectCombatLogLines([{ kind: 'spikes-changed', spike: 'reflect-turns', from: 1, to: 0 }])).toEqual([]);
    });

    it("the history carries a card's spikes and its random discard", () => {
        let s = encounter(['sb-thorns', 'sb-discard', 'sb-reflect', 'sb-reflect']);
        s = free(s, 'h0');
        const discarded = paid(s, 'h1');
        const ids = discarded.events.flatMap((e) => (e.kind === 'cards-discarded' ? e.cardIds : []));
        expect(ids).toHaveLength(2);
        s = discarded.state;
        const texts = selectCombatLogHistory(s).map((l) => l.text);
        expect(texts).toContain('Your THORNS 3.');
        expect(texts).toContain(`You discard ${ids[0]} and ${ids[1]} at random.`);
    });

    it('names the card a RETRIEVE brings back', () => {
        const s = free({ ...encounter(['sb-retrieve']), discard: ['grey-strike'] }, 'h0');
        expect(selectCombatLogHistory(s).map((l) => l.text)).toContain('You RETRIEVE A Plain Blow.');
    });

    it('narrates each THORNS hit back from a real foe turn', () => {
        let s = encounter(['sb-thorns']);
        s = free(s, 'h0');
        const res = resolveThreatPhase(s);
        const hits = res.events.filter((e) => e.kind === 'spike-struck');
        expect(hits.length).toBeGreaterThan(0);
        const texts = selectCombatLogHistory(res.state).map((l) => l.text);
        for (const h of hits) expect(texts).toContain(`THORNS deals ${(h as { amount: number }).amount} back to the foe.`);
    });
});

describe('the spikes on card faces and in the glossary', () => {
    it('glosses THORNS, REFLECT and RETRIEVE, finds them in printed text, and explains "GUARD holds"', () => {
        for (const kw of ['Thorns', 'Reflect', 'Retrieve']) expect(keywordGloss(kw)).toBeTruthy();
        expect(keywordsInText('THORNS 2, REFLECT 25%. RETRIEVE 1.')).toEqual(['Thorns', 'Reflect', 'Retrieve']);
        expect(systemTermsForCard('While GUARD holds, your THORNS deal double.', []).map((t) => t.term)).toEqual(['HOLDS']);
        expect(systemTermsForCard('GUARD 6', [])).toEqual([]);
    });

    it('headlines and FREE cells print the spike tokens, each with a silhouette', () => {
        expect(programHeadline('THORNS 3')).toEqual({ keyword: 'THORNS', value: '3' });
        expect(programHeadline('REFLECT 50%')).toEqual({ keyword: 'REFLECT', value: '50%' });
        expect(programHeadline('RETRIEVE 1')).toEqual({ keyword: 'RETRIEVE', value: '1' });
        expect(programHeadline('Double your THORNS')).toEqual({ keyword: 'THORNS', value: '' });
        expect(programFreeCell('THORNS 2')).toEqual({ keyword: 'THORNS', value: '2' });
        expect(programFreeCell('RETRIEVE 1')).toEqual({ keyword: 'RETRIEVE', value: '1' });
        expect(programFreeCell('REFLECT 25%')).toEqual({ keyword: 'REFLECT', value: '25%' });
        for (const kw of ['THORNS', 'REFLECT', 'RETRIEVE']) expect(glyphShapeFor(kw)).not.toBeNull();
    });
});

describe('the play VM reads an unpayable random discard', () => {
    it("names the PAID line's shortfall when the hand is too thin, and nothing when it can pay", () => {
        const thin = encounter(['sb-discard', 'sb-thorns']);
        expect(programPlayVM(thin, 'h0', 'sb-discard').paidDiscard).toEqual({ discard: 2, held: 1 });
        expect(programPlayVM(thin, 'h0', 'sb-discard').paidBlock).toBeTruthy();
        expect(programPlayVM(thin, 'h0', 'sb-discard').freeBlock).toBeNull();
        const full = encounter(['sb-discard', 'sb-thorns', 'sb-reflect']);
        expect(programPlayVM(full, 'h0', 'sb-discard').paidDiscard).toBeNull();
    });
});
