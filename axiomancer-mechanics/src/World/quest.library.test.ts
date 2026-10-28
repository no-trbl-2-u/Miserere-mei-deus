/**
 * The quest library's rules (phase LR1f, A5 and A18 of the LR1 brief).
 *
 * Every authored quest pays a lane relic whose library entry says
 * `relicSource: 'quest'`, so no quest ever pays an elite-only relic; no quest
 * relic is paid twice; only Chapter 1 (the Breakwater) carries a quest so far
 * (T, 2026-10-27), started by a choice in a narration on that map, and
 * Chapters 2-4 carry none. The Breakwater's elite draws from the elite-only
 * relics alone.
 */

import { describe, expect, it } from 'vitest';

import { QUEST_LIBRARY } from './quest.library';
import { questRewardItem } from './quest.engine';
import { getMapDefinition, getNodeEventPool } from './index';
import { MAP_REGISTRY } from './map.registry';
import { eliteRelicPool } from '../Combat/combat.rewards';
import { getRelicById, relicLibrary } from '../Items/relic.library';
import { createNewGameState } from '../Game/game.reducer';
import type { ContinentName, MapName } from './map.library';

const CHAPTER_1 = { continent: 'coastal-continent', map: 'breakwater' } as const;

/** Chapters 2-4: no quest until T settles what a quest is. */
const LATER_CHAPTERS: ReadonlyArray<{ continent: ContinentName; map: MapName }> = [
    { continent: 'coastal-continent', map: 'charcoal-wood' },
    { continent: 'northern-continent', map: 'beacon-crags' },
    { continent: 'northern-continent', map: 'lantern-deep' },
];

/** Every quest any registered map hands out. */
function authoredQuests() {
    return Object.values(MAP_REGISTRY).flatMap(maps => Object.values(maps).flatMap(def => def?.quests ?? []));
}

describe('A18 · no quest pays an elite-only relic', () => {
    it('every authored quest pays a library relic with relicSource quest', () => {
        const quests = authoredQuests();
        expect(quests.length).toBeGreaterThan(0);
        for (const quest of quests) {
            const item = questRewardItem(quest.reward);
            expect(item, quest.name).not.toBeNull();
            const entry = getRelicById(item!.id);
            expect(entry, `${quest.name} pays ${item!.id}`).toBeDefined();
            expect(entry!.relicSource, `${quest.name} pays ${item!.id}`).toBe('quest');
        }
    });

    it('no quest relic is paid twice, and Chapter 1 pays the Ruby Signet', () => {
        const paid = authoredQuests().map(q => questRewardItem(q.reward)!.id);
        expect(new Set(paid).size).toBe(paid.length);
        expect(paid).toEqual(['relic-ruby-signet']);
        const questRelics = new Set(relicLibrary.filter(r => r.relicSource === 'quest').map(r => r.id));
        for (const id of paid) expect(questRelics.has(id), id).toBe(true);
    });
});

describe('A5 · Chapter 1 carries one quest, given by a narration on its map', () => {
    it('the Breakwater carries exactly one library quest', () => {
        const quests = getMapDefinition(CHAPTER_1.continent, CHAPTER_1.map).quests ?? [];
        expect(quests.map(q => q.mapName)).toEqual([CHAPTER_1.map]);
        expect(QUEST_LIBRARY).toContain(quests[0]);
    });

    it('a narration on the Breakwater has the one choice that starts it', () => {
        const { continent, map } = CHAPTER_1;
        const def = getMapDefinition(continent, map);
        const quest = def.quests![0]!;
        const starters = def.nodes.filter(node => {
            const payload = getNodeEventPool(continent, map, node.id)?.entries[0]?.payload;
            if (payload?.kind !== 'narration') return false;
            return Object.values(payload.dialogue.nodes)
                .some(n => (n.choices ?? []).some(c => c.effect?.startQuest === quest.name));
        });
        expect(starters.map(n => n.id)).toEqual(['bw-12']);
    });

    it('Chapters 2-4 carry no quest yet', () => {
        for (const { continent, map } of LATER_CHAPTERS) {
            expect(getMapDefinition(continent, map).quests ?? [], map).toEqual([]);
        }
    });
});

describe('the elite pool: the Act 1 elite draws only the elite-only relics', () => {
    it('a fresh player\'s pool is the Crimson Circlet, the Elementalist\'s Signet and the Thornback Signet', () => {
        const pool = eliteRelicPool(createNewGameState().player).map(r => r.id).sort();
        const eliteOnly = relicLibrary.filter(r => r.relicSource === 'elite').map(r => r.id).sort();
        expect(pool).toEqual(eliteOnly);
        // The Thornback Signet is the Defender's elite relic (DF1e).
        expect(pool).toHaveLength(3);
    });
});
