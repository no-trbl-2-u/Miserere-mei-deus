/**
 * Hermetic E2E — relics with holes, and old packed saves (EQ3a, A3).
 *
 * No `GAME_STATE_VERSION` change: a packed relic list written before EQ3a
 * (fewer than three entries, no `null`) loads at the same version with its
 * relics at positions 0..n-1, and a save with a hole round-trips through
 * JSON. Every reader of `relics` skips the holes.
 */

import { describe, it, expect } from 'vitest';

import { createNewGameState, GAME_STATE_VERSION } from '../game.reducer';
import { migrate } from '../game.migrate';
import { equipItem, unequipItem, getEquippedItems } from '../../Character/equipment.reducer';
import { getRelicById, getSignaturesForLoadout, relicLibrary } from '../../Items/relic.library';
import { wornPieces } from '../../Items/relic-lanes';
import { statsWithWorn } from '../../Character/equipment.reducer';
import { initializeCombatEncounter } from '../../Combat/combat.engine';
import { FloatEye } from '../../Enemy/enemy.library';
import { unlockedLaneIds } from '../../Combat/combat.rewards';
import type { GameState } from '../types';

const RING = getRelicById('relic-disarming-plea')!;
const SIGNET = getRelicById('relic-bleeding-signet')!;

function stateWith(relics: unknown[]): GameState {
    const state = createNewGameState();
    return { ...state, player: { ...state.player, equipment: { ...state.player.equipment, relics } as never } };
}

function roundTrip(state: GameState): GameState {
    return migrate(JSON.parse(JSON.stringify(state)), GAME_STATE_VERSION);
}

describe('a packed save from before EQ3a', () => {
    it('loads at the same version with its relics at positions 0..n-1', () => {
        const loaded = roundTrip(stateWith([RING, SIGNET]));
        expect(loaded.version).toBe(GAME_STATE_VERSION);
        expect(loaded.player.equipment.relics.map(r => r?.id ?? null)).toEqual([RING.id, SIGNET.id]);
        expect(getEquippedItems(loaded.player.equipment).map(i => i.id)).toEqual([RING.id, SIGNET.id]);
    });

    it('gives the same signatures and lanes as the same relics packed into the new shape', () => {
        const packed = roundTrip(stateWith([RING, SIGNET])).player;
        const padded = roundTrip(stateWith([RING, SIGNET, null])).player;
        expect(getSignaturesForLoadout(packed.equipment)).toEqual(getSignaturesForLoadout(padded.equipment));
        expect(wornPieces(packed).map(p => p.id)).toEqual(wornPieces(padded).map(p => p.id));
        expect(unlockedLaneIds(packed, [], relicLibrary)).toEqual(unlockedLaneIds(padded, [], relicLibrary));
    });

    it('can still be worn into, from the first empty position', () => {
        const packed = roundTrip(stateWith([RING])).player;
        const next = equipItem(packed, SIGNET);
        expect(next.equipment.relics.map(r => r?.id ?? null)).toEqual([RING.id, SIGNET.id, null]);
    });
});

describe('a save with a hole', () => {
    it('round-trips with the hole where it was', () => {
        const loaded = roundTrip(stateWith([null, RING, SIGNET]));
        expect(loaded.player.equipment.relics.map(r => r?.id ?? null)).toEqual([null, RING.id, SIGNET.id]);
    });

    it('every reader skips the hole: signatures, lane pieces, worn items, stat fold, the fight', () => {
        const { player } = roundTrip(stateWith([null, SIGNET, null]));
        expect(getSignaturesForLoadout(player.equipment)).toEqual(['sig-bleeding-signet']);
        expect(wornPieces(player).map(p => p.id)).toEqual([SIGNET.id]);
        expect(getEquippedItems(player.equipment).every(i => i !== null)).toBe(true);
        expect(statsWithWorn(player).mind).toBe(player.baseStats.mind + 5);
        
        const fight = initializeCombatEncounter(player, FloatEye, ['grey-strike'], 1);
        expect(fight.signatures).toEqual(['sig-bleeding-signet']);
    });

    it('taking a relic off in play leaves the hole in the saved shape', () => {
        const base = stateWith([RING, SIGNET, null]).player;
        const off = unequipItem(base, 'relic', 0);
        const loaded = roundTrip({ ...stateWith([]), player: off });
        expect(loaded.player.equipment.relics.map(r => r?.id ?? null)).toEqual([null, SIGNET.id, null]);
    });
});
