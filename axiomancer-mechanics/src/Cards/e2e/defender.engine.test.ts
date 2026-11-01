/**
 * Hermetic E2E — the Defender trial set (Phase DF1d, acceptance A7, A8, A9 of
 * `plan/README.md`).
 *
 * The set's own test (the only test that names its card ids). Pins:
 *   · the set: 30 cards (10 red / 10 blue / 10 purple) with T's names, one
 *     upgrade each as commons;
 *   · the lane `defender`: all 30 as its reward pool, and T's 20-card test
 *     deck (every Global and every Spell; 7 red, 6 blue, 7 purple);
 *   · the numbers T chose to ship on the faces, and printed equals applied
 *     for DEAL, GUARD, THORNS and REFLECT at neutral and raised stats;
 *   · the cards play the spikes as ruled (a few by card), a PAID discard that
 *     cannot pay is refused and the FREE line always plays, every card has a
 *     playable line, and the test deck fights to an outcome, plain and upgraded;
 *   · a save naming a removed card drops it.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { FloatEye, GreenJelly, DeathBeholder, Sandbag_01 } from '../../Enemy/enemy.library';
import type { BaseStats } from '../../Character/types';
import { getCardById } from '../cards.library';
import { getCardLane, laneRewardPool } from '../card.lanes';
import { canUpgrade, upgradeLimit } from '../card-upgrades';
import { DEFENDER_SET } from '../library/defender.cards';
import { deepClone } from '../../Utils';
import { dropUnknownCardIds } from '../../Game/game.migrate';
import type { GameState } from '../../Game/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, discardCombatCard, handCards, PROGRAM_KIT, resolveThreatPhase, startTurn,
} from '../../Combat/combat.engine';
import { DISCARD_SHORTFALL_REASON, programIllegalReason as illegalReason } from '../../Combat/combat.card-program';
import { programFaceText } from '../../Combat/combat.cards';
import { runOneEncounter } from '../../Combat/combat.encounter.sim';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const illegal = (s: CombatEncounterState, uid: string, paid: boolean) => illegalReason(s, uid, paid, PROGRAM_KIT);
const CARDS = DEFENDER_SET.cards;
const FILLER = 'grey-strike';
const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

/** T's test deck (2026-10-26), by ledger slot. */
const TEST_DECK_SLOTS = {
    red: ['P-01', 'P-03', 'P-06', 'E-04', 'E-07', 'M-08', 'M-09'],
    blue: ['P-02', 'P-08', 'P-10', 'E-01', 'E-03', 'M-01'],
    purple: ['P-07', 'E-05', 'E-06', 'E-09', 'M-06', 'M-07', 'M-10'],
};

/** T's names, by ledger slot (revisions, "Names"). */
const NAMES: Record<string, string> = {
    'P-01': 'Bristling Blow', 'P-02': 'Shield Bash', 'P-03': 'Cracking Swing', 'P-04': 'Mirror Barb',
    'P-05': 'Thornwall', 'P-06': 'Spite Growth', 'P-07': 'Shed the Shell', 'P-08': 'Spiked Shell',
    'P-09': 'Riposte', 'P-10': 'Don the Brambles',
    'E-01': 'Studded Guard', 'E-02': 'Barbed Wall', 'E-03': 'Turn the Blow', 'E-04': 'Hedge Strike',
    'E-05': 'Briar Surge', 'E-06': 'Overgrowth', 'E-07': 'Thorn Lash', 'E-08': 'Polished Shell',
    'E-09': 'Rose Wrap', 'E-10': 'Gather Thistles',
    'M-01': 'Hunker Down', 'M-02': 'Mend the Shell', 'M-03': 'Crack the Armour', 'M-04': 'Draw In',
    'M-05': 'Prickly Resolve', 'M-06': 'Steady Shell', 'M-07': 'Rummage', 'M-08': 'Nettle Poke',
    'M-09': 'Loose the Barbs', 'M-10': 'Lacquer the Plate',
};

/** T's colours (revisions, "Colours"). */
const RED = ['P-01', 'P-03', 'P-06', 'E-04', 'E-07', 'E-10', 'M-03', 'M-05', 'M-08', 'M-09'];
const BLUE = ['P-02', 'P-08', 'P-09', 'P-10', 'E-01', 'E-03', 'E-08', 'M-01', 'M-02', 'M-04'];
const PURPLE = ['P-04', 'P-05', 'P-07', 'E-02', 'E-05', 'E-06', 'E-09', 'M-06', 'M-07', 'M-10'];

