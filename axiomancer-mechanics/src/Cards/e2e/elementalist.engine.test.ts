/**
 * Hermetic E2E — the Elementalist trial set (Phase EL1c, acceptance A5, A6,
 * A7 of `plan/phases/phase_EL1_elementalist_trial_set.md`).
 *
 * The set's own test (the only test that names its card ids). Pins:
 *   · the set: 30 cards (9 red / 11 blue / 10 purple), placeholder names
 *     "Elementalist <slot>", one upgrade each as commons;
 *   · the lane `elementalist`: all 30 as its reward pool, and T's 20-card
 *     test deck (the sims' best-played, 7 red / 7 blue / 6 purple);
 *   · the sims' adjusted numbers on the faces, and printed equals applied
 *     for DEAL, GUARD, HEAL and the elements;
 *   · the cards play the weather as ruled (a few by card), every card has a
 *     playable line, and the test deck fights to an outcome, plain and
 *     upgraded;
 *   · the six cards an upgrade leaves alone (only formulas or resolved
 *     numbers), and a save naming a removed card drops it.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { FloatEye, GreenJelly, DeathBeholder, Sandbag_01 } from '../../Enemy/enemy.library';
import type { BaseStats } from '../../Character/types';
import { getCardById, cardLibrary } from '../cards.library';
import { getCardLane, laneRewardPool } from '../card.lanes';
import { canUpgrade, upgradeCard, upgradeLimit } from '../card-upgrades';
import { ELEMENTALIST_SET } from '../library/elementalist.cards';
import { deepClone } from '../../Utils';
import { dropUnknownCardIds } from '../../Game/game.migrate';
import type { GameState } from '../../Game/types';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, resolveThreatPhase, startTurn,
    handCards, PROGRAM_KIT,
} from '../../Combat/combat.engine';
import { programIllegalReason } from '../../Combat/combat.card-program';
import { runOneEncounter } from '../../Combat/combat.encounter.sim';
import { weatherReading, type ElementState } from '../../Combat/combat.elements';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const CARDS = ELEMENTALIST_SET.cards;
const FILLER = 'grey-strike';
const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };

/** T's test deck (2026-10-24), by ledger slot. */
const TEST_DECK_SLOTS = {
    red: ['P-10', 'P-02', 'P-07', 'P-05', 'E-02', 'P-04', 'P-09'],
    blue: ['M-10', 'E-07', 'M-09', 'P-03', 'P-06', 'M-05', 'M-06'],
    purple: ['M-08', 'E-09', 'M-04', 'P-08', 'E-04', 'E-05'],
};

/** A card's id from its ledger slot, read off its placeholder name. */
const idOf = (slot: string): string => {
    const card = CARDS.find(c => c.name === `Elementalist ${slot}`);
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

const withWeather = (s: CombatEncounterState, patch: Partial<ElementState>): CombatEncounterState =>
    ({ ...s, program: { ...s.program!, el: { ...s.program!.el, ...patch } } });

const play = (s: CombatEncounterState, uid: string, paid: boolean): CombatEncounterState =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, paid, paid ? 'w' : undefined).state;

const weather = (s: CombatEncounterState) => weatherReading(s.program!.el);

