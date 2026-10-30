/**
 * The enemy roster reset.
 *
 * Pins the roster: the three R2 survivors (Float-Eye, the Green Jelly, the
 * Death Beholder), Chapter 1's normals as they land (EN1f: the Gallows Crow,
 * the Net-Mender, the Crane-Hook) and the `sandbag` fixture; no foe carries a
 * keyword or a stage `gain` list; no enemy card carries an affliction; every
 * Act 1 map draws Float-Eye; each Act 1 region pins the Green Jelly mid-region
 * and the Death Beholder as its door boss. The keyword, rider, curse and
 * SUMMON code stays gone from the engine's surface. lexicon-ok: guard pins the deleted surface stays gone
 */

import { describe, expect, it } from 'vitest';

import {
    DeathBeholder, ENEMY_REGISTRY, EnemiesByMap, EnemyLibrary, FloatEye, GreenJelly, LIVE_ENEMY_IDS,
} from '../enemy.library';
import { enemyStatBudget } from '../index';
import type { Enemy } from '../types';
import { ENEMY_CARD_LIBRARY, type EnemyCardFace } from '../../Combat/combat.enemy-cards';
import { ENEMY_DECKS, deckCardIds } from '../../Combat/combat.enemy-decks';
import { getThreatSequence } from '../../Combat/combat.threat';
import { getNodeEventPool } from '../../World';
import { BW_ELITE_DRAWS } from '../../World/MapEvents/content';
import * as engine from '../../Combat/combat.engine';
import * as mechanics from '../../index';

const SURVIVOR_IDS = ['enemy-float-eye', 'enemy-green-jelly', 'enemy-death-beholder'];
/** Chapter 1's normals other than the Green Jelly, in library order. */
const CHAPTER1_IDS = [
    'enemy-gallows-crow', 'enemy-net-mender', 'enemy-crane-hook', 'enemy-brine-widow', 'enemy-lamprey-knot',
];
/** The cliffs, the hamlet and the sea cave's elite (EN1h), in library order. */
const CLIFF_IDS = ['enemy-wreck-picker', 'enemy-smokehouse-gutter', 'enemy-tithe-collector'];
/** The foes that still play an enemy deck (the rest play HP phases). */
const DECK_IDS = ['enemy-death-beholder'];

describe('the R2 roster', () => {
    it('ENEMY_REGISTRY is exactly sandbag, the three survivors and Chapter 1 normals', () => {
        expect(Object.keys(ENEMY_REGISTRY).sort())
            .toEqual([
                'brine-widow', 'cave-choir', 'crane-hook', 'curfew-ringer', 'death-beholder', 'float-eye', 'gallows-crow',
                'green-jelly', 'lamprey-knot', 'net-mender', 'sandbag', 'smokehouse-gutter', 'tide-gate', 'tithe-collector',
                'toll-keeper', 'wreck-picker',
            ]);
        expect(EnemyLibrary.map(e => e.id)).toEqual([
            'enemy-float-eye', ...CHAPTER1_IDS, 'enemy-green-jelly', 'enemy-curfew-ringer', ...CLIFF_IDS,
            'enemy-cave-choir',
            'enemy-toll-keeper', 'enemy-tide-gate',
            'enemy-death-beholder',
        ]);
        expect([...LIVE_ENEMY_IDS].sort())
            .toEqual([
                ...SURVIVOR_IDS, ...CHAPTER1_IDS, 'enemy-curfew-ringer', ...CLIFF_IDS, 'enemy-cave-choir',
                ENEMY_REGISTRY.sandbag.id,
                'enemy-toll-keeper', 'enemy-tide-gate',
            ].sort());
    });

    it('no survivor carries a keyword, and no stage grants one', () => {
        for (const enemy of Object.values(ENEMY_REGISTRY) as Enemy[]) {
            expect(enemy.keywords ?? [], `${enemy.id} keywords`).toEqual([]);
            for (const stage of enemy.stages ?? []) {
                expect((stage as { gain?: unknown }).gain, `${enemy.id} stage ${stage.name} gain`)
                    .toBeUndefined();
            }
        }
    });

    it('every survivor resolves an authored threat sequence', () => {
        for (const enemy of EnemyLibrary) {
            expect(getThreatSequence(enemy).length, enemy.id).toBeGreaterThan(0);
        }
    });
});

