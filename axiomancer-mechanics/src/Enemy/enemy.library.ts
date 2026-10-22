/**
 * Enemy library — the roster.
 *
 * Three foes that deal plain damage, one per tier Act 1 uses, plus the
 * `sandbag-01` dev dummy:
 *   - Float-Eye (L1, normal) — every Act 1 map's wandering fight.
 *   - The Brine Hag (L7, elite) — a rarer mid-region fight; befriendable.
 *   - The Death Beholder (L8, boss) — every region's door fight.
 *
 * No enemy carries a keyword, affliction or rider.
 *
 * Difficulty is tier (`normal → elite → boss`, driving the threat-damage
 * multiplier, XP and the encounter generator's adaptive level band), authored
 * level, and THE CLOCK — every telegraphed hit escalates each round past
 * `THREAT_ESCALATION_GRACE`. `xpReward` falls back to
 * `level × DEFAULT_XP_BY_DIFFICULTY[difficulty]`.
 */

import { createEnemy, enemyStatBudget } from './index';
import { LootTableEntry } from './types';
import { consumableLibrary, getConsumableById } from '../Items/consumable.library';
import { Consumable } from '../Items/types';

// ─── Loot helpers ─────────────────────────────────────────────────────────────

/** Returns a fresh copy of the named consumable from the library, q=1. */
function consumable(id: string): Consumable {
    const found = getConsumableById(id);
    if (!found) {
        throw new Error(`enemy.library: unknown consumable id '${id}'.`);
    }
    return { ...found, quantity: 1 };
}

/** No-drop bucket helper — readability sugar over `{ item: null, weight }`. */
function none(weight: number): LootTableEntry {
    return { item: null, weight };
}

/** Drop bucket helper — wraps a consumable id with its weight. */
function drop(id: string, weight: number): LootTableEntry {
    return { item: consumable(id), weight };
}

const ADDED = '2026-07-06';

/** Provenance stamp for the W-01 labyrinth-boss batch the Act 1 boss's numbers came from. */
const APORIA_ADDED = '2026-07-07';

// ─── The roster ───────────────────────────────────────────────────────────────

/**
 * The library's smallest stat block. HAND-SET 1/1/1 (15 HP at L1); many
 * hermetic e2e tests depend on the exact
 * `maxHealth = 15`, so keep this block at 1/1/1.
 */
export const FloatEye = createEnemy({
    id: 'enemy-float-eye',
    portraitAsset: 'float-eye',
    name: 'Float-Eye',
    description: 'An eye that outlived its head. It has watched so long it has developed opinions, and one of them is about you.',
    level: 1,
    baseStats: { body: 1, mind: 1, heart: 1 },
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    finalBlowLines: {
        brutal: 'The eye closes for the first time in its long career, and does not reopen.',
        quiet:  'It blinks once — a thing it had been saving — and settles into the dark.',
        ironic: 'It watched the blow arrive from very far away, and disagreed with it to the end.',
    },
    causeLines: {
        brutal: 'It saw the opening before you made it. It had seen it for some time.',
        broken: 'You cannot outlast a thing whose whole vocation is waiting.',
        quiet:  'You look at it a moment too long, and it wins the exchange of looking.',
    },
    addedIn: ADDED,
    tags: ['early-game', 'enemy'],
});

export const BrineHag = createEnemy({
    id: 'enemy-brine-hag',
    portraitAsset: 'brine-hag',
    name: 'Brine Hag',
    description: 'She traded her reflection to the tide for the right to keep yours. The exchange rate has only worsened since.',
    level: 7,
    baseStats: enemyStatBudget(7, { heart: 4, body: 1, mind: 2 }),
    mapName: 'breakwater',
    difficulty: 'elite',
    logic: 'strategic',
    loot: [none(80), drop('healing-potion', 20)],
    befriendabilityConfig: {
        hpGate: { belowPct: 0.3 },
    },
    friendshipReward: {
        items: [
            { ...getConsumableById('healing-potion')! },
        ],
        xpBonus: 35,
        narrative:
            'The hag lowers her hands and, for the first time in a tide\'s age, looks at ' +
            'nothing at all. "You kept your face," she says. "Even here. Even now. ' +
            'Perhaps the sea will trade mine back for the novelty."',
        flagSet: 'befriended-brine-hag',
    },
    pactLines: {
        quiet:   'She stops reaching for your reflection. The rock pools go still and honest.',
        setDown: 'She sets a small mirror of pooled brine between you. It shows you, unedited. It is a gift.',
        heavy:   '"I sold my face for leverage over the drowning. You are the first to stand in front of me and stay one person."',
    },
    journalEntry: {
        id: 'codex-brine-hag',
        title: 'The Face Broker',
        body:
            'Every bargain she has struck is recorded in a face she keeps and cannot wear. ' +
            'She does not want your death. She wants a reflection that stops flinching. ' +
            'The tide pays its debts in other people\'s features.',
    },
    finalBlowLines: {
        brutal: 'The stolen reflections leave her all at once, a spring tide of other people\'s faces.',
        quiet:  'She wades out past her depth, and for once nothing in the water looks back.',
        ironic: 'She reached for your reflection and found your resolve wearing it.',
    },
    causeLines: {
        brutal: 'She holds up the face you make at the end, and keeps it.',
        broken: 'Bargain by bargain, you trade away the parts of you that were winning.',
        quiet:  'You catch your reflection in her tide pool and it does not follow you home.',
    },
    addedIn: ADDED,
    tags: ['early-game', 'elite', 'enemy'],
});

