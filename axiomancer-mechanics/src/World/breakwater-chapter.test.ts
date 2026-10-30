/**
 * The rebuilt Breakwater against T's node list (phase BW1a: A1, A3's static
 * half, A4's pairing, A12's quest relics).
 *
 * `NODE_LIST` below is the board v4 table of
 * `braindump/2026-10-28-breakwater-chapter-1-map.md` ("The node list"): code,
 * kind and roads, copied by hand so the map is checked against T's table and
 * not against itself. A change T makes on the board edits both.
 */

import { describe, expect, it } from 'vitest';

import { breakwaterChapter, BREAKWATER_CHAPTER_GATES } from './Continents/Coastal-Village/breakwater-chapter';
import { BREAKWATER_CHAPTER_KINDS, BREAKWATER_CHAPTER_POOLS, BW_ELITE_DRAWS } from './MapEvents/content';
import {
    BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_QUESTLINE_ID, BREAKWATER_KEEP_KEY,
} from './breakwater-chapter.questline';
import { getMapDefinition } from './map.registry';
import { getNodeEventPool } from './MapEvents/resolve-map-event';
import { isEliteNode } from './elite-respawn';
import { questGateProblems } from './quest-gates';
import { getQuestline } from './questline';
import { AUTHORED_QUESTLINES } from './quest.library';
import { getRelicById } from '../Items/relic.library';
import type { MapEventPayload } from './MapEvents/types';

/** Code | kind | roads to ("C0 (travel)" marks the passage, not a road). */
const NODE_LIST = `
W1|start|W2
W2|fight|W1, W3, W4, M1
W3|fight|W2, H1
W4|rest|W2, W5
W5|elite fight|W4, K1
K1|quest|W5, K2
K2|chapter boss|K1
H1|fight|W3, H2, T1
H2|fight|H1, H3
H3|fight|H2, H4
H4|hazard|H3, H5
H5|rest|H4, H6, H7
H6|travel|H5, C0 (travel)
H7|fight|H5, H8
H8|loot cache|H7
C0|travel|H6 (travel), C1
C1|elite fight|C0, C2
C2|quest|C1
T1|fight|H1, T2
T2|fight|T1, B1, T3
T3|fight|T2, T4, T5
T4|village|T3
T5|hazard|T3, T6
T6|fight|T5, L1
B1|quest|T2, B2
B2|travel|B1
L1|fight|T6, L2, L3, D1
L2|cutscene|L1
L3|rest|L1, L4
L4|elite fight|L3, L5
L5|quest|L4
D1|fight|L1, D2, D3
D2|loot cache|D1
D3|fight|D1, D4
D4|hazard|D3, D5
D5|cutscene|D4
M1|fight|W2, M2, P1
M2|hazard|M1, M3, M4
M3|loot cache|M2
M4|hazard|M2, M5
M5|village|M4
P1|hazard|M1, P2
P2|fight|P1, P3
P3|cutscene|P2
`.trim().split('\n').map(line => {
    const [code, kind, roads] = line.split('|') as [string, string, string];
    const id = (c: string) => `bw-${c.trim().toLowerCase()}`;
    const links = roads.split(',').map(r => r.trim());
    return {
        id: id(code),
        kind,
        roads: links.filter(r => !r.endsWith('(travel)')).map(id),
        travel: links.filter(r => r.endsWith('(travel)')).map(r => id(r.replace('(travel)', ''))),
    };
});

const roadKey = (a: string, b: string) => [a, b].sort().join('~');

function payloadOf(nodeId: string): MapEventPayload {
    return getNodeEventPool('coastal-continent', 'breakwater', nodeId)!.entries[0]!.payload;
}

/** The board kind a node's authored pool reads as. */
function boardKindOf(nodeId: string): string {
    if (nodeId === breakwaterChapter.startingNode.id) return 'start';
    const p = payloadOf(nodeId);
    switch (p.kind) {
        case 'encounter':
            if (p.isBoss) return 'chapter boss';
            return isEliteNode('coastal-continent', 'breakwater', nodeId) ? 'elite fight' : 'fight';
        case 'loot-cache': return 'loot cache';
        default: return p.kind;
    }
}