describe('the R2 enemy cards', () => {
    const RIDERS = ['effectId', 'intensity'] as const;
    const bare = (where: string, face: Partial<EnemyCardFace>): void => {
        for (const field of RIDERS) {
            expect(face[field], `${where}.${field}`).toBeUndefined();
        }
    };

    it('no card (or branch face) carries an affliction', () => {
        for (const [id, card] of Object.entries(ENEMY_CARD_LIBRARY)) {
            bare(id, card);
            if (card.branch) {
                bare(`${id}.then`, card.branch.then);
                bare(`${id}.else`, card.branch.else);
            }
        }
    });

    it('ENEMY_DECKS holds exactly the deck foes, and every card id resolves', () => {
        expect(Object.keys(ENEMY_DECKS).sort()).toEqual([...DECK_IDS].sort());
        for (const [enemyId, spec] of Object.entries(ENEMY_DECKS)) {
            const ids = deckCardIds(spec);
            expect(ids.length, enemyId).toBeGreaterThan(0);
            for (const cardId of ids) {
                expect(ENEMY_CARD_LIBRARY[cardId], `${enemyId} → ${cardId}`).toBeDefined();
            }
        }
    });
});

describe('the R2 Act 1 pools and pins (D61)', () => {
    const ACT1 = [
        { continent: 'coastal-continent', map: 'breakwater', elite: 'bw-w5', door: 'bw-k2' },
        { continent: 'coastal-continent', map: 'charcoal-wood', elite: 'cw-12', door: 'cw-17' },
        { continent: 'northern-continent', map: 'beacon-crags', elite: 'bc-8', door: 'bc-15' },
        { continent: 'northern-continent', map: 'lantern-deep', elite: 'ld-8', door: 'ld-16' },
    ] as const;

    const encounterAt = (continent: string, map: string, nodeId: string) => {
        const payload = getNodeEventPool(continent, map, nodeId)?.entries[0]?.payload;
        expect(payload?.kind, `${map}/${nodeId}`).toBe('encounter');
        return payload as { kind: 'encounter'; enemySlug?: string; isBoss?: boolean };
    };

    it.each(ACT1)('$map draws Float-Eye and nothing else', ({ map }) => {
        expect(EnemiesByMap[map]).toEqual([FloatEye]);
    });

    it.each(ACT1)('$map pins the Death Beholder as its door boss ($door)', ({ continent, map, door }) => {
        const payload = encounterAt(continent, map, door);
        expect(payload.enemySlug).toBe('death-beholder');
        expect(payload.isBoss).toBe(true);
        expect(ENEMY_REGISTRY[payload.enemySlug as keyof typeof ENEMY_REGISTRY].difficulty).toBe('boss');
    });

    it.each(ACT1)('$map pins the Green Jelly mid-region ($elite), staged as an elite there, or its own draw', ({ continent, map, elite }) => {
        const payload = encounterAt(continent, map, elite) as { enemySlug?: string; isBoss?: boolean; difficulty?: string };
        // A Breakwater elite node with a `BW_ELITE_DRAWS` row draws its own elites (EN1j on).
        const draw = map === 'breakwater' ? BW_ELITE_DRAWS[elite] : undefined;
        if (draw) {
            expect(payload.enemySlug).toBe(draw[0]!.slug);
            expect(payload.isBoss ?? false).toBe(false);
            expect(ENEMY_REGISTRY[draw[0]!.slug].difficulty).toBe('elite');
            return;
        }
        expect(payload.enemySlug).toBe('green-jelly');
        expect(payload.isBoss ?? false).toBe(false);
        expect(payload.difficulty).toBe('elite');
    });
});

describe('R2b — the enemy keyword code is gone (D63)', () => {
    it('the engine exports none of the deleted keyword, SUMMON or curse surface', () => {
        const gone = [
            'strikeAdd', 'ADD_WAVE_CAP', 'STRIKE_ADD_COST', 'ADD_BITE_PER_LEVEL',
            'effectiveHide', 'scalePlayerHitDetailed', 'BRUTAL_DAMAGE_MULT',
            'WOUND_CARD_ID', 'projectEnemyHealPerRound',
        ];
        for (const name of gone) {
            expect(name in engine, `combat.engine exports ${name}`).toBe(false);
            expect(name in mechanics, `the package exports ${name}`).toBe(false);
        }
    });

    it('no deck telegraph prints a PLEA, premise or curse rider', () => {
        // A `phases` move may carry the BARNACLE Curse, one of the enemy
        // words; the deleted words stay gone from every telegraph.
        for (const enemy of EnemyLibrary) {
            for (const phase of getThreatSequence(enemy)) {
                const faces = phase.branch ? [phase.branch.then, phase.branch.else] : [phase];
                for (const face of faces) {
                    const banned = phase.enemyMove ? /PLEA|premise/ : /PLEA|premise|curse/i;
                    expect(face.threatAction.description, enemy.id).not.toMatch(banned);
                }
            }
        }
    });
});

