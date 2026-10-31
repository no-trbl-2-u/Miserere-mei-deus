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
            { name: 'Rusted Cutlass', slot: 'weapon', rarity: 'common' },
            { name: 'Minor Healing Potion', slot: 'consumable', rarity: 'common' },
        ]);
    });

    it('nulls xpReward when the engine granted none', () => {
        const vm = selectAftermathViewModel({ ...VICTORY_SNAPSHOT, xpReward: null });
        expect(vm?.kind === 'victory' && vm.rewards.xp).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Parley branch
// ---------------------------------------------------------------------------

const PARLEY_SNAPSHOT_MID: Extract<AftermathData, { variant: 'parley' }> = {
    variant: 'parley',
    enemy: {
        name: 'Larch-Stalker',
        description: 'A figure long since gnawed by the road.',
        level: 4,
    },
    shillings: 6,
    journalEntry: null,
};

describe('selectAftermathViewModel: parley branch', () => {
    it('returns a parley VM with uppercased enemy name', () => {
        const vm = selectAftermathViewModel(PARLEY_SNAPSHOT_MID);
        expect(vm?.kind).toBe('parley');
        expect(vm?.kind === 'parley' && vm.enemyName).toBe('LARCH-STALKER');
    });

    it('derives the epithet the same way as the victory branch', () => {
        const vm = selectAftermathViewModel(PARLEY_SNAPSHOT_MID);
        expect(vm?.kind === 'parley' && vm.enemyEpithet).toBe(
            'figure long since gnawed by the road',
        );
    });

    it('picks the quiet-yield pact phrase for low-level enemies (<=2)', () => {
        const vm = selectAftermathViewModel({
            ...PARLEY_SNAPSHOT_MID,
            enemy: { ...PARLEY_SNAPSHOT_MID.enemy, level: 1 },
        });
        expect(vm?.kind === 'parley' && vm.pactPhrase).toContain('stopped');
    });

    it('picks the bell pact phrase for mid-level enemies (3-5)', () => {
        const vm = selectAftermathViewModel(PARLEY_SNAPSHOT_MID);
        expect(vm?.kind === 'parley' && vm.pactPhrase).toContain('set down the bell');
    });

    it('picks the heavy-yield pact phrase for higher-level enemies (>5)', () => {
        const vm = selectAftermathViewModel({
            ...PARLEY_SNAPSHOT_MID,
            enemy: { ...PARLEY_SNAPSHOT_MID.enemy, level: 8 },
        });
        expect(vm?.kind === 'parley' && vm.pactPhrase).toContain('held out the bell');
    });

    it('threads xpReward + collapses currency / loot to nullish defaults', () => {
        const vm = selectAftermathViewModel(PARLEY_SNAPSHOT_MID);
        expect(vm?.kind === 'parley' && vm.rewards).not.toHaveProperty('xp');
        expect(vm?.kind === 'parley' && vm.rewards.currency).toEqual({ shillings: 6 });
        expect(vm?.kind === 'parley' && vm.rewards.loot).toEqual([]);
    });

    it('passes journalEntry through verbatim when populated', () => {
        const vm = selectAftermathViewModel({
            ...PARLEY_SNAPSHOT_MID,
            journalEntry: {
                bookName: 'CODEX',
                entryTitle: 'Of the Larch-Stalker',
                preview: 'a bell that does not ring',
            },
        });
        expect(vm?.kind === 'parley' && vm.journalEntry).toEqual({
            bookName: 'CODEX',
            entryTitle: 'Of the Larch-Stalker',
            preview: 'a bell that does not ring',
        });
    });

    it('leaves journalEntry null when the snapshot has none', () => {
        const vm = selectAftermathViewModel(PARLEY_SNAPSHOT_MID);
        expect(vm?.kind === 'parley' && vm.journalEntry).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Defeat branch
// ---------------------------------------------------------------------------

const DEFEAT_SNAPSHOT: Extract<AftermathData, { variant: 'defeat' }> = {
    variant: 'defeat',
    enemy: {
        name: 'Hierophant',
        description: 'A figure long since gnawed by iron tongues.',
        level: 7,
    },
    characterName: 'Worm-Eaten Pilgrim',
    finalBlow: {
        cardName: 'AXE-FALL',
        damage: 28,
        descriptor: 'cleaves the binding rib',
    },
    runSummary: {
        roundsEndured: 4,
        encountersFaced: 12,
        deepestNodeId: 'bw-l5',
        currentMapId: 'breakwater',
    },
};

describe('selectAftermathViewModel: defeat branch', () => {
    it('returns a defeat VM with uppercased character name', () => {
        const vm = selectAftermathViewModel(DEFEAT_SNAPSHOT);
        expect(vm?.kind).toBe('defeat');
        expect(vm?.kind === 'defeat' && vm.characterName).toBe('WORM-EATEN PILGRIM');
    });

    it('populates the killer block (uppercased name + epithet + final card + damage)', () => {
        const vm = selectAftermathViewModel(DEFEAT_SNAPSHOT);
        expect(vm?.kind === 'defeat' && vm.killer).toEqual({
            name: 'HIEROPHANT',
            epithet: 'figure long since gnawed by iron tongues',
            finalCard: 'AXE-FALL',
            damage: 28,
        });
    });

    it('falls back to STRIKE + 0 damage when finalBlow is null', () => {
        const vm = selectAftermathViewModel({ ...DEFEAT_SNAPSHOT, finalBlow: null });
        expect(vm?.kind === 'defeat' && vm.killer).toEqual({
            name: 'HIEROPHANT',
            epithet: 'figure long since gnawed by iron tongues',
            finalCard: 'STRIKE',
            damage: 0,
        });
    });

    it('picks the brutal cause phrase for damage >= 20', () => {
        const vm = selectAftermathViewModel(DEFEAT_SNAPSHOT);
        expect(vm?.kind === 'defeat' && vm.causePhrase).toContain('laid down where it stood');
    });

    it('picks the broken-down cause phrase for damage in [10, 20)', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            finalBlow: { cardName: 'STRIKE', damage: 12, descriptor: null },
        });
        expect(vm?.kind === 'defeat' && vm.causePhrase).toContain('came in pieces');
    });

    it('picks the quiet cause phrase for damage < 10', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            finalBlow: { cardName: 'STRIKE', damage: 4, descriptor: null },
        });
        expect(vm?.kind === 'defeat' && vm.causePhrase).toContain('steady one');
    });

    it('threads the run-summary with Phase 93 fixes', () => {
        const vm = selectAftermathViewModel(DEFEAT_SNAPSHOT);
        expect(vm?.kind === 'defeat' && vm.runSummary).toEqual({
            rounds: 4,
            encountersFaced: 11, // 12 - 1: the fatal encounter is not survived
            deepestNodeId: 'The Lighthouse', // resolved from bw-l5 via map layout
        });
    });

    it('preserves a null deepestNodeId for the "died on first node" branch', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { roundsEndured: 1, encountersFaced: 1, deepestNodeId: null, currentMapId: 'breakwater' },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.deepestNodeId).toBe('·');
    });
});

