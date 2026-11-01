import { describe, expect, it } from 'vitest';
import { act1FightLedger, stageStats, walkAct1 } from './act1-progression';
import { createCharacter } from '../Character';
import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { scaleEnemyToLevel } from '../World/encounter';
import { simulateHazardPatternCombat } from '../Combat/combat.encounter.sim';
import { STARTING_CARD_IDS } from '../Combat/combat.rewards';
import { wearGreySword } from '../Combat/combat.grey-sword';

describe('the Act 1 XP ledger (LV1)', () => {
    const ledger = act1FightLedger();

    it('stages 39 fights, one door per map, every one pinned', () => {
        expect(ledger).toHaveLength(39);
        expect(ledger.filter(f => f.isBoss).map(f => f.nodeId)).toEqual(['bw-k2', 'cw-17', 'bc-15', 'ld-16']);
        expect(ledger.every(f => f.level !== undefined)).toBe(true);
    });

    // Chapter 1's normals fight at levels 3 to 6 (EN1f, EN1g, EN1h), the sea
    // cave's elites at level 5 (EN1j), the lighthouse path's at level 7 (EN1k)
    // and the keep causeway's at level 8 (EN1l), so the Breakwater pays more
    // XP than its old level-2 Float-Eyes and level-3 elites did.
    it('a full clear meets the doors at levels 8, 15, 18 and 20 and ends at level 21', () => {
        const walk = walkAct1(ledger);
        expect(walk.doors.map(d => d.playerLevel)).toEqual([8, 15, 18, 20]);
        expect(walk.doors.map(d => d.doorLevel)).toEqual([1, 2, 3, 4]);
        expect(walk.finalLevel).toBe(21);
    });

    it('counts an elite node\'s pair as one fight, at the pair\'s shared level (EN1k)', () => {
        const lighthouse = ledger.filter(f => f.nodeId === 'bw-l4');
        expect(lighthouse).toHaveLength(1);
        expect(lighthouse[0]).toMatchObject({ enemySlug: 'lamplighter', level: 7, isBoss: false });
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
    // Beacon Crags door at level 19 (17 before EN1j's, EN1k's and EN1l's elites), where the placeholder Death Beholder is
    // won about 92% of the time: winnable but free. Chapter 1's normals
    // (EN1f, EN1g, EN1h) and the elites (EN1k's level 7, EN1l's level 8) pay
    // more XP, so the Charcoal Wood door and the Lantern Deep door are free
    // too. XP1a (a fifth less XP per kill) moved the doors to levels 8, 15, 18
    // and 20, and the Breakwater's own door (level 8) is no longer free.
    // T's tuning session after EN1i retunes the ledger; until then these
    // doors are held to "winnable" only. Filed for T in plan/CRITIQUE.md (BW1b).
    const FREE_UNTIL_RETUNED: ReadonlySet<string> = new Set(['cw-17', 'bc-15', 'ld-16']);

    it('still finds each excused door free (drop it from the set once the retune lands)', () => {
        for (const door of walkAct1(ledger).doors.filter(d => FREE_UNTIL_RETUNED.has(d.nodeId))) {
            const player = wearGreySword(createCharacter({
                name: 'Stage', level: door.playerLevel,
                baseStats: stageStats(door.playerLevel, 'even'), knownCards: [...STARTING_CARD_IDS],
            }));
            const foe = scaleEnemyToLevel(ENEMY_REGISTRY['death-beholder'], door.doorLevel!);
            expect(simulateHazardPatternCombat(player, foe, 100, 1).winRate, door.nodeId).toBeGreaterThanOrEqual(0.9);
        }
    });

    it('each door is winnable, not free, at its expected stage (even spread, greedy witness)', () => {
        for (const door of walkAct1(ledger).doors) {
            const player = wearGreySword(createCharacter({
                name: 'Stage', level: door.playerLevel,
                baseStats: stageStats(door.playerLevel, 'even'), knownCards: [...STARTING_CARD_IDS],
            }));
            const foe = scaleEnemyToLevel(ENEMY_REGISTRY['death-beholder'], door.doorLevel!);
            const { winRate } = simulateHazardPatternCombat(player, foe, 100, 1);
            expect(winRate, door.nodeId).toBeGreaterThan(0.1);
            if (!FREE_UNTIL_RETUNED.has(door.nodeId)) expect(winRate, door.nodeId).toBeLessThan(0.9);
        }
    });
});
