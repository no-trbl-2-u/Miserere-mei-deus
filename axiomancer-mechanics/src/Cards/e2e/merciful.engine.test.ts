/**
 * Hermetic E2E — the Merciful trial set (Phase MF1d, acceptance A8, A9, A10 and
 * A11 of `plan/phases/phase_MF1_merciful_trial_set.md`).
 *
 * The set's own test (the only test that names its card ids). Pins:
 *   · the set: 29 cards (10 red / 10 blue / 9 purple) with the drafted names, one
 *     upgrade each as commons, every program opting into the sim's value witness;
 *   · the lane `merciful`: all 29 as its reward pool, and the sims' 20-card test
 *     deck (every Global and every Spell; 7 red, 6 blue, 7 purple);
 *   · the numbers T chose to ship on the faces, and "bursts" never "triggers";
 *   · the cards play RADIANCE and MERCY as ruled (a few by card), P-08's half
 *     rounds down, the Globals fire at the start of the turn, the test deck fights
 *     to an outcome plain and upgraded;
 *   · the Suppliant's Ring opens the lane, an elite drop;
 *   · a save naming a removed card drops it.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { FloatEye, GreenJelly, DeathBeholder, Sandbag_01 } from '../../Enemy/enemy.library';
import { getCardById } from '../cards.library';
import { CARD_LANES, getCardLane, laneRewardPool } from '../card.lanes';
import { canUpgrade, upgradeLimit } from '../card-upgrades';
import { MERCIFUL_SET } from '../library/merciful.cards';
import { cardLinesText } from '../card-rules';
import { relicLaneId } from '../../Items/relic-lanes';
import { getRelicById, relicLibrary } from '../../Items/relic.library';
import { deepClone } from '../../Utils';
import { dropUnknownCardIds } from '../../Game/game.migrate';
import type { GameState } from '../../Game/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn,
} from '../../Combat/combat.engine';
import { programFaceText } from '../../Combat/combat.cards';
import { runOneEncounter } from '../../Combat/combat.encounter.sim';
import { eliteRelicPool } from '../../Combat/combat.rewards';
import { programText } from '../../Combat/stat-scaling';
import type { BaseStats } from '../../Character/types';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const CARDS = MERCIFUL_SET.cards;
const FILLER = 'grey-strike';
const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

/** The drafted names (ledger "Revisions", "Names"), by card id. */
const NAMES: Record<string, string> = {
    'mc-p-01a': 'Searing Mend', 'mc-p-02b': 'Dawn Bulwark', 'mc-p-03b': 'Grace Called Due', 'mc-p-04a': 'What Grace Owes',
    'mc-p-05a': 'Hastened Reckoning', 'mc-p-06a': 'Weight of Grace', 'mc-p-06c': 'Spread the Mantle',
    'mc-p-07b': 'Mended Wrath', 'mc-p-08b': 'Shared Mending', 'mc-p-09c': 'Scarred Resolve', 'mc-p-10c': 'Absolve at Dawn',
    'mc-e-01b': 'Salve', 'mc-e-02c': 'Gentle Debt', 'mc-e-03b': 'Swelling Grace', 'mc-e-04b': 'Open the Wound',
    'mc-e-06a': 'Kindled Prayer', 'mc-e-07b': 'Draw the Fever', 'mc-e-08b': 'Twin Mending', 'mc-e-09b': 'Vigil',
    'mc-e-10b': 'Quiet Breath',
    'mc-m-01b': 'Sanctuary', 'mc-m-02b': 'Offer of Peace', 'mc-m-04b': 'Purifying Light', 'mc-m-05c': 'Deep Well',
    'mc-m-06c': 'Steady Pulse', 'mc-m-07c': 'Kind Cut', 'mc-m-08a': 'Stay the Hand', 'mc-m-09c': 'Call Back a Kindness',
    'mc-m-10c': 'Overflowing Cup',
};

/** The sims' colours (ledger "Revisions"). */
const RED = ['mc-p-01a', 'mc-p-04a', 'mc-p-06a', 'mc-p-07b', 'mc-e-04b', 'mc-e-07b', 'mc-e-10b', 'mc-m-04b', 'mc-m-07c', 'mc-m-10c'];
const BLUE = ['mc-p-02b', 'mc-p-06c', 'mc-p-08b', 'mc-p-09c', 'mc-e-01b', 'mc-e-03b', 'mc-e-09b', 'mc-m-01b', 'mc-m-06c', 'mc-m-09c'];
const PURPLE = ['mc-p-03b', 'mc-p-05a', 'mc-p-10c', 'mc-e-02c', 'mc-e-06a', 'mc-e-08b', 'mc-m-02b', 'mc-m-05c', 'mc-m-08a'];

