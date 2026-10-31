/**
 * The atlas data: one plain object built from the game's libraries, for the
 * private DevLog's Atlas page. Pure: it reads the libraries and writes
 * nothing; `scripts/export-catalog.ts` is the one place that writes it to
 * `devlog/data/atlas.json`. Nothing imports this module.
 *
 * Every number here is read from the library that owns it, never typed in:
 * the page's calculators read `formulas`, and `atlas.data.test.ts` pins each
 * section to its source.
 */

import { cardLibrary } from '../Cards/cards.library';
import { CARD_LANES } from '../Cards/card.lanes';
import { printedKeywords } from '../Cards/card-rules';
import { relicLibrary } from '../Items/relic.library';
import { SIGNATURE_SKILLS } from '../Combat/combat.signature';
import { LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER } from '../Combat/live-encounter';
import { scaleAmount } from '../Combat/stat-scaling';
import { EnemyLibrary } from '../Enemy/enemy.library';
import { MAP_REGISTRY } from '../World/map.registry';
import { getNodeEventPool } from '../World/MapEvents/resolve-map-event';
import '../World/MapEvents/content';
import { planAct1Walk } from '../World/act1-walk';
import { listQuestlines } from '../World/questline';
import '../World/quest.library';
import { experienceToNext, experienceForLevel } from '../Character/experience';
import { PLAYER_VITAE_BASE, RESOURCE_MULTIPLIERS } from '../Game/game-mechanics.constants';
import type { Reward } from '../World/types';

/** The highest level the XP table lists. */
export const ATLAS_MAX_LEVEL = 50;
/** The stats the scaling table lists (0 to this, inclusive). */
export const ATLAS_MAX_STAT = 20;
/** The base amount the scaling table scales. */
export const ATLAS_SCALING_BASE = 10;

export interface AtlasMeta {
    readonly commit: string;
    readonly generatedAt: string;
}

export interface AtlasCard {
    id: string;
    name: string;
    laneId: string | null;
    color: string;
    type: string;
    rank: number;
    keywords: string[];
    /** A Global's trigger (`turn`, `sac` or `curse`); null for every other card. */
    trigger: string | null;
}

export interface AtlasData {
    cards: AtlasCard[];
    lanes: { id: string; name: string; cardIds: string[] }[];
    relics: {
        id: string; name: string; laneId: string | null; relicSource: string | null;
        statLines: string[]; signatureId: string | null;
    }[];
    signatures: { id: string; name: string; cost: number; description: string }[];
    enemies: {
        id: string; name: string; level: number; difficulty: string | null;
        vitae: number; liveVitae: number;
    }[];
    regions: {
        continent: string; map: string; nodeCount: number;
        nodesByKind: Record<string, number>; act1: boolean;
    }[];
    questlines: {
        id: string; name: string | null; map: string;
        steps: { step: number; objectives: string[]; rewards: string[] }[];
    }[];
    xp: { level: number; experienceToNext: number; total: number }[];
    formulas: {
        PLAYER_VITAE_BASE: number;
        RESOURCE_MULTIPLIERS: { VITAE_PER_BODY: number; VITAE_PER_MIND: number; VITAE_PER_HEART: number };
        LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER: number;
        scalingBase: number;
        scaling: { stat: number; oneShot: number; repeating: number }[];
    };
    meta: AtlasMeta;
}

/** A reward as one short label. */
function rewardLabel(r: Reward): string {
    if (typeof r === 'string') return r;
    if ('kind' in r) {
        switch (r.kind) {
            case 'currency': return `${r.amount} currency`;
            case 'experience': return `${r.amount} XP`;
            case 'card': return `card ${r.cardId}`;
            case 'item': return `item ${r.item.name}`;
            case 'card-pick': return `pick ${r.count} cards`;
            default: return String((r as { kind: string }).kind);
        }
    }
    return (r as { name?: string }).name ?? 'item';
}

function nodeKind(continent: string, map: string, nodeId: string): string {
    return getNodeEventPool(continent, map, nodeId)?.entries[0]?.kind ?? 'none';
}

/**
 * Builds the atlas from the libraries.
 *
 * @param meta - The commit and date to stamp; the exporter reads them from git.
 */
export function buildAtlasData(meta: AtlasMeta = { commit: 'unknown', generatedAt: '' }): AtlasData {
    const seen = new Set<string>();
    const cards: AtlasCard[] = [];
    for (const c of cardLibrary) {
        if (seen.has(c.id)) continue;
        seen.add(c.id);
        cards.push({
            id: c.id,
            name: c.name,
            laneId: CARD_LANES.find(l => l.cardIds.includes(c.id))?.id ?? null,
            color: c.color,
            type: c.cardType,
            rank: c.rank,
            keywords: printedKeywords(c),
            trigger: c.program?.global?.trigger ?? null,
        });
    }

    const signatures = Object.values(SIGNATURE_SKILLS).map(s => ({
        id: s.id, name: s.name, cost: s.cost, description: s.description,
    }));

    const act1Maps = new Set<string>(planAct1Walk().regions.map(r => r.map));
    const regions: AtlasData['regions'] = [];
    for (const [continent, maps] of Object.entries(MAP_REGISTRY)) {
        for (const [map, def] of Object.entries(maps)) {
            if (!def) continue;
            const nodesByKind: Record<string, number> = {};
            for (const n of def.nodes) {
                const k = nodeKind(continent, map, n.id);
                nodesByKind[k] = (nodesByKind[k] ?? 0) + 1;
            }
            regions.push({
                continent, map, nodeCount: def.nodes.length, nodesByKind, act1: act1Maps.has(map),
            });
        }
    }

    return {
        cards,
        lanes: CARD_LANES.map(l => ({ id: l.id, name: l.name, cardIds: [...l.cardIds] })),
        relics: relicLibrary.map(r => ({
            id: r.id,
            name: r.name,
            laneId: r.laneId ?? null,
            relicSource: r.relicSource ?? null,
            statLines: (r.statModifiers ?? []).map(m =>
                `${m.stat} ${m.value >= 0 ? `+${m.value}` : `${m.value}`}`),
            signatureId: r.grantsSignature ?? null,
        })),
        signatures,
        enemies: EnemyLibrary.map(e => ({
            id: e.id,
            name: e.name,
            level: e.level,
            difficulty: e.difficulty ?? null,
            vitae: e.maxHealth,
            liveVitae: e.maxHealth * LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER,
        })),
        regions,
        questlines: listQuestlines().map(q => ({
            id: q.id,
            name: q.name ?? null,
            map: q.mapName,
            steps: q.steps.map(s => ({
                step: s.step,
                objectives: s.quest.objectives.map(o => o.description),
                rewards: s.rewards.map(rewardLabel),
            })),
        })),
        xp: Array.from({ length: ATLAS_MAX_LEVEL }, (_, i) => ({
            level: i + 1,
            experienceToNext: experienceToNext(i + 1),
            total: experienceForLevel(i + 1),
        })),
        formulas: {
            PLAYER_VITAE_BASE,
            RESOURCE_MULTIPLIERS: { ...RESOURCE_MULTIPLIERS },
            LIVE_ENCOUNTER_ENEMY_HP_MULTIPLIER,
            scalingBase: ATLAS_SCALING_BASE,
            scaling: Array.from({ length: ATLAS_MAX_STAT + 1 }, (_, stat) => ({
                stat,
                oneShot: scaleAmount(ATLAS_SCALING_BASE, stat, 'one-shot'),
                repeating: scaleAmount(ATLAS_SCALING_BASE, stat, 'repeating'),
            })),
        },
        meta: { ...meta },
    };
}