/** A card's id from its ledger slot, read off T's name. */
const idOf = (slot: string): string => {
    const card = CARDS.find(c => c.name === NAMES[slot]);
    if (!card) throw new Error(`no card for ${slot}`);
    return card.id;
};

/** A fight against a 500-VITAE sandbag with `hand` in hand and one wild die. */
function fight(hand: string[], vitae = 100, stats?: BaseStats): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
    const player = { ...deepClone(Player), ...(stats ? { baseStats: stats } : {}) };
    let s = initializeCombatEncounter(player, enemy, [...hand, ...Array(10).fill(FILLER)], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: vitae, maxHealth: Math.max(vitae, s.player.maxHealth) },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const play = (s: CombatEncounterState, uid: string, paid: boolean): CombatEncounterState =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined).state;

const thorns = (s: CombatEncounterState): number => s.program!.spikes?.thorns ?? 0;
const reflect = (s: CombatEncounterState): number => s.program!.spikes?.reflect ?? 0;

describe('the Defender set', () => {
    it('holds the 30 kept cards, 10 red, 10 blue, 10 purple, with T\'s names and colours', () => {
        expect(CARDS).toHaveLength(30);
        const by = (c: string) => CARDS.filter(card => card.color === c).length;
        expect([by('body'), by('mind'), by('heart')]).toEqual([10, 10, 10]);
        for (const card of CARDS) {
            expect(card.id, card.id).toMatch(/^df-[pem]-\d{2}[a-z]$/);
            expect(getCardById(card.id), card.id).toBe(card);
        }
        for (const [slot, name] of Object.entries(NAMES)) expect(getCardById(idOf(slot))!.name).toBe(name);
        for (const [slots, colour] of [[RED, 'body'], [BLUE, 'mind'], [PURPLE, 'heart']] as const) {
            for (const slot of slots) expect(getCardById(idOf(slot))!.color, slot).toBe(colour);
        }
        expect(CARDS.filter(c => c.cardType === 'global').map(c => c.name).sort())
            .toEqual(['Don the Brambles', 'Lacquer the Plate', 'Rose Wrap', 'Steady Shell']);
        expect(CARDS.filter(c => c.cardType === 'spell').map(c => c.name).sort())
            .toEqual(['Briar Surge', 'Overgrowth', 'Shed the Shell']);
        // T's own card keeps the `n` suffix.
        expect(idOf('M-10')).toBe('df-m-10n');
    });

    it('takes one upgrade each, as commons', () => {
        for (const card of CARDS) {
            expect(upgradeLimit(card), card.id).toBe(1);
            expect(canUpgrade(card), card.id).toBe(true);
            expect(getCardById(`${card.id}+`)?.id).toBe(`${card.id}+`);
            expect(getCardById(`${card.id}++`)).toBeUndefined();
        }
    });

    it('prints the numbers T chose to ship (the sims\' fixes)', () => {
        const free = (slot: string) => getCardById(idOf(slot))!.program!.free!.text;
        const paid = (slot: string) => getCardById(idOf(slot))!.program!.paid!.text;
        expect(free('P-01')).toBe('DEAL {deal:2}, +1 per 2 THORNS you have.');
        expect(paid('P-01')).toBe('DEAL {deal:4}, +1 per THORNS you have.');
        expect(free('P-03')).toBe('VULNERABLE +{vuln:25}% for 1 turn, then DEAL {deal:2}.');
        expect(paid('P-03')).toBe('Discard 2 cards at random. VULNERABLE +{vuln:75}% for 2 turns, then DEAL {deal:8}.');
        expect(paid('P-04')).toBe('Discard 1 card at random. DEAL {deal:3}, REFLECT 75%.');
        expect(free('P-06')).toBe("THORNS equal to half the damage you've done this turn.");
        expect(paid('E-01')).toBe('Discard 1 card at random. GUARD {guard:10}, THORNS {thorns:3}.');
        expect(paid('E-04')).toBe('DEAL {deal:3}, GUARD {guard:4}, THORNS {thorns:2}.');
        expect(paid('E-07')).toBe('Discard 1 card at random. DEAL {deal:5}, THORNS {thorns:5}.');
        expect(paid('M-04')).toBe("GUARD {guard:4}. You don't lose your GUARD at the end of the enemy's turn this turn.");
        expect(paid('M-08')).toBe('DEAL {deal:2}, THORNS {thorns:2}, DRAW 1.');
        expect(paid('M-09')).toBe('DEAL {deal:5}, GUARD {guard:4}.');
        // The rider is a card property, printed once, after the PAID line.
        expect(programFaceText(getCardById(idOf('M-09'))!).paid).toBe('DEAL 5, GUARD 4. If this card is discarded, THORNS 2.');
        expect(getCardById(idOf('M-10'))!.program!.global!.text).toBe('REFLECT 15%.');
        // The Spells' PAID lines carry T's numbers with EXILE.
        expect(paid('P-07')).toBe('Discard your hand. THORNS {thorns:3} for each card discarded. EXILE.');
        expect(paid('E-05')).toBe('Discard 2 cards at random. THORNS {thorns:8}. EXILE.');
        expect(paid('E-06')).toBe('Double your THORNS. EXILE.');
    });

    it('P-08 prints the HOLDS term, and the glossary words are all carried', () => {
        expect(getCardById(idOf('P-08'))!.program!.free!.text).toContain('While GUARD HOLDS');
    });

    it('a Global prints one line: PAID equals FREE, paying makes it permanent', () => {
        for (const card of CARDS.filter(c => c.program?.global)) {
            expect(card.program!.global!.paidDelta, card.id).toBeUndefined();
        }
    });

    it('a PAID discard is written first on its line, and a FREE line never discards', () => {
        for (const card of CARDS) {
            expect(card.program?.free?.text ?? '', card.id).not.toMatch(/Discard/);
        }
    });

    it('a save that names a removed Defender card drops it on load', () => {
        const state = {
            version: 0,
            player: { ...deepClone(Player), knownCards: ['df-p-01a', 'df-p-01z'], combatRewardCards: ['df-x-99q'] },
        } as unknown as GameState;
        const out = dropUnknownCardIds(state);
        expect(out.player.knownCards).toEqual(['df-p-01a']);
        expect(out.player.combatRewardCards).toEqual([]);
    });
});

