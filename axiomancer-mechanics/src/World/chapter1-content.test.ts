/**
 * Chapter 1's content as data (phase SM2b, A5): every Breakwater node, quest
 * step, staged foe, hazard and payable item listed exactly once, and its gates
 * and regions in story order. The ids below are the test's fixtures; the
 * listing itself reads only the data.
 */

import { describe, expect, it } from 'vitest';

import { ENEMY_REGISTRY } from '../Enemy/enemy.library';
import { renderContent } from '../CLI/chapter1-content.cli';
import { HAZARD_LIBRARY } from './Hazard/hazard.content';
import { BW_ELITE_DRAWS, BW_ENCOUNTER_FOES } from './MapEvents/content';
import { BREAKWATER_CHAPTER_QUESTLINE, BREAKWATER_CHAPTER_RELICS, BREAKWATER_KEEP_KEY } from './breakwater-chapter.questline';
import { chapter1Content } from './chapter1-content';
import { BREAKWATER_CHAPTER_GATES, breakwaterChapter } from './Continents/Coastal-Village/breakwater-chapter';

const unique = (ids: readonly string[]): boolean => new Set(ids).size === ids.length;

describe('chapter1Content', () => {
    const c = chapter1Content();

    it('reads the map a new game starts on', () => {
        expect(c.map).toBe('breakwater');
        expect(c.startNodeId).toBe('bw-w1');
        expect(c.exitNodeIds).toEqual(['bw-b2']);
    });

    it('lists every node exactly once, with its kind, gate and story flags', () => {
        expect(c.nodes.map((n) => n.id)).toEqual(breakwaterChapter.nodes.map((n) => n.id));
        const node = (id: string) => c.nodes.find((n) => n.id === id)!;
        expect(node('bw-w5')).toMatchObject({ kind: 'encounter', gate: true, elite: true, role: 'story' });
        expect(node('bw-k2')).toMatchObject({ kind: 'encounter', boss: true, role: 'story' });
        expect(node('bw-c2')).toMatchObject({ kind: 'quest', role: 'story', gate: false });
        expect(node('bw-b2')).toMatchObject({ kind: 'travel', exit: true, role: 'story' });
        expect(node('bw-t4')).toMatchObject({ kind: 'village', role: 'side', gate: false });
        expect(node('bw-p3')).toMatchObject({ kind: 'cutscene', role: 'side' });
    });

    it('lists the gates in story order: wreck, cove elite, lighthouse elite, keep causeway, keep gate, bridge', () => {
        const keep = BREAKWATER_CHAPTER_GATES.pastKeep;
        const bridge = BREAKWATER_CHAPTER_GATES.pastBridge;
        expect(c.gates.map((g) => g.id)).toEqual([
            'held:bw-h4', 'held:bw-c1', 'held:bw-l4', 'held:bw-w5',
            `quest:${keep.from}>${keep.to}`, `quest:${bridge.from}>${bridge.to}`,
        ]);
    });

    it('cuts the chapter into regions, each node in exactly one, in story order', () => {
        expect(c.regions.length).toBe(c.gates.length + 1);
        expect(c.regions[0]!.gateId).toBeNull();
        c.regions.slice(1).forEach((r, i) => expect(r.gateId).toBe(c.gates[i]!.id));
        const all = c.regions.flatMap((r) => r.nodeIds);
        expect(unique(all)).toBe(true);
        expect([...all].sort()).toEqual(c.nodes.map((n) => n.id).sort());
        const regionOf = (id: string) => c.regions.find((r) => r.nodeIds.includes(id))!.index;
        expect(regionOf('bw-w1')).toBe(0);
        expect(regionOf('bw-h4')).toBe(0);
        expect(regionOf('bw-h5')).toBe(1);
        expect(regionOf('bw-c0')).toBe(1);
        expect(regionOf('bw-c2')).toBe(2);
        expect(regionOf('bw-l5')).toBe(3);
        expect(regionOf('bw-k1')).toBe(4);
        expect(regionOf('bw-k2')).toBe(5);
        expect(regionOf('bw-b2')).toBe(6);
    });

    it('lists the chapter questline and every step once', () => {
        const main = c.quests.find((q) => q.main)!;
        expect(main.id).toBe(BREAKWATER_CHAPTER_QUESTLINE.id);
        expect(main.steps.map((s) => s.questName)).toEqual(BREAKWATER_CHAPTER_QUESTLINE.steps.map((s) => s.quest.name));
        expect(main.steps.map((s) => s.turnInNodeId)).toEqual(['bw-c2', null, 'bw-k1', 'bw-b1']);
        // The run log's quest-step key: the questline id and the step number as text.
        expect(main.steps.map((s) => s.stepId)).toEqual(['1', '2', '3', '4']);
        expect(unique(c.quests.map((q) => q.id))).toBe(true);
    });

    it('lists every staged foe once, with each node that stages it', () => {
        expect(unique(c.enemies.map((e) => e.id))).toBe(true);
        const staged = (slug: string, node: string) =>
            c.enemies.find((e) => e.id === ENEMY_REGISTRY[slug as keyof typeof ENEMY_REGISTRY].id)?.stagings.some((s) => s.nodeId === node);
        for (const [node, foe] of Object.entries(BW_ENCOUNTER_FOES)) expect(staged(foe.slug, node), node).toBe(true);
        for (const [node, draw] of Object.entries(BW_ELITE_DRAWS)) for (const foe of draw) expect(staged(foe.slug, node), node).toBe(true);
        expect(staged('death-beholder', 'bw-k2')).toBe(true);
    });

    it('lists every hazard a crossing can draw once, at every hazard node', () => {
        expect(c.hazards.map((h) => h.id)).toEqual(HAZARD_LIBRARY.map((h) => h.id));
        const hazardNodes = c.nodes.filter((n) => n.kind === 'hazard').map((n) => n.id);
        for (const h of c.hazards) expect(h.nodeIds).toEqual(hazardNodes);
    });

    it('lists every item the chapter can pay once, with its sources', () => {
        expect(unique(c.items.map((i) => i.id))).toBe(true);
        const item = (id: string) => c.items.find((i) => i.id === id);
        for (const relic of Object.values(BREAKWATER_CHAPTER_RELICS)) expect(item(relic)?.sources).toContain('quest');
        expect(item(BREAKWATER_KEEP_KEY.id)).toMatchObject({ sources: ['quest'], nodeIds: ['bw-l5'] });
        expect(item('relic-crimson-circlet')?.sources).toEqual(expect.arrayContaining(['quest', 'elite-drop']));
        expect(c.items.some((i) => i.sources.includes('village'))).toBe(true);
        expect(c.items.some((i) => i.sources.includes('foe-drop'))).toBe(true);
    });

    it('prints a readable listing with every region', () => {
        const text = renderContent(c);
        for (const r of c.regions) expect(text).toContain(`${r.index}. past ${r.gateId ?? 'the start'}`);
        expect(JSON.parse(JSON.stringify(c))).toEqual(c);
    });
});
