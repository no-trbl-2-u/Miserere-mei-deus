/**
 * The board glossary: one source (`BOARD_GLOSSARY`) for every word and mark the
 * combat board shows with no text of its own.
 *
 * A1 entries, the sentence cap, numbers pinned to the engine constants, and the
 * rule that an entry the systems glossary or the keyword registry already
 * defines is referenced, not copied. A2 the X wording. A7 the momentum popup's
 * SURGE line, with the forged die read off the engine.
 */
import { describe, expect, it } from '@jest/globals';

import {
    cardLibrary, playCombatCard, rollEncounterDice,
    MOMENTUM_SURGE_LENGTH, SPECIAL_CONVICTION_DEFAULT, type CombatEncounterState,
} from '@mechanics';
import { RESERVE_MAX, RESERVE_PIP_CAP } from '@mechanics/Combat/combat.dice';

import {
    BOARD_GLOSSARY, boardGlossView, keywordGloss, MOMENTUM_GLOSS, SYSTEM_GLOSSARY,
    type BoardTermId,
} from '@/state/combat/keywords';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { dieGlossTerms } from '@/components/combat/encounter/CombatBoard';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';

const sentenceCount = (s: string) => s.split(/[.!?](?:\s+|$)/).filter((t) => t.trim().length > 0).length;
const systemDef = (term: string) => SYSTEM_GLOSSARY.find((s) => s.term === term)?.def;

const REQUIRED: BoardTermId[] = [
    'conviction', 'boon', 'mana', 'miss', 'banked', 'ghost', 'xdie', 'xvaries', 'piles', 'ledger', 'global',
];

describe('A1 — one board glossary source', () => {
    it('has an entry for every term the board opens', () => {
        expect(Object.keys(BOARD_GLOSSARY).sort()).toEqual([...REQUIRED].sort());
    });

    it('no definition is empty, and none runs past two sentences', () => {
        const offenders: string[] = [];
        for (const id of REQUIRED) {
            const { title, def, more } = BOARD_GLOSSARY[id];
            if (title.trim() === '' || def.trim() === '') offenders.push(`${id}: empty`);
            if (sentenceCount(def) > 2) offenders.push(`${id}: ${sentenceCount(def)} sentences`);
            if (more !== null && sentenceCount(more) > 2) offenders.push(`${id}.more: ${sentenceCount(more)} sentences`);
            const all = `${def} ${more ?? ''}`;
            if (all.includes('—')) offenders.push(`${id}: em dash`);
            if (all.includes(';')) offenders.push(`${id}: semicolon`);
            if (/\benemy\b/i.test(all)) offenders.push(`${id}: says "the enemy"`);
        }
        expect(offenders).toEqual([]);
    });

    it('references the systems glossary and the keyword registry, never a copy', () => {
        expect(BOARD_GLOSSARY.conviction.def).toBe(systemDef('CONVICTION ◆'));
        expect(BOARD_GLOSSARY.banked.def).toBe(systemDef('RESERVE & PIPS'));
        expect(BOARD_GLOSSARY.global.def).toBe(systemDef('GLOBAL'));
        expect(BOARD_GLOSSARY.boon.def).toBe(keywordGloss('Boon'));
    });

    it('states the numbers the engine constants hold', () => {
        // The BOON names the weapon as what sets its payload, and no figure of its own.
        expect(BOARD_GLOSSARY.boon.def).toContain('worn weapon');
        // The pip cap and the Reserve size.
        expect(BOARD_GLOSSARY.banked.more).toContain(`up to ${RESERVE_PIP_CAP}`);
        expect(BOARD_GLOSSARY.banked.more).toContain(`holds ${RESERVE_MAX}`);
        expect(keywordGloss('Pip')).toContain(`capped at ${RESERVE_PIP_CAP}`);
        expect(systemDef('RESERVE & PIPS')).toContain(`Up to ${RESERVE_MAX} dice`);
        // Every figure a board definition prints is one of those constants.
        // 1 is the ripening step (`ripenReserve` adds one pip per phase survived).
        const ripenStep = 1;
        const known = new Set([SPECIAL_CONVICTION_DEFAULT, RESERVE_PIP_CAP, RESERVE_MAX, ripenStep]);
        const stray: string[] = [];
        for (const id of REQUIRED) {
            const { def, more } = BOARD_GLOSSARY[id];
            for (const n of `${def} ${more ?? ''}`.match(/\b\d+\b/g) ?? []) {
                if (!known.has(Number(n))) stray.push(`${id}: ${n}`);
            }
        }
        // GLOBAL's "3 turns played FREE" is the card-type rule, not a dice constant.
        expect(stray).toEqual(['global: 3']);
    });

    it('prints the live numbers a touch carries', () => {
        expect(boardGlossView(['conviction'], { conviction: 4 }).live).toBe('You hold ◆ 4.');
        expect(boardGlossView(['piles'], { deck: 9, discard: 2 }).live).toBe('Deck 9, discard 2.');
        expect(boardGlossView(['ledger'], { ledger: { clear: 1, overwhelmed: 2, pending: 3 } }).live)
            .toBe('1 cleared, 2 overwhelmed, 3 ahead.');
        const die = boardGlossView(['boon', 'banked'], { special: "Your weapon's special: +2 Conviction when it powers a card.", pips: 1 });
        expect(die.title).toBe('BOON');
        expect(die.sections[1].title).toBe('BANKED DIE');
        expect(die.live).toBe(`Your weapon's special: +2 Conviction when it powers a card. This die holds 1 of ${RESERVE_PIP_CAP} pips.`);
        expect(boardGlossView(['mana']).live).toBeNull();
    });
});