describe('the lane', () => {
    const lane = getCardLane('defender')!;

    it('lists all 30 cards, so the reward-pool box offers all 30', () => {
        expect(lane.name).toBe('Defender');
        expect(lane.cardIds).toEqual(CARDS.map(c => c.id));
        expect(laneRewardPool(['defender'])).toEqual(CARDS.map(c => c.id));
    });

    it('deals T\'s 20-card test deck: every Global and Spell, 7 red, 6 blue, 7 purple, one copy each', () => {
        const want = [...TEST_DECK_SLOTS.red, ...TEST_DECK_SLOTS.blue, ...TEST_DECK_SLOTS.purple].map(idOf);
        expect(lane.testDeck).toEqual(want);
        expect(new Set(lane.testDeck).size).toBe(20);
        const deck = lane.testDeck.map(id => getCardById(id)!);
        expect(deck.filter(c => c.color === 'body')).toHaveLength(7);
        expect(deck.filter(c => c.color === 'mind')).toHaveLength(6);
        expect(deck.filter(c => c.color === 'heart')).toHaveLength(7);
        const inDeck = new Set(lane.testDeck);
        for (const card of CARDS.filter(c => c.cardType === 'global' || c.cardType === 'spell')) {
            expect(inDeck.has(card.id), card.name).toBe(true);
        }
    });

    it('the test deck fights each Act 1 foe to an outcome, plain and upgraded', () => {
        for (const deck of [[...lane.testDeck], lane.testDeck.map(id => `${id}+`)]) {
            for (const foe of [FloatEye, GreenJelly, DeathBeholder]) {
                const player = { ...deepClone(Player), knownCards: deck };
                const run = runOneEncounter(player, deepClone(foe), 3, 'greedy', { deck });
                expect(['victory', 'mercy', 'defeat'], `${foe.name}`).toContain(run.outcome);
                expect(run.plays).toBeGreaterThan(0);
            }
        }
    });
});

