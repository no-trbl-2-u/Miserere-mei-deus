/**
 * Hermetic E2E: Chapter 1's cliffs, hamlet and sea cave (phase EN1h, A11 and
 * A12): the Wreck-Picker, the Smokehouse Gutter and the Tithe-Collector play
 * exactly the Appendix's moves, in order, with each move's rider resolved by
 * the engine (`Combat/combat.enemy-riders.ts`).
 *
 * Each foe fights at its Breakwater level, so every number is the Appendix's
 * scaled with `scaleMoveNumber` from the authored level (2 for a normal, 3 for
 * an elite). Counts and percentages stay as printed. Fixed RNG; no disk /
 * network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import { ENEMY_REGISTRY, SmokehouseGutter, TitheCollector, WreckPicker } from '../enemy.library';
import { enemyPhaseTarget, PHASES_AUTHORED_LEVEL } from '../enemy-phases';
import { enemyPhaseKeywords } from '../enemy-keywords';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { payloadDifficulty } from '../../World/encounter-tier';
import { isEliteNode } from '../../World/elite-respawn';
import { BW_ELITE_DRAWS, BW_ENCOUNTER_FOES } from '../../World/MapEvents/content';
import { getNodeEventPool } from '../../World';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import {
    discardCombatCard, initializeCombatEncounter, playSignatureSkill, rollEncounterDice, resolveThreatPhase,
    threatHits,
} from '../../Combat/combat.engine';
import { scaleMoveNumber } from '../../Combat/combat.threat';
import { applyRiderAfterMove } from '../../Combat/combat.enemy-riders';
import { foeInferno, initElementState, yourInferno } from '../../Combat/combat.elements';
import { initProgramLedger } from '../../Combat/combat.card-program';
import type { CombatEncounterState } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-en1h-free', name: 'QA Cliff', color: 'body',
        description: 'cliff fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 1 },
    },
]);
const DECK = ['qa-en1h-free'];
const CARD = 'qa-en1h-free';

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

/** The foe as its Breakwater node fights it. */
function atLevel(foe: Enemy, level: number): Enemy {
    return { ...scaleEnemyToLevel(foe, level), effects: [] };
}

/** Opens the fight with the foe about to play `move` (in `phase`, 0 = the opening loop). */
function at(foe: Enemy, move: string, phase = 0): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), foe, DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx, `${foe.id} has no ${move} in phase ${phase}`).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], guard: 0, conviction: 0 };
}

/** The foe's turn: what the player lost, and the state after. */
function foeTurn(s: CombatEncounterState, roll: () => number = rng) {
    const res = resolveThreatPhase(s, roll);
    return { lost: s.player.health - res.state.player.health, next: res.state, events: res.events };
}

const cards = (n: number) => Array.from({ length: n }, (_u, i) => ({ uid: `h${i}`, cardId: CARD }));
const pile = (n: number) => Array.from({ length: n }, () => CARD);
const n6 = (n: number) => scaleMoveNumber(n, 6, PHASES_AUTHORED_LEVEL.normal);
const e5 = (n: number) => scaleMoveNumber(n, 5, PHASES_AUTHORED_LEVEL.elite);
const liens = (s: CombatEncounterState) => s.hand.filter(h => h.cardId === BARNACLE_ID).length;

/** Every foe's phases as `kind name` lines, and its DANGERs. */
function shape(foe: Enemy): { moves: string[][]; dangers: (string | undefined)[] } {
    return {
        moves: (foe.phases ?? []).map(p => p.moves.map(m => `${m.kind} ${m.name}`)),
        dangers: (foe.phases ?? []).map(p => p.danger && `${p.danger.kind} ${p.danger.name}`),
    };
}

