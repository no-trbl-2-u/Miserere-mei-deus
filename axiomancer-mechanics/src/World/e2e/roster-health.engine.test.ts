/**
 * Roster health — live-tree invariant plus one planted fault per lens.
 *
 * Dangling is a hard invariant, like the traversal and reachability tests:
 * a reference to an id that does not exist is a bug. Orphans are pinned by
 * id: a new orphan fails with its name, and the fixture changes in the same
 * change that adds, grants or retires the content.
 */

import { describe, expect, it } from 'vitest';

import {
    auditRosterHealth, collectRosterSources,
    danglingDialogue, danglingEnemySlugs, danglingItems, danglingMapNpcs, danglingRelicSignatures,
    orphanDialogueNodes, orphanEnemies, orphanItems, orphanNpcs, orphanQuests,
    type RosterSources,
} from '../roster-health';
import { registerMapEventPool, setNodeEventPoolOverride } from '../MapEvents/resolve-map-event';
import type { MapEventPool } from '../MapEvents/types';
import type { MapDefinition, Quest } from '../types';
import type { DialogueTree } from '../../NPCs/types';
import type { Equipment, Item } from '../../Items/types';
import { GreenJelly as LiveGreenJelly, FloatEye as LiveFloatEye, Sandbag_01 } from '../../Enemy/enemy.library';

// Computed before any synthetic pool below is registered.
const LIVE = auditRosterHealth();

/** The orphans on the live tree, by lens and id. Change with the content. */
const PINNED_ORPHANS: ReadonlyArray<{ lens: string; id: string }> = [
    // No run starts with the ring or is handed it any more; old saves and
    // the dev menu hold it until it gets a lane.
    { lens: 'item-ungranted', id: 'relic-disarming-plea' },
    // Blood Price's relics: the Circlet drops from elites (`rollEliteRelicDrop`,
    // a source this audit does not read); the two quest relics wait on the Act 1
    // quests (LR1f). Until then only the dev menu hands them over.
    { lens: 'item-ungranted', id: 'relic-crimson-circlet' },
    { lens: 'item-ungranted', id: 'relic-ruby-signet' },
    { lens: 'item-ungranted', id: 'relic-bleeding-signet' },
];

describe('roster health — live tree', () => {
    it('has no dangling reference', () => {
        expect(LIVE.dangling, JSON.stringify(LIVE.dangling, null, 2)).toEqual([]);
    });

    it('orphans match the pinned list', () => {
        expect(LIVE.orphans.map(o => ({ lens: o.lens, id: o.id }))).toEqual(PINNED_ORPHANS);
    });

    it('reads the four Act 1 maps and their pools', () => {
        const src = collectRosterSources();
        expect(src.maps.map(m => m.name)).toEqual(
            expect.arrayContaining(['breakwater', 'charcoal-wood', 'beacon-crags', 'lantern-deep']),
        );
        expect(src.pools.length).toBeGreaterThan(0);
    });
});

// ─── Synthetic sources ────────────────────────────────────────────────────────

const potion: Item = {
    id: 'healing-potion', name: 'Healing Potion', description: '', category: 'consumable', quantity: 1,
} as Item;
const ring: Equipment = {
    id: 'relic-test', name: 'Test Ring', description: '', category: 'equipment', slot: 'accessory',
    statModifiers: [], grantsSignature: 'sig-disarming-plea',
} as Equipment;

// Live foes with their loot stripped, so only planted items are named.
const FloatEye = { ...LiveFloatEye, loot: [] };
const GreenJelly = { ...LiveGreenJelly, loot: [], friendshipReward: undefined };

function mapDef(over: Partial<MapDefinition>): MapDefinition {
    return { name: 'test-map', continent: 'test-continent', nodes: [], ...over } as unknown as MapDefinition;
}

function quest(name: string, nextQuest?: string): Quest {
    return { name, description: '', mapName: 'breakwater', objectives: [], reward: 'experience', nextQuest, status: 'available' } as Quest;
}