/**
 * The region boss — every Act 1 region's door fight. Its stages are a boss
 * phase change, not keywords.
 */
export const DeathBeholder = createEnemy({
    id: 'enemy-death-beholder',
    portraitAsset: 'death-beholder',
    name: 'The Death Beholder',
    description:
        'An eye that outlived its seeing. The sockets are empty, and the gaze comes out of them ' +
        'anyway, heavier for having nothing left to look through. It does not blink. ' +
        'It has nothing left to close.',
    level: 8,
    baseStats: enemyStatBudget(8, { heart: 1, body: 3, mind: 2 }),
    mapName: 'lantern-deep',
    difficulty: 'boss',
    logic: 'boss',
    vitae: 320,
    stages: [
        {
            at: { vitaePct: 0.6 },
            name: 'EVERY DOOR HE REMEMBERS',
            text: 'He shuts one more. You did not know it was open until you heard it.',
            threatBonus: 0.3,
        },
        {
            at: { vitaePct: 0.25 },
            name: 'WHAT SHUTS, STAYS SHUT',
            text: 'He kneels lower. Bronze finds the seam of the room and the room stops having a far side.',
            heal: { pct: 0.15 },
            threatBonus: 0.5,
        },
    ],
    loot: [
        drop('healing-potion', 40),
        drop('greater-healing-potion', 25),
        drop('minor-healing-potion', 20),
    ],
    finalBlowLines: {
        brutal: 'The hinge-priest comes apart at every joint at once. Ten thousand doors, unheld, swing open somewhere.',
        quiet:  'He folds shut along his own seams, the way a door closes on an empty room, and stays closed.',
        ironic: 'He remembered every door that ever shut. He had no doctrine for one that simply walked through him.',
    },
    causeLines: {
        brutal: 'The threshold arrives at you, all bronze and precedent, and closes.',
        broken: 'Room by room he narrows the argument until the only door left open is the one behind you.',
        quiet:  'You pause to knock. In his chapel, knocking is consent to the terms of the house.',
    },
    journalEntry: {
        id: 'codex-death-beholder',
        title: 'The Hinge-Priest',
        body:
            'The house needed something to believe in its doors, so it built a believer. ' +
            'He was assembled from the hinges of every argument that ever closed — each ' +
            'joint a refusal, oiled and kept. His liturgy is short: what shuts, stays ' +
            'shut. He kneels because a kneeling thing is a door at rest, and he has ' +
            'been at rest, facing the entrance, for a very long time.',
    },
    addedIn: APORIA_ADDED,
    tags: ['early-game', 'boss', 'enemy'],
});

// ─── Test fixture (NOT part of the roster) ───────────────────────────────────

/**
 * Punching-bag enemy used by hermetic tests that need a long-lived combat
 * encounter. It keeps body at 1 so body-defense damage assertions remain stable, while heart/mind carry the extra HP budget.
 * Kept separate from the roster so the encounter generator never selects it.
 */
export const Sandbag_01 = createEnemy({
    id: 'sandbag-01',
    name: 'Sandbag',
    description:
        'A practice dummy of stitched arguments, hung from a rope. It mumbles, ' +
        'rarely strikes back, and refuses to die quickly.',
    level: 10,
    baseStats: { body: 1, mind: 30, heart: 29 },
    mapName: 'breakwater',
    difficulty: 'simple',
    logic: 'random',
});

// ─── Library indices ──────────────────────────────────────────────────────────

/** Every production enemy, in tier order. */
export const EnemyLibrary = [FloatEye, BrineHag, DeathBeholder] as const;

/**
 * An Act 1 region's wandering pool: Float-Eye. The Brine Hag is a
 * rarer mid-region fight and the Death Beholder the door fight; both are pinned
 * per-node in `MapEvents/content.ts`, not drawn.
 */
const ACT1_POOL = [FloatEye];

/**
 * Per-map enemy pools used by the encounter generator. Act 1 draws Float-Eye;
 * the parked Labyrinth keeps it so its parked tests run.
 */
export const EnemiesByMap = {
    'breakwater': ACT1_POOL,
    'charcoal-wood': ACT1_POOL,
    'beacon-crags': ACT1_POOL,
    'lantern-deep': ACT1_POOL,
    // Parked; unreachable while the vault door is sealed.
    'aporia-colonnade': ACT1_POOL,
    'aporia-archive': ACT1_POOL,
    'aporia-proof': ACT1_POOL,
} as const;

/**
 * Slug-keyed registry of enemy fixtures. Useful for hermetic tests, map-event
 * payloads and debug entry points that look an enemy up by short name.
 */
export const ENEMY_REGISTRY = {
    // Test fixture.
    sandbag: Sandbag_01,
    'float-eye':      FloatEye,
    'brine-hag':      BrineHag,
    'death-beholder': DeathBeholder,
} as const;

export type EnemySlug = keyof typeof ENEMY_REGISTRY;

/** Every live enemy id. A save naming any other (a removed foe) re-points to Float-Eye. */
export const LIVE_ENEMY_IDS: ReadonlySet<string> = new Set(
    Object.values(ENEMY_REGISTRY).map(e => e.id),
);

// Re-export the consumable library so test runners that import this file
// don't accidentally tree-shake the dependency.
void consumableLibrary;