describe('A11 and A12 — the three foes play exactly the Appendix', () => {
    it('the Wreck-Picker: Everything Washes Up at 30%, Pick Over takes 2', () => {
        expect(shape(WreckPicker)).toEqual({
            moves: [
                ['attack Pick Over', 'attack Hurl Flotsam', 'defend Hide in the Hoard', 'status Gull-call'],
                ['attack Pick Over', 'attack Hurl Flotsam', 'defend Hide in the Hoard', 'status Gull-call'],
            ],
            dangers: [undefined, 'danger Everything Washes Up'],
        });
        expect(WreckPicker.phases![0].moves[0].rider).toEqual({ kind: 'hoard-pick', cards: 1, from: 'random' });
        expect(WreckPicker.phases![1].moves[0].rider).toEqual({ kind: 'hoard-pick', cards: 2, from: 'random' });
    });

    it('the Smokehouse Gutter: Light the Racks at 30%, Gut Hook always lands its BARNACLE', () => {
        expect(shape(SmokehouseGutter)).toEqual({
            moves: [
                ['attack Smoke Lash', 'attack Gut Hook', 'defend Hang to Cure', 'status Choking Smoke'],
                ['attack Smoke Lash', 'attack Gut Hook', 'defend Hang to Cure', 'status Choking Smoke'],
            ],
            dangers: [undefined, 'danger Light the Racks'],
        });
        expect(SmokehouseGutter.phases![0].moves[1].rider).toEqual({ kind: 'barnacle-on-hit' });
        expect(SmokehouseGutter.phases![1].moves[1].barnacle).toBe(1);
        expect(SmokehouseGutter.phases![1].moves[1].rider).toBeUndefined();
    });

    it('the Tithe-Collector: three phases, Audit at 60%, Foreclose at 30%', () => {
        expect(shape(TitheCollector)).toEqual({
            moves: [
                ['attack Assess', 'attack Garnish', 'defend Ledger Shield'],
                ['status Lien', 'attack Assess', 'attack Garnish'],
                ['attack Seize Goods', 'attack Assess'],
            ],
            dangers: [undefined, 'danger Audit', 'danger Foreclose'],
        });
    });

    it('each is a registered foe with its own id and portrait key; the collector is a real elite', () => {
        for (const [slug, foe, tier] of [
            ['wreck-picker', WreckPicker, 'normal'], ['smokehouse-gutter', SmokehouseGutter, 'normal'],
            ['tithe-collector', TitheCollector, 'elite'],
        ] as const) {
            expect(ENEMY_REGISTRY[slug], slug).toBe(foe);
            expect(foe.id).toBe(`enemy-${slug}`);
            expect(foe.portraitAsset).toBe(slug);
            expect(foe.difficulty).toBe(tier);
            expect(foe.phases!.length).toBe(tier === 'elite' ? 3 : 2);
        }
        // Elite lines: 60% then 30%.
        const phase = (hp: number) => enemyPhaseTarget({ ...TitheCollector, health: hp, maxHealth: 100 });
        expect([phase(61), phase(60), phase(31), phase(30)]).toEqual([0, 1, 1, 2]);
    });

    it('their enemy words are the words their moves carry', () => {
        // The hoard's WARD is a rider, shown by the hoard counter, not a move word.
        expect(enemyPhaseKeywords(WreckPicker)).toEqual(['undertow']);
        expect(enemyPhaseKeywords(SmokehouseGutter)).toEqual(['mend', 'tangle', 'barnacle']);
        expect(enemyPhaseKeywords(TitheCollector)).toEqual(['barnacle']);
    });

    it('the nodes bind them, every foe under level 10, and the sea cave is an elite node', () => {
        expect(BW_ENCOUNTER_FOES['bw-l1']).toEqual({ slug: 'wreck-picker', level: 6 });
        expect(BW_ENCOUNTER_FOES['bw-d1']).toEqual({ slug: 'smokehouse-gutter', level: 6 });
        expect(BW_ENCOUNTER_FOES['bw-d3']).toEqual({ slug: 'wreck-picker', level: 6 });
        // The sea cave draws the Tithe-Collector or the Cave Choir (EN1j's pair), 50/50.
        expect(BW_ELITE_DRAWS['bw-c1']).toContainEqual({ slug: 'tithe-collector', level: 5 });
        const entries = getNodeEventPool('coastal-continent', 'breakwater', 'bw-c1')!.entries;
        const payload = entries.map(e => e.payload).find(p => (p as { enemySlug?: string }).enemySlug === 'tithe-collector');
        expect(payload).toMatchObject({ kind: 'encounter', enemySlug: 'tithe-collector', level: 5 });
        expect(payloadDifficulty(payload as Parameters<typeof payloadDifficulty>[0])).toBe('elite');
        expect(isEliteNode('coastal-continent', 'breakwater', 'bw-c1')).toBe(true);
    });
});

