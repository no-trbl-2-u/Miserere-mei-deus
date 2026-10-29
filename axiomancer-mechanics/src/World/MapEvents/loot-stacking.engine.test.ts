import { describe, it, expect } from 'vitest';
import { createNewGameState } from '../../Game';
import { resolveLootCache } from './handlers';
import type { Consumable } from '../../Items/types';

// RC walk, leg 2: a loot cache granting a potion the player already held
// appended a second row, and drinking one then removed both.
describe('map-event grants stack consumables onto the held row', () => {
    const potion: Consumable = {
        id: 'greater-healing-potion', name: 'Greater Healing Potion', description: '',
        category: 'consumable', healAmount: 50, quantity: 1,
    };
    const holding = () => {
        const state = createNewGameState();
        return { ...state, player: { ...state.player, inventory: [{ ...potion }] } };
    };
    const potionRows = (inv: readonly { id: string }[]) => inv.filter(i => i.id === potion.id);

    it('loot-cache', () => {
        const { state } = resolveLootCache(holding(), { kind: 'loot-cache', items: [{ ...potion }], currency: 0 } as never);
        const rows = potionRows(state.player.inventory);
        expect(rows).toHaveLength(1);
        expect((rows[0] as Consumable).quantity).toBe(2);
    });
});
