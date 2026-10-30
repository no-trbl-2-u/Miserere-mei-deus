/**
 * Enemy library — the roster.
 *
 * Act 1's foes, plus the `sandbag-01` dev dummy:
 *   - Float-Eye (L1, normal) — every Act 1 map's wandering fight; HP phases.
 *   - The Gallows Crow, the Net-Mender and the Crane-Hook (normals) —
 *     Chapter 1's fields and quays, bound per node in `MapEvents/content.ts`;
 *     HP phases.
 *   - The Brine-Widow, the Lamprey-Knot and the Curfew-Ringer (normals) —
 *     the long pier and the town; HP phases.
 *   - The Green Jelly (L5, normal, reworked) — the town's befriendable fight;
 *     HP phases.
 *   - The Wreck-Picker and the Smokehouse Gutter (normals) — the cliffs and
 *     the hamlet; the Tithe-Collector (elite) — one of the sea cave's two
 *     elites, drawn per run; HP phases.
 *   - The Cave Choir (L5, elite) — the sea cave's other elite, drawn per run;
 *     HP phases and its VERSE count.
 *   - The Lamplighter and the Wrecker (L7, elites) — the lighthouse path's
 *     two elites, drawn per run; HP phases, its lamp and its Bait.
 *   - The Death Beholder (L8, boss) — every region's door fight.
 *
 * A `phases` foe plays T's moves: a fixed loop per phase, a DANGER on
 * each phase change, the enemy words as move fields and one conditional
 * `rider` per move (`Combat/combat.enemy-riders.ts`). Its numbers are
 * authored at its tier's level (`PHASES_AUTHORED_LEVEL`) and scale with its
 * level. The Death Beholder keeps its deck for now.
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

const SALT_THE_WOUND: EnemyMove = {
    name: 'Salt the Wound', kind: 'attack',
    text: '5 damage, doubled if you carry any status.',
    damage: 5, rider: { kind: 'double-if-status' },
};
/** Keening's BRINE: 3, and 5 in its second phase. */
function keening(brine: number): EnemyMove {
    return { name: 'Keening', kind: 'attack', text: `4 damage and BRINE ${brine}.`, damage: 4, brine };
}
const BLACK_VEIL: EnemyMove = {
    name: 'Black Veil', kind: 'defend',
    text: 'WARD 6. While veiled, your HEAL is halved.',
    ward: 6, rider: { kind: 'veil' },
};
const MOURNING: EnemyMove = {
    name: 'Mourning', kind: 'status',
    text: 'You are VULNERABLE 25% for 2 turns.',
    vulnerable: { pct: 25, turns: 2 },
};

const LATCH: EnemyMove = {
    name: 'Latch', kind: 'attack',
    text: '4 damage and LEECH 2 on you: it heals what you lose.',
    damage: 4, leech: 2,
};
/** Writhe's hits: 3, and 4 in its second phase. */
function writhe(hits: number): EnemyMove {
    return { name: 'Writhe', kind: 'attack', text: `2 damage, ${hits} hits.`, damage: 2, hits };
}
const KNOT_UP: EnemyMove = {
    name: 'Knot Up', kind: 'defend',
    text: 'WARD 5 and MEND 4.',
    ward: 5, enemyHeal: 4,
};
const MOUTHFUL: EnemyMove = {
    name: 'Mouthful', kind: 'status',
    text: 'LEECH 3 on you.',
    leech: 3,
};

/** Engulf holds one card, and two in the second phase. */
function engulf(cards: number): EnemyMove {
    return {
        name: 'Engulf', kind: 'attack',
        text: `5 damage. The next ${cards === 1 ? 'card you play is' : `${cards} cards you play are`} HELD inside it until it dies or its DANGER fires.`,
        damage: 5, rider: { kind: 'engulf-hold', cards },
    };
}
const SHOW_YOU_YOUR_FACE: EnemyMove = {
    name: 'Show You Your Face', kind: 'attack',
    text: 'Deals what you dealt it last turn, up to 10.',
    rider: { kind: 'mirror-dealt', cap: 10 },
};
const SETTLE: EnemyMove = {
    name: 'Settle', kind: 'defend',
    text: 'WARD 8.',
    ward: 8,
};
const REFLECTION: EnemyMove = {
    name: 'Reflection', kind: 'status',
    text: 'Copies the last status you put on it back onto you.',
    rider: { kind: 'copy-last-status' },
};