describe('the Wreck-Picker\'s riders (level 6)', () => {
    const picker = atLevel(WreckPicker, 6);

    it('Pick Over: 5, and a random card from your discard goes into its hoard', () => {
        const s = { ...at(picker, 'Pick Over'), discard: pile(3) };
        expect(threatHits(s)).toEqual([n6(5)]);
        const res = foeTurn(s);
        expect(res.lost).toBe(n6(5));
        expect(res.next.enemyRiders?.hoard).toEqual([CARD]);
        // The discard shrinks by the card taken (read before the foe's turn end redraws).
        const rider = s.threatPhases[s.currentPhaseIndex]!.threatAction.rider;
        const planned = applyRiderAfterMove(s, rider, { fullyBlocked: false, guardBefore: 0, rng }).state;
        expect(planned.discard.length).toBe(2);
        expect(res.events).toContainEqual({ kind: 'enemy-rider', rider: 'hoard-pick', amount: 1 });
        // An empty discard leaves nothing to take.
        expect(foeTurn({ ...s, discard: [] }).next.enemyRiders?.hoard).toBeUndefined();
    });

    it('Pick Over takes 2 cards in its second phase, never more than the discard holds', () => {
        const s = { ...at(picker, 'Pick Over', 1), discard: pile(3) };
        expect(foeTurn(s).next.enemyRiders?.hoard).toHaveLength(2);
        expect(foeTurn({ ...s, discard: pile(1) }).next.enemyRiders?.hoard).toHaveLength(1);
    });

    it('Hurl Flotsam: 3 damage per card in its hoard, nothing with an empty one', () => {
        const s = at(picker, 'Hurl Flotsam');
        expect(threatHits(s)).toEqual([]);
        const full = { ...s, enemyRiders: { hoard: [CARD, CARD, CARD, CARD] } };
        expect(threatHits(full)).toEqual([n6(3) * 4]);
        expect(foeTurn(full).lost).toBe(n6(3) * 4);
    });

    it('Hide in the Hoard: WARD 3 per hoarded card', () => {
        const s = at(picker, 'Hide in the Hoard');
        expect(foeTurn(s).next.enemyWords?.ward ?? 0).toBe(0);
        const res = foeTurn({ ...s, enemyRiders: { hoard: [CARD, CARD] } });
        expect(res.next.enemyWords?.ward).toBe(n6(3) * 2);
    });

    it('Gull-call: UNDERTOW on a random die', () => {
        const s = at(picker, 'Gull-call');
        expect(foeTurn(s, () => 0).next.enemyWords?.undertow).toBe('heart');
        expect(foeTurn(s, () => 0.5).next.enemyWords?.undertow).toBe('body');
        expect(foeTurn(s, () => 0.99).next.enemyWords?.undertow).toBe('mind');
    });

    it('Everything Washes Up: 4 damage per hoarded card, then the cards go back to your hand', () => {
        const s = at(picker, 'Everything Washes Up', 1);
        const full = { ...s, enemyRiders: { hoard: [CARD, CARD, CARD] } };
        expect(threatHits(full)).toEqual([n6(4) * 3]);
        const res = foeTurn(full);
        expect(res.lost).toBe(n6(4) * 3);
        expect(res.next.enemyRiders?.hoard).toBeUndefined();
        expect(res.next.hand.filter(h => h.cardId === CARD).length).toBeGreaterThanOrEqual(3);
        expect(new Set(res.next.hand.map(h => h.uid)).size).toBe(res.next.hand.length);
    });
});