describe('A1: the graph is T\'s node list', () => {
    it('has exactly the 44 nodes, by board code, starting on the windmill', () => {
        expect(NODE_LIST).toHaveLength(44);
        expect(breakwaterChapter.nodes.map(n => n.id)).toEqual(NODE_LIST.map(n => n.id));
        expect(breakwaterChapter.startingNode.id).toBe('bw-w1');
        expect(breakwaterChapter.name).toBe('breakwater');
    });

    it('has exactly the 42 roads, each authored once', () => {
        const listed = new Set(NODE_LIST.flatMap(n => n.roads.map(r => roadKey(n.id, r))));
        const authored = breakwaterChapter.nodes.flatMap(n => n.connectedNodes.map(r => roadKey(n.id, r)));
        expect(listed.size).toBe(42);
        expect(authored).toHaveLength(42);
        expect(new Set(authored)).toEqual(listed);
    });

    it('lists every road from both ends in the table (the table reads true)', () => {
        for (const n of NODE_LIST) {
            for (const r of n.roads) expect(NODE_LIST.find(m => m.id === r)!.roads, `${n.id}-${r}`).toContain(n.id);
        }
    });

    it('gives every node its listed kind, through its one-entry pool (an elite pair, two)', () => {
        expect(BREAKWATER_CHAPTER_POOLS).toHaveLength(44);
        for (const n of NODE_LIST) {
            // An elite node with a pair in `BW_ELITE_DRAWS` holds one entry per foe (EN1j, EN1k).
            const entries = BW_ELITE_DRAWS[n.id]?.length ?? 1;
            expect(getNodeEventPool('coastal-continent', 'breakwater', n.id)!.entries, n.id).toHaveLength(entries);
            expect(boardKindOf(n.id), n.id).toBe(n.kind);
        }
    });

    it('tallies the kinds as the brief does', () => {
        const tally: Record<string, number> = {};
        for (const n of NODE_LIST) tally[n.kind] = (tally[n.kind] ?? 0) + 1;
        expect(tally).toEqual({
            start: 1, village: 2, quest: 4, 'chapter boss': 1, 'elite fight': 3, hazard: 6,
            fight: 15, rest: 3, 'loot cache': 3, cutscene: 3, travel: 3,
        });
        const kinds: Record<string, number> = {};
        for (const { kind } of Object.values(BREAKWATER_CHAPTER_KINDS)) kinds[kind] = (kinds[kind] ?? 0) + 1;
        expect(kinds).toEqual({
            start: 1, village: 2, quest: 4, boss: 1, elite: 3, hazard: 6,
            fight: 15, rest: 3, loot: 3, cutscene: 3, travel: 3,
        });
    });

    it('authors both villages as NK1\'s village: paid rest, card shop and the Anvil', () => {
        for (const id of ['bw-t4', 'bw-m5']) {
            const p = payloadOf(id);
            expect(p.kind).toBe('village');
            if (p.kind !== 'village') continue;
            expect(p.rest).toBe(true);
            expect(p.cardShop).toBe(true);
            expect(p.anvil?.variants?.length).toBeGreaterThan(0);
        }
    });

    it('is the registered Breakwater', () => {
        expect(getMapDefinition('coastal-continent', 'breakwater')).toBe(breakwaterChapter);
    });
});

describe('A3: what holds a road', () => {
    it('holds the wreck and the three elites, and nothing else', () => {
        expect([...breakwaterChapter.holdRoadsUntilSettled!].sort()).toEqual(['bw-c1', 'bw-h4', 'bw-l4', 'bw-w5']);
    });

    it('authors each held node\'s far road as its own road, so only the far side is held', () => {
        const far: Record<string, string> = { 'bw-h4': 'bw-h5', 'bw-c1': 'bw-c2', 'bw-l4': 'bw-l5', 'bw-w5': 'bw-k1' };
        for (const [held, beyond] of Object.entries(far)) {
            expect(breakwaterChapter.nodes.find(n => n.id === held)!.connectedNodes, held).toEqual([beyond]);
        }
    });

    it('seeds the keep gate and the bridge shut as the chain\'s gates, and no gate can be walked around', () => {
        const seeded = (breakwaterChapter.initialBlockedRoutes ?? []).map(r => ({ from: r.from, to: r.to }));
        expect(seeded).toEqual([BREAKWATER_CHAPTER_GATES.pastKeep, BREAKWATER_CHAPTER_GATES.pastBridge]);
        const gates = BREAKWATER_CHAPTER_QUESTLINE.steps.flatMap(s => s.gatesPast ?? []);
        expect(gates).toEqual([BREAKWATER_CHAPTER_GATES.pastKeep, BREAKWATER_CHAPTER_GATES.pastBridge]);
        expect(questGateProblems(breakwaterChapter, [BREAKWATER_CHAPTER_QUESTLINE])).toEqual([]);
    });

    it('leaves the chapter boss a dead end that holds nothing', () => {
        expect(breakwaterChapter.nodes.find(n => n.id === 'bw-k2')!.connectedNodes).toEqual([]);
        expect(breakwaterChapter.holdRoadsUntilSettled).not.toContain('bw-k2');
    });
});

