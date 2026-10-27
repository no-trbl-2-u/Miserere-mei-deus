/**
 * Program cards on the combat board — the presenter half.
 *
 * Pins, against the REAL engine and the live library (no card id is named:
 * cards are found by what they are, so a trial set can come out without
 * touching this file):
 *   · a program face headlines its PAID line, wears its type tag, and draws a
 *     FREE silhouette;
 *   · a hand card whose SACRIFICE would leave the player below 1 VITAE reads
 *     unplayable with the engine's reason, and the overlay says why;
 *   · a Curse is unscrappable on the board's VM;
 *   · a Global in play is listed with its turns left; LEECH and TETHER show on
 *     the foe as chips;
 *   · the log narrates SACRIFICE, HEAL, Globals and EXILE.
 */

import {
    cardLibrary, rollEncounterDice, playCombatCard,
    type Card, type CombatEncounterState,
} from '@mechanics';

import { buildCombatViewModel, selectCombatLogHistory } from '../combat-encounter.engine';
import { programHeadline, programFreeCell } from '../card-program.engine';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

const programCards = cardLibrary.filter((c) => c.program);
const find = (pred: (c: Card) => boolean): Card => {
    const card = programCards.find(pred);
    if (!card) throw new Error('no library card matches');
    return card;
};
const freeText = (c: Card): string => c.program?.free?.text ?? '';
const paidText = (c: Card): string => c.program?.paid?.text ?? '';

const SACRIFICE_FREE = find((c) => /^SACRIFICE \d+, DEAL/.test(freeText(c)));
const CURSE = find((c) => c.cardType === 'curse');
const TURN_GLOBAL = find((c) => c.program?.global?.trigger === 'turn');
const LEECH_CARD = find((c) => /^LEECH \{leech:\d+\}\.$/.test(paidText(c)));
const TETHER_CARD = find((c) => /^TETHER \d+\. SACRIFICE 1/.test(paidText(c)));

const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

function encounter(hand: string[], vitae = 100): CombatEncounterState {
    const deck = [...hand, 'grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'];
    const { combat } = startRealFight(
        realFightFixture({ level: 1, baseStats: { heart: 5, body: 5, mind: 5 } }),
        { deck, seed: 5 },
    );
    const s = rollEncounterDice(combat).state;
    return {
        ...s,
        // The real foe, fattened so no test's damage ends the fight.
        enemy: { ...s.enemy, health: 400, maxHealth: 400 },
        hand: hand.map((cardId, i) => ({ uid: `h${i}`, cardId })),
        player: { ...s.player, health: vitae },
        dice: [{ ...WILD }],
    };
}

const paid = (s: CombatEncounterState, uid: string): CombatEncounterState =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, true, 'w').state;

describe('program faces', () => {
    it('headline a registry keyword as KEYWORD · value and DEAL as a plain hero line', () => {
        expect(programHeadline('SACRIFICE 4, GUARD 12.')).toEqual({ keyword: 'GUARD', value: '12' });
        expect(programHeadline('SACRIFICE 4, DEAL 12.')).toEqual({ keyword: null, value: 'Deal 12' });
        expect(programHeadline('TETHER 3. SACRIFICE 4.')).toEqual({ keyword: 'TETHER', value: '3' });
        expect(programFreeCell('SACRIFICE 2, DEAL 5.')).toEqual({ keyword: 'SACRIFICE', value: '−2' });
        // A FREE line always wears a pill, so a damage-only line reads DEAL.
        expect(programFreeCell('DEAL 3.')).toEqual({ keyword: 'DEAL', value: '3' });
        expect(programFreeCell('DEAL half the VITAE you lost this combat (max 10).')).toEqual({ keyword: 'DEAL', value: 'X' });
    });

    it('a Global and a Curse wear their type tag; the hand card carries its play state', () => {
        const vm = buildCombatViewModel(encounter([TURN_GLOBAL.id, CURSE.id]));
        const [global, curse] = vm.hand;
        expect(global.face.typeTag).toMatch(/^GLOBAL/);
        expect(curse.face.typeTag).toMatch(/^CURSE/);
        expect(curse.play?.unscrappable).toBe(true);
        expect(global.play?.unscrappable).toBe(false);
        expect(global.detail.subtitle).toMatch(/^Global:/);
        expect(curse.detail.systemTerms.map((t) => t.term)).toContain('CURSE');
    });
});