const TOLL: EnemyMove = {
    name: 'Toll', kind: 'attack',
    text: '4 damage, +2 for every Toll already rung this fight (the count shows).',
    damage: 4, rider: { kind: 'toll-count', damage: 2 },
};
const CLAPPER: EnemyMove = {
    name: 'Clapper', kind: 'attack',
    text: '7 damage, +4 if you played 3+ cards this turn.',
    damage: 7, rider: { kind: 'many-plays-bonus', damage: 4, cards: 3 },
};
const BAR_THE_DOOR: EnemyMove = {
    name: 'Bar the Door', kind: 'defend',
    text: 'WARD 8.',
    ward: 8,
};
const HUSH: EnemyMove = {
    name: 'Hush', kind: 'status',
    text: 'TANGLE 2.',
    tangle: 2,
};

// The cliffs and hamlet: the Wreck-Picker's hoard and the Smokehouse Gutter's fire.
/** Pick Over takes one card into the hoard, two in the second phase. */
function pickOver(cards: number): EnemyMove {
    return {
        name: 'Pick Over', kind: 'attack',
        text: `5 damage. Takes ${cards === 1 ? 'a random card' : `${cards} random cards`} from your discard into its hoard.`,
        damage: 5, rider: { kind: 'hoard-pick', cards, from: 'random' },
    };
}
const HURL_FLOTSAM: EnemyMove = {
    name: 'Hurl Flotsam', kind: 'attack',
    text: '3 damage per card in its hoard.',
    rider: { kind: 'hoard-hurl', damage: 3 },
};
const HIDE_IN_THE_HOARD: EnemyMove = {
    name: 'Hide in the Hoard', kind: 'defend',
    text: 'WARD 3 per hoarded card.',
    rider: { kind: 'hoard-ward', ward: 3 },
};
const GULL_CALL: EnemyMove = {
    name: 'Gull-call', kind: 'status',
    text: 'UNDERTOW on a random die.',
    undertow: 'random',
};

const SMOKE_LASH: EnemyMove = {
    name: 'Smoke Lash', kind: 'attack',
    text: '6 damage. Adds the INFERNO on it to the hit and gains that much WARD.',
    damage: 6, rider: { kind: 'inferno-feed' },
};
const GUT_HOOK: EnemyMove = {
    name: 'Gut Hook', kind: 'attack',
    text: '7 damage. If it gets through your GUARD: BARNACLE.',
    damage: 7, rider: { kind: 'barnacle-on-hit' },
};
const HANG_TO_CURE: EnemyMove = {
    name: 'Hang to Cure', kind: 'defend',
    text: 'MEND 8, but it is VULNERABLE 25% next turn.',
    enemyHeal: 8, rider: { kind: 'self-vulnerable', pct: 25, turns: 1 },
};
const CHOKING_SMOKE: EnemyMove = {
    name: 'Choking Smoke', kind: 'status',
    text: 'TANGLE 2.',
    tangle: 2,
};

// The sea cave's Tithe-Collector: the LEDGER reads what you scrap and spend.
/** Assess: 6, +3 per card scrapped this turn; from the second phase +4, and +2 per Lien. */
function assess(later: boolean): EnemyMove {
    return later
        ? {
            name: 'Assess', kind: 'attack',
            text: '6 damage, +4 for each card you scrapped this turn and +2 for each Lien in your hand.',
            damage: 6, rider: { kind: 'assess', perScrap: 4, perLien: 2 },
        }
        : {
            name: 'Assess', kind: 'attack',
            text: '6 damage, +3 for each card you scrapped this turn.',
            damage: 6, rider: { kind: 'assess', perScrap: 3 },
        };
}
/** Garnish: 6, takes 2 Conviction (+4 with none to take); from the second phase +2 per Lien. */
function garnish(later: boolean): EnemyMove {
    return {
        name: 'Garnish', kind: 'attack',
        text: `6 damage and takes 2 Conviction. With none to take: +4 damage.${later ? ' +2 for each Lien in your hand.' : ''}`,
        damage: 6,
        rider: later ? { kind: 'garnish', take: 2, bonus: 4, perLien: 2 } : { kind: 'garnish', take: 2, bonus: 4 },
    };
}
const LEDGER_SHIELD: EnemyMove = {
    name: 'Ledger Shield', kind: 'defend',
    text: 'WARD equal to twice your Conviction.',
    rider: { kind: 'ward-per-conviction', per: 2 },
};
const LIEN: EnemyMove = {
    name: 'Lien', kind: 'status',
    text: 'A Lien (a BARNACLE Curse) goes into your hand. His attacks gain +2 for each Lien in your hand.',
    barnacle: 1,
};
const SEIZE_GOODS: EnemyMove = {
    name: 'Seize Goods', kind: 'attack',
    text: '5 damage. Takes the top card of your discard until he dies.',
    damage: 5, rider: { kind: 'hoard-pick', cards: 1, from: 'top' },
};