/** The sims' 20-card test deck (ledger "Revisions", "The test deck"). */
const TEST_DECK = [
    'mc-p-01a', 'mc-p-04a', 'mc-p-06a', 'mc-p-07b', 'mc-e-04b', 'mc-m-07c', 'mc-m-10c',
    'mc-p-08b', 'mc-e-01b', 'mc-e-03b', 'mc-e-09b', 'mc-m-06c', 'mc-m-09c',
    'mc-p-03b', 'mc-p-05a', 'mc-p-10c', 'mc-e-02c', 'mc-e-06a', 'mc-e-08b', 'mc-m-05c',
];

/** A fight on a sandbag with `hand` in hand, one wild die, neutral stats. */
function fight(hand: string[], opts: { vitae?: number; foeVitae?: number; foeMax?: number; stats?: BaseStats } = {}): CombatEncounterState {
    const foeMax = opts.foeMax ?? 500;
    const enemy = { ...deepClone(Sandbag_01), health: opts.foeVitae ?? foeMax, maxHealth: foeMax };
    const player = { ...deepClone(Player), baseStats: opts.stats ?? { heart: 5, body: 5, mind: 5 } };
    let s = initializeCombatEncounter(player, enemy, [...hand, ...Array(10).fill(FILLER)], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: opts.vitae ?? 100, maxHealth: 100 },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 0,
    };
}

const play = (s: CombatEncounterState, uid: string, paid = false): CombatEncounterState =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined).state;

const mercy = (s: CombatEncounterState) => s.program!.mercy;
const face = (id: string) => programFaceText(getCardById(id)!);
const text = (id: string) => cardLinesText(getCardById(id)!);

describe('the Merciful set', () => {
    it('holds the 29 kept cards, 10 red, 10 blue, 9 purple, with the drafted names and the sims\' colours', () => {
        expect(CARDS).toHaveLength(29);
        const by = (c: string) => CARDS.filter(card => card.color === c).length;
        expect([by('body'), by('mind'), by('heart')]).toEqual([10, 10, 9]);
        for (const card of CARDS) {
            expect(card.id, card.id).toMatch(/^mc-[pem]-\d{2}[a-z]$/);
            expect(getCardById(card.id), card.id).toBe(card);
        }
        expect(CARDS.map(c => c.id).sort()).toEqual(Object.keys(NAMES).sort());
        for (const [id, name] of Object.entries(NAMES)) expect(getCardById(id)!.name).toBe(name);
        for (const [ids, colour] of [[RED, 'body'], [BLUE, 'mind'], [PURPLE, 'heart']] as const) {
            for (const id of ids) expect(getCardById(id)!.color, id).toBe(colour);
        }
        expect(CARDS.filter(c => c.cardType === 'global').map(c => c.name).sort())
            .toEqual(['Absolve at Dawn', 'Steady Pulse', 'Vigil']);
        expect(CARDS.filter(c => c.cardType === 'spell').map(c => c.name).sort())
            .toEqual(['Deep Well', 'Grace Called Due', 'Hastened Reckoning', 'Kindled Prayer', 'Swelling Grace']);
    });

    it('all 29 programs opt into the sim\'s value witness, plain and upgraded', () => {
        expect(CARDS.filter(c => c.program?.valueWitness === true)).toHaveLength(29);
        for (const card of CARDS) {
            expect(getCardById(`${card.id}+`)!.program?.valueWitness, `${card.id}+`).toBe(true);
        }
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
        const free = (id: string) => getCardById(id)!.program!.free!.text;
        const paid = (id: string) => getCardById(id)!.program!.paid!.text;
        expect(free('mc-p-01a')).toBe('RADIANCE {radiance:3}');
        expect(paid('mc-p-01a')).toBe('RADIANCE {radiance:7}');
        expect(free('mc-m-09c')).toBe('Return the last MERCY card you played to your hand');
        expect(paid('mc-m-09c')).toBe('Return the last 2 MERCY cards you played to your hand');
        expect(paid('mc-p-03b')).toBe("MERCY {mercy:8}, the foe's MERCY bursts. EXILE");
        expect(paid('mc-p-05a')).toBe("The foe's MERCY bursts. EXILE");
        expect(free('mc-p-08b')).toBe('HEAL {heal:3}, MERCY half all you healed this turn');
        expect(paid('mc-p-08b')).toBe('HEAL {heal:6}, MERCY half all you healed this turn');
        expect(paid('mc-e-01b')).toBe('HEAL {heal:5}, DRAW 2');
        expect(paid('mc-e-03b')).toBe('2× each HEAL this turn. EXILE');
        expect(paid('mc-m-05c')).toBe('+6 max VITAE this combat, HEAL = your missing VITAE. EXILE');
        // T: "bursts", never "triggers"; a number a face prints stays out of the printed word list.
        for (const card of CARDS) {
            const printed = JSON.stringify(cardLinesText(card));
            expect(printed, card.id).not.toMatch(/trigger/i);
            expect(printed, card.id).not.toMatch(/BURST/);
        }
    });

    it('a Global has one effect: playing it PAID only makes it permanent', () => {
        for (const card of CARDS.filter(c => c.program?.global)) {
            expect(Object.keys(card.program!.global!).sort(), card.id).toEqual(['run', 'text', 'trigger']);
            expect(card.program!.global!.trigger, card.id).toBe('turn');
        }
    });

    it('a save that names a removed Merciful card drops it on load', () => {
        const state = {
            version: 0,
            player: { ...deepClone(Player), knownCards: ['mc-p-01a', 'mc-p-01z'], combatRewardCards: ['mc-x-99q'] },
        } as unknown as GameState;
        const out = dropUnknownCardIds(state);
        expect(out.player.knownCards).toEqual(['mc-p-01a']);
        expect(out.player.combatRewardCards).toEqual([]);
    });
});