describe('the Smokehouse Gutter\'s riders (level 6)', () => {
    const gutter = atLevel(SmokehouseGutter, 6);
    const burning = (s: CombatEncounterState, infFoe: number, infShared: number): CombatEncounterState => ({
        ...s, program: { ...initProgramLedger(), el: { ...initElementState(), infFoe, infShared } },
    });

    it('Smoke Lash: 6, plus the INFERNO on it, and it gains that much WARD', () => {
        const s = at(gutter, 'Smoke Lash');
        expect(threatHits(s)).toEqual([n6(6)]);
        const lit = burning(s, 3, 2);
        expect(foeInferno(lit.program!.el)).toBe(5);
        expect(threatHits(lit)).toEqual([n6(6) + 5]);
        const res = foeTurn(lit);
        expect(res.lost).toBe(n6(6) + 5);
        expect(res.next.enemyWords?.ward).toBe(5);
    });

    it('Gut Hook: a BARNACLE only if it gets through your GUARD', () => {
        const s = at(gutter, 'Gut Hook');
        const through = foeTurn(s);
        expect(through.lost).toBe(n6(7));
        expect(liens(through.next)).toBe(1);
        const blocked = foeTurn({ ...s, guard: 500 });
        expect(blocked.lost).toBe(0);
        expect(liens(blocked.next)).toBe(0);
    });

    it('Gut Hook in its second phase always lands its BARNACLE, blocked or not', () => {
        const s = at(gutter, 'Gut Hook', 1);
        expect(liens(foeTurn({ ...s, guard: 500 }).next)).toBe(1);
        expect(liens(foeTurn(s).next)).toBe(1);
    });

    it('Hang to Cure: MEND 8, but it is VULNERABLE 25% next turn', () => {
        const s = at(gutter, 'Hang to Cure');
        const hurt = { ...s, enemy: { ...s.enemy, health: Math.floor(s.enemy.maxHealth / 2) } };
        const res = foeTurn(hurt);
        expect(res.next.enemy.health - hurt.enemy.health).toBe(n6(8));
        const vuln = res.next.enemy.effects.find(e => e.effectId === 'debuff_vulnerable');
        expect(vuln?.intensity).toBe(25);
    });

    it('Choking Smoke: TANGLE 2', () => {
        expect(foeTurn(at(gutter, 'Choking Smoke')).next.enemyWords?.tangle).toBe(2);
    });

    it('Light the Racks: INFERNO 4 on both sides (the foe burns in full, you by half)', () => {
        const res = foeTurn(at(gutter, 'Light the Racks', 1));
        const el = res.next.program!.el;
        expect(el.infShared).toBe(4);
        expect(foeInferno(el)).toBe(4);
        expect(yourInferno(el)).toBe(2);
        expect(res.events).toContainEqual({ kind: 'enemy-rider', rider: 'inferno-both', amount: 4 });
    });
});