describe('A2 — the X collision is gone', () => {
    it('WILD / X names the X die as dead and says an X on a card means the amount varies', () => {
        const def = systemDef('WILD / X') ?? '';
        expect(def).toMatch(/X die powers nothing/);
        expect(def).toMatch(/X on a card's line[^.]*varies/);
    });

    it('no glossary text says X powers nothing without saying die', () => {
        const texts = [
            ...SYSTEM_GLOSSARY.map((s) => s.def),
            ...REQUIRED.map((id) => `${BOARD_GLOSSARY[id].def} ${BOARD_GLOSSARY[id].more ?? ''}`),
        ];
        for (const t of texts) {
            expect(t).not.toMatch(/\bX\b(?! die)[^.]*powers nothing/);
        }
    });
});

describe('A7 — the momentum popup names SURGE and the die it forges', () => {
    // A MIND card on a chain already at heart, body: the third node lights.
    const mindCard = cardLibrary.find((c) => c.color === 'mind' && c.cardType !== 'global' && c.cardType !== 'curse');

    it('the third node is the constant the popup states', () => {
        expect(MOMENTUM_SURGE_LENGTH).toBe(3);
        expect(MOMENTUM_GLOSS.surge).toContain('third node');
        expect(MOMENTUM_GLOSS.surge).toContain('SURGES');
    });

    it('the die a SURGE forges is floating, so the tray names it GHOST', () => {
        expect(mindCard).toBeDefined();
        const { combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: [mindCard!.id] }, seed: 16 });
        let s: CombatEncounterState = rollEncounterDice(combat).state;
        s = {
            ...s,
            momentumV2: { color: 'body', length: MOMENTUM_SURGE_LENGTH - 1 },
            hand: [{ uid: 'surge-card', cardId: mindCard!.id }],
            dice: [{ id: 'surge-wild', color: 'wild', face: 'mana', state: 'available', temporary: false }],
        };
        const res = playCombatCard(s, { uid: 'surge-card' }, true, 'surge-wild');
        const surged = res.events.find((e) => e.kind === 'momentum-surged');
        expect(surged).toBeDefined();
        const forged = res.state.dice.find((d) => surged && surged.kind === 'momentum-surged' && d.id === surged.dieId);
        expect(forged?.floating).toBe(true);
        // The board VM carries it as a floating die, which is the GHOST caption and the GHOST gloss.
        const vmDie = buildCombatViewModel(res.state).dice.find((d) => d.id === forged!.id);
        expect(vmDie?.floating).toBe(true);
        expect(dieGlossTerms(vmDie!)).toContain('ghost');
        expect(MOMENTUM_GLOSS.surge).toContain('GHOST');
    });

    it('the forged die lasts until spent or the fight ends, as the engine says', () => {
        expect(MOMENTUM_GLOSS.meta).toContain('until spent or the fight ends');
        expect(MOMENTUM_GLOSS.meta).not.toContain('turn ends');
    });
});
