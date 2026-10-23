/**
 * Hermetic E2E tests — dev evidence presets.
 *
 * Drives the dev actions end-to-end through the engine store:
 *   - `applyPlayerTierPreset` (L1/L15/L30/L50 ladder)
 *   - `addItemById` (equipment / unique / consumable resolution)
 *   - `grantAllRelics` (every relic once; a free trinket position is worn
 *     for real, so the loadout and the signature bar both change)
 *
 * The first and third no longer have a dev-menu button: `DebugPlayerTierPresets`
 * was cut on 2026-10-16 (off the real stat curve) and `DebugGetAllRelics` the
 * same day (every relic is already a `DebugItemPicker` chip). The actions stay
 * on the store's surface, so their behaviour is pinned here rather than through
 * a component that no longer exists.
 *
 * Hermetic = self-contained + deterministic + isolated.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { getEquippedItems, grantFirstNodeRelic, initializeCombatEncounter, isEquipment, relicLibrary } from '@mechanics';

import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { PLAYER_TIER_PRESETS } from '@/state/dev/player-presets';
import { buildCombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { startRealFight } from '@/test-utils/realFight';
import { selectInventoryViewModel } from '@/state/presenters/inventory.engine';

afterEach(() => {
    jest.restoreAllMocks();
});

function makeStore() {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const actions = createAppActions(store);
    return { store, actions };
}

describe('applyPlayerTierPreset: L1/L15/L30/L50 ladder', () => {
    it.each(PLAYER_TIER_PRESETS.map((p) => [p.id, p.label, p.preset.level]))(
        'apply "%s" → player rebuilt at level %i',
        (presetId, label, level) => {
            const { store, actions } = makeStore();

            const result = actions.applyPlayerTierPreset(presetId as string);

            expect(result.applied).toBe(true);
            expect(result.presetId).toBe(presetId);
            expect(result.label).toBe(label);
            expect(result.level).toBe(level);

            const player = store.getState().player;
            expect(player.level).toBe(level);
            expect(player.maxHealth).toBeGreaterThan(0);
            expect(player.health).toBe(player.maxHealth);
            // Every tier seeds known cards (the full combat catalogue per
            // ADR-0002 — there is no separate equipped rotation).
            expect(player.knownCards?.length ?? 0).toBeGreaterThan(0);
        },
    );

    it('seeds the starting relics for the higher tiers', () => {
        const { store, actions } = makeStore();

        actions.applyPlayerTierPreset('kid-l50');
        const player = store.getState().player;
        // The preset's declared equipment is ignored; the build wears the
        // starting relic `createCharacter` seeds — the Suppliant's Ring alone.
        const worn = getEquippedItems(player.equipment);
        expect(worn.map((i) => i.id)).toEqual(['relic-disarming-plea']);
    });

    it('L1 is a leaner build than L50 (ladder escalates)', () => {
        const { store, actions } = makeStore();

        actions.applyPlayerTierPreset('kid-l1');
        const l1Health = store.getState().player.maxHealth;

        actions.applyPlayerTierPreset('kid-l50');
        const l50Health = store.getState().player.maxHealth;

        expect(l50Health).toBeGreaterThan(l1Health);
    });

    it('subsequent apply replaces — L15 state does not leak into L30', () => {
        const { store, actions } = makeStore();

        actions.applyPlayerTierPreset('kid-l15');
        const l15Level = store.getState().player.level;

        actions.applyPlayerTierPreset('kid-l30');
        const l30Level = store.getState().player.level;

        expect(l15Level).toBe(15);
        expect(l30Level).toBe(30);
    });

    it('unknown id is a no-op (applied=false, player untouched)', () => {
        const { store, actions } = makeStore();
        const before = store.getState().player;

        const result = actions.applyPlayerTierPreset('kid-l999');

        expect(result.applied).toBe(false);
        expect(result.presetId).toBeNull();
        expect(result.level).toBeNull();
        expect(store.getState().player).toBe(before);
    });
});

describe('addItemById: registry resolution', () => {
    it('adds a signet relic by id (Phase 21 — relics are the only equipment)', () => {
        const { store, actions } = makeStore();
        const before = store.getState().player.inventory?.length ?? 0;

        const result = actions.addItemById('relic-disarming-plea');

        expect(result.added).toBe(true);
        expect(result.kind).toBe('equipment');
        expect(result.name).toBeTruthy();
        expect((store.getState().player.inventory?.length ?? 0)).toBe(before + 1);
    });

    it('adds a consumable by id', () => {
        const { store, actions } = makeStore();

        const result = actions.addItemById('healing-potion');

        expect(result.added).toBe(true);
        expect(result.kind).toBe('consumable');
    });

    it('trims surrounding whitespace before lookup', () => {
        const { store, actions } = makeStore();

        const result = actions.addItemById('  relic-disarming-plea  ');

        expect(result.added).toBe(true);
        expect(result.id).toBe('relic-disarming-plea');
        expect(result.kind).toBe('equipment');
    });

    it('returns a graceful failure for an empty id', () => {
        const { actions } = makeStore();

        const result = actions.addItemById('   ');

        expect(result.added).toBe(false);
        expect(result.kind).toBeNull();
        expect(result.reason).toBeTruthy();
    });

    it('returns a graceful failure for an unknown id', () => {
        const { store, actions } = makeStore();
        const before = store.getState().player.inventory?.length ?? 0;

        const result = actions.addItemById('not-a-real-item');

        expect(result.added).toBe(false);
        expect(result.kind).toBeNull();
        expect(result.reason).toContain('not-a-real-item');
        expect((store.getState().player.inventory?.length ?? 0)).toBe(before);
    });
});

/** Every relic id the player currently holds in the satchel. */
const relicIds = (store: AppStore): string[] =>
    store.getState().player.inventory.filter(isEquipment).map((i) => i.id);