/**
 * Phase AN4a moved the Act 1 boss to new art, a new id and new words. Phase
 * UP1h measures this exact fight, so every number it fights with is pinned
 * here at the values the Doorwarden carried: an art change must not re-tune it.
 */
describe('the Death Beholder is the Doorwarden\'s fight, carried over whole (AN4a)', () => {
    it('keeps the boss tier, level, map, VITAE and stat budget', () => {
        expect(DeathBeholder).toMatchObject({
            id: 'enemy-death-beholder',
            portraitAsset: 'death-beholder',
            level: 8,
            difficulty: 'boss',
            logic: 'boss',
            mapName: 'lantern-deep',
            maxHealth: 320,
        });
        expect(DeathBeholder.baseStats).toEqual(enemyStatBudget(8, { heart: 1, body: 3, mind: 2 }));
    });

    it('keeps its two stages, its loot and its tiered deck', () => {
        expect(DeathBeholder.stages?.map(st => ({ at: st.at, threatBonus: st.threatBonus, heal: st.heal })))
            .toEqual([
                { at: { vitaePct: 0.6 }, threatBonus: 0.3, heal: undefined },
                { at: { vitaePct: 0.25 }, threatBonus: 0.5, heal: { pct: 0.15 } },
            ]);
        expect(DeathBeholder.loot?.map(l => [l.item?.id ?? null, l.weight])).toEqual([
            ['healing-potion', 40], ['greater-healing-potion', 25], ['minor-healing-potion', 20],
        ]);
        expect(ENEMY_DECKS['enemy-death-beholder']).toEqual({
            tier1: ['litany-of-thresholds', 'the-door-kept-open'],
            tier2: ['the-bronze-frame', 'ap-the-margin-note'],
            tier3: ['what-shuts-stays-shut', 'ap-the-proof-completed', 'ap-the-question-that-eats'],
            tier2AtRound: 4,
            tier3AtRound: 7,
        });
    });

    it('cannot be befriended, so no save ever unlocks its codex entry', () => {
        expect(DeathBeholder.friendshipReward).toBeUndefined();
    });
});

describe('the Green Jelly is the Brine Hag\'s fight, reworked into a town normal (EN1g)', () => {
    it('is a normal at level 5 with HP phases, and keeps its art, map and stat shape', () => {
        expect(GreenJelly).toMatchObject({
            id: 'enemy-green-jelly',
            portraitAsset: 'green-jelly',
            level: 5,
            difficulty: 'normal',
            logic: 'strategic',
            mapName: 'breakwater',
        });
        expect(GreenJelly.baseStats).toEqual(enemyStatBudget(5, { heart: 4, body: 1, mind: 2 }));
        expect(GreenJelly.phases).toHaveLength(2);
        expect(GreenJelly.stages).toEqual([]);
    });

    it('keeps its loot and drops its old deck', () => {
        expect(GreenJelly.loot?.map(l => [l.item?.id ?? null, l.weight])).toEqual([
            [null, 80], ['healing-potion', 20],
        ]);
        expect(ENEMY_DECKS['enemy-green-jelly']).toBeUndefined();
    });

    it('keeps the befriend gate below 30% and its 35 XP friendship bonus', () => {
        expect(GreenJelly.befriendabilityConfig).toEqual({ hpGate: { belowPct: 0.3 } });
        expect(GreenJelly.friendshipReward?.items?.map(i => i.id)).toEqual(['healing-potion']);
        expect(GreenJelly.friendshipReward?.xpBonus).toBe(35);
        expect(GreenJelly.friendshipReward?.flagSet).toBe('befriended-green-jelly');
        expect(GreenJelly.journalEntry?.id).toBe('codex-green-jelly');
    });
});