// The Cave Choir (phase EN1j), the sea cave's second elite: numbers authored
// at level 3 (`PHASES_AUTHORED_LEVEL.elite`).

const HYMN: EnemyMove = {
    name: 'Hymn', kind: 'attack',
    text: '3 damage, 2 hits. +1 VERSE.',
    damage: 3, hits: 2, rider: { kind: 'verse-gain', verse: 1 },
};
const THE_PEWS: EnemyMove = {
    name: 'The Pews', kind: 'defend',
    text: 'WARD 10.',
    ward: 10,
};
const CRESCENDO: EnemyMove = {
    name: 'Crescendo', kind: 'attack',
    text: 'One hit of 2 damage per VERSE.',
    rider: { kind: 'verse-hit', damage: 2 },
};
const SEA_WATER_PSALM: EnemyMove = {
    name: 'Sea-Water Psalm', kind: 'status',
    text: '2 BARNACLE Curses into your hand.',
    barnacle: 2,
};
const ANTIPHON: EnemyMove = {
    name: 'Antiphon', kind: 'unknown',
    text: 'Answers your last turn. If you attacked, The Pews. If you guarded, a Hymn worth +2 VERSE.',
    rider: { kind: 'antiphon', ward: 10, damage: 3, hits: 2, verse: 2 },
};

// The lighthouse path's elites (phase EN1k): numbers authored at level 3
// (`PHASES_AUTHORED_LEVEL.elite`). The Lamplighter's lamp starts Lit.

const WICK_LASH: EnemyMove = {
    name: 'Wick-Lash', kind: 'attack',
    text: '6 damage. If Lit, INFERNO 2 on you.',
    damage: 6, rider: { kind: 'wick-lash', inferno: 2, dark: 0 },
};
const SHUTTER: EnemyMove = {
    name: 'Shutter', kind: 'defend',
    text: 'Goes Dark, WARD 12.',
    ward: 12, rider: { kind: 'lamp', to: 'dark' },
};
const GLARE: EnemyMove = {
    name: 'Glare', kind: 'status',
    text: 'VULNERABLE 25% for 1 turn. Lit only.',
    vulnerable: { pct: 25, turns: 1 }, rider: { kind: 'lit-only' },
};
const WICK_LASH_2: EnemyMove = {
    name: 'Wick-Lash', kind: 'attack',
    text: '6 damage, +3 while Dark. If Lit, INFERNO 2 on you.',
    damage: 6, rider: { kind: 'wick-lash', inferno: 2, dark: 3 },
};
const SHUTTER_2: EnemyMove = {
    name: 'Shutter', kind: 'defend',
    text: 'WARD 12. Goes Dark every other time, and Lit the time between.',
    ward: 12, rider: { kind: 'lamp', to: 'flip' },
};
// The last loop plays "Anything" in the dark: its moves telegraph UNKNOWN and hit +3.
const WICK_LASH_3: EnemyMove = {
    name: 'Wick-Lash', kind: 'unknown',
    text: '9 damage, +3 while Dark.',
    damage: 9, rider: { kind: 'wick-lash', inferno: 0, dark: 3 },
};
const SHUTTER_3: EnemyMove = {
    name: 'Shutter', kind: 'unknown',
    text: 'WARD 12. The lamp stays out.',
    ward: 12,
};

