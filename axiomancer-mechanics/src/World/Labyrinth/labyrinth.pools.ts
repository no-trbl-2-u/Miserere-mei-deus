/**
 * The Aporia — MapEvent pools.
 *
 * Every room rolls its act's weighted pool on FIRST arrival only
 * (existing `consumedNodes` one-shot semantics = "solved space is
 * solved"). Authored overrides: entrances and set-piece rooms play a
 * one-line cutscene, waystones rest (one-shot, meagre; the Third Waystone
 * generous — the finale resource floor), the ledger room (`act.questRoom`)
 * plays the Sophist's own line as a cutscene, boss rooms fire the act boss. Weights per act:
 * DESIGN.md section 4 (plan/labyrinth).
 *
 * Self-registers on import, mirroring `MapEvents/content.ts`.
 */

import {
    registerMapEventPool,
    setDefaultMapEventPool,
    setNodeEventPoolOverride,
} from '../MapEvents/resolve-map-event';
import { applyPayload } from '../MapEvents/handlers';
import type { MapEventPool, ResolveMapEventResult } from '../MapEvents/types';
import type { GameState } from '../../Game/types';
import { getRng } from '../../Utils/rng';
import { ENEMY_REGISTRY } from '../../Enemy/enemy.library';
import type { EnemySlug } from '../../Enemy/enemy.library';
import type { LabyrinthActDef, LabyrinthRoomDef } from './types';
import { APORIA_ACTS } from './maps';

/** One line in the Sophist's voice, played as a cutscene. */
function sophistLine(text: string): MapEventPool['entries'][number] {
    return { kind: 'cutscene', weight: 1, payload: { kind: 'cutscene', lines: [text] } };
}

/** Boss levels pin the act difficulty regardless of shared-enemy tier. */
const BOSS_LEVEL: Record<LabyrinthActDef['id'], number> = {
    act1: 8,
    act2: 12,
    act3: 16,
};

/** Per-act random-pool tuning (DESIGN.md section 4). */
const ACT_POOL_TUNING: Record<LabyrinthActDef['id'], {
    weights: { encounter: number; hazard: number; lootCache: number; gleaning: number; rest: number; vignette: number };
    hazardDamage: number;
    cacheCurrency: number;
    gatherItem: { id: string; name: string; description: string };
    vignette: string;
}> = {
    act1: {
        weights: { encounter: 30, hazard: 18, lootCache: 14, gleaning: 12, rest: 14, vignette: 12 },
        hazardDamage: 6,
        cacheCurrency: 20,
        gatherItem: {
            id: 'colonnade-tallow', name: 'Tallow Stub',
            description: 'Candle-end from a colonnade sconce. The house does not waste oil; neither should you.',
        },
        vignette: 'Someone before you chalked an arrow on the floor here. Someone after them scrubbed it out. I remember both, and which of them left.',
    },
    act2: {
        weights: { encounter: 34, hazard: 24, lootCache: 12, gleaning: 10, rest: 10, vignette: 10 },
        hazardDamage: 9,
        cacheCurrency: 30,
        gatherItem: {
            id: 'archive-vellum', name: 'Vellum Scrap',
            description: 'A margin torn from a retired argument. Blank, which is the most useful state of vellum.',
        },
        vignette: 'The Archive once catalogued its own catalogue. The entry is filed under itself. Nobody has found it since, which the librarians insist is correct behavior.',
    },
    act3: {
        weights: { encounter: 40, hazard: 28, lootCache: 10, gleaning: 6, rest: 8, vignette: 8 },
        hazardDamage: 12,
        cacheCurrency: 40,
        gatherItem: {
            id: 'proof-waystone-chip', name: 'Waystone Chip',
            description: 'A flake of true granite. It bears weight even in a pocket.',
        },
        vignette: 'This deep, the house stops decorating. What is left is what was always underneath: stone, and the question, and whichever of you outlasts the other.',
    },
};

function buildDefaultPool(act: LabyrinthActDef): MapEventPool {
    const t = ACT_POOL_TUNING[act.id];
    return {
        id: `${act.mapName}.default`,
        entries: [
            { kind: 'encounter', weight: t.weights.encounter, payload: { kind: 'encounter' } },
            {
                kind: 'hazard', weight: t.weights.hazard,
                payload: { kind: 'hazard', damage: t.hazardDamage, description: 'The building fights you.' },
            },
            {
                kind: 'loot-cache', weight: t.weights.lootCache,
                payload: { kind: 'loot-cache', currency: t.cacheCurrency, description: 'Something a previous walker will not be coming back for.' },
            },
            {
                // The act's material, found loose: a cache holding one item.
                kind: 'loot-cache', weight: t.weights.gleaning,
                payload: {
                    kind: 'loot-cache',
                    items: [{ ...t.gatherItem, category: 'material', quantity: 1 }],
                    description: 'The maze grows little. Take what it grows.',
                },
            },
            {
                kind: 'rest', weight: t.weights.rest,
                // The house is not an innkeeper. Camp.
                payload: { kind: 'rest', shelter: 'camp', description: 'A corner the house forgot to make uncomfortable.' },
            },
            { ...sophistLine(t.vignette), weight: t.weights.vignette },
        ],
    };
}

