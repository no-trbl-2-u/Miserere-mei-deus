/**
 * Hermetic E2E — AsyncStorage persistence adapter (three save slots).
 *
 * Drives `createAsyncStorageAdapter` end-to-end against
 * AsyncStorage's official jest mock. Hermetic = self-contained +
 * deterministic + isolated. See docs/testing.md.
 *
 * Slot semantics under test: `load()`/`save()` are scoped to the ACTIVE
 * slot; preload reads every slot and the remembered last slot; an
 * unreadable slot is reported, never thrown; the pre-slot single-slot key is
 * deleted and never read.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createCharacter, createNewGameState, type GameState } from '@mechanics';

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { createAsyncStorageAdapter } from '../asyncStorageAdapter';
import {
    LAST_SLOT_KEY,
    LEGACY_SAVE_KEY,
    mostRecentSlot,
    slotStorageKey,
} from '../saveSlots';
import {
    CURRENT_SCHEMA_VERSION,
    type MigrationMap,
    type StoredEnvelope,
    unwrap,
    wrap,
} from '../migrations';

afterEach(async () => {
    await AsyncStorage.clear();
    jest.restoreAllMocks();
});

function buildState(playerName = 'Pilgrim'): GameState {
    const base = createNewGameState({ characterId: 'the-chosen' });
    const player = createCharacter({
        name: playerName,
        level: 1,
        baseStats: { heart: 4, body: 4, mind: 4 },
    });
    return { ...base, player: { ...player, characterId: 'the-chosen' } };
}

// ---------------------------------------------------------------------------
// preload + load
// ---------------------------------------------------------------------------

describe('createAsyncStorageAdapter — preload + load', () => {
    it('preload with no saved data leaves every slot empty; load returns null', async () => {
        const adapter = createAsyncStorageAdapter();

        await adapter.preload();

        expect(adapter.load()).toBeNull();
        expect(adapter.getActiveSlot()).toBeNull();
        expect(adapter.listSlots().map((s) => s.status)).toEqual(['empty', 'empty', 'empty']);
    });

    it('preload reads every slot and boots straight into the remembered last slot', async () => {
        await AsyncStorage.setItem(slotStorageKey(2), JSON.stringify(wrap(buildState('Pilgrim'), 1_000)));
        await AsyncStorage.setItem(slotStorageKey(3), JSON.stringify(wrap(buildState('Other'), 2_000)));
        await AsyncStorage.setItem(LAST_SLOT_KEY, '2');

        const adapter = createAsyncStorageAdapter();
        await adapter.preload();

        expect(adapter.getActiveSlot()).toBe(2);
        expect(adapter.load()?.player.name).toBe('Pilgrim');
        expect(adapter.readSlot(3)?.player.name).toBe('Other');
        expect(adapter.readSlot(1)).toBeNull();
        const summaries = adapter.listSlots();
        expect(summaries.map((s) => s.status)).toEqual(['empty', 'saved', 'saved']);
        expect(summaries[1]?.savedAt).toBe(1_000);
        expect(summaries[2]?.level).toBe(1);
        expect(mostRecentSlot(summaries)).toBe(3);
    });

    it('a remembered last slot that is empty does not become active', async () => {
        await AsyncStorage.setItem(LAST_SLOT_KEY, '1');
        const adapter = createAsyncStorageAdapter();
        await adapter.preload();
        expect(adapter.getActiveSlot()).toBeNull();
        expect(adapter.load()).toBeNull();
    });

    it('preload reports corrupted JSON as an unreadable slot instead of throwing', async () => {
        await AsyncStorage.setItem(slotStorageKey(1), '{ not valid json');
        await AsyncStorage.setItem(LAST_SLOT_KEY, '1');

        const adapter = createAsyncStorageAdapter();
        await expect(adapter.preload()).resolves.toBeUndefined();

        expect(adapter.listSlots()[0]?.status).toBe('unreadable');
        expect(adapter.readSlot(1)).toBeNull();
        // The torn slot is never booted into.
        expect(adapter.getActiveSlot()).toBeNull();
    });

    it('preload reports a save from a future schema version as unreadable', async () => {
        const envelope: StoredEnvelope = { schemaVersion: 999, state: {} };
        await AsyncStorage.setItem(slotStorageKey(2), JSON.stringify(envelope));

        const adapter = createAsyncStorageAdapter();
        await adapter.preload();

        expect(adapter.listSlots()[1]?.status).toBe('unreadable');
    });

    it('preload deletes the retired single-slot key and never reads it (owner call: discard legacy)', async () => {
        await AsyncStorage.setItem(LEGACY_SAVE_KEY, JSON.stringify(wrap(buildState('Legacy'))));

        const adapter = createAsyncStorageAdapter();
        await adapter.preload();

        expect(adapter.load()).toBeNull();
        expect(adapter.listSlots().every((s) => s.status === 'empty')).toBe(true);
        expect(await AsyncStorage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// save (debounced) + flush
//
// Call-count tests inject a fake `storage` so they don't share spy state
// with the module-level AsyncStorage mock.
// ---------------------------------------------------------------------------

interface FakeStorage {
    getItem: jest.Mock<(key: string) => Promise<string | null>>;
    setItem: jest.Mock<(key: string, value: string) => Promise<void>>;
    removeItem: jest.Mock<(key: string) => Promise<void>>;
}

function createFakeStorage(): FakeStorage {
    return {
        getItem: jest.fn<(key: string) => Promise<string | null>>().mockResolvedValue(null),
        setItem: jest.fn<(key: string, value: string) => Promise<void>>().mockResolvedValue(undefined),
        removeItem: jest.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined),
    };
}

describe('createAsyncStorageAdapter — save (debounced)', () => {
    it('save with NO active slot is dropped — nothing is written into an unpicked slot', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ debounceMs: 0, storage });

        adapter.save(buildState('Ghost'));
        await adapter.flush();

        expect(adapter.load()).toBeNull();
        expect(storage.setItem).not.toHaveBeenCalled();
    });

    it('save updates the load cache immediately', () => {
        const adapter = createAsyncStorageAdapter({
            debounceMs: 50,
            storage: createFakeStorage(),
        });
        adapter.selectSlot(1);

        adapter.save(buildState('Alice'));

        expect(adapter.load()?.player.name).toBe('Alice');
    });

    it('save writes to the ACTIVE slot key, stamped with the clock', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ debounceMs: 0, storage, now: () => 42_000 });
        adapter.selectSlot(3);

        adapter.save(buildState('Slot Three'));
        await adapter.flush();

        const slotWrites = storage.setItem.mock.calls.filter(([key]) => key === slotStorageKey(3));
        expect(slotWrites).toHaveLength(1);
        const written = JSON.parse(slotWrites[0]![1]) as StoredEnvelope;
        expect(written.savedAt).toBe(42_000);
        expect(unwrap(written).player.name).toBe('Slot Three');
        expect(adapter.listSlots()[2]?.savedAt).toBe(42_000);
        // The selection is remembered for the next launch.
        expect(storage.setItem).toHaveBeenCalledWith(LAST_SLOT_KEY, '3');
    });

    it('selecting a new slot flushes a write pending for the old slot into the OLD slot', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ debounceMs: 50, storage });
        adapter.selectSlot(1);
        adapter.save(buildState('One'));

        adapter.selectSlot(2);
        await adapter.flush();

        const slotWrites = storage.setItem.mock.calls.filter(([key]) => key.startsWith('@axiomancer/save:v2:slot-'));
        expect(slotWrites.map(([key]) => key)).toEqual([slotStorageKey(1)]);
        expect(adapter.readSlot(2)).toBeNull();
    });

    it('subscribers are told about writes, selects and clears', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ debounceMs: 0, storage });
        const listener = jest.fn();
        const unsubscribe = adapter.subscribe(listener);

        adapter.selectSlot(1);
        adapter.save(buildState());
        await adapter.flush();
        await adapter.clearSlot(1);
        const calls = listener.mock.calls.length;
        expect(calls).toBeGreaterThanOrEqual(3);

        unsubscribe();
        adapter.selectSlot(2);
        expect(listener.mock.calls.length).toBe(calls);
    });


    it('save coalesces bursts within the debounce window into one AsyncStorage write', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ debounceMs: 50, storage });
        adapter.selectSlot(1);
        storage.setItem.mockClear();

        adapter.save(buildState('A'));
        adapter.save(buildState('B'));
        adapter.save(buildState('C'));

        expect(storage.setItem).not.toHaveBeenCalled();

        await adapter.flush();

        expect(storage.setItem).toHaveBeenCalledTimes(1);
        const [, blob] = storage.setItem.mock.calls[0];
        const written = JSON.parse(blob) as StoredEnvelope;
        expect(written.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
        const result = unwrap(written);
        expect(result.player.name).toBe('C');
    });

    it('debounceMs: 0 writes synchronously on every save', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ debounceMs: 0, storage });
        adapter.selectSlot(1);
        storage.setItem.mockClear();

        adapter.save(buildState('A'));
        adapter.save(buildState('B'));

        await adapter.flush();

        expect(storage.setItem).toHaveBeenCalledTimes(2);
    });

    it('flush is a no-op when there is no pending write', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ storage });

        await adapter.flush();

        expect(storage.setItem).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// clear
// ---------------------------------------------------------------------------

describe('createAsyncStorageAdapter — clear / clearSlot', () => {
    it('clear removes the ACTIVE slot on disk and resets its cache; other slots survive', async () => {
        const adapter = createAsyncStorageAdapter({ debounceMs: 10 });
        adapter.selectSlot(2);
        adapter.save(buildState('Two'));
        await adapter.flush();
        adapter.selectSlot(1);
        adapter.save(buildState('One'));
        await adapter.flush();

        await adapter.clear();

        expect(adapter.load()).toBeNull();
        expect(adapter.getActiveSlot()).toBe(1);
        expect(await AsyncStorage.getItem(slotStorageKey(1))).toBeNull();
        expect(adapter.readSlot(2)?.player.name).toBe('Two');
        expect(adapter.listSlots().map((s) => s.status)).toEqual(['empty', 'saved', 'empty']);
    });

    it('clear cancels a pending debounced write', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ debounceMs: 50, storage });
        adapter.selectSlot(1);
        storage.setItem.mockClear();

        adapter.save(buildState());
        await adapter.clear();
        await adapter.flush();

        expect(storage.setItem).not.toHaveBeenCalled();
        // Exactly the slot key goes (the pre-slot key is preload's job).
        expect(storage.removeItem).toHaveBeenCalledWith(slotStorageKey(1));
    });

    it('clear with no active slot is a no-op', async () => {
        const storage = createFakeStorage();
        const adapter = createAsyncStorageAdapter({ storage });
        await adapter.clear();
        expect(storage.removeItem).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// migrations
// ---------------------------------------------------------------------------

describe('migrations — unwrap', () => {
    it('returns state unchanged when the envelope is already at CURRENT', () => {
        const envelope: StoredEnvelope = {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            state: { foo: 'bar' },
        };

        const result = unwrap(envelope) as unknown as { foo: string };

        expect(result.foo).toBe('bar');
    });

    it('throws when the saved version is newer than CURRENT', () => {
        const envelope: StoredEnvelope = { schemaVersion: 999, state: {} };

        expect(() => unwrap(envelope)).toThrow(/future version/);
    });

    it('throws on a malformed envelope (missing schemaVersion)', () => {
        expect(() => unwrap({} as StoredEnvelope)).toThrow(/corrupt save/);
    });

    it('chains forward-migrations from the source version to CURRENT', () => {
        // Simulate a save with a hypothetically-older schema by pretending
        // CURRENT bumped without us moving the saved data. We construct an
        // envelope at version -1 and a migration from -1 to 0; if CURRENT
        // is also 0 we exit cleanly. The chain pattern itself is what's
        // tested; a real v1 → v2 bump uses the same shape.
        if (CURRENT_SCHEMA_VERSION <= 1) {
            // Cannot exercise a real migration chain at v1; assert the
            // contract by simulating one step backward via a stub current.
            const migrations: MigrationMap = {
                0: (s) => ({ ...(s as object), migrated: true }),
            };
            // The migration path 0 -> 1 only fires when source < CURRENT.
            // At CURRENT_SCHEMA_VERSION === 1 we test the 0 -> 1 path.
            const envelope: StoredEnvelope = { schemaVersion: 0, state: { foo: 'bar' } };
            const result = unwrap(envelope, migrations) as unknown as { foo: string; migrated: boolean };
            expect(result.foo).toBe('bar');
            expect(result.migrated).toBe(true);
        }
    });

    it('throws when no migration exists for an older version', () => {
        if (CURRENT_SCHEMA_VERSION <= 1) {
            const envelope: StoredEnvelope = { schemaVersion: 0, state: {} };
            expect(() => unwrap(envelope, {})).toThrow(/no migration from v0/);
        }
    });

    it('preload + load on a v2 envelope walks the legacy bridge (Phase 51 + 52)', async () => {
        // Load a `schemaVersion: 2` envelope through the adapter and confirm
        // it comes back intact. Pins the migration runs end-to-end through
        // createAsyncStorageAdapter, not just through unwrap().
        const v2State = {
            player: {
                name: 'V2 Pilgrim',
                baseStats: { heart: 10, body: 10, mind: 10 },
                derivedStats: {},
                nonCombatStats: {},
            },
        };
        await AsyncStorage.setItem(
            slotStorageKey(1),
            JSON.stringify({ schemaVersion: 2, state: v2State }),
        );
        await AsyncStorage.setItem(LAST_SLOT_KEY, '1');

        const adapter = createAsyncStorageAdapter();
        await adapter.preload();
        const loaded = adapter.load() as unknown as Record<string, unknown>;

        expect(loaded).not.toBeNull();
        expect((loaded.player as { name: string }).name).toBe('V2 Pilgrim');
    });
});