describe('grantAllRelics: every relic once, and worn for real', () => {
    it('adds every relic once, skips ones already owned, and a second call adds nothing', () => {
        const { store, actions } = makeStore();
        const owned = new Set(relicIds(store));

        const first = actions.grantAllRelics();
        const after = relicIds(store);

        // Once each — never a duplicate, however the starting kit was seeded.
        for (const r of relicLibrary) expect(after.filter((id) => id === r.id)).toHaveLength(1);
        expect(after.length).toBe(new Set([...owned, ...relicLibrary.map((r) => r.id)]).size);
        expect(first.added.length).toBeGreaterThan(0);

        // Idempotent: the second call finds nothing left to grant.
        const second = actions.grantAllRelics();
        expect(second.added).toEqual([]);
        expect(relicIds(store)).toEqual(after);
    });

    it('a relic landing in a free trinket position is worn: +20 max VITAE and Crimson Covenant on the bar', () => {
        const { store, actions } = makeStore();
        const before = store.getState().player;

        actions.grantAllRelics();

        const player = store.getState().player;
        expect(player.equipment.accessories.map((a) => a.id)).toContain('relic-bleeding-signet');
        expect(player.maxHealth).toBe(before.maxHealth + 20);

        // The dock shows it in a trinket slot beside the Ring.
        const dock = selectInventoryViewModel(store.getState()).equipmentDock.slots
            .filter((sl) => sl.key === 'accessory').map((sl) => sl.item?.id ?? null);
        expect(dock).toContain('relic-bleeding-signet');

        // The signature bar lists every signature the worn signets grant, and both cast.
        const fight = initializeCombatEncounter(player, startRealFight().enemy, ['grey-strike'], 1);
        const bar = buildCombatViewModel({ ...fight, conviction: 8 }).signatures;
        expect(bar.map((sig) => sig.name)).toEqual(
            player.equipment.accessories.map((a) => a.grantsSignature === 'sig-disarming-plea' ? 'The Open Hand' : 'Crimson Covenant'),
        );
        expect(bar.find((sig) => sig.name === 'Crimson Covenant')?.affordable).toBe(true);
    });

    it('beside the Suppliant\'s Ring: two trinket slots worn, both signatures on the bar', () => {
        const { store, actions } = makeStore();
        const granted = grantFirstNodeRelic(store.getState().player, []);
        store.setState({ player: granted.character });

        actions.grantAllRelics();

        const player = store.getState().player;
        expect(player.equipment.accessories.map((a) => a.id)).toEqual(['relic-disarming-plea', 'relic-bleeding-signet']);
        const fight = initializeCombatEncounter(player, startRealFight().enemy, ['grey-strike'], 1);
        expect(buildCombatViewModel(fight).signatures.map((sig) => sig.name)).toEqual(['The Open Hand', 'Crimson Covenant']);
    });

    it('displaces nothing already worn', () => {
        const { store, actions } = makeStore();
        const granted = grantFirstNodeRelic(store.getState().player, []);
        store.setState({ player: granted.character });
        const wornBefore = getEquippedItems(store.getState().player.equipment).map((i) => i.id);

        actions.grantAllRelics();

        const wornAfter = getEquippedItems(store.getState().player.equipment).map((i) => i.id);
        for (const id of wornBefore) expect(wornAfter).toContain(id);
    });
});
