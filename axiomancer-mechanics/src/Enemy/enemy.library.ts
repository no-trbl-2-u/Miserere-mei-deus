/**
 * Enemy library — the roster.
 *
 * Act 1's foes, plus the `sandbag-01` dev dummy:
 *   - Float-Eye (L1, normal) — every Act 1 map's wandering fight; HP phases.
 *   - The Gallows Crow, the Net-Mender and the Crane-Hook (normals) —
 *     Chapter 1's fields and quays, bound per node in `MapEvents/content.ts`;
 *     HP phases.
 *   - The Green Jelly (L7, elite) — a rarer mid-region fight; befriendable.
 *   - The Death Beholder (L8, boss) — every region's door fight.
 *
 * A `phases` foe plays T's moves: a fixed loop per phase, a DANGER on
 * each phase change, the enemy words as move fields and one conditional
 * `rider` per move (`Combat/combat.enemy-riders.ts`). Its numbers are
 * authored at its tier's level (`PHASES_AUTHORED_LEVEL`) and scale with its
 * level. The Green Jelly and the Death Beholder keep their decks for now.
 *
 * Difficulty is tier (`normal → elite → boss`, driving the threat-damage
 * multiplier, XP and the encounter generator's adaptive level band), authored
 * level, and THE CLOCK — every telegraphed hit escalates each round past
 * `THREAT_ESCALATION_GRACE`. `xpReward` falls back to
 * `level × DEFAULT_XP_BY_DIFFICULTY[difficulty]`.
 */

import { createEnemy, enemyStatBudget } from './index';
import { EnemyMove, LootTableEntry } from './types';
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

/** Provenance stamp for Chapter 1's normals (T's Breakwater Bestiary picks). */
const CHAPTER1_ADDED = '2026-10-30';

// ─── Chapter 1 moves (T's Breakwater Bestiary, 2026-10-30) ───────────────────
//
// Kinds are the telegraph kinds; numbers are authored at level 2.

const LONG_LOOK: EnemyMove = {
    name: 'Long Look', kind: 'attack',
    text: '6 damage, +2 for each card you leave unplayed in your hand.',
    damage: 6, rider: { kind: 'unplayed-card-bonus', damage: 2 },
};
const AFTERIMAGE: EnemyMove = {
    name: 'Afterimage', kind: 'attack',
    text: '5 damage. If your GUARD blocks all of it, the eye copies your GUARD as its own WARD.',
    damage: 5, rider: { kind: 'guard-to-ward' },
};
const SHUT_LID: EnemyMove = {
    name: 'Shut Lid', kind: 'defend',
    text: 'WARD 8. While shut it cannot see: the next status you put on it lasts 1 turn longer.',
    ward: 8, rider: { kind: 'lengthen-next-status', turns: 1 },
};
const STARE: EnemyMove = {
    name: 'Stare', kind: 'status',
    text: 'You are VULNERABLE 25% for 1 turn.',
    vulnerable: { pct: 25, turns: 1 },
};

const PECK_THE_DEBT: EnemyMove = {
    name: 'Peck the Debt', kind: 'attack',
    text: '3 damage, 2 hits. Each hit that gets through steals 1 Conviction.',
    damage: 3, hits: 2, rider: { kind: 'steal-conviction-per-hit', amount: 1 },
};
const CARRION_DIVE: EnemyMove = {
    name: 'Carrion Dive', kind: 'attack',
    text: '8 damage. If you are under half VITAE: 12 damage, and the crow MENDs 4.',
    damage: 8, rider: { kind: 'below-half-vitae', damage: 12, mend: 4 },
};
const TAKE_WING: EnemyMove = {
    name: 'Take Wing', kind: 'defend',
    text: 'WARD 6. If you do not hit it this turn, its next attack gains +3.',
    ward: 6, rider: { kind: 'unhit-next-attack-bonus', damage: 3 },
};
const SHINY_THING: EnemyMove = {
    name: 'Shiny Thing', kind: 'status',
    text: 'Steals one banked die. With none banked: TANGLE 1.',
    rider: { kind: 'steal-banked-die', tangle: 1 },
};

const CAST_NET: EnemyMove = {
    name: 'Cast Net', kind: 'attack',
    text: '5 damage and TANGLE 1.',
    damage: 5, tangle: 1,
};
const HAUL_IN: EnemyMove = {
    name: 'Haul In', kind: 'attack',
    text: '6 damage. If you are TANGLED: 11 damage, and the tangle ends.',
    damage: 6, rider: { kind: 'if-tangled', damage: 11 },
};
const MEND_THE_NET: EnemyMove = {
    name: 'Mend the Net', kind: 'defend',
    text: 'MEND 6 and it SCOURs one status off itself.',
    enemyHeal: 6, enemyCleanse: 1,
};
const GILL_HOOK: EnemyMove = {
    name: 'Gill-hook', kind: 'status',
    text: 'A BARNACLE Curse goes into your hand.',
    barnacle: 1,
};