describe('a line that cannot be paid', () => {
    it('reads blocked with the engine\'s reason, on the VM and in the overlay', () => {
        const vm = buildCombatViewModel(encounter([SACRIFICE_FREE.id, CURSE.id], 2));
        const [sac, curse] = vm.hand;
        expect(sac.play?.freeBlock).toMatch(/below 1 VITAE/);
        expect(sac.detail.readNote).toMatch(/FREE can't be played now/);
        expect(curse.play?.freeBlock).toMatch(/below 1 VITAE/);
        expect(curse.play?.paidBlock).toMatch(/below 1 VITAE/);
    });

    it('is playable at full VITAE', () => {
        const vm = buildCombatViewModel(encounter([SACRIFICE_FREE.id], 100));
        expect(vm.hand[0].play?.freeBlock).toBeNull();
    });

    it('carries the engine shortfall on the VM: the cost and the VITAE held, null when payable', () => {
        const cost = Number(/^SACRIFICE (\d+)/.exec(freeText(SACRIFICE_FREE))![1]);
        const low = buildCombatViewModel(encounter([SACRIFICE_FREE.id], 1)).hand[0];
        expect(low.play?.freeShortfall).toEqual({ cost, vitae: 1 });
        const full = buildCombatViewModel(encounter([SACRIFICE_FREE.id], 100)).hand[0];
        expect(full.play?.freeShortfall).toBeNull();
        expect(full.play?.paidShortfall).toBeNull();
    });
});

describe('the board reads the program ledger', () => {
    it('lists a PAID Global as in play for the rest of combat, a FREE one with its turns', () => {
        const s = paid(encounter([TURN_GLOBAL.id]), 'h0');
        const vm = buildCombatViewModel(s);
        expect(vm.globals).toHaveLength(1);
        expect(vm.globals[0].turnsLabel).toBe('∞');
        expect(vm.globals[0].card?.cardId).toBe(TURN_GLOBAL.id);
        const free = buildCombatViewModel(playCombatCard(encounter([TURN_GLOBAL.id]), { uid: 'h0' }, false).state);
        expect(free.globals[0].turnsLabel).toBe('⏳3');
    });

    it('shows LEECH (potency and turns) and TETHER on the foe', () => {
        let s = paid(encounter([LEECH_CARD.id, TETHER_CARD.id, LEECH_CARD.id]), 'h0');
        s = paid(s, 'h1');
        const chips = buildCombatViewModel(s).enemy.effects;
        expect(chips.map((c) => c.glyph.label)).toContain('Leech');
        expect(chips.map((c) => c.glyph.label)).toContain('Tether');
        const one = chips.find((c) => c.glyph.label === 'Leech')!;
        expect(one.duration).toBe(3);
        // A second LEECH stacks: 3 more turns and its potency added.
        s = paid(s, 'h2');
        const two = buildCombatViewModel(s).enemy.effects.find((c) => c.glyph.label === 'Leech')!;
        expect(two.duration).toBe(6);
        expect(two.intensity).toBe(one.intensity * 2);
    });

    it('headlines the next-DEAL bonus and a 2X DEAL', () => {
        expect(programHeadline('🩸 When you SACRIFICE n: your next DEAL this turn deals +n.')).toEqual({ keyword: null, value: 'Next Deal +n' });
        expect(programHeadline('SACRIFICE any amount X (max 12), DEAL 2X.')).toEqual({ keyword: null, value: 'Deal 2X' });
    });

    it('a PAID headline whose amount is not printed reads "varies", never a bare X (GL1 A8)', () => {
        expect(programHeadline('DEAL half the VITAE you lost this combat (max 10).')).toEqual({ keyword: null, value: 'Deal varies' });
        expect(programHeadline('The foe loses VITAE equal to your Conviction.')).toEqual({ keyword: null, value: 'Foe − varies' });
        expect(programHeadline("GUARD equal to the foe's BLIZZARD")).toEqual({ keyword: 'GUARD', value: 'varies' });
        expect(programHeadline('HEAL equal to your Conviction.')).toEqual({ keyword: 'HEAL', value: 'varies' });
        expect(programHeadline('LEECH {leech:0}.')).toEqual({ keyword: 'LEECH', value: 'varies' });
        expect(programHeadline('SACRIFICE any amount X (max 12).')).toEqual({ keyword: 'SACRIFICE', value: 'varies' });
        // A formula and the n amounts keep their letter; the FREE pill keeps its X.
        expect(programHeadline('SACRIFICE any amount X (max 12), DEAL 2X.')).toEqual({ keyword: null, value: 'Deal 2X' });
        expect(programHeadline('SACRIFICE n, GUARD n.')).toEqual({ keyword: 'GUARD', value: 'n' });
        expect(programFreeCell('DEAL half the VITAE you lost this combat (max 10).')).toEqual({ keyword: 'DEAL', value: 'X' });
    });

    it('no live card face headlines a bare X, and the cards that did now say varies (GL1 A8)', () => {
        const bare: string[] = [];
        const varies: string[] = [];
        for (const card of programCards) {
            const vm = buildCombatViewModel(encounter([card.id])).hand.find((c) => c.cardId === card.id);
            if (!vm) continue;
            if (/(^|\s)X$/.test(vm.face.heroText.trim())) bare.push(`${card.id}: ${vm.face.heroText}`);
            if (/varies/.test(vm.face.heroText)) varies.push(card.id);
        }
        expect(bare).toEqual([]);
        expect(varies.length).toBeGreaterThan(0);
    });

    it('narrates SACRIFICE and a Global entering play in the log', () => {
        let s = playCombatCard(encounter([SACRIFICE_FREE.id, TURN_GLOBAL.id]), { uid: 'h0' }, false).state;
        s = paid(s, 'h1');
        const text = selectCombatLogHistory(s).map((l) => l.text).join('\n');
        expect(text).toMatch(/You SACRIFICE \d+ VITAE/);
        expect(text).toMatch(/enters play for the rest of combat/);
    });
});