const WRECKERS_BAIT: EnemyMove = {
    name: "Wrecker's Bait", kind: 'unknown',
    text: 'Reads your turn end. With GUARD up it takes WARD 14. Without, 12 damage.',
    rider: { kind: 'bait', ward: 14, damage: 12 },
};
const CUDGEL: EnemyMove = {
    name: 'Cudgel', kind: 'attack',
    text: '7 damage. If it gets through your GUARD, BARNACLE.',
    damage: 7, rider: { kind: 'barnacle-if-through', barnacle: 1 },
};
const ROPE: EnemyMove = {
    name: 'Rope', kind: 'status',
    text: 'TANGLE 2.',
    tangle: 2,
};
const SALVAGE_HOOK: EnemyMove = {
    name: 'Salvage Hook', kind: 'attack',
    text: '6 damage and steals a banked die.',
    damage: 6, rider: { kind: 'steal-banked-die', tangle: 0 },
};
const CUDGEL_3: EnemyMove = {
    name: 'Cudgel', kind: 'attack',
    text: '10 damage. If it gets through your GUARD, BARNACLE.',
    damage: 10, rider: { kind: 'barnacle-if-through', barnacle: 1 },
};
const SALVAGE_HOOK_3: EnemyMove = {
    name: 'Salvage Hook', kind: 'attack',
    text: '9 damage and steals a banked die.',
    damage: 9, rider: { kind: 'steal-banked-die', tangle: 0 },
};

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
    level: 5,
    baseStats: enemyStatBudget(5, { heart: 4, body: 1, mind: 2 }),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'strategic',
    loot: [none(80), drop('healing-potion', 20)],
    // Reworked (T, 2026-10-30): a town normal that keeps what it eats. Its
    // befriend window is the 30% line, where the second phase begins.
    phases: [
        { moves: [engulf(1), SHOW_YOU_YOUR_FACE, SETTLE, REFLECTION] },
        {
            danger: {
                name: 'Spit It Out', kind: 'danger',
                text: 'Every HELD card drops into your discard, 4 damage per card.',
                rider: { kind: 'spit-held', damage: 4 },
            },
            // Engulf holds 2 cards; the Open Hand can now befriend it.
            moves: [engulf(2), SHOW_YOU_YOUR_FACE, SETTLE, REFLECTION],
        },
    ],
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
    tags: ['early-game', 'enemy'],
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

