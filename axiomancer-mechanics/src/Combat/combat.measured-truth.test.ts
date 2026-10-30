import { describe, expect, it } from 'vitest';

import { createCharacter } from '../Character';
import type { Character } from '../Character/types';
import { getCardLane, laneRewardPool } from '../Cards/card.lanes';
import { getRng, setSeed } from '../Utils/rng';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { act1FightLedger, stageStats, walkAct1 } from '../Game/act1-progression';
import {
    percentile, runOneEncounter, selfBurnFromLog, simulateHazardPatternCombatDetailed,
} from './combat.encounter.sim';
import { upgradeLevel } from '../Cards/card-upgrades';
import { getCardById } from '../Cards/cards.library';
import {
    HALF_UPGRADED_DECK_SUFFIX, MEASURED_DECK_LANES, MEASURED_HALF_UPGRADED_LANES, MEASURED_SAMPLED_FAMILIES,
    MEASURED_SPREADS, halfUpgradedDeck, measuredTruthCells, sampledFamilyDraws,
    type MeasuredTruthDeck, type MeasuredTruthFamily,
} from './combat.measured-truth';
import { STARTING_CARD_IDS } from './combat.rewards';

const CELL_KEYS = [
    'winRate', 'meanRounds', 'lowestVitaeFractionMean', 'lowestVitaeFractionP10',
    'playerHpTakenMean', 'selfBurnMean', 'runs', 'seed',
] as const;

function greyPlayer(health: number, maxHealth: number): Character {
    const p = createCharacter({
        name: 'Trough', level: 1, baseStats: { body: 5, mind: 5, heart: 5 }, knownCards: [...STARTING_CARD_IDS],
    });
    return { ...p, health, maxHealth };
}

describe('lowest VITAE in the combat sim (R12a A3)', () => {
    const floatEye = scaleEnemyToLevel(ENEMY_REGISTRY['float-eye'], 1);
    const doorwarden = scaleEnemyToLevel(ENEMY_REGISTRY['death-beholder'], 4);

    it('a player too deep to dent never drops below full', () => {
        const r = runOneEncounter(greyPlayer(1_000_000, 1_000_000), floatEye, 1);
        expect(r.lowestVitaeFraction).toBeGreaterThan(0.999);
        expect(r.lowestVitaeFraction).toBeLessThanOrEqual(1);
    });

    it('a defeat reads exactly 0', () => {
        const r = runOneEncounter(greyPlayer(1, 100), doorwarden, 1);
        expect(r.outcome).toBe('defeat');
        expect(r.lowestVitaeFraction).toBe(0);
    });

    it('the low is never above the start or the end of the fight', () => {
        const player = greyPlayer(60, 100);
        const r = runOneEncounter(player, floatEye, 3);
        expect(r.lowestVitaeFraction).toBeLessThanOrEqual(0.6);
        expect(r.lowestVitaeFraction).toBeGreaterThanOrEqual(0);
    });

    it('aggregates a mean and a p10 no higher than it', () => {
        const { stats } = simulateHazardPatternCombatDetailed({ player: greyPlayer(100, 100), enemy: doorwarden, runs: 20 });
        expect(stats.lowestVitaeFractionP10).toBeLessThanOrEqual(stats.lowestVitaeFractionMean);
        expect(stats.lowestVitaeFractionMean).toBeGreaterThanOrEqual(0);
        expect(stats.lowestVitaeFractionMean).toBeLessThanOrEqual(1);
        expect(stats.playerHpTakenMean).toBeGreaterThan(0);
    });

    it('percentile is nearest-rank', () => {
        expect(percentile([], 0.1)).toBe(0);
        expect(percentile([5], 0.1)).toBe(5);
        expect(percentile([0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 1], 0.1)).toBe(0.1);
        expect(percentile([0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.4, 0.6, 0.8, 1, 0.05], 0.1)).toBe(0.1);
    });
});

