import { describe, expect, it } from '@jest/globals';
import type { CharacterDefinition } from '@mechanics';

import {
    CAROUSEL_COLUMNS,
    buildCharacterSelectVM,
    resolveSelectedId,
} from '../character-select.engine';

function def(id: string, over: Partial<CharacterDefinition> = {}): CharacterDefinition {
    return {
        id,
        name: `Name ${id}`,
        portraitKey: 'bard',
        startingRelicId: 'relic-bleeding-signet',
        baseStats: { heart: 5, body: 7, mind: 3 },
        startingLaneIds: ['lane-x', 'lane-y'],
        startingCardIds: ['card-x', 'card-y', 'card-z'],
        playstyle: 'Bleeds to win.',
        ...over,
    };
}

const flat = (rows: readonly (readonly unknown[])[]) => rows.flat();

describe('buildCharacterSelectVM', () => {
    it('lays two rows of four squares: roster characters first, the rest locked', () => {
        const vm = buildCharacterSelectVM([def('a'), def('b')]);
        expect(vm.rows).toHaveLength(2);
        expect(vm.rows.every(r => r.length === CAROUSEL_COLUMNS)).toBe(true);
        expect(vm.rows[0].map(s => s.kind)).toEqual(['character', 'character', 'locked', 'locked']);
        expect(vm.rows[1].every(s => s.kind === 'locked')).toBe(true);
        expect(vm.rows[1][0].label).toBe('Locked');
    });

    it('shows the first character when nothing is picked, and the picked one after', () => {
        const roster = [def('a'), def('b')];
        expect(buildCharacterSelectVM(roster).selected?.id).toBe('a');
        const vm = buildCharacterSelectVM(roster, 'b');
        expect(vm.selected?.id).toBe('b');
        expect(vm.rows[0].map(s => s.selected)).toEqual([false, true, false, false]);
        expect(resolveSelectedId(roster, 'gone')).toBe('a');
        expect(resolveSelectedId([], 'a')).toBeNull();
    });

    it('builds the selected view model: portrait, relic, stats, playstyle', () => {
        const { selected } = buildCharacterSelectVM([def('a')]);
        expect(selected).toEqual({
            id: 'a',
            name: 'Name a',
            portraitKey: 'bard',
            relicId: 'relic-bleeding-signet',
            relicName: 'Bleeding Signet',
            stats: [
                { key: 'heart', label: 'HEART', value: 5 },
                { key: 'body', label: 'BODY', value: 7 },
                { key: 'mind', label: 'MIND', value: 3 },
            ],
            playstyle: 'Bleeds to win.',
        });
        expect(JSON.stringify(selected)).not.toContain('lane');
    });

    it('is all locked for an empty roster and for the forced-locked dev state', () => {
        for (const vm of [buildCharacterSelectVM([]), buildCharacterSelectVM([def('a')], 'a', true)]) {
            expect(vm.selected).toBeNull();
            expect(flat(vm.rows)).toHaveLength(8);
            expect(vm.rows.flat().every(s => s.kind === 'locked')).toBe(true);
        }
    });

    it('grows a third row past eight characters', () => {
        const roster = Array.from({ length: 9 }, (_, i) => def(`c${i}`));
        expect(buildCharacterSelectVM(roster).rows).toHaveLength(3);
    });
});