/** The long pier: she waits at the pier end with a fist of salt. */
export const BrineWidow = createEnemy({
    id: 'enemy-brine-widow',
    portraitAsset: 'brine-widow',
    name: 'Brine-Widow',
    description: 'She waits at the pier end with a fist of salt for whoever comes back.',
    level: 4,
    baseStats: enemyStatBudget(4),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    phases: [
        { moves: [SALT_THE_WOUND, keening(3), BLACK_VEIL, MOURNING] },
        {
            danger: {
                name: 'Throw the Salt', kind: 'danger',
                text: 'Strips your THORNS, REFLECT and INFERNO, then 3 damage for each one stripped.',
                rider: { kind: 'strip-weather-hits', damage: 3 },
            },
            // Keening's BRINE rises to 5.
            moves: [SALT_THE_WOUND, keening(5), BLACK_VEIL, MOURNING],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy'],
});

/** The harbour steps: a ball of lampreys knotted round a pier pile. */
export const LampreyKnot = createEnemy({
    id: 'enemy-lamprey-knot',
    portraitAsset: 'lamprey-knot',
    name: 'Lamprey-Knot',
    description: 'A ball of lampreys knotted round a pier pile, feeding on the tide line.',
    level: 4,
    baseStats: enemyStatBudget(4),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    phases: [
        { moves: [LATCH, writhe(3), KNOT_UP, MOUTHFUL] },
        {
            danger: {
                name: 'Unravel', kind: 'danger',
                text: '4 damage per turn of LEECH left on you, then it lets go.',
                rider: { kind: 'leech-turns-damage', damage: 4 },
            },
            // Writhe rises to 4 hits.
            moves: [LATCH, writhe(4), KNOT_UP, MOUTHFUL],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy'],
});

/** The town: rings it to bed. */
export const CurfewRinger = createEnemy({
    id: 'enemy-curfew-ringer',
    portraitAsset: 'curfew-ringer',
    name: 'Curfew-Ringer',
    description: 'Rings the town to bed. Anyone still out after the bell is fair game.',
    level: 5,
    baseStats: enemyStatBudget(5),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    phases: [
        { moves: [TOLL, CLAPPER, BAR_THE_DOOR, HUSH] },
        {
            danger: {
                name: 'Curfew', kind: 'danger',
                text: 'Next turn you can play at most 2 cards.',
                rider: { kind: 'curfew', cards: 2 },
            },
            // Toll comes every other turn.
            moves: [TOLL, CLAPPER, TOLL, BAR_THE_DOOR, TOLL, HUSH],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy'],
});

/** The cliffs: strips what the sea brings in, and what you carry. */
export const WreckPicker = createEnemy({
    id: 'enemy-wreck-picker',
    portraitAsset: 'wreck-picker',
    name: 'Wreck-Picker',
    description: 'A cliff scavenger who strips what the sea brings in, and what you carry.',
    level: 6,
    baseStats: enemyStatBudget(6),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    phases: [
        { moves: [pickOver(1), HURL_FLOTSAM, HIDE_IN_THE_HOARD, GULL_CALL] },
        {
            danger: {
                name: 'Everything Washes Up', kind: 'danger',
                text: '4 damage per hoarded card, then the cards go back to your hand.',
                rider: { kind: 'hoard-return', damage: 4 },
            },
            // Pick Over takes 2 cards.
            moves: [pickOver(2), HURL_FLOTSAM, HIDE_IN_THE_HOARD, GULL_CALL],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy'],
});

/** The hamlet: gutted and hung on the smoking racks, still working. */
export const SmokehouseGutter = createEnemy({
    id: 'enemy-smokehouse-gutter',
    portraitAsset: 'smokehouse-gutter',
    name: 'Smokehouse Gutter',
    description: 'Something gutted and hung on the hamlet\'s smoking racks, still working.',
    level: 6,
    baseStats: enemyStatBudget(6),
    mapName: 'breakwater',
    difficulty: 'normal',
    logic: 'balanced',
    loot: [none(70), drop('minor-healing-potion', 25), drop('healing-potion', 5)],
    phases: [
        { moves: [SMOKE_LASH, GUT_HOOK, HANG_TO_CURE, CHOKING_SMOKE] },
        {
            danger: {
                name: 'Light the Racks', kind: 'danger',
                text: 'INFERNO 4 on both sides.',
                rider: { kind: 'inferno-both', amount: 4 },
            },
            // Gut Hook always lands its BARNACLE.
            moves: [
                SMOKE_LASH,
                { name: 'Gut Hook', kind: 'attack', text: '7 damage and a BARNACLE Curse, always.', damage: 7, barnacle: 1 },
                HANG_TO_CURE, CHOKING_SMOKE,
            ],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy'],
});

/** The sea cave's elite: the town's tithe, followed down to the cave. */
export const TitheCollector = createEnemy({
    id: 'enemy-tithe-collector',
    portraitAsset: 'tithe-collector',
    name: 'The Tithe-Collector',
    description: 'The town\'s tithe is due, and he has followed you down to the sea cave to collect it. Your name is already in the ledger.',
    level: 5,
    baseStats: enemyStatBudget(5),
    mapName: 'breakwater',
    difficulty: 'elite',
    logic: 'balanced',
    loot: [none(50), drop('healing-potion', 35), drop('greater-healing-potion', 15)],
    phases: [
        {
            moves: [assess(false), garnish(false), LEDGER_SHIELD],
        },
        {
            danger: {
                name: 'Audit', kind: 'danger',
                text: '3 damage per LEDGER, then the LEDGER clears.',
                rider: { kind: 'audit', damage: 3 },
            },
            moves: [LIEN, assess(true), garnish(true)],
        },
        {
            danger: {
                name: 'Foreclose', kind: 'danger',
                text: 'Takes all your Conviction, then 2 damage and WARD 2 for each point taken.',
                rider: { kind: 'foreclose', damage: 2, ward: 2 },
            },
            moves: [SEIZE_GOODS, assess(true)],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'elite', 'enemy'],
});

/** The sea cave's second elite (phase EN1j): the drowned congregation. */
export const CaveChoir = createEnemy({
    id: 'enemy-cave-choir',
    portraitAsset: 'cave-choir',
    name: 'The Cave Choir',
    description: 'The drowned congregation, still at service under the cliff.',
    level: 5,
    baseStats: enemyStatBudget(5),
    mapName: 'breakwater',
    difficulty: 'elite',
    logic: 'strategic',
    loot: [none(80), drop('healing-potion', 20)],
    phases: [
        { moves: [HYMN, THE_PEWS, HUSH] },
        {
            danger: {
                name: 'Toll for the Drowned', kind: 'danger',
                text: 'UNDERTOW on 2 dice, then 8 damage.',
                // Heart and Mind: the Body die stays, to shake off the Psalm's Barnacles.
                undertow: ['heart', 'mind'], damage: 8,
            },
            moves: [CRESCENDO, HYMN, SEA_WATER_PSALM],
        },
        {
            danger: {
                name: 'Amen', kind: 'danger',
                text: 'Spends every VERSE: 3 damage per VERSE, and it MENDs the same.',
                rider: { kind: 'verse-amen', damage: 3 },
            },
            moves: [ANTIPHON, CRESCENDO],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy', 'elite'],
});

/** One of the lighthouse path's two elites (phase EN1k): LIT or DARK. */
export const Lamplighter = createEnemy({
    id: 'enemy-lamplighter',
    portraitAsset: 'lamplighter',
    name: 'The Lamplighter',
    description: 'Kept the light until it went out. Now he lights lures.',
    level: 7,
    baseStats: enemyStatBudget(7),
    mapName: 'breakwater',
    difficulty: 'elite',
    logic: 'strategic',
    loot: [none(80), drop('healing-potion', 20)],
    phases: [
        { moves: [WICK_LASH, SHUTTER, GLARE] },
        {
            danger: {
                name: 'Lure Light', kind: 'danger',
                text: 'TANGLE 3, MEND 8, and it goes Lit.',
                tangle: 3, enemyHeal: 8, rider: { kind: 'lamp', to: 'lit' },
            },
            moves: [WICK_LASH_2, SHUTTER_2, GLARE],
        },
        {
            danger: {
                name: 'The Lamp Goes Out', kind: 'danger',
                text: 'Dark for the rest of the fight.',
                rider: { kind: 'lamp', to: 'out' },
            },
            moves: [WICK_LASH_3, SHUTTER_3],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy', 'elite'],
});

/** The lighthouse path's other elite (phase EN1k): its Bait reads your turn end. */
export const Wrecker = createEnemy({
    id: 'enemy-wrecker',
    portraitAsset: 'wrecker',
    name: 'The Wrecker',
    description: 'Swings a false light on the rocks so ships come in wrong.',
    level: 7,
    baseStats: enemyStatBudget(7),
    mapName: 'breakwater',
    difficulty: 'elite',
    logic: 'strategic',
    loot: [none(80), drop('healing-potion', 20)],
    phases: [
        { moves: [WRECKERS_BAIT, CUDGEL, ROPE] },
        {
            danger: {
                name: 'Onto the Rocks', kind: 'danger',
                text: '4 damage per card in your hand.',
                rider: { kind: 'hand-size-damage', damage: 4 },
            },
            moves: [WRECKERS_BAIT, SALVAGE_HOOK, WRECKERS_BAIT],
        },
        {
            danger: {
                name: 'Strip the Wreck', kind: 'danger',
                text: 'Takes your banked dice and 4 Conviction, WARD 4 per thing taken.',
                rider: { kind: 'strip-wreck', conviction: 4, ward: 4 },
            },
            moves: [CUDGEL_3, SALVAGE_HOOK_3, WRECKERS_BAIT],
        },
    ],
    addedIn: CHAPTER1_ADDED,
    tags: ['early-game', 'enemy', 'elite'],
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
export const EnemyLibrary = [
    FloatEye, GallowsCrow, NetMender, CraneHook, BrineWidow, LampreyKnot, GreenJelly, CurfewRinger,
    WreckPicker, SmokehouseGutter, TitheCollector, CaveChoir,
    Lamplighter, Wrecker,
    DeathBeholder,
] as const;

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
    'brine-widow':    BrineWidow,
    'lamprey-knot':   LampreyKnot,
    'curfew-ringer':  CurfewRinger,
    'green-jelly':      GreenJelly,
    'wreck-picker':       WreckPicker,
    'smokehouse-gutter':  SmokehouseGutter,
    'tithe-collector':    TitheCollector,
    'cave-choir':     CaveChoir,
    'lamplighter':    Lamplighter,
    'wrecker':        Wrecker,
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