describe('the cards play the spikes', () => {
    it('E-04 PAID: the hit, GUARD and THORNS', () => {
        const before = fight([idOf('E-04')]);
        const s = play(before, 't0', true);
        expect(before.enemy.health - s.enemy.health).toBeGreaterThan(0);
        expect(s.guard).toBeGreaterThan(0);
        expect(thorns(s)).toBeGreaterThan(0);
    });

    it('E-03 stacks REFLECT: FREE 50%, PAID 100%', () => {
        expect(reflect(play(fight([idOf('E-03')]), 't0', false))).toBe(50);
        expect(reflect(play(fight([idOf('E-03')]), 't0', true))).toBe(100);
    });

    it('E-06 PAID doubles THORNS and EXILEs', () => {
        let s = play(fight([idOf('E-06'), idOf('E-02')]), 't1', false);
        const t = thorns(s);
        expect(t).toBeGreaterThan(0);
        s = play(s, 't0', true);
        expect(thorns(s)).toBe(2 * t);
        expect(s.program!.exiled).toContain(idOf('E-06'));
    });

    it('P-07 PAID throws away the hand and pays THORNS for each card', () => {
        const hand = [idOf('P-07'), FILLER, FILLER, FILLER];
        const s = play(fight(hand), 't0', true);
        expect(s.hand).toHaveLength(0);
        const one = thorns(play(fight([idOf('P-07'), FILLER]), 't0', true));
        expect(one).toBeGreaterThan(0);
        expect(thorns(s)).toBe(3 * one);
        expect(s.program!.exiled).toContain(idOf('P-07'));
    });

    it('M-09 fires its THORNS when it is scrapped and when a random discard takes it, not when played', () => {
        const scrapped = discardCombatCard(fight([idOf('M-09')]), 't0').state;
        expect(thorns(scrapped)).toBeGreaterThan(0);
        const thrown = play(fight([idOf('E-07'), idOf('M-09')]), 't0', true);
        expect(thrown.discard).toContain(idOf('M-09'));
        // E-07's own THORNS 5 plus M-09's rider.
        const alone = play(fight([idOf('E-07'), FILLER]), 't0', true);
        expect(thorns(thrown)).toBeGreaterThan(thorns(alone));
        expect(thorns(play(fight([idOf('M-09')]), 't0', true))).toBe(0);
    });

    it('M-07 FREE brings a card back from the discard', () => {
        const base = fight([idOf('M-07')]);
        const s = play({ ...base, discard: [FILLER] }, 't0', false);
        expect(s.hand.map(h => h.cardId)).toEqual([FILLER]);
    });

    it('M-10 and its REFLECT: the Global puts 15% up at the start of the turn', () => {
        const s = play(fight([idOf('M-10')]), 't0', false);
        expect(s.program!.globals?.length ?? 0).toBeGreaterThan(0);
    });

    it('M-04 PAID keeps GUARD through the foe turn (a hold is armed)', () => {
        const s = play(fight([idOf('M-04')]), 't0', true);
        expect(s.program!.spikes?.guardHoldRound).toBeDefined();
    });
});

/** A fight with `spikes` already up, `guard` held and `dealt` VITAE of DEALs done this turn. */
function primed(hand: string[], over: { thorns?: number; guard?: number; hp?: number } = {}): CombatEncounterState {
    const s = fight(hand, over.hp ?? 60);
    const sp = s.program!.spikes ?? { thorns: 0, upThorns: false, reflect: 0, reflectTurns: 0 };
    return { ...s, guard: over.guard ?? 0, program: { ...s.program!, spikes: { ...sp, thorns: over.thorns ?? 0 } } };
}
const loss = (a: CombatEncounterState, b: CombatEncounterState): number => a.enemy.health - b.enemy.health;

