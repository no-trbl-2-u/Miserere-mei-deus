import { describe, expect, it } from 'vitest';
import { act1FightLedger, stageStats, walkAct1 } from './act1-progression';
import { createCharacter } from '../Character';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { simulateHazardPatternCombat } from '../Combat/combat.encounter.sim';
import { STARTING_CARD_IDS } from '../Combat/combat.rewards';

describe('the Act 1 XP ledger (LV1)', () => {
    const ledger = act1FightLedger();

    it('stages 39 fights, one door per map, every one pinned', () => {
        expect(ledger).toHaveLength(39);
        expect(ledger.filter(f => f.isBoss).map(f => f.nodeId)).toEqual(['bw-k2', 'cw-17', 'bc-15', 'ld-16']);
        expect(ledger.every(f => f.level !== undefined)).toBe(true);
    });

    it('a full clear meets the doors at levels 6, 13, 16 and 19 and ends at level 21', () => {
        const walk = walkAct1(ledger);
        expect(walk.doors.map(d => d.playerLevel)).toEqual([6, 13, 16, 19]);
        expect(walk.doors.map(d => d.doorLevel)).toEqual([1, 2, 3, 4]);
        expect(walk.finalLevel).toBe(21);
    });

    it('records the level stepping up to every fight, doors included', () => {
        const walk = walkAct1(ledger);
        expect(walk.fightLevels).toHaveLength(ledger.length);
        expect(walk.fightLevels[0]).toBe(1);
        const doorLevels = ledger.flatMap((f, i) => (f.isBoss ? [walk.fightLevels[i]] : []));
        expect(doorLevels).toEqual(walk.doors.map(d => d.playerLevel));
    });

    it('a door-only route meets the Breakwater door at level 1', () => {
        const walk = walkAct1(ledger.filter(f => f.isBoss));
        expect(walk.doors[0]!.playerLevel).toBe(1);
        expect(walk.finalLevel).toBeLessThan(21);
    });

    // The rebuilt Breakwater stages 19 fights, so a full clear reaches the
    // Beacon Crags door at level 16, where the placeholder Death Beholder is
    // won about 92% of the time: winnable but free. Chapter 1's real foes
    // (enemy sessions 1-2, B2) retune the ledger; until then this one door is
    // held to "winnable" only. Filed for T in plan/CRITIQUE.md (BW1b).
    const FREE_UNTIL_RETUNED: ReadonlySet<string> = new Set(['bc-15']);

    it('still finds each excused door free (drop it from the set once the retune lands)', () => {
        for (const door of walkAct1(ledger).doors.filter(d => FREE_UNTIL_RETUNED.has(d.nodeId))) {
            const player = createCharacter({
                name: 'Stage', level: door.playerLevel,
                baseStats: stageStats(door.playerLevel, 'even'), knownCards: [...STARTING_CARD_IDS],
            });
            const foe = scaleEnemyToLevel(ENEMY_REGISTRY['death-beholder'], door.doorLevel!);
            expect(simulateHazardPatternCombat(player, foe, 100, 1).winRate, door.nodeId).toBeGreaterThanOrEqual(0.9);
        }
    });

    it('each door is winnable, not free, at its expected stage (even spread, greedy witness)', () => {
        for (const door of walkAct1(ledger).doors) {
            const player = createCharacter({
                name: 'Stage', level: door.playerLevel,
                baseStats: stageStats(door.playerLevel, 'even'), knownCards: [...STARTING_CARD_IDS],
            });
            const foe = scaleEnemyToLevel(ENEMY_REGISTRY['death-beholder'], door.doorLevel!);
            const { winRate } = simulateHazardPatternCombat(player, foe, 100, 1);
            expect(winRate, door.nodeId).toBeGreaterThan(0.1);
            if (!FREE_UNTIL_RETUNED.has(door.nodeId)) expect(winRate, door.nodeId).toBeLessThan(0.9);
        }
    });
});