const SWING: EnemyMove = {
    name: 'Swing', kind: 'attack',
    text: '8 damage. Your GUARD counts half against it.',
    damage: 8, rider: { kind: 'half-guard' },
};
const LOCK_THE_BRAKE: EnemyMove = {
    name: 'Lock the Brake', kind: 'defend',
    text: 'WARD 10.',
    ward: 10,
};
const HOIST: EnemyMove = {
    name: 'Hoist', kind: 'status',
    text: 'UNDERTOW: your body die is lifted out of your next roll.',
    undertow: 'body',
};
/** Counterweight's second hit: 6, and 9 in its second phase. */
function counterweight(later: number): EnemyMove {
    return {
        name: 'Counterweight', kind: 'attack',
        text: `4 damage now, ${later} more next turn unless you deal 10+ to it this turn.`,
        damage: 4, rider: { kind: 'delayed-hit', damage: later, unless: 10 },
    };
}

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
    // Reworked (T, 2026-10-30): it punishes a full hand and a big final blow.
    phases: [
        { moves: [LONG_LOOK, AFTERIMAGE, SHUT_LID, STARE] },
        {
            danger: {
                name: 'The Long Career', kind: 'danger',
                text: 'Hits back for half the damage you dealt it last turn.',
                rider: { kind: 'half-dealt-last-turn' },
            },
            // Shut Lid leaves the pool; Long Look rises to +3 per unplayed card.
            moves: [
                { ...LONG_LOOK, text: '6 damage, +3 for each card you leave unplayed in your hand.', rider: { kind: 'unplayed-card-bonus', damage: 3 } },
                AFTERIMAGE, STARE,
            ],
        },
    ],
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

export const GreenJelly = createEnemy({
    id: 'enemy-green-jelly',
    portraitAsset: 'green-jelly',
    name: 'Green Jelly',
    description:
        'A green clot of jelly the size of a cart, clear enough to read through. Things it has ' +
        'eaten hang in it, half gone, still facing the way they faced. It is in no hurry. Neither were they.',
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
            'The jelly settles, slow as cooling wax, and goes still on the stone. Through it, ' +
            'the things it kept drift loose and sink, one by one, until it holds only light. ' +
            'It does not follow when you go. It lets you take the whole of yourself away.',
        flagSet: 'befriended-green-jelly',
    },
    pactLines: {
        quiet:   'She stops reaching for your reflection. The rock pools go still and honest.',
        setDown: 'She sets a small mirror of pooled brine between you. It shows you, unedited. It is a gift.',
        heavy:   '"I sold my face for leverage over the drowning. You are the first to stand in front of me and stay one person."',
    },
    journalEntry: {
        id: 'codex-green-jelly',
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

/** Fields & south road: lives on the crossroads gibbet. */
export const GallowsCrow = createEnemy({
    id: 'enemy-gallows-crow',
    portraitAsset: 'gallows-crow',
    name: 'Gallows Crow',
    description: 'Lives on the crossroads gibbet, collecting what the hanged still owed.',
    level: 2,
    baseStats: enemyStatBudget(2),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    phases: [
        { moves: [PECK_THE_DEBT, CARRION_DIVE, TAKE_WING, SHINY_THING] },
        {
            danger: {
                name: 'Murder of Crows', kind: 'danger',
                text: 'One 2-damage hit per 2 cards in your discard (at least 3 hits).',
                damage: 2, rider: { kind: 'hits-per-discard', per: 2, min: 3 },
            },
            // Peck the Debt becomes 3 hits.
            moves: [
                { ...PECK_THE_DEBT, text: '3 damage, 3 hits. Each hit that gets through steals 1 Conviction.', hits: 3 },
                CARRION_DIVE, TAKE_WING, SHINY_THING,
            ],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy'],
});

/** The quays: a drowned fisherman still mending his net. */
export const NetMender = createEnemy({
    id: 'enemy-net-mender',
    portraitAsset: 'net-mender',
    name: 'Net-Mender',
    description: 'A drowned fisherman still mending the net he went down in.',
    level: 3,
    baseStats: enemyStatBudget(3),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    phases: [
        { moves: [CAST_NET, HAUL_IN, MEND_THE_NET, GILL_HOOK] },
        {
            danger: {
                name: 'The Whole Catch', kind: 'danger',
                text: '3 damage per card in your hand, then TANGLE 2.',
                tangle: 2, rider: { kind: 'hand-size-damage', damage: 3 },
            },
            // Cast Net and Haul In always come back to back.
            moves: [CAST_NET, HAUL_IN],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy'],
});

/** The quays: an iron dock crane that swings on its own. */
export const CraneHook = createEnemy({
    id: 'enemy-crane-hook',
    portraitAsset: 'crane-hook',
    name: 'Crane-Hook',
    description: 'An iron dock crane that swings on its own and lifts whatever is owed.',
    level: 3,
    baseStats: enemyStatBudget(3),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    phases: [
        { moves: [SWING, counterweight(6), LOCK_THE_BRAKE, HOIST] },
        {
            danger: {
                name: 'Drop the Load', kind: 'danger',
                text: '15 damage. If you block all of it, the crane is VULNERABLE 50% for 2 turns.',
                damage: 15, rider: { kind: 'self-vulnerable-on-block', pct: 50, turns: 2 },
            },
            // Counterweight's second hit grows to 9.
            moves: [SWING, counterweight(9), LOCK_THE_BRAKE, HOIST],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy'],
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
export const EnemyLibrary = [FloatEye, GallowsCrow, NetMender, CraneHook, GreenJelly, DeathBeholder] as const;

/**
 * An Act 1 region's wandering pool: Float-Eye. The Green Jelly is a
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
    'gallows-crow':   GallowsCrow,
    'net-mender':     NetMender,
    'crane-hook':     CraneHook,
    'green-jelly':      GreenJelly,
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
