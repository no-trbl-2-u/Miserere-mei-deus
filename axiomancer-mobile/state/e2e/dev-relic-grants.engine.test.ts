/**
 * Hermetic store test — every dev relic grant wears the relic while a
 * position is free (phase SG1 A3).
 *
 * The dev chips (`addItemById`), POPULATE (`populateAllItems`), the seed
 * (`debugSeed`) and GET ALL RELICS (`grantAllRelics`) share one rule with the
 * mechanics CLI: wear when the slot has a free position, never displace a worn
 * relic, otherwise carry. Before SG1 the chips, POPULATE and the seed only
 * pushed into the satchel, so a chip-added Bleeding Signet reached the fight
 * with no signature.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { createCharacter, FIXTURE_TRINKETS, initializeCombatEncounter, ENEMY_REGISTRY, type Character } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

afterEach(() => {
    jest.restoreAllMocks();
});

const RING = 'relic-disarming-plea';
const SIGNET = 'relic-bleeding-signet';
/** The first three library relics fill the three positions; the fourth is carried. */
const FIRST_THREE = [RING, 'relic-crimson-circlet', 'relic-ruby-signet'];

function storeWith(player: Character): AppStore {
    return createAppStore({ adapter: createMemoryAdapter(), overrides: { player } });
}

const bare = (): Character => createCharacter({ name: 'Dev', level: 1, baseStats: { heart: 5, body: 5, mind: 5 } });
const full = (): Character => createCharacter({
    name: 'Dev', level: 1, baseStats: { heart: 5, body: 5, mind: 5 },
    inventory: [...FIXTURE_TRINKETS], equipment: [...FIXTURE_TRINKETS],
});

const worn = (store: AppStore) => store.getState().player.equipment.relics.map((a) => a.id);
const carried = (store: AppStore) => store.getState().player.inventory.map((i) => i.id);

const GRANTS: readonly [string, (store: AppStore) => void, readonly string[]][] = [
    ['addItemById (the dev chip)', (s) => { createAppActions(s).addItemById(SIGNET); }, [SIGNET]],
    ['populateAllItems', (s) => { createAppActions(s).populateAllItems(); }, FIRST_THREE],
    ['debugSeed', (s) => { createAppActions(s).debugSeed(); }, [RING]],
    ['grantAllRelics', (s) => { createAppActions(s).grantAllRelics(); }, FIRST_THREE],
];

describe('every dev relic grant wears while a position is free (SG1 A3)', () => {
    it.each(GRANTS)('%s wears each relic on a bare player', (_name, grant, expected) => {
        const store = storeWith(bare());
        grant(store);
        expect(worn(store)).toEqual(expected);
        for (const id of expected) expect(carried(store)).toContain(id);
    });

    it.each(GRANTS)('%s carries the relic when the row is full, and nothing worn moves', (_name, grant, expected) => {
        const store = storeWith(full());
        const before = worn(store);
        grant(store);
        expect(worn(store)).toEqual(before);
        for (const id of expected) expect(carried(store)).toContain(id);
    });

    it('a chip-added Signet reaches the next fight with Open Vein', () => {
        const store = storeWith(bare());
        createAppActions(store).addItemById(SIGNET);
        const fight = initializeCombatEncounter(
            store.getState().player, { ...ENEMY_REGISTRY['float-eye'] }, ['grey-strike'], 1,
        );
        expect(fight.signatures).toEqual(['sig-bleeding-signet']);
    });
});
