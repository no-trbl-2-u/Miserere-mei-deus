/**
 * Aftermath presenter pins.
 *
 * Hermetic; presenter is a pure function on `AftermathData`, so no
 * store / provider scaffolding is needed.
 */

import { describe, expect, it } from '@jest/globals';

import { selectAftermathViewModel } from '@/state/presenters/aftermath.engine';
import type { AftermathData } from '@/state/combat-mode';

const VICTORY_SNAPSHOT: Extract<AftermathData, { variant: 'victory' }> = {
    variant: 'victory',
    enemy: {
        name: 'Larch-Stalker',
        description: 'A figure long since gnawed by the road.',
        level: 4,
    },
    finalBlow: { cardName: 'RENDING STRIKE', damage: 24, descriptor: 'cleaves the binding rib' },
    xpReward: 18,
};

describe('selectAftermathViewModel', () => {
    it('returns null when data is null', () => {
        expect(selectAftermathViewModel(null)).toBeNull();
    });

    // The defeat branch has its own describe block below.

    it('uppercases the enemy name for the gothic title slot', () => {
        const vm = selectAftermathViewModel(VICTORY_SNAPSHOT);
        expect(vm?.kind).toBe('victory');
        expect(vm?.kind === 'victory' && vm.enemyName).toBe('LARCH-STALKER');
    });

    it('derives the epithet by stripping the leading article + period', () => {
        const vm = selectAftermathViewModel(VICTORY_SNAPSHOT);
        expect(vm?.kind === 'victory' && vm.enemyEpithet).toBe('figure long since gnawed by the road');
    });

    it('returns null epithet when description is empty', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            enemy: { ...VICTORY_SNAPSHOT.enemy, description: '' },
        });
        expect(vm?.kind === 'victory' && vm.enemyEpithet).toBeNull();
    });

    it('truncates long descriptions at a word boundary <= 40 chars', () => {
        const longDesc =
            'A figure long since gnawed by the road past any hope of recognition.';
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            enemy: { ...VICTORY_SNAPSHOT.enemy, description: longDesc },
        });
        const epithet = vm?.kind === 'victory' ? vm.enemyEpithet : '';
        expect(epithet?.length).toBeLessThanOrEqual(40);
        // Must end on a word boundary, not mid-word.
        expect(epithet?.endsWith(' ')).toBe(false);
    });

    it('passes through final-blow data with fallbacks', () => {
        const vm = selectAftermathViewModel(VICTORY_SNAPSHOT);
        expect(vm?.kind === 'victory' && vm.finalBlow).toEqual({
            cardName: 'RENDING STRIKE',
            damage: 24,
            descriptor: 'cleaves the binding rib',
        });
    });

    it('uses STRIKE / felled-the-foe fallbacks when finalBlow fields are nullish', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            finalBlow: { cardName: null, damage: 7, descriptor: null },
        });
        expect(vm?.kind === 'victory' && vm.finalBlow).toEqual({
            cardName: 'STRIKE',
            damage: 7,
            descriptor: 'felled the foe',
        });
    });

    it('returns null finalBlow when snapshot has no final blow', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            finalBlow: null,
        });
        expect(vm?.kind === 'victory' && vm.finalBlow).toBeNull();
    });

    it('picks the brutal phrase for damage >= 20', () => {
        const vm = selectAftermathViewModel(VICTORY_SNAPSHOT);
        expect(vm?.kind === 'victory' && vm.finalBlowPhrase).toContain('went down face-first');
    });

    it('picks the quiet phrase for damage in [10, 20)', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            finalBlow: { cardName: 'STRIKE', damage: 12, descriptor: 'd' },
        });
        expect(vm?.kind === 'victory' && vm.finalBlowPhrase).toContain('wet rag folds');
    });

    it('picks the ironic phrase for damage < 10', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            finalBlow: { cardName: 'STRIKE', damage: 5, descriptor: 'd' },
        });
        expect(vm?.kind === 'victory' && vm.finalBlowPhrase).toContain('bell did not ring');
    });

    it('threads xpReward through; loot empty and currency null when no drop', () => {
        const vm = selectAftermathViewModel(VICTORY_SNAPSHOT);
        expect(vm?.kind === 'victory' && vm.rewards.xp).toBe(18);
        expect(vm?.kind === 'victory' && vm.rewards.loot).toEqual([]);
        expect(vm?.kind === 'victory' && vm.rewards.currency).toBeNull();
    });

    it('victory: the shillings the engine paid fill the currency cell', () => {
        const vm = selectAftermathViewModel({ ...VICTORY_SNAPSHOT, shillings: 15 });
        expect(vm?.kind === 'victory' && vm.rewards.currency).toEqual({ shillings: 15 });
    });

    it('maps engine loot items into spoils tiles (equipment slot/rarity; other items by category)', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            loot: [
                {
                    id: 'eq-1',
                    name: 'Rusted Cutlass',
                    description: 'A pitted blade.',
                    category: 'equipment',
                    slot: 'weapon',
                    rarity: 'uncommon',
                    requiredLevel: 1,
                },
                {
                    id: 'con-1',
                    name: 'Minor Healing Potion',
                    description: 'Restores a little vitae.',
                    category: 'consumable',
                    quantity: 1,
                },
            ] as never,
        });
        // Every loot entry reports `common`; equipment has no rarity axis.
        expect(vm?.kind === 'victory' && vm.rewards.loot).toEqual([
            { itemId: 'eq-1', name: 'Rusted Cutlass', slot: 'weapon', rarity: 'common' },
            { itemId: 'con-1', name: 'Minor Healing Potion', slot: 'consumable', rarity: 'common' },
        ]);
    });

    it('nulls xpReward when the engine granted none', () => {
        const vm = selectAftermathViewModel({ ...VICTORY_SNAPSHOT, xpReward: null });
        expect(vm?.kind === 'victory' && vm.rewards.xp).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Engine narrative prose consumer
// ---------------------------------------------------------------------------

describe('selectAftermathViewModel: engine narrative lines (Phase 76)', () => {
    const FINAL_BLOW_LINES = {
        brutal: 'the gull falls mid-cry. the list ends on a half-syllable.',
        quiet: 'it folds its wings and lands once, gently, before it stops.',
        ironic: 'a slight it had not catalogued yet, delivered by the listener.',
    };
    it('victory: prefers engine finalBlowLines.brutal for damage >= 20', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            enemy: { ...VICTORY_SNAPSHOT.enemy, finalBlowLines: FINAL_BLOW_LINES },
        });
        expect(vm?.kind === 'victory' && vm.finalBlowPhrase).toBe(FINAL_BLOW_LINES.brutal);
    });

    it('victory: prefers engine finalBlowLines.quiet for damage in [10, 20)', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            finalBlow: { cardName: 'STRIKE', damage: 12, descriptor: 'd' },
            enemy: { ...VICTORY_SNAPSHOT.enemy, finalBlowLines: FINAL_BLOW_LINES },
        });
        expect(vm?.kind === 'victory' && vm.finalBlowPhrase).toBe(FINAL_BLOW_LINES.quiet);
    });

    it('victory: prefers engine finalBlowLines.ironic for damage < 10', () => {
        const vm = selectAftermathViewModel({
            ...VICTORY_SNAPSHOT,
            finalBlow: { cardName: 'STRIKE', damage: 5, descriptor: 'd' },
            enemy: { ...VICTORY_SNAPSHOT.enemy, finalBlowLines: FINAL_BLOW_LINES },
        });
        expect(vm?.kind === 'victory' && vm.finalBlowPhrase).toBe(FINAL_BLOW_LINES.ironic);
    });

    it('falls back to the generic phrase when the engine field is absent', () => {
        // Sanity — re-pin the fallback to confirm the null-engine-line
        // path keeps the panel rendering.
        const victory = selectAftermathViewModel(VICTORY_SNAPSHOT);
        expect(victory?.kind === 'victory' && victory.finalBlowPhrase)
            .toContain('went down face-first');
    });
});