function overridePool(act: LabyrinthActDef, room: LabyrinthRoomDef): MapEventPool | undefined {
    const id = `${act.mapName}.${room.nodeId}.override`;

    if (room.nodeId === act.questRoom) {
        // The ledger room plays the Sophist's own scripted line (the
        // room keeps its identity — `act.questRoom` also gates
        // the act3 "settle debt" action in `labyrinth.cli.ts` /
        // `state/presenters/labyrinth.engine.ts`, an unrelated mechanic).
        return {
            id,
            entries: [sophistLine(room.narration)],
        };
    }

    if (room.nodeId === act.bossRoom) {
        if (!(act.bossSlug in ENEMY_REGISTRY)) {
            throw new Error(`Act ${act.id}: boss slug '${act.bossSlug}' is not in ENEMY_REGISTRY.`);
        }
        return {
            id,
            entries: [{
                kind: 'encounter', weight: 1,
                payload: {
                    kind: 'encounter',
                    enemySlug: act.bossSlug as EnemySlug,
                    isBoss: true,
                    level: BOSS_LEVEL[act.id],
                    description: room.name,
                },
            }],
        };
    }

    if (room.waystone) {
        // One-shot meagre rest. A waystone is a CAMP: the stone holds your
        // place, it does not keep an inn. `World/RestChoice` heals a flat
        // fraction regardless of shelter.
        return {
            id,
            entries: [{
                kind: 'rest', weight: 1,
                payload: {
                    kind: 'rest',
                    shelter: 'camp',
                    description: `${room.name}. Rest your hand on the stone; the house will hold your place.`,
                },
            }],
        };
    }

    if (room.nodeId === act.entry || room.eject || act.gates.some(g => g.roomId === room.nodeId)) {
        // Entrances, the Foundation, and the Oubliette play a line — their
        // drama is authored, not rolled.
        return {
            id,
            entries: [sophistLine(room.narration)],
        };
    }

    return undefined;
}

/**
 * Resolve a POI trap (`LabyrinthInspectResult.trap`) into a real event.
 * Baited clues bypass the first-arrival pool (the room is already
 * consumed by the time a POI is inspected): the payload is built from
 * the act's tuning and applied through the standard MapEvents dispatch,
 * so a trap encounter scales exactly like an arrival encounter and a
 * trap hazard bites with the act's hazard damage.
 */
export function resolvePoiTrap(
    state: GameState,
    act: LabyrinthActDef,
    kind: 'encounter' | 'hazard',
    rng: () => number = () => getRng().random(),
): ResolveMapEventResult {
    const t = ACT_POOL_TUNING[act.id];
    const payload = kind === 'hazard'
        ? {
            kind: 'hazard' as const, damage: t.hazardDamage,
            description: 'The clue was bait. The building fights you.',
        }
        : {
            kind: 'encounter' as const,
            description: 'The clue was bait. Something kept it.',
        };
    return applyPayload(state, payload, rng);
}

/** Registers every Aporia pool. Idempotence guard for hermetic tests. */
let registered = false;
export function registerAporiaEventPools(): void {
    if (registered) return;
    registered = true;
    for (const act of APORIA_ACTS) {
        const defaultPool = buildDefaultPool(act);
        registerMapEventPool(defaultPool);
        setDefaultMapEventPool('labyrinth-continent', act.mapName, defaultPool.id);
        for (const room of act.rooms) {
            const pool = overridePool(act, room);
            if (!pool) continue;
            registerMapEventPool(pool);
            setNodeEventPoolOverride('labyrinth-continent', act.mapName, room.nodeId, pool.id);
        }
    }
}

/**
 * Test-only: drops the idempotence guard so `registerAporiaEventPools()`
 * can replay after `_clearMapEventPoolRegistry()`. Mirrors the MapEvents
 * registry's own test hook; never call from production code.
 */
export function _resetAporiaEventPoolRegistration(): void {
    registered = false;
}

registerAporiaEventPools();