// ---------------------------------------------------------------------------
// Death screen: encounters survived and deepest node name
// ---------------------------------------------------------------------------

describe('selectAftermathViewModel: Phase 93 fixes', () => {
    it('F09: encounter survived counter shows 0 when player died in first encounter', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { ...DEFEAT_SNAPSHOT.runSummary, encountersFaced: 1 },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.encountersFaced).toBe(0);
    });

    it('F09: encounter survived counter is encountersFaced - 1 for multi-encounter deaths', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { ...DEFEAT_SNAPSHOT.runSummary, encountersFaced: 5 },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.encountersFaced).toBe(4);
    });

    it('F09: guards against negative encounter counts in edge cases', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { ...DEFEAT_SNAPSHOT.runSummary, encountersFaced: 0 },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.encountersFaced).toBe(0);
    });

    it('F10: resolves node ID to human-readable name via map layout', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { ...DEFEAT_SNAPSHOT.runSummary, deepestNodeId: 'bw-w1', currentMapId: 'breakwater' },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.deepestNodeId).toBe('The Windmill');
    });

    it('F10: falls back to node ID when map layout is missing', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { ...DEFEAT_SNAPSHOT.runSummary, deepestNodeId: 'unknown-node', currentMapId: 'missing-map' },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.deepestNodeId).toBe('unknown-node');
    });

    it('F10: falls back to node ID when current map is null', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { ...DEFEAT_SNAPSHOT.runSummary, deepestNodeId: 'bw-w1', currentMapId: null },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.deepestNodeId).toBe('bw-w1');
    });

    it('F10: falls back to node ID when node is not found in map layout', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { ...DEFEAT_SNAPSHOT.runSummary, deepestNodeId: 'non-existent-node', currentMapId: 'breakwater' },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.deepestNodeId).toBe('non-existent-node');
    });

    it('F10: shows "·" when deepest node ID is null', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            runSummary: { ...DEFEAT_SNAPSHOT.runSummary, deepestNodeId: null, currentMapId: 'breakwater' },
        });
        expect(vm?.kind === 'defeat' && vm.runSummary.deepestNodeId).toBe('·');
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
    const PACT_LINES = {
        quiet: 'for a long moment, neither speaks the slights remembered.',
        setDown: 'it settles on the rail beside you. the catalogue is closed.',
        heavy: 'the list goes on inside it. you are listed too. it lands anyway.',
    };
    const CAUSE_LINES = {
        brutal: 'the list resolves in your name. you go down to the next item on it.',
        broken: 'the slights accumulate. eventually you are one of them.',
        quiet: 'it catalogues a last grievance and you do not stand up from it.',
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

    it('parley: prefers engine pactLines.quiet for level <= 2', () => {
        const vm = selectAftermathViewModel({
            ...PARLEY_SNAPSHOT_MID,
            enemy: { ...PARLEY_SNAPSHOT_MID.enemy, level: 1, pactLines: PACT_LINES },
        });
        expect(vm?.kind === 'parley' && vm.pactPhrase).toBe(PACT_LINES.quiet);
    });

    it('parley: prefers engine pactLines.setDown for level 3-5', () => {
        const vm = selectAftermathViewModel({
            ...PARLEY_SNAPSHOT_MID,
            enemy: { ...PARLEY_SNAPSHOT_MID.enemy, pactLines: PACT_LINES },
        });
        expect(vm?.kind === 'parley' && vm.pactPhrase).toBe(PACT_LINES.setDown);
    });

    it('parley: prefers engine pactLines.heavy for level > 5', () => {
        const vm = selectAftermathViewModel({
            ...PARLEY_SNAPSHOT_MID,
            enemy: { ...PARLEY_SNAPSHOT_MID.enemy, level: 8, pactLines: PACT_LINES },
        });
        expect(vm?.kind === 'parley' && vm.pactPhrase).toBe(PACT_LINES.heavy);
    });

    it('defeat: prefers engine causeLines.brutal for damage >= 20', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            enemy: { ...DEFEAT_SNAPSHOT.enemy, causeLines: CAUSE_LINES },
        });
        expect(vm?.kind === 'defeat' && vm.causePhrase).toBe(CAUSE_LINES.brutal);
    });

    it('defeat: prefers engine causeLines.broken for damage in [10, 20)', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            finalBlow: { cardName: 'STRIKE', damage: 12, descriptor: null },
            enemy: { ...DEFEAT_SNAPSHOT.enemy, causeLines: CAUSE_LINES },
        });
        expect(vm?.kind === 'defeat' && vm.causePhrase).toBe(CAUSE_LINES.broken);
    });

    it('defeat: prefers engine causeLines.quiet for damage < 10', () => {
        const vm = selectAftermathViewModel({
            ...DEFEAT_SNAPSHOT,
            finalBlow: { cardName: 'STRIKE', damage: 4, descriptor: null },
            enemy: { ...DEFEAT_SNAPSHOT.enemy, causeLines: CAUSE_LINES },
        });
        expect(vm?.kind === 'defeat' && vm.causePhrase).toBe(CAUSE_LINES.quiet);
    });

    it('falls back to the generic phrase when the engine field is absent', () => {
        // Sanity — re-pin a single fallback per branch to confirm the
        // null-engine-line path keeps the panel rendering.
        const victory = selectAftermathViewModel(VICTORY_SNAPSHOT);
        expect(victory?.kind === 'victory' && victory.finalBlowPhrase)
            .toContain('went down face-first');

        const parley = selectAftermathViewModel(PARLEY_SNAPSHOT_MID);
        expect(parley?.kind === 'parley' && parley.pactPhrase)
            .toContain('set down the bell');

        const defeat = selectAftermathViewModel(DEFEAT_SNAPSHOT);
        expect(defeat?.kind === 'defeat' && defeat.causePhrase)
            .toContain('laid down where it stood');
    });
});
