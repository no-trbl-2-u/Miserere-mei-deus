/**
 * The quest library's rules (phase LR1f, A5 and A18 of the LR1 brief).
 *
 * Every authored quest pays a lane relic whose library entry says
 * `relicSource: 'quest'`, so no quest ever pays an elite-only relic; the four
 * pay the four quest relics, one each; each quest sits on its own Act 1 map's
 * `quests` and is started by a choice in a narration on that map. The
 * Breakwater's elite draws from the elite-only relics alone.
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

const ACT1: ReadonlyArray<{ continent: ContinentName; map: MapName }> = [
    { continent: 'coastal-continent', map: 'breakwater' },
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

    it('the quest relics are paid once each, and every quest relic has its quest', () => {
        const paid = authoredQuests().map(q => questRewardItem(q.reward)!.id).sort();
        const questRelics = relicLibrary.filter(r => r.relicSource === 'quest').map(r => r.id).sort();
        expect(paid).toEqual(questRelics);
        expect(paid).toHaveLength(4);
    });
});

describe('A5 · one quest per Act 1 region, given by a narration on that map', () => {
    it('each Act 1 map carries exactly one library quest', () => {
        for (const { continent, map } of ACT1) {
            const quests = getMapDefinition(continent, map).quests ?? [];
            expect(quests.map(q => q.mapName), map).toEqual([map]);
            expect(QUEST_LIBRARY).toContain(quests[0]);
        }
    });

    it('a narration on the quest\'s own map has a choice that starts it', () => {
        for (const { continent, map } of ACT1) {
            const def = getMapDefinition(continent, map);
            const quest = def.quests![0]!;
            const starters = def.nodes.filter(node => {
                const payload = getNodeEventPool(continent, map, node.id)?.entries[0]?.payload;
                if (payload?.kind !== 'narration') return false;
                return Object.values(payload.dialogue.nodes)
                    .some(n => (n.choices ?? []).some(c => c.effect?.startQuest === quest.name));
            });
            expect(starters, `${map}: ${quest.name}`).toHaveLength(1);
        }
    });
});

describe('the elite pool: the Act 1 elite draws only the elite-only relics', () => {
    it('a fresh player\'s pool is the Crimson Circlet and the Elementalist\'s Signet', () => {
        const pool = eliteRelicPool(createNewGameState().player).map(r => r.id).sort();
        const eliteOnly = relicLibrary.filter(r => r.relicSource === 'elite').map(r => r.id).sort();
        expect(pool).toEqual(eliteOnly);
        expect(pool).toHaveLength(2);
    });
});
