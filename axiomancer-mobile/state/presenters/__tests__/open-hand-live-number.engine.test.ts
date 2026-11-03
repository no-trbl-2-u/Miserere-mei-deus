/**
 * T, on PR 1350: The Open Hand shows the live number. Every screen that prints
 * it reads the amount after Heart scaling, which is the amount the fight applies.
 */

import { describe, expect, it } from '@jest/globals';
import { createCharacter, getRelicById, playSignatureSkill, rollEncounterDice } from '@mechanics';

import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { selectEquipmentDetailViewModel } from '@/state/presenters/equipment-detail.engine';
import { selectItemRewardVM } from '@/state/presenters/item-reward.engine';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

const SIG_ID = 'sig-disarming-plea';
const RING = getRelicById('relic-disarming-plea')!;
const AT_HEART_8 = 'MERCY 7 on the foe: it heals 7, and its MERCY grows by 7. When the clock runs out, MERCY bursts for twice its total.';
const STATS = { heart: 8, body: 8, mind: 8 };

function fight() {
    const { combat } = startRealFight(realFightFixture({ level: 3, baseStats: STATS }));
    return { ...rollEncounterDice(combat).state, signatures: [SIG_ID], conviction: 4 } as typeof combat;
}

function player() {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const base = store.getState().player;
    const built = createCharacter({ id: base.id, name: base.name, level: base.level, baseStats: STATS, inventory: [RING], equipment: [] });
    store.setState({ player: { ...base, ...built } });
    return store.getState();
}

describe('The Open Hand prints the number it applies', () => {
    it('on the signature bar and its info panel', () => {
        const state = fight();
        const sig = buildCombatViewModel(state).signatures.find(s => s.id === SIG_ID)!;
        const wounded = { ...state, enemy: { ...state.enemy, health: state.enemy.health - 20 } };
        const added = playSignatureSkill(wounded, SIG_ID).events.find(e => e.kind === 'mercy-added');
        expect(added).toMatchObject({ amount: 7, healed: 7 });
        expect(sig.description).toBe(AT_HEART_8);
    });

    it('on the ring long-press card', () => {
        const vm = selectEquipmentDetailViewModel(player(), RING.id);
        expect(vm?.signature?.description).toBe(AT_HEART_8);
    });

    it('on the item reward screen', () => {
        const state = player();
        const vm = selectItemRewardVM({ player: state.player, itemReward: { queue: [{ item: RING }] } } as never);
        expect(vm.signature?.description).toBe(AT_HEART_8);
    });
});