describe('the Elementalist set', () => {
    it('holds the 30 kept cards, 9 red, 11 blue, 10 purple, with placeholder names', () => {
        expect(CARDS).toHaveLength(30);
        const by = (c: string) => CARDS.filter(card => card.color === c).length;
        expect([by('body'), by('mind'), by('heart')]).toEqual([9, 11, 10]);
        for (const card of CARDS) {
            expect(card.name, card.id).toMatch(/^Elementalist [PEM]-\d{2}$/);
            expect(card.id, card.id).toMatch(/^el-[pem]-\d{2}[a-z]$/);
            expect(getCardById(card.id), card.id).toBe(card);
        }
        expect(CARDS.filter(c => c.cardType === 'global').map(c => c.name).sort())
            .toEqual(['Elementalist E-06', 'Elementalist E-09', 'Elementalist M-08', 'Elementalist M-10', 'Elementalist P-10']);
        // T's own card keeps the `n` suffix.
        expect(idOf('M-10')).toBe('el-m-10n');
    });

    it('takes one upgrade each, as commons', () => {
        for (const card of CARDS) {
            expect(upgradeLimit(card), card.id).toBe(1);
            expect(canUpgrade(card), card.id).toBe(true);
            expect(getCardById(`${card.id}+`)?.id).toBe(`${card.id}+`);
            expect(getCardById(`${card.id}++`)).toBeUndefined();
        }
    });

    it('prints the sims\' adjusted numbers', () => {
        const free = (slot: string) => getCardById(idOf(slot))!.program!.free!.text;
        const paid = (slot: string) => getCardById(idOf(slot))!.program!.paid!.text;
        expect(free('P-01')).toBe('DEAL {deal:3}.');
        expect(paid('P-02')).toBe('DEAL {deal:9}; INFERNO 4 (you and the foe both burn).');
        expect(paid('E-01')).toBe('INFERNO 4, GUARD {guard:5}.');
        expect(paid('E-05')).toBe('STORM 2, DRAW 2.');
        expect(free('M-07')).toBe('STORM 1.');
        expect(paid('M-07')).toBe('VULNERABLE +{vuln:10}% per STORM on the foe, for 2 turns.');
        expect(getCardById(idOf('P-10'))!.program!.global!.text).toBe('if the foe has two or more elements, DEAL {deal:3}.');
    });

    it('a Global prints one line: PAID equals FREE, paying makes it permanent', () => {
        for (const card of CARDS.filter(c => c.program?.global)) {
            expect(card.program!.global!.paidDelta, card.id).toBeUndefined();
        }
    });

    it('a save that names a removed Elementalist card drops it on load', () => {
        const state = {
            version: 0,
            player: { ...deepClone(Player), knownCards: ['el-p-01b', 'el-p-01z'], combatRewardCards: ['el-x-99q'] },
        } as unknown as GameState;
        const out = dropUnknownCardIds(state);
        expect(out.player.knownCards).toEqual(['el-p-01b']);
        expect(out.player.combatRewardCards).toEqual([]);
    });
});

