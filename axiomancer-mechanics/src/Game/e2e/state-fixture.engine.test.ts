/**
 * Hermetic e2e — state fixtures (`src/Game/fixtures`).
 *
 * Drives the public surface end-to-end: registry → validate → build →
 * `createGameStore` boot, plus the migration contract (a built fixture is
 * always current-version) and the determinism contract (seeded fixtures
 * build byte-equal twice).
 *
 * Hermetic: no disk, no network; the RNG is seeded per fixture or reset in
 * `beforeEach`; every spy is restored in `afterEach`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createGameStore } from '../store';
import { nullAdapter } from '../persistence/null.adapter';
import { GAME_STATE_VERSION, createNewGameState } from '../game.reducer';
import { migrate } from '../game.migrate';
import { setSeed } from '../../Utils/rng';
import { getMapDefinition } from '../../World/map.registry';
import { resolveMapEvent } from '../../World/MapEvents/resolve-map-event';
import { legalMovesFrom } from '../../World/world.reducer';
import { getQuestline, _unregisterQuestline } from '../../World/questline';
import {
    STATE_FIXTURES, buildStateFromFixture, getStateFixtureById, listStateFixtureIds,
    parseStateFixture, problemsFor, validateStateFixture, StateFixtureError,
    FIXTURE_NPC,
} from '../fixtures';
import type { StateFixture } from '../fixtures';
import { createFixtureGameStore, resolveFixture } from '../../test-utils/fixture-store';

beforeEach(() => setSeed('state-fixture-suite'));
afterEach(() => vi.restoreAllMocks());

const KEBAB = /^[a-z][a-z0-9-]*$/;

describe('registry', () => {
    it('ids are kebab-case and unique', () => {
        const ids = listStateFixtureIds();
        expect(ids.every(id => KEBAB.test(id))).toBe(true);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(STATE_FIXTURES.map(f => [f.id, f] as const))('"%s" validates and builds a current-version state', (_id, fixture) => {
        expect(problemsFor(fixture)).toEqual([]);
        const state = buildStateFromFixture(fixture);
        expect(state.version).toBe(GAME_STATE_VERSION);
        // Round-trip through the persistence front door: a built fixture
        // must satisfy `migrate`'s structural checks unchanged.
        expect(migrate(JSON.parse(JSON.stringify(state)), state.version)).toEqual(JSON.parse(JSON.stringify(state)));
        if (fixture.world) {
            expect(state.world.currentMap.name).toBe(fixture.world.map);
            expect(state.world.currentContinent.name).toBe(fixture.world.continent);
            const expectedNode = fixture.world.node ?? getMapDefinition(fixture.world.continent, fixture.world.map).startingNode.id;
            expect(state.world.currentMap.currentNode).toBe(expectedNode);
        }
    });

    it('getStateFixtureById returns undefined for unknown ids', () => {
        expect(getStateFixtureById('no-such-fixture')).toBeUndefined();
        expect(getStateFixtureById('fresh-start')?.id).toBe('fresh-start');
    });
});

describe('buildStateFromFixture', () => {
    it('an empty fixture is a new game', () => {
        setSeed('same');
        const fresh = createNewGameState();
        setSeed('same');
        const built = buildStateFromFixture({ id: 'empty' });
        expect(built).toEqual(fresh);
    });

    it('is deterministic when seeded (run id included)', () => {
        const fixture = getStateFixtureById('sage-bw-door-gate')!;
        const a = buildStateFromFixture(fixture);
        const b = buildStateFromFixture(fixture);
        expect(a).toEqual(b);
        expect(a.runId).toBe(b.runId);
    });

    it('preset + player overrides rebuild the character consistently', () => {
        const state = buildStateFromFixture({
            id: 'override',
            seed: 1,
            preset: 'apprentice',
            player: { level: 7, baseStats: { body: 9 }, health: 5, currency: 33, knownCards: ['thin-hymn'], name: 'Tester' },
        });
        const p = state.player;
        expect(p.name).toBe('Tester');
        expect(p.level).toBe(7);
        expect(p.baseStats.body).toBe(9);
        expect(p.health).toBe(5);
        expect(p.maxHealth).toBeGreaterThan(5);
        expect(p.currency).toBe(33);
        expect(p.knownCards).toContain('thin-hymn');
        expect(new Set(p.knownCards).size).toBe(p.knownCards.length);
    });

    it('clamps health to maxHealth', () => {
        const state = buildStateFromFixture({
            id: 'clamp',
            seed: 2,
            player: { health: 99999 },
        });
        expect(state.player.health).toBe(state.player.maxHealth);
    });

    it('world placement unlocks the map, stamps completed maps, and marks the node live', () => {
        const state = buildStateFromFixture({
            id: 'world',
            seed: 3,
            world: { continent: 'coastal-continent', map: 'charcoal-wood', node: 'cw-8', completedMaps: ['breakwater'] },
        });
        const { currentContinent, currentMap } = state.world;
        expect(currentContinent.name).toBe('coastal-continent');
        expect(currentContinent.availableMaps).toContain('charcoal-wood');
        expect(currentContinent.lockedMaps).not.toContain('charcoal-wood');
        expect(currentContinent.completedMaps).toEqual(['breakwater']);
        expect(currentMap.currentNode).toBe('cw-8');
        expect(currentMap.lockedNodes).not.toContain('cw-8');
        expect(currentMap.availableNodes).toEqual(legalMovesFrom(currentMap));
        expect(currentMap.discoveredNodes).toContain('cw-8');
    });

    it('world.questNodesSettled spends the map\'s quest nodes and opens their locks; without it the road to marker 4 stays shut', () => {
        const at = (questNodesSettled?: boolean) => buildStateFromFixture({
            id: 'settled',
            seed: 3,
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-15', ...(questNodesSettled === undefined ? {} : { questNodesSettled }) },
        }).world.currentMap;
        const settled = at(true);
        expect(legalMovesFrom(settled)).toContain('bw-22');
        expect(settled.consumedNodes).toEqual(expect.arrayContaining(['bw-19', 'bw-20', 'bw-21', 'bw-22']));
        expect(settled.blockedRoutes).toEqual([]);
        for (const plain of [at(), at(false)]) {
            expect(legalMovesFrom(plain)).not.toContain('bw-22');
            expect(plain.blockedRoutes).toHaveLength(4);
        }
        expect(problemsFor({ id: 'bad', world: { continent: 'coastal-continent', map: 'breakwater', questNodesSettled: 'yes' } }))
            .toContain('world.questNodesSettled: expected a boolean');
    });

    it('flags append without duplicates', () => {
        const base = buildStateFromFixture({ id: 'base', seed: 4 });
        const withFlags = buildStateFromFixture({ id: 'flags', seed: 4, flags: [base.flags[0]!, 'x-flag', 'x-flag'] });
        expect(withFlags.flags.filter(f => f === 'x-flag')).toHaveLength(1);
        expect(withFlags.flags.filter(f => f === base.flags[0])).toHaveLength(1);
    });

    it('boots a store through createGameStore as full overrides', () => {
        const initial = buildStateFromFixture(getStateFixtureById('l30-bw-hazard')!);
        const store = createGameStore(nullAdapter, initial);
        const s = store.getState();
        expect(s.player.level).toBe(30);
        expect(s.player.health).toBe(12);
        expect(s.world.currentMap.name).toBe('breakwater');
        expect(s.world.currentMap.currentNode).toBe('bw-3');
        expect(s.version).toBe(GAME_STATE_VERSION);
    });
});

describe('validateStateFixture', () => {
    const bad = {
        id: 'Not Kebab',
        preset: 'no-such-preset',
        player: { level: 0, baseStats: { heart: 'x' } },
        world: { continent: 'coastal-continent', map: 'breakwater', node: 'zz-99', completedMaps: ['nowhere'] },
        flags: 'oops',
        arrive: 'yes',
    };

    it('reports every problem at once with field paths', () => {
        const problems = problemsFor(bad);
        expect(problems).toEqual(expect.arrayContaining([
            expect.stringContaining('id:'),
            expect.stringContaining('preset:'),
            expect.stringContaining('player.level'),
            expect.stringContaining('player.baseStats.heart'),
            expect.stringContaining("world.node: 'zz-99'"),
            expect.stringContaining("world.completedMaps: unknown map"),
            expect.stringContaining('flags:'),
            expect.stringContaining('arrive:'),
        ]));
        expect(() => validateStateFixture(bad)).toThrow(StateFixtureError);
    });

    it('checks stagedDialogue is a tree: an object with a string rootId and a nodes object', () => {
        const tree = { rootId: 'r', nodes: { r: { id: 'r', text: 'x' } } };
        expect(problemsFor({ id: 'x', stagedDialogue: tree })).toEqual([]);
        const bad = ['stagedDialogue: expected a dialogue tree'];
        expect(problemsFor({ id: 'x', stagedDialogue: 'tree' })).toEqual(bad);
        expect(problemsFor({ id: 'x', stagedDialogue: { nodes: {} } })).toEqual(bad);
        expect(problemsFor({ id: 'x', stagedDialogue: { rootId: 7, nodes: {} } })).toEqual(bad);
        expect(problemsFor({ id: 'x', stagedDialogue: { rootId: 'r' } })).toEqual(bad);
        expect(problemsFor({ id: 'x', stagedDialogue: { rootId: 'r', nodes: 'n' } })).toEqual(bad);
    });

    it('rejects unknown maps and non-objects', () => {
        expect(problemsFor({ id: 'x', world: { continent: 'coastal-continent', map: 'atlantis' } })).toEqual([
            expect.stringContaining("unknown map 'coastal-continent/atlantis'"),
        ]);
        expect(problemsFor(null)).toEqual(['fixture: expected an object']);
        expect(problemsFor([])).toEqual(['fixture: expected an object']);
    });

    it('parseStateFixture accepts a JSON document and rejects malformed JSON', () => {
        const doc: StateFixture = { id: 'from-json', seed: 'j', preset: 'wanderer' };
        expect(parseStateFixture(JSON.stringify(doc))).toEqual(doc);
        expect(() => parseStateFixture('{not json')).toThrow(StateFixtureError);
    });
});

describe('createFixtureGameStore (src/test-utils/fixture-store.ts)', () => {
    it('boots a hermetic store from a registry id', () => {
        const { store, state, fixture } = createFixtureGameStore('sage-bw-door-gate');
        expect(fixture.id).toBe('sage-bw-door-gate');
        expect(store.getState().runId).toBe(state.runId);
        expect(store.getState().world.currentMap.currentNode).toBe('bw-22');
    });

    it('accepts an inline fixture and rejects bad refs', () => {
        const { store } = createFixtureGameStore({ id: 'inline', seed: 5, preset: 'wanderer' });
        expect(store.getState().player.level).toBe(8);
        expect(() => resolveFixture('nope')).toThrow(/Known ids/);
        expect(() => resolveFixture({ id: 'Bad Id' })).toThrow(/Invalid state fixture/);
    });

    it('every arrival fixture stands on a node whose primary kind matches its description', () => {
        const arrivals = STATE_FIXTURES.filter(f => f.arrive);
        expect(arrivals.length).toBeGreaterThanOrEqual(7);
        for (const f of arrivals) {
            const { state } = createFixtureGameStore(f.id);
            expect(state.world.currentMap.currentNode).toBe(f.world?.node);
        }
    });

    // NK1a — no map event opens a dialogue; the dialogue fixture seats the
    // fixture NPC's tree instead of staging an event.
    it('"apprentice-staged-dialogue" seats the fixture NPC\'s tree and stages no event', () => {
        const f = getStateFixtureById('apprentice-staged-dialogue')!;
        expect(f.arrive).toBe(true);
        expect(f.stagedEvent).toBeUndefined();
        expect(f.stagedDialogue).toBe(FIXTURE_NPC.dialogueTree);
    });

    // R7e — Act 1 stages no NPC, shop or off-start cutscene; these fixtures
    // stage the neutral witnesses and must resolve to them, not the node's pool.
    it.each([
        ['wanderer-staged-village', 'village'],
        ['wanderer-staged-cutscene', 'cutscene'],
    ])('"%s" resolves its staged %s event', (id, kind) => {
        const f = getStateFixtureById(id)!;
        expect(f.stagedEvent?.kind).toBe(kind);
        const { state } = createFixtureGameStore(id);
        const result = resolveMapEvent(state, () => 0, f.stagedEvent);
        expect(result.event.kind).toBe(kind);
        expect(result.state.world.currentMap.consumedNodes).toContain(f.world?.node);
    });

    // QL1c — the quest screen's hermetic witness is a fixture that stages the
    // quest node and brings its questline along (the live Breakwater's own
    // questline is registered at load). A quest node is not spent by being resolved.
    it('only a fixture that stages the fixture questline registers it', () => {
        _unregisterQuestline('fixture-questline');
        createFixtureGameStore('wanderer-staged-cutscene');
        expect(getQuestline('fixture-questline')).toBeUndefined();
        createFixtureGameStore({
            id: 'other-quest', seed: 3,
            world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-2' },
            stagedEvent: { kind: 'quest', questline: 'some-other-line', node: 1 },
        });
        expect(getQuestline('fixture-questline')).toBeUndefined();
        expect(getQuestline('some-other-line')).toBeUndefined();
    });

    it('"apprentice-staged-quest" stages the fixture questline\'s first node and registers the line', () => {
        const f = getStateFixtureById('apprentice-staged-quest')!;
        expect(f.stagedEvent?.kind).toBe('quest');
        _unregisterQuestline('fixture-questline');
        const { state } = createFixtureGameStore('apprentice-staged-quest');
        expect(getQuestline('fixture-questline')?.steps).toHaveLength(2);
        const result = resolveMapEvent(state, () => 0, f.stagedEvent);
        expect(result.event).toMatchObject({ kind: 'quest', questline: 'fixture-questline', node: 1, stage: 'offer' });
        expect(result.state.world.currentMap.consumedNodes).not.toContain(f.world?.node);
    });
});