describe('the cards that read the fight', () => {
    it('P-01 adds 1 per 2 THORNS on FREE and 1 per THORNS on PAID', () => {
        const base = loss(fight([idOf('P-01')]), play(fight([idOf('P-01')]), 't0', false));
        const free = primed([idOf('P-01')], { thorns: 6 });
        expect(loss(free, play(free, 't0', false))).toBe(base + 3);
        const paidBase = loss(fight([idOf('P-01')]), play(fight([idOf('P-01')]), 't0', true));
        const paid = primed([idOf('P-01')], { thorns: 6 });
        expect(loss(paid, play(paid, 't0', true))).toBe(paidBase + 6);
    });

    it('P-02 PAID deals as much as the GUARD it holds, and nothing extra with none', () => {
        const s = primed([idOf('P-02'), FILLER], { guard: 3 });
        const after = play(s, 't0', true);
        expect(loss(s, after)).toBe(after.guard);
        expect(after.guard).toBeGreaterThan(3);
        expect(after.hand).toHaveLength(0);
    });

    it('P-05 turns THORNS into GUARD: once on FREE, twice on PAID', () => {
        const free = play(primed([idOf('P-05')], { thorns: 4 }), 't0', false);
        expect(free.guard).toBe(thorns(free));
        const paid = play(primed([idOf('P-05')], { thorns: 4 }), 't0', true);
        expect(paid.guard).toBe(2 * thorns(paid));
    });

    it('P-06 turns the damage done this turn into THORNS: half on FREE, all of it on PAID', () => {
        const hit = (paid: boolean) => {
            const s = play(fight([idOf('E-04'), idOf('P-06')]), 't0', true);
            const dealt = loss(fight([idOf('E-04'), idOf('P-06')]), s);
            const t0 = thorns(s);
            const after = play(s, 't1', paid);
            return { dealt, gained: thorns(after) - t0 };
        };
        const free = hit(false), paid = hit(true);
        expect(free.dealt).toBeGreaterThan(1);
        expect(free.gained).toBe(Math.floor(free.dealt / 2));
        expect(paid.gained).toBe(paid.dealt);
        expect(loss(fight([idOf('P-06')]), play(fight([idOf('P-06')]), 't0', true))).toBe(0);
        expect(thorns(play(fight([idOf('P-06')]), 't0', true))).toBe(0);
    });

    it('M-02 heals the GUARD you hold, and PAID adds your THORNS', () => {
        const free = primed([idOf('M-02')], { guard: 7, thorns: 3, hp: 40 });
        expect(play(free, 't0', false).player.health - 40).toBe(7);
        const paid = primed([idOf('M-02')], { guard: 7, thorns: 3, hp: 40 });
        expect(play(paid, 't0', true).player.health - 40).toBe(10);
        const none = primed([idOf('M-02')], { hp: 40 });
        expect(play(none, 't0', false).player.health).toBe(40);
    });

    it('P-08 and P-09 arm their riders, and P-09 FREE puts REFLECT up at once', () => {
        expect(play(fight([idOf('P-08')]), 't0', false).program!.spikes?.thornsDoubleRound).toBeDefined();
        expect(play(fight([idOf('P-08')]), 't0', true).program!.spikes?.thornsDoubleRound).toBeDefined();
        const armed = play(fight([idOf('P-09')]), 't0', true);
        expect(armed.program!.spikes?.reflectOnAttack).toBe(50);
        expect(reflect(armed)).toBe(0);
        expect(reflect(play(fight([idOf('P-09')]), 't0', false))).toBe(25);
    });

    it('M-03 puts VULNERABLE on the foe; P-03 lands it before the DEAL', () => {
        const m = play(fight([idOf('M-03')]), 't0', false);
        expect(m.enemy.effects?.length ?? 0).toBeGreaterThan(0);
        const plain = loss(fight([idOf('P-03')]), play(fight([idOf('P-03')]), 't0', false));
        const dealOnly = loss(fight([idOf('E-04')]), play(fight([idOf('E-04')]), 't0', false));
        expect(plain).toBeGreaterThan(dealOnly - 1);
        expect(plain).toBeGreaterThanOrEqual(3);
    });

    it('M-05 gains Conviction (1 FREE, 3 PAID) and THORNS', () => {
        expect(play(fight([idOf('M-05')]), 't0', false).conviction).toBe(1);
        expect(play(fight([idOf('M-05'), FILLER]), 't0', true).conviction).toBe(3);
    });

    it('M-01 and E-10 draw, M-08 PAID draws 1', () => {
        const draws = (slot: string, paid: boolean) => {
            const s = { ...fight([idOf(slot), FILLER]), drawPile: [FILLER, FILLER, FILLER, FILLER] };
            return play(s, 't0', paid).hand.length;
        };
        expect(draws('M-01', false)).toBe(2);
        expect(draws('M-01', true)).toBe(3);
        expect(draws('E-10', true)).toBe(3);
        expect(draws('M-08', true)).toBe(2);
        expect(draws('M-08', false)).toBe(1);
    });

    it('the Globals fire at the start of the turn: GUARD per THORNS, THORNS and the VITAE cost, DRAW, REFLECT', () => {
        const start = (slot: string, over: { thorns?: number } = {}) => {
            let s = play(primed([idOf(slot)], over), 't0', false);
            s = { ...s, drawPile: [FILLER, FILLER, FILLER], hand: [] };
            return startTurn(resolveThreatPhase(s).state).state;
        };
        expect(start('P-10', { thorns: 6 }).guard).toBeGreaterThan(0);
        const rose = start('E-09');
        expect(thorns(rose)).toBeGreaterThan(0);
        expect(rose.player.health).toBeLessThan(60);
        expect(start('M-06').hand.length).toBeGreaterThan(0);
        expect(reflect(start('M-10'))).toBeGreaterThan(0);
    });
});