describe('measuredTruthCells (R12a A1, A2; EM1 A1)', () => {
    const ledger = act1FightLedger();
    const report = measuredTruthCells({ runs: 5, seed: 1, sampleDraws: 2 });

    const deckCount = MEASURED_DECK_LANES.length + MEASURED_HALF_UPGRADED_LANES.length
        + MEASURED_SAMPLED_FAMILIES.length;

    it('has one cell per ledger fight x spread x deck', () => {
        expect(report.cells).toHaveLength(ledger.length * MEASURED_SPREADS.length * deckCount);
        expect(new Set(report.cells.map(c => `${c.fight}|${c.spread}|${c.deck}`)).size).toBe(report.cells.length);
    });

    it('carries every A1 key on every cell', () => {
        for (const cell of report.cells) {
            for (const key of CELL_KEYS) expect(typeof cell[key], `${cell.fight} ${key}`).toBe('number');
            expect(cell.runs).toBe(5);
            expect(cell.seed).toBe(1);
        }
    });

    it('meets each door at the full-clear level, against its pinned level', () => {
        const doors = report.cells.filter(c => c.isBoss && c.deck === 'grey' && c.spread === 'even');
        expect(doors.map(d => d.playerLevel)).toEqual([9, 16, 18, 21]);
        expect(doors.map(d => d.enemyLevel)).toEqual([1, 2, 3, 4]);
    });

    it('resolves every measured lane through the lane registry', () => {
        expect(MEASURED_DECK_LANES).toContain('elementalist');
        for (const id of MEASURED_DECK_LANES) {
            const deck = report.decks[id] as MeasuredTruthDeck;
            expect(deck.deckCards).toEqual([...getCardLane(id)!.testDeck]);
            expect(deck.deadCardRate).toBeGreaterThanOrEqual(0);
            expect(deck.deadCardRate).toBeLessThanOrEqual(1);
        }
    });

    it('orders the decks: lanes, half-upgraded decks, then the sampled families', () => {
        expect(Object.keys(report.decks)).toEqual([
            'grey', 'blood-price', 'elementalist', `blood-price${HALF_UPGRADED_DECK_SUFFIX}`,
            'elementalist~20of30', 'mixed~20of60',
        ]);
    });

    it('measures the elementalist in every ledger fight at every spread', () => {
        for (const spread of MEASURED_SPREADS) {
            expect(report.cells.filter(c => c.deck === 'elementalist' && c.spread === spread)).toHaveLength(ledger.length);
        }
    });

    it('rejects a lane the registry does not carry', () => {
        expect(() => measuredTruthCells({ runs: 1, deckLanes: ['no-such-lane'], fights: ledger.slice(0, 1) }))
            .toThrow(/no card lane/);
        expect(() => measuredTruthCells({ runs: 1, halfUpgradedLanes: ['no-such-lane'], fights: ledger.slice(0, 1) }))
            .toThrow(/no card lane/);
    });
});

describe('the half-upgraded Blood Price deck (UP1 A10)', () => {
    const ledger = act1FightLedger();
    const report = measuredTruthCells({ runs: 5, seed: 1, sampledFamilies: [] });
    const id = `blood-price${HALF_UPGRADED_DECK_SUFFIX}`;

    it('measures blood-price half-upgraded beside the plain deck', () => {
        expect(MEASURED_HALF_UPGRADED_LANES).toContain('blood-price');
        expect(Object.keys(report.decks)).toEqual(['grey', 'blood-price', 'elementalist', id]);
    });

    it('sits beside the plain deck in every ledger fight at every spread', () => {
        for (const spread of MEASURED_SPREADS) {
            const plain = report.cells.filter(c => c.deck === 'blood-price' && c.spread === spread);
            const half = report.cells.filter(c => c.deck === id && c.spread === spread);
            expect(plain).toHaveLength(ledger.length);
            expect(half.map(c => [c.fight, c.playerLevel, c.enemyLevel]))
                .toEqual(plain.map(c => [c.fight, c.playerLevel, c.enemyLevel]));
        }
    });

    it('upgrades exactly half the lane deck once, every id resolving', () => {
        const base = getCardLane('blood-price')!.testDeck;
        const deck = (report.decks[id] as MeasuredTruthDeck).deckCards;
        expect(deck).toHaveLength(base.length);
        expect(deck.filter(c => upgradeLevel(c) === 1)).toHaveLength(Math.floor(base.length / 2));
        expect(deck.every(c => upgradeLevel(c) <= 1)).toBe(true);
        deck.forEach((c, i) => {
            expect(c.replace(/\+$/, '')).toBe(base[i]);
            expect(getCardById(c), c).toBeDefined();
        });
    });

    it('halfUpgradedDeck alternates, keeps order and copies, and skips a card at its limit', () => {
        expect(halfUpgradedDeck(['grey-strike', 'grey-ward', 'grey-strike', 'grey-word']))
            .toEqual(['grey-strike+', 'grey-ward', 'grey-strike+', 'grey-word']);
        expect(halfUpgradedDeck(['grey-strike+', 'grey-ward', 'grey-word', 'grey-strike']))
            .toEqual(['grey-strike+', 'grey-ward+', 'grey-word', 'grey-strike+']);
        expect(halfUpgradedDeck([])).toEqual([]);
    });
});