function sources(over: Partial<RosterSources> = {}): RosterSources {
    return {
        enemyRegistry: { 'float-eye': FloatEye, sandbag: Sandbag_01 },
        enemyLibrary: [FloatEye],
        enemiesByMap: { 'test-map': [FloatEye] },
        devOnlyEnemyIds: [Sandbag_01.id],
        pools: [],
        maps: [],
        consumables: [potion],
        relics: [ring],
        signatureIds: new Set(['sig-disarming-plea']),
        cardExists: id => id === 'a-plain-blow',
        startingItemIds: [ring.id],
        cacheItemIds: [potion.id],
        ...over,
    };
}

function narrationPool(id: string, dialogue: DialogueTree): MapEventPool {
    return { id, entries: [{ kind: 'narration', weight: 1, payload: { kind: 'narration', dialogue } }] };
}

describe('roster health — a clean synthetic tree reports nothing', () => {
    it('is empty', () => {
        expect(auditRosterHealth(sources())).toEqual({ dangling: [], orphans: [] });
    });
});

describe('roster health — each dangling lens fires', () => {
    it('enemy-slug: an encounter names an unknown slug', () => {
        const pools: MapEventPool[] = [{
            id: 'x-1.encounter',
            entries: [{ kind: 'encounter', weight: 1, payload: { kind: 'encounter', enemySlug: 'no-such-foe' as never } }],
        }];
        expect(danglingEnemySlugs(sources({ pools })).map(f => [f.lens, f.id, f.where]))
            .toEqual([['enemy-slug', 'no-such-foe', 'x-1.encounter']]);
    });

    it('loot-item: a loot table names an unknown consumable', () => {
        const foe = { ...FloatEye, loot: [{ item: { ...potion, id: 'ghost-potion' }, weight: 1 }] };
        const found = danglingItems(sources({ enemyLibrary: [foe], enemiesByMap: { m: [foe] } }));
        expect(found.map(f => [f.lens, f.subject, f.id])).toEqual([['loot-item', 'consumable', 'ghost-potion']]);
    });

    it('loot-item: a cache names an unknown relic', () => {
        const pools: MapEventPool[] = [{
            id: 'x-2.loot-cache',
            entries: [{ kind: 'loot-cache', weight: 1, payload: { kind: 'loot-cache', items: [{ ...ring, id: 'relic-gone' }] } }],
        }];
        expect(danglingItems(sources({ pools })).map(f => [f.subject, f.id])).toEqual([['relic', 'relic-gone']]);
    });

    it('shop-ware: a shop stocks an unknown item', () => {
        const pools: MapEventPool[] = [{
            id: 'x-3.village',
            entries: [{ kind: 'village', weight: 1, payload: { kind: 'village', villageName: 'V', shop: { wares: [{ itemId: 'nothing', price: 1 }] } } }],
        }];
        expect(danglingItems(sources({ pools })).map(f => [f.lens, f.id])).toEqual([['shop-ware', 'nothing']]);
    });

    it('relic-signature: a relic grants an unregistered signature', () => {
        expect(danglingRelicSignatures(sources({ signatureIds: new Set() })).map(f => [f.id, f.where]))
            .toEqual([['sig-disarming-plea', 'relic-test']]);
    });

    it('dialogue-next / dialogue-quest / dialogue-card: a choice names a missing node, quest and card', () => {
        const tree: DialogueTree = {
            rootId: 'root',
            nodes: {
                root: {
                    id: 'root', text: '',
                    choices: [{
                        text: 'go', nextNodeId: 'nowhere',
                        effect: { startQuest: 'lost-quest', teachCard: 'no-such-card' },
                    }],
                },
            },
        };
        const found = danglingDialogue(sources({ pools: [narrationPool('x-4.narration', tree)] }));
        expect(found.map(f => [f.lens, f.id])).toEqual([
            ['dialogue-next', 'nowhere'],
            ['dialogue-quest', 'lost-quest'],
            ['dialogue-card', 'no-such-card'],
        ]);
    });

    it('dialogue-quest: a quest chains into an undefined quest', () => {
        const maps = [mapDef({ quests: [quest('first', 'second')] })];
        expect(danglingDialogue(sources({ maps })).map(f => [f.lens, f.id])).toEqual([['dialogue-quest', 'second']]);
    });

    it('map-npc: an interaction names nobody on the roster or the unstaged list', () => {
        const continent = 'rh-test-continent';
        registerMapEventPool({
            id: 'rh-1.interaction',
            entries: [{ kind: 'interaction', weight: 1, payload: { kind: 'interaction', npcName: 'Nobody' } }],
        });
        setNodeEventPoolOverride(continent, 'rh-map', 'rh-1', 'rh-1.interaction');
        const maps = [mapDef({ name: 'rh-map' as never, continent: continent as never, nodes: [{ id: 'rh-1' }] as never })];
        expect(danglingMapNpcs(sources({ maps })).map(f => [f.id, f.where])).toEqual([['Nobody', 'rh-map:rh-1']]);
    });
});

