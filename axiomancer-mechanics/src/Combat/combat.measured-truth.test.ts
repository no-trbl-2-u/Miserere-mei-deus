import { describe, expect, it } from 'vitest';

import { createCharacter } from '../Character';
import type { Character } from '../Character/types';
import { getCardLane } from '../Cards/card.lanes';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { act1FightLedger } from '../Game/act1-progression';
import {
    percentile, runOneEncounter, simulateHazardPatternCombatDetailed,
} from './combat.encounter.sim';
import { MEASURED_DECK_LANES, MEASURED_SPREADS, measuredTruthCells } from './combat.measured-truth';
import { STARTING_CARD_IDS } from './combat.rewards';

const CELL_KEYS = [
    'winRate', 'meanRounds', 'lowestVitaeFractionMean', 'lowestVitaeFractionP10',
    'playerHpTakenMean', 'runs', 'seed',
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

describe('measuredTruthCells (R12a A1, A2)', () => {
    const ledger = act1FightLedger();
    const report = measuredTruthCells({ runs: 5, seed: 1 });

    it('has one cell per ledger fight x spread x deck', () => {
        expect(report.cells).toHaveLength(ledger.length * MEASURED_SPREADS.length * MEASURED_DECK_LANES.length);
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
        expect(doors.map(d => d.playerLevel)).toEqual([4, 9, 14, 18]);
        expect(doors.map(d => d.enemyLevel)).toEqual([1, 2, 3, 4]);
    });

    it('resolves both decks through the lane registry', () => {
        for (const id of MEASURED_DECK_LANES) {
            expect(report.decks[id]!.deckCards).toEqual([...getCardLane(id)!.testDeck]);
            expect(report.decks[id]!.deadCardRate).toBeGreaterThanOrEqual(0);
            expect(report.decks[id]!.deadCardRate).toBeLessThanOrEqual(1);
        }
    });

    it('rejects a lane the registry does not carry', () => {
        expect(() => measuredTruthCells({ runs: 1, deckLanes: ['no-such-lane'], fights: ledger.slice(0, 1) }))
            .toThrow(/no card lane/);
    });
});