describe('the sampled deck families (EM1 A2, A3)', () => {
    const fights = act1FightLedger().slice(0, 1);
    const report = measuredTruthCells({ runs: 3, seed: 1, sampleDraws: 3, fights });

    it('draws sampleDraws decks of 20 distinct cards from each family pool', () => {
        expect(MEASURED_SAMPLED_FAMILIES.map(f => f.id)).toEqual(['elementalist~20of30', 'mixed~20of60']);
        for (const family of MEASURED_SAMPLED_FAMILIES) {
            const entry = report.decks[family.id] as MeasuredTruthFamily;
            const pool = new Set(laneRewardPool(family.laneIds));
            expect(entry.family).toBe(true);
            expect(entry.poolSize).toBe(pool.size);
            expect(entry.drawSize).toBe(20);
            expect(entry.draws).toHaveLength(3);
            for (const draw of entry.draws) {
                expect(draw).toHaveLength(20);
                expect(new Set(draw).size).toBe(20);
                for (const c of draw) expect(pool.has(c), c).toBe(true);
            }
        }
        expect((report.decks['elementalist~20of30'] as MeasuredTruthFamily).poolSize).toBe(30);
        expect((report.decks['mixed~20of60'] as MeasuredTruthFamily).poolSize).toBe(60);
    });

    it('a family cell is the median of its draws, bracketed by its range', () => {
        const family = MEASURED_SAMPLED_FAMILIES[0]!;
        const entry = report.decks[family.id] as MeasuredTruthFamily;
        const fight = fights[0]!;
        const playerLevel = walkAct1(fights).fightLevels[0]!;
        const enemyLevel = fight.level ?? Math.max(ENEMY_REGISTRY[fight.enemySlug].level, playerLevel);
        const enemy = scaleEnemyToLevel(ENEMY_REGISTRY[fight.enemySlug], enemyLevel);
        const middle = (xs: number[]) => [...xs].sort((a, b) => a - b)[1]!;
        for (const spread of MEASURED_SPREADS) {
            const cell = report.cells.find(c => c.deck === family.id && c.spread === spread)!;
            const draws = entry.draws.map(cards => simulateHazardPatternCombatDetailed({
                player: createCharacter({
                    name: 'Measured', level: playerLevel,
                    baseStats: stageStats(playerLevel, spread), knownCards: [...new Set(cards)],
                }),
                enemy, runs: 3, startSeed: 1, policy: 'greedy', deck: cards,
            }).stats);
            const r4 = (x: number) => Math.round(x * 10000) / 10000;
            expect(cell.winRate).toBe(r4(middle(draws.map(d => d.winRate))));
            expect(cell.lowestVitaeFractionP10).toBe(r4(middle(draws.map(d => d.lowestVitaeFractionP10))));
            expect(cell.meanRounds).toBe(r4(middle(draws.map(d => d.avgRounds))));
            expect(cell.selfBurnMean).toBe(r4(middle(draws.map(d => d.selfBurnMean))));
            expect(cell.winRateMin).toBe(Math.min(...draws.map(d => r4(d.winRate))));
            expect(cell.winRateMax).toBe(Math.max(...draws.map(d => r4(d.winRate))));
            expect(cell.lowestVitaeFractionP10Min).toBeLessThanOrEqual(cell.lowestVitaeFractionP10);
            expect(cell.lowestVitaeFractionP10Max).toBeGreaterThanOrEqual(cell.lowestVitaeFractionP10);
        }
    });

    it('plain deck cells carry no range fields', () => {
        for (const cell of report.cells.filter(c => !c.deck.includes('~'))) {
            expect(cell.winRateMin).toBeUndefined();
            expect(cell.lowestVitaeFractionP10Max).toBeUndefined();
        }
    });

    it('the same seed gives the same draws and cells; another seed gives other draws', () => {
        const again = measuredTruthCells({ runs: 3, seed: 1, sampleDraws: 3, fights });
        expect(again.decks).toEqual(report.decks);
        expect(again.cells).toEqual(report.cells);
        const family = MEASURED_SAMPLED_FAMILIES[0]!;
        expect(sampledFamilyDraws(family, 2, 3).draws).not.toEqual(sampledFamilyDraws(family, 1, 3).draws);
        expect(sampledFamilyDraws(family, 1, 3).draws).toEqual((report.decks[family.id] as MeasuredTruthFamily).draws);
    });

    it('drawing never reads or writes the global RNG', () => {
        setSeed(12345);
        const before = getRng().getState();
        for (const family of MEASURED_SAMPLED_FAMILIES) sampledFamilyDraws(family, 7, 16);
        expect(getRng().getState()).toBe(before);
    });

    it('rejects a family whose lane the registry does not carry', () => {
        expect(() => sampledFamilyDraws({ id: 'x~1of1', laneIds: ['no-such-lane'], drawSize: 1 }, 1, 1))
            .toThrow(/no card lane/);
        expect(() => sampledFamilyDraws({ id: 'grey~99', laneIds: ['grey'], drawSize: 99 }, 1, 1))
            .toThrow(/pool/);
    });
});