describe('the Tithe-Collector\'s riders (level 5, elite)', () => {
    const collector = atLevel(TitheCollector, 5);
    const withConviction = (s: CombatEncounterState, conviction: number): CombatEncounterState => ({ ...s, conviction });

    it('Assess: 6, +3 for each card you scrapped this turn', () => {
        const s = at(collector, 'Assess');
        expect(threatHits(s)).toEqual([e5(6)]);
        expect(threatHits({ ...s, scrapsThisTurn: 2 })).toEqual([e5(6) + e5(3) * 2]);
    });

    it('Assess from the second phase: +4 per scrap and +2 per Lien in your hand', () => {
        const s = at(collector, 'Assess', 1);
        const hand = [...cards(1), { uid: 'l1', cardId: BARNACLE_ID }, { uid: 'l2', cardId: BARNACLE_ID }];
        expect(threatHits({ ...s, scrapsThisTurn: 1, hand })).toEqual([e5(6) + e5(4) + e5(2) * 2]);
    });

    it('Garnish: 6 and takes 2 Conviction; with none to take, +4', () => {
        const s = at(collector, 'Garnish');
        const rich = withConviction(s, 5);
        expect(threatHits(rich)).toEqual([e5(6)]);
        const res = foeTurn(rich);
        expect(res.next.conviction).toBe(3);
        expect(res.events).toContainEqual({ kind: 'enemy-rider', rider: 'garnish', amount: 2 });
        expect(threatHits(s)).toEqual([e5(6) + e5(4)]);
        expect(foeTurn(withConviction(s, 1)).next.conviction).toBe(0);
    });

    it('Ledger Shield: WARD equal to twice your Conviction', () => {
        const s = at(collector, 'Ledger Shield');
        expect(foeTurn(withConviction(s, 3)).next.enemyWords?.ward).toBe(6);
        expect(foeTurn(s).next.enemyWords?.ward ?? 0).toBe(0);
    });

    it('Audit: 3 damage per LEDGER, then the LEDGER clears', () => {
        const s = at(collector, 'Audit', 1);
        expect(threatHits(s)).toEqual([]);
        const owed = { ...s, enemyRiders: { ledger: 4 } };
        expect(threatHits(owed)).toEqual([e5(3) * 4]);
        const res = foeTurn(owed);
        expect(res.lost).toBe(e5(3) * 4);
        expect(res.next.enemyRiders?.ledger).toBeUndefined();
    });

    it('Lien: a Barnacle Curse goes into your hand', () => {
        expect(liens(foeTurn(at(collector, 'Lien', 1)).next)).toBe(1);
    });

    it('Garnish from the second phase adds +2 per Lien in your hand', () => {
        const s = at(collector, 'Garnish', 1);
        const hand = [{ uid: 'l1', cardId: BARNACLE_ID }];
        expect(threatHits(withConviction({ ...s, hand }, 4))).toEqual([e5(6) + e5(2)]);
    });

    it('Foreclose: takes all your Conviction, then 2 damage and WARD 2 for each point taken', () => {
        const s = at(collector, 'Foreclose', 2);
        const rich = withConviction(s, 3);
        expect(threatHits(rich)).toEqual([e5(2) * 3]);
        const res = foeTurn(rich);
        expect(res.lost).toBe(e5(2) * 3);
        expect(res.next.conviction).toBe(0);
        expect(res.next.enemyWords?.ward).toBe(e5(2) * 3);
        // With none to take there is nothing to read.
        expect(threatHits(s)).toEqual([]);
    });

    it('Seize Goods: 5, and the top card of your discard goes into its hoard', () => {
        const s = { ...at(collector, 'Seize Goods', 2), discard: ['first', 'second', 'top'] };
        const res = foeTurn(s);
        expect(res.lost).toBe(e5(5));
        expect(res.next.enemyRiders?.hoard).toEqual(['top']);
        expect(res.next.hand.some(h => h.cardId === 'top')).toBe(false);
    });
});

describe('the LEDGER counts what you scrap and spend', () => {
    const collector = atLevel(TitheCollector, 5);
    const play = (): CombatEncounterState => ({ ...at(collector, 'Assess'), phase: 'phase-play', hand: cards(4), conviction: 12 });

    it('every scrap adds 1, paid or not', () => {
        let s = play();
        for (const [i, uid] of ['h0', 'h1', 'h2', 'h3'].entries()) {
            s = discardCombatCard(s, uid).state;
            expect(s.enemyRiders?.ledger, `scrap ${i + 1}`).toBe(i + 1);
        }
    });

    it('a signature adds the Conviction it spent', () => {
        const s = play();
        const cast = playSignatureSkill(s, 'sig-ruby-signet').state;
        expect(s.conviction - cast.conviction).toBeGreaterThan(0);
        expect(cast.enemyRiders?.ledger).toBe(3);
    });

    it('a refused signature spends nothing and adds nothing', () => {
        const poor = { ...play(), conviction: 0 };
        expect(playSignatureSkill(poor, 'sig-ruby-signet').state.enemyRiders?.ledger).toBeUndefined();
    });

    it('a foe with no Audit keeps no LEDGER', () => {
        const eye = { ...at(atLevel(ENEMY_REGISTRY['float-eye'], 2), 'Long Look'), phase: 'phase-play' as const, hand: cards(2) };
        expect(discardCombatCard(eye, 'h0').state.enemyRiders?.ledger).toBeUndefined();
    });
});