describe('roster health — each orphan lens fires', () => {
    it('enemy-unpooled: a library enemy no pool draws or pins', () => {
        const found = orphanEnemies(sources({ enemyLibrary: [FloatEye, GreenJelly] }));
        expect(found.map(f => f.id)).toEqual([GreenJelly.id]);
    });

    it('enemy-unpooled: an encounter pin reaches the enemy; the dev dummy is never an orphan', () => {
        const pools: MapEventPool[] = [{
            id: 'x-5.encounter',
            entries: [{ kind: 'encounter', weight: 1, payload: { kind: 'encounter', enemySlug: 'green-jelly' } }],
        }];
        const src = sources({
            enemyLibrary: [FloatEye, GreenJelly, Sandbag_01],
            enemyRegistry: { 'float-eye': FloatEye, 'green-jelly': GreenJelly, sandbag: Sandbag_01 },
            pools,
        });
        expect(orphanEnemies(src)).toEqual([]);
    });

    it('item-ungranted: a consumable and a relic nothing grants', () => {
        const found = orphanItems(sources({ startingItemIds: [], cacheItemIds: [] }));
        expect(found.map(f => [f.subject, f.id])).toEqual([['consumable', 'healing-potion'], ['relic', 'relic-test']]);
    });

    it('item-ungranted: a friendship reward grants', () => {
        const foe = { ...FloatEye, friendshipReward: { items: [ring] } };
        expect(orphanItems(sources({ enemyLibrary: [foe], startingItemIds: [] }))).toEqual([]);
    });

    it('npc-unreached: a rostered NPC with a tree no interaction names', () => {
        const tree: DialogueTree = { rootId: 'r', nodes: { r: { id: 'r', text: '' } } };
        const maps = [mapDef({ name: 'rh-lonely' as never, npcs: [{ name: 'Hermit', dialogueTree: tree }] })];
        expect(orphanNpcs(sources({ maps })).map(f => [f.id, f.where])).toEqual([['Hermit', 'rh-lonely']]);
    });

    it('dialogue-node-unreached: a node neither the root nor a choice reaches', () => {
        const tree: DialogueTree = {
            rootId: 'a',
            nodes: {
                a: { id: 'a', text: '', choices: [{ text: '', nextNodeId: 'b' }] },
                b: { id: 'b', text: '' },
                c: { id: 'c', text: '' },
            },
        };
        expect(orphanDialogueNodes(sources({ pools: [narrationPool('x-6.narration', tree)] })).map(f => f.id)).toEqual(['c']);
    });

    it('quest-unstarted: a quest nothing starts; a chained quest counts as started', () => {
        const maps = [mapDef({ quests: [quest('alone'), quest('head', 'tail'), quest('tail')] })];
        const tree: DialogueTree = {
            rootId: 'r',
            nodes: { r: { id: 'r', text: '', choices: [{ text: '', effect: { startQuest: 'head' } }] } },
        };
        const found = orphanQuests(sources({ maps, pools: [narrationPool('x-7.narration', tree)] }));
        expect(found.map(f => f.id)).toEqual(['alone']);
    });
});