describe('self-burn (EM1 A4)', () => {
    it('sums the self INFERNO dot-ticks of a transcript and nothing else', () => {
        expect(selfBurnFromLog([
            { kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 3, target: 'self' },
            { kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 4, target: 'enemy' },
            { kind: 'dot-tick', effectId: 'poison', label: 'POISON', amount: 5, target: 'self' },
            { kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 2, target: 'self' },
        ])).toBe(5);
        expect(selfBurnFromLog([])).toBe(0);
    });

    const fights = act1FightLedger().filter(f => f.isBoss).slice(0, 1);
    const report = measuredTruthCells({ runs: 20, seed: 1, fights, sampledFamilies: [] });

    it('grey and Blood Price never burn themselves', () => {
        for (const cell of report.cells.filter(c => c.deck !== 'elementalist')) {
            expect(cell.selfBurnMean, `${cell.deck} ${cell.spread}`).toBe(0);
        }
    });

    it('the Elementalist test deck loses VITAE to its own INFERNO at the first door', () => {
        const burns = report.cells.filter(c => c.deck === 'elementalist').map(c => c.selfBurnMean);
        expect(Math.max(...burns)).toBeGreaterThan(0);
    });

    it('the sim mean is the mean of the per-run self-burn', () => {
        const fight = fights[0]!;
        const cards = [...getCardLane('elementalist')!.testDeck];
        const player = createCharacter({
            name: 'Burn', level: 4, baseStats: { body: 8, mind: 8, heart: 8 }, knownCards: [...new Set(cards)],
        });
        const enemy = scaleEnemyToLevel(ENEMY_REGISTRY[fight.enemySlug], 1);
        const { stats } = simulateHazardPatternCombatDetailed({ player, enemy, runs: 10, startSeed: 1, deck: cards });
        let total = 0;
        for (let i = 0; i < 10; i++) total += runOneEncounter(player, enemy, 1 + i, 'greedy', { deck: cards }).selfBurn;
        expect(stats.selfBurnMean).toBeCloseTo(total / 10, 10);
        expect(stats.selfBurnMean).toBeGreaterThan(0);
    });
});