describe('A4: the sea cave is a same-map travel pair', () => {
    it('pairs the mouth and the face, each naming the other, with no road between them', () => {
        const pair = NODE_LIST.filter(n => n.travel.length > 0).map(n => [n.id, n.travel]);
        expect(pair).toEqual([['bw-h6', ['bw-c0']], ['bw-c0', ['bw-h6']]]);
        for (const [id, [far]] of pair as [string, string[]][]) {
            const p = payloadOf(id);
            expect(p.kind === 'travel' && p.destination).toEqual({ node: far });
            expect(payloadOf(far!).kind).toBe('travel');
        }
        const roads = new Set(breakwaterChapter.nodes.flatMap(n => n.connectedNodes.map(r => roadKey(n.id, r))));
        expect(roads.has(roadKey('bw-h6', 'bw-c0'))).toBe(false);
    });

    it('sends the far bank on to the Charcoal Wood, through the bridge door', () => {
        const p = payloadOf('bw-b2');
        expect(p.kind === 'travel' && p.destination).toEqual({ map: 'charcoal-wood', continent: 'coastal-continent' });
    });
});

describe('A2: the chain', () => {
    it('is registered, gives step 1 from the windmill\'s arrival and puts steps 2-4 on the quest nodes', () => {
        expect(AUTHORED_QUESTLINES).toEqual([BREAKWATER_CHAPTER_QUESTLINE]);
        expect(getQuestline(BREAKWATER_CHAPTER_QUESTLINE_ID)).toBe(BREAKWATER_CHAPTER_QUESTLINE);
        const w1 = payloadOf('bw-w1');
        expect(w1.kind === 'cutscene' && w1.effect).toEqual({
            giveQuestStep: { questline: BREAKWATER_CHAPTER_QUESTLINE_ID, step: 1 },
        });
        const quests = NODE_LIST.filter(n => n.kind === 'quest').map(n => {
            const p = payloadOf(n.id);
            return p.kind === 'quest' ? [n.id, p.questline, p.node] : [n.id];
        });
        expect(quests).toEqual([
            ['bw-k1', BREAKWATER_CHAPTER_QUESTLINE_ID, 4],
            ['bw-c2', BREAKWATER_CHAPTER_QUESTLINE_ID, 2],
            ['bw-b1', BREAKWATER_CHAPTER_QUESTLINE_ID, 5],
            ['bw-l5', BREAKWATER_CHAPTER_QUESTLINE_ID, 3],
        ]);
        expect(BREAKWATER_CHAPTER_QUESTLINE.steps.map(s => [s.step, s.nodeId, s.settle])).toEqual([
            [1, 'bw-w1', 'turn-in'], [2, 'bw-c2', 'on-arrival'], [3, 'bw-l5', 'turn-in'], [4, 'bw-k1', 'turn-in'],
        ]);
        expect(BREAKWATER_CHAPTER_QUESTLINE.steps[3]!.turnInAt).toBe('bw-b1');
    });

    it('gives every quest node its own refusal line', () => {
        const lines = ['bw-c2', 'bw-l5', 'bw-k1', 'bw-b1'].map(id => {
            const p = payloadOf(id);
            return p.kind === 'quest' ? p.lockedLine : undefined;
        });
        for (const line of lines) expect(line).toMatch(/^\[content\] /);
        expect(new Set(lines).size).toBe(4);
    });

    it('pays XP and exactly one relic per step; step 2 also pays the key, and step 3 carries it', () => {
        for (const step of BREAKWATER_CHAPTER_QUESTLINE.steps) {
            const relics = step.rewards.filter(r => typeof r === 'object' && 'kind' in r && r.kind === 'item'
                && r.item.category === 'equipment' && r.item.slot === 'relic');
            expect(relics, `step ${step.step}`).toHaveLength(1);
            expect(step.rewards[0], `step ${step.step}`).toMatchObject({ kind: 'experience' });
        }
        expect(BREAKWATER_CHAPTER_QUESTLINE.steps[1]!.rewards).toContain(BREAKWATER_KEEP_KEY);
        expect(BREAKWATER_CHAPTER_QUESTLINE.steps[2]!.quest.objectives).toEqual([
            expect.objectContaining({ type: 'carry', target: BREAKWATER_KEEP_KEY.id }),
        ]);
    });
});

describe('A12: no relic is elite-only', () => {
    it('lets a quest pay a relic the elite drop also draws (the chain\'s step 4 pays one)', () => {
        const circlet = getRelicById('relic-crimson-circlet')!;
        expect(circlet.relicSource).toBe('elite');
        expect(BREAKWATER_CHAPTER_QUESTLINE.steps[3]!.rewards).toContainEqual({ kind: 'item', item: circlet });
    });
});
