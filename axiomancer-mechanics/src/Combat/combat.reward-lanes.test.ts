/**
 * The reward-lane section of the measured report (phase CH1d): per character,
 * the lanes in the pool and each lane's share of the offers at run start and
 * after three worn relics. Fixture roster, lanes and relics, plus the live
 * roster's pool.
 */

import { describe, expect, it } from 'vitest';

import { CARD_LANES, GREY_LANE, getCardLane, type CardLane } from '../Cards/card.lanes';
import { CHARACTER_ROSTER, type CharacterDefinition } from '../Character/roster';
import type { Equipment } from '../Items/types';
import { rewardLanesByCharacter, lateRelicPicks } from './combat.reward-lanes';
import { measuredTruthCells } from './combat.measured-truth';
import { createNewGameState } from '../Game/game.reducer';

const BLOOD = getCardLane('blood-price')!.cardIds;
const EMBER = getCardLane('elementalist')!.cardIds;
const half = (ids: readonly string[], second: boolean): string[] =>
    [...(second ? ids.slice(Math.floor(ids.length / 2)) : ids.slice(0, Math.floor(ids.length / 2)))];
const laneOf = (id: string, cardIds: string[]): CardLane => ({ id, name: id, cardIds, testDeck: [] });

const LANE_X = laneOf('fx-x', half(BLOOD, false));
const LANE_Y = laneOf('fx-y', half(BLOOD, true));
const LANE_Z = laneOf('fx-z', half(EMBER, false));
const LANE_W = laneOf('fx-w', half(EMBER, true));
const LANES: readonly CardLane[] = [GREY_LANE, LANE_X, LANE_Y, LANE_Z, LANE_W];

function relic(id: string, laneId?: string): Equipment {
    return { id, name: id, description: '', category: 'equipment', slot: 'relic', statModifiers: [], laneId };
}

const START_RELIC = relic('fx-start-relic', 'fx-z');
const RELIC_PLAIN = relic('fx-relic-plain');
const RELIC_Z2 = relic('fx-relic-z2', 'fx-z');
const RELIC_W = relic('fx-relic-w', 'fx-w');
const RELIC_X = relic('fx-relic-x', 'fx-x');
const RELICS: readonly Equipment[] = [START_RELIC, RELIC_PLAIN, RELIC_Z2, RELIC_W, RELIC_X];

const FIXTURE: CharacterDefinition = {
    id: 'fx-character',
    name: 'Fixture Character',
    portraitKey: 'portrait-1',
    startingRelicId: START_RELIC.id,
    baseStats: { heart: 5, body: 5, mind: 5 },
    startingLaneIds: ['fx-x', 'fx-y'],
    startingCardIds: [LANE_X.cardIds[0]!, LANE_Y.cardIds[0]!],
    playstyle: 'Fixture.',
};

const FIXTURE_OPTIONS = { roster: [FIXTURE], lanes: LANES, relics: RELICS, rolls: 120, seed: 7 };

describe('the live roster (CH1d A5, CH1f)', () => {
    it('holds one row per live character, each with a non-empty start pool', () => {
        expect(CHARACTER_ROSTER.length).toBeGreaterThan(0);
        const report = rewardLanesByCharacter({ rolls: 30 });
        expect(report.rows.map(r => r.character)).toEqual(CHARACTER_ROSTER.map(c => c.id));
        for (const row of report.rows) {
            expect(row.start.lanes.length).toBeGreaterThan(0);
            expect(row.start.shares.grey).toBeUndefined();
        }
    });

    it('the Chosen starts on Defender, Blood Price and the ring Merciful lane', () => {
        const row = rewardLanesByCharacter({ rolls: 30 }).rows.find(r => r.character === 'the-chosen')!;
        expect(row.start.worn).toEqual(['relic-disarming-plea']);
        expect(row.start.lanes).toEqual(expect.arrayContaining(['defender', 'blood-price', 'merciful']));
    });
});

describe('a fixture character row (CH1d A5)', () => {
    const report = rewardLanesByCharacter(FIXTURE_OPTIONS);
    const [row] = report.rows;

    it('has one row per roster character', () => {
        expect(report.rows.map(r => r.character)).toEqual(['fx-character']);
        expect(row!.name).toBe('Fixture Character');
        expect(report.rolls).toBe(120);
        expect(report.seed).toBe(7);
    });

    it('start: the two starting lanes and the starting relic lane, the starting relic worn', () => {
        expect(row!.start.worn).toEqual(['fx-start-relic']);
        expect(row!.start.lanes).toEqual(['fx-x', 'fx-y', 'fx-z']);
        expect(row!.start.offered).toBe(120 * 3);
        expect(Object.keys(row!.start.shares).sort()).toEqual(['fx-x', 'fx-y', 'fx-z']);
    });

    it('late: names a lane the start lacks, and wears three relics', () => {
        expect(row!.late.worn).toEqual(['fx-start-relic', 'fx-relic-w', 'fx-relic-z2']);
        expect(row!.late.lanes).toEqual(['fx-x', 'fx-y', 'fx-z', 'fx-w']);
        expect(row!.late.lanes.filter(l => !row!.start.lanes.includes(l))).toEqual(['fx-w']);
        expect(row!.late.shares['fx-w']).toBeGreaterThan(0);
    });

    it('shares sum to one and never name grey', () => {
        for (const state of [row!.start, row!.late]) {
            const total = Object.values(state.shares).reduce((a, b) => a + b, 0);
            expect(total).toBeGreaterThan(0.999);
            expect(total).toBeLessThan(1.001);
            expect(state.shares.grey).toBeUndefined();
        }
    });

    it('is deterministic for a seed', () => {
        expect(rewardLanesByCharacter(FIXTURE_OPTIONS)).toEqual(report);
    });
});

describe('lateRelicPicks (CH1d A5)', () => {
    const { player } = createNewGameState({ characterId: FIXTURE.id, roster: [FIXTURE], relics: RELICS });

    it('takes the relic adding a new lane first, ties in library order, skipping laneless and worn relics', () => {
        expect(lateRelicPicks(player, 2, LANES, RELICS).map(r => r.id)).toEqual(['fx-relic-w', 'fx-relic-z2']);
        expect(lateRelicPicks(player, 3, LANES, RELICS).map(r => r.id))
            .toEqual(['fx-relic-w', 'fx-relic-z2', 'fx-relic-x']);
    });

    it('returns fewer when the library runs out, and none for a count of zero', () => {
        expect(lateRelicPicks(player, 9, LANES, RELICS)).toHaveLength(3);
        expect(lateRelicPicks(player, 0, LANES, RELICS)).toEqual([]);
    });
});

describe('the section rides the measured report (CH1d A5)', () => {
    it('measuredTruthCells carries the reward lanes, seeded from the report seed', () => {
        const report = measuredTruthCells({
            runs: 1, fights: [], deckLanes: [], halfUpgradedLanes: [], sampledFamilies: [],
            seed: 3, rewardLanes: { rolls: 10 },
        });
        expect(report.rewardLanes.seed).toBe(3);
        expect(report.rewardLanes.rolls).toBe(10);
        expect(report.rewardLanes.rows.map(r => r.character)).toEqual(CHARACTER_ROSTER.map(c => c.id));
        expect(CARD_LANES.length).toBeGreaterThan(0);
    });
});