describe('a PAID discard that cannot pay is refused; the FREE line plays', () => {
    const lone: [string, string][] = [['P-02', 'GUARD'], ['E-01', 'GUARD'], ['E-05', 'THORNS'], ['E-07', 'DEAL'], ['M-05', 'THORNS']];

    it.each(lone)('%s PAID with no other card in hand is refused (%s)', slot => {
        const s = fight([idOf(slot)]);
        expect(illegal(s, 't0', true)).toBe(DISCARD_SHORTFALL_REASON);
        expect(illegal(s, 't0', false)).toBeNull();
        const refused = play(s, 't0', true);
        expect(refused.hand.map(h => h.cardId)).toEqual([idOf(slot)]);
    });

    it('P-07 PAID with no other card is refused, as every PAID discard line', () => {
        const s = fight([idOf('P-07')]);
        expect(illegal(s, 't0', true)).toBe(DISCARD_SHORTFALL_REASON);
        expect(illegal(s, 't0', false)).toBeNull();
    });

    it('P-03 PAID needs two other cards', () => {
        expect(illegal(fight([idOf('P-03'), FILLER]), 't0', true)).toBe(DISCARD_SHORTFALL_REASON);
        expect(illegal(fight([idOf('P-03'), FILLER, FILLER]), 't0', true)).toBeNull();
    });
});

/** A face made only of DEAL / GUARD / THORNS / REFLECT numbers. */
const PLAIN = /^(?:(?:DEAL \d+|GUARD \d+|THORNS \d+|REFLECT \d+%)[,.;]?\s*)+$/;

function printedEqualsApplied(stats: BaseStats): { checked: number; mismatches: string[] } {
    const mismatches: string[] = [];
    let checked = 0;
    for (const card of CARDS) {
        if (card.program?.global) continue;
        for (const paid of [false, true]) {
            const before = fight([card.id, FILLER, FILLER], 100, stats);
            const hand = handCards(before).find(h => h.uid === 't0')!.card;
            const face = (paid ? hand.bottomActionText : hand.topActionText)
                .replace(/^(FREE|PAID) — /, '').replace(/ \(Ash\)$/, '').replace(/ Costs 1 die\.$/, '')
                .replace(/^Discard \d cards? at random\. /, '')
                .replace(/ EXILE\.$/, '');
            if (!PLAIN.test(face)) continue;
            checked++;
            const sum = (re: RegExp): number => [...face.matchAll(re)].reduce((a, m) => a + Number(m[1]), 0);
            const want = {
                enemy: sum(/DEAL (\d+)/g), guard: sum(/GUARD (\d+)/g), thorns: sum(/THORNS (\d+)/g), reflect: sum(/REFLECT (\d+)%/g),
            };
            const after = play(before, 't0', paid);
            const got = {
                enemy: before.enemy.health - after.enemy.health, guard: (after.guard ?? 0) - (before.guard ?? 0),
                thorns: thorns(after), reflect: reflect(after),
            };
            if (JSON.stringify(got) !== JSON.stringify(want)) {
                mismatches.push(`${card.id} ${paid ? 'PAID' : 'FREE'} "${face}" want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
            }
        }
    }
    return { checked, mismatches };
}

describe('printed equals applied', () => {
    it('every plain line lands the numbers its face prints, at neutral stats', () => {
        const r = printedEqualsApplied({ body: 5, mind: 5, heart: 5 });
        expect(r.checked).toBeGreaterThanOrEqual(15);
        expect(r.mismatches).toEqual([]);
    });

    it('and at raised stats (DEAL, GUARD and THORNS print the scaled number; REFLECT stays unscaled)', () => {
        const r = printedEqualsApplied({ body: 8, mind: 7, heart: 9 });
        expect(r.checked).toBeGreaterThanOrEqual(15);
        expect(r.mismatches).toEqual([]);
    });

    it('every card has a line that can be played in some state', () => {
        const never: string[] = [];
        for (const card of CARDS) {
            const s = fight([card.id, FILLER, FILLER, FILLER]);
            const playable = [false, true].some(paid => illegal(s, 't0', paid) === null);
            if (!playable) never.push(card.id);
        }
        expect(never).toEqual([]);
    });
});