describe('the lane', () => {
    const lane = getCardLane('merciful')!;

    it('is registered after the Defender and lists all 29 cards, so the reward-pool box offers all 29', () => {
        expect(CARD_LANES.map(l => l.id)).toEqual(['grey', 'blood-price', 'elementalist', 'defender', 'merciful']);
        expect(lane.name).toBe('Merciful');
        expect(lane.cardIds).toEqual(CARDS.map(c => c.id));
        expect(laneRewardPool(['merciful'])).toEqual(CARDS.map(c => c.id));
    });

    it('deals the 20-card test deck: every Global and Spell, 7 red, 6 blue, 7 purple, one copy each', () => {
        expect(lane.testDeck).toEqual(TEST_DECK);
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

describe("the Suppliant's Ring", () => {
    it('opens the Merciful lane while worn, reading "Lane: Merciful" through the lane name, and drops from elites', () => {
        const ring = getRelicById('relic-disarming-plea')!;
        expect(ring.laneId).toBe('merciful');
        expect(relicLaneId(ring)).toBe('merciful');
        expect(getCardLane(ring.laneId!)!.name).toBe('Merciful');
        expect(ring.relicSource).toBe('elite');
        expect(relicLibrary.filter(r => r.laneId === 'merciful')).toEqual([ring]);
        expect(eliteRelicPool({ inventory: [] }).map(r => r.id)).toContain('relic-disarming-plea');
    });
});

describe('the cards play RADIANCE and MERCY', () => {
    it('P-01 FREE: RADIANCE 3 heals 3 and hits for 3 below max, and hits for 0 at full', () => {
        const hurt = fight(['mc-p-01a'], { vitae: 90, foeVitae: 300 });
        const s = play(hurt, 't0');
        expect(s.player.health).toBe(93);
        expect(hurt.enemy.health - s.enemy.health).toBe(3);
        const full = play(fight(['mc-p-01a'], { vitae: 100, foeVitae: 300 }), 't0');
        expect(full.enemy.health).toBe(300);
    });

    it('P-03 PAID: MERCY 8 heals the foe 8 and then the MERCY bursts for 16, EXILE', () => {
        const before = fight(['mc-p-03b'], { foeVitae: 200 });
        const r = playCombatCard({ ...before, dice: [{ ...WILD }] }, { uid: 't0' }, true, 'w');
        expect(r.state.enemy.health).toBe(200 + 8 - 16);
        expect(mercy(r.state)).toMatchObject({ total: 0, clock: 0 });
        expect(r.events).toContainEqual({ kind: 'card-exiled', cardId: 'mc-p-03b' });
    });

    it('MERCY on a foe at full VITAE adds N, whatever the heal restored (E-02 FREE: MERCY 2)', () => {
        const s = play(fight(['mc-e-02c'], { foeVitae: 500, foeMax: 500 }), 't0');
        expect(mercy(s)).toMatchObject({ total: 2, clock: 3 });
        expect(s.enemy.health).toBe(500);
    });

    it('P-04 FREE deals 6 with MERCY on the foe, 3 without; P-06 DEALs its MERCY total, twice on PAID', () => {
        const plain = play(fight(['mc-p-04a'], { foeVitae: 300 }), 't0');
        expect(300 - plain.enemy.health).toBe(3);
        const marked = play(fight(['mc-e-02c', 'mc-p-04a'], { foeVitae: 300 }), 't0');
        expect(mercy(marked).total).toBe(2);
        const owed = play(marked, 't1');
        expect(marked.enemy.health - owed.enemy.health).toBe(6);
        const base = play(fight(['mc-p-03b', 'mc-p-06a'], { foeVitae: 300 }), 't0');
        expect(mercy(base).total).toBe(5);
        const weight = play(base, 't1', true);
        expect(base.enemy.health - weight.enemy.health).toBe(10);
        const free = play(base, 't1');
        expect(base.enemy.health - free.enemy.health).toBe(5);
    });

    it('P-08 gives MERCY equal to half what you healed this turn, rounded down', () => {
        // HEAL 3 below max restores 3: half is 1.
        const s = play(fight(['mc-p-08b'], { vitae: 90, foeVitae: 300 }), 't0');
        expect(s.player.health).toBe(93);
        expect(mercy(s).total).toBe(1);
        // HEAL 6 restores 6: half is 3.
        const big = play(fight(['mc-p-08b'], { vitae: 90, foeVitae: 300 }), 't0', true);
        expect(mercy(big).total).toBe(3);
        // Nothing healed at full VITAE: nothing added.
        expect(mercy(play(fight(['mc-p-08b'], { foeVitae: 300 }), 't0')).total).toBe(0);
    });

    it('M-02 makes the foe YIELDING while it has MERCY (the program ledger marks it)', () => {
        const s = play(fight(['mc-m-02b'], { foeVitae: 300 }), 't0');
        expect(mercy(s).total).toBe(2);
        expect(mercy(s).yielding).toBe(true);
    });

    it('M-05 PAID: +6 max VITAE then HEAL to full; FREE +4 and a card', () => {
        const free = play(fight(['mc-m-05c'], { vitae: 60 }), 't0');
        expect(free.player.maxHealth).toBe(104);
        const paid = play(fight(['mc-m-05c'], { vitae: 60 }), 't0', true);
        expect(paid.player.maxHealth).toBe(106);
        expect(paid.player.health).toBe(106);
    });

    it('the Globals fire at the start of the turn: MERCY and a heal, a heal by half, RADIANCE once the foe has MERCY', () => {
        const start = (hand: string[], opts: { vitae?: number } = {}) => {
            let s = fight(hand, { vitae: opts.vitae ?? 50, foeVitae: 300 });
            for (let i = 0; i < hand.length; i++) s = play(s, `t${i}`);
            s = { ...s, drawPile: [FILLER, FILLER, FILLER], hand: [] };
            return startTurn(resolveThreatPhase(s).state).state;
        };
        const vigil = start(['mc-e-09b']);
        expect(mercy(vigil).total).toBe(1);
        // Steady Pulse: below half VITAE heals 5, otherwise 2 (against the same turn with a filler).
        const gain = (vitae: number): number => start(['mc-m-06c'], { vitae }).player.health - start([FILLER], { vitae }).player.health;
        expect(gain(40)).toBe(5);
        expect(gain(90)).toBe(2);
        // Absolve at Dawn hits only while the foe has MERCY.
        const dry = start(['mc-p-10c']);
        expect(dry.enemy.health).toBe(300);
        const wet = start(['mc-e-02c', 'mc-p-10c']);
        expect(wet.enemy.health).toBeLessThan(300);
    });
});

describe('printed equals applied', () => {
    it('every line prints an Arabic number or a word, never a bare token', () => {
        for (const id of Object.keys(NAMES)) {
            const t = text(id);
            expect(`${t.free} ${t.paid}`, id).not.toMatch(/[{}]/);
            expect(`${face(id).free} ${face(id).paid}`, id).not.toMatch(/\{[a-z]+:/);
        }
    });

    it('RADIANCE and MERCY print the Heart-scaled number they apply, at neutral and raised stats', () => {
        for (const stats of [{ heart: 5, body: 5, mind: 5 }, { heart: 9, body: 5, mind: 5 }]) {
            const printed = (id: string, re: RegExp): number => {
                const line = programText(getCardById(id)!.program!.free!.text, stats);
                return Number(re.exec(line)![1]);
            };
            const radiance = printed('mc-p-01a', /RADIANCE (\d+)/);
            const hit = play(fight(['mc-p-01a'], { vitae: 50, foeVitae: 300, stats }), 't0');
            expect(hit.player.health, JSON.stringify(stats)).toBe(50 + radiance);
            const owed = printed('mc-p-03b', /MERCY (\d+)/);
            expect(mercy(play(fight(['mc-p-03b'], { foeVitae: 300, stats }), 't0')).total, JSON.stringify(stats)).toBe(owed);
            if (stats.heart > 5) expect(radiance).toBeGreaterThan(3);
        }
    });

    it('every card has a line that can be played in some state', () => {
        const never: string[] = [];
        for (const card of CARDS) {
            const s = fight([card.id, FILLER, FILLER, FILLER]);
            const playable = [false, true].some(paid => {
                const r = playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid: 't0' }, paid, paid ? 'w' : undefined);
                return r.state !== s || r.events.length > 0;
            });
            if (!playable) never.push(card.id);
        }
        expect(never).toEqual([]);
    });
});