describe('the lane', () => {
    const lane = getCardLane('elementalist')!;

    it('lists all 30 cards, so the reward-pool box offers all 30', () => {
        expect(lane.name).toBe('Elementalist');
        expect(lane.cardIds).toEqual(CARDS.map(c => c.id));
        expect(laneRewardPool(['elementalist'])).toEqual(CARDS.map(c => c.id));
    });

    it('deals T\'s 20-card test deck: 7 red, 7 blue, 6 purple, one copy each', () => {
        const want = [...TEST_DECK_SLOTS.red, ...TEST_DECK_SLOTS.blue, ...TEST_DECK_SLOTS.purple].map(idOf);
        expect(lane.testDeck).toEqual(want);
        expect(new Set(lane.testDeck).size).toBe(20);
        const colour = (ids: string[]) => ids.map(id => getCardById(id)!.color);
        expect(new Set(colour(TEST_DECK_SLOTS.red.map(idOf)))).toEqual(new Set(['body']));
        expect(new Set(colour(TEST_DECK_SLOTS.blue.map(idOf)))).toEqual(new Set(['mind']));
        expect(new Set(colour(TEST_DECK_SLOTS.purple.map(idOf)))).toEqual(new Set(['heart']));
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

describe('the cards play the weather', () => {
    it('P-02 PAID: the hit, and INFERNO 4 on both sides (you burn half)', () => {
        const s = play(fight([idOf('P-02')]), 't0', true);
        expect(weather(s)['foe-inferno']).toBe(4);
        expect(weather(s)['your-inferno']).toBe(2);
    });

    it('P-01 PAID doubles its hit on a burning foe', () => {
        const cold = fight([idOf('P-01')]);
        const hot = withWeather(cold, { infFoe: 1 });
        const hitCold = cold.enemy.health - play(cold, 't0', true).enemy.health;
        const hitHot = hot.enemy.health - play(hot, 't0', true).enemy.health;
        expect(hitCold).toBeGreaterThan(0);
        expect(hitHot).toBe(2 * hitCold);
    });

    it('M-06 doubles its GUARD while the foe is FROZEN', () => {
        const plain = play(fight([idOf('M-06')]), 't0', false);
        const frozen = play(withWeather(fight([idOf('M-06')]), { blizzard: 9, frozen: true }), 't0', false);
        expect(plain.guard).toBeGreaterThan(0);
        expect(frozen.guard).toBe(2 * (plain.guard ?? 0));
    });

    it('M-04 PAID puts all three elements up at 3', () => {
        const s = play(fight([idOf('M-04')]), 't0', true);
        expect(weather(s)).toMatchObject({ 'foe-inferno': 3, blizzard: 3, storm: 3 });
    });

    it('E-06 in play makes the STORM grow by 1 extra', () => {
        let s = play(fight([idOf('E-06'), idOf('E-05')]), 't0', false);
        s = play(s, 't1', false);
        expect(weather(s).storm).toBe(1);
        s = startTurn(resolveThreatPhase(s).state).state;
        // 1, then +1 growth, +1 from E-06.
        expect(weather(s).storm).toBe(3);
    });

    it('E-08 PAID turns your INFERNO into the foe\'s BLIZZARD and INFERNO', () => {
        const s = play(withWeather(fight([idOf('E-08')]), { infSelf: 3, upSelf: true }), 't0', true);
        expect(weather(s)).toMatchObject({ 'your-inferno': 0, blizzard: 3, 'foe-inferno': 3 });
    });

    it('E-07 PAID STORMs by the real hand size even when DRAW is a no-op (empty deck)', () => {
        const before = { ...fight([idOf('E-07')]), drawPile: [], discard: [] };
        const s = play(before, 't0', true);
        expect(weather(s).storm).toBe(0);
    });
});

/** A face made only of DEAL / GUARD / HEAL / INFERNO / BLIZZARD / STORM numbers. */
const PLAIN = /^(?:(?:DEAL \d+|GUARD \d+|HEAL \d+|INFERNO \d+|BLIZZARD \d+|STORM \d+)[,.;]?\s*)+$/;

function printedEqualsApplied(stats: BaseStats): { checked: number; mismatches: string[] } {
    const mismatches: string[] = [];
    let checked = 0;
    for (const card of CARDS) {
        if (card.program?.global) continue;
        for (const paid of [false, true]) {
            const before = fight([card.id], 100, stats);
            const hand = handCards(before).find(h => h.uid === 't0')!.card;
            const face = (paid ? hand.bottomActionText : hand.topActionText)
                .replace(/^(FREE|PAID) — /, '').replace(/ \(Ash\)$/, '').replace(/ Costs 1 die\.$/, '');
            if (!PLAIN.test(face)) continue;
            checked++;
            const sum = (re: RegExp): number => [...face.matchAll(re)].reduce((a, m) => a + Number(m[1]), 0);
            const want = {
                enemy: sum(/DEAL (\d+)/g), heal: sum(/HEAL (\d+)/g), guard: sum(/GUARD (\d+)/g),
                inferno: sum(/INFERNO (\d+)/g), blizzard: sum(/BLIZZARD (\d+)/g), storm: sum(/STORM (\d+)/g),
            };
            const after = play(before.player.health > 60 ? { ...before, player: { ...before.player, health: 60 } } : before, 't0', paid);
            const w = weather(after);
            const got = {
                enemy: before.enemy.health - after.enemy.health, heal: after.player.health - 60,
                guard: (after.guard ?? 0) - (before.guard ?? 0),
                inferno: w['foe-inferno'], blizzard: w.blizzard, storm: w.storm,
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
        expect(r.checked).toBeGreaterThanOrEqual(10);
        expect(r.mismatches).toEqual([]);
    });

    it('and at raised stats (the face prints the scaled number; the elements stay unscaled)', () => {
        const r = printedEqualsApplied({ body: 8, mind: 7, heart: 9 });
        expect(r.checked).toBeGreaterThanOrEqual(10);
        expect(r.mismatches).toEqual([]);
    });

    it('every card has a line that can be played in some state', () => {
        const never: string[] = [];
        for (const card of CARDS) {
            const states = [fight([card.id], 100), withWeather(fight([card.id], 40), { infShared: 4, blizzard: 3, storm: 2 })];
            const ok = states.some(s => [false, true].some(p => programIllegalReason(s, 't0', p, PROGRAM_KIT) === null));
            if (!ok) never.push(card.id);
        }
        expect(never).toEqual([]);
    });
});

describe('the upgrade', () => {
    it('leaves alone only the six cards whose numbers are formulas or read off the fight', () => {
        const same = CARDS.filter(card => {
            const up = upgradeCard(card)!;
            const text = (c: typeof card) => JSON.stringify([c.program?.free?.text, c.program?.paid?.text, c.program?.global?.text]);
            return text(up) === text(card);
        }).map(c => c.name.replace('Elementalist ', ''));
        expect(same.sort()).toEqual(['E-07', 'E-09', 'M-01', 'M-09', 'P-03', 'P-08']);
    });

    it('grows a hit by MAGNITUDE and an element by 1', () => {
        const up = getCardById(`${idOf('P-02')}+`)!;
        expect(up.program!.paid!.text).toBe('DEAL {deal:13}; INFERNO 5 (you and the foe both burn).');
        expect(getCardById(`${idOf('E-06')}+`)!.program!.global!.stormGrowth).toBe(2);
    });

    it('the library holds no other card named "Elementalist"', () => {
        expect(cardLibrary.filter(c => c.name.startsWith('Elementalist ')).length).toBe(30);
    });
});
