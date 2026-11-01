/**
 * Hermetic E2E — mobile state-fixture boot (`state/fixtures.ts`,
 * `state/persistence/fixtureBootAdapter.ts`, `<FixtureBoot>`).
 *
 * Drives the same registry fixtures the CLI boots from through the
 * mobile store: request channels (global vs URL), the dev-tools gate,
 * invalid-request fallback, ephemeral persistence, `arrive` firing the
 * current node's event so `<EventGate>` has a route, and the shared
 * `placeOnNode` path behind `/dev` JUMP.
 *
 * Hermetic = self-contained + deterministic (every fixture is seeded) +
 * isolated (globals + memo reset in afterEach).
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { GAME_STATE_VERSION, getStateFixtureById } from '@mechanics';

import { createAppActions } from '@/state/actions';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import {
    FIXTURE_QUERY_PARAM,
    readFixtureRequest,
    resetBootFixtureForTests,
    resolveBootFixture,
    resolveFixtureRequest,
    getBootFixture,
} from '@/state/fixtures';
import { createFixtureBootAdapter } from '@/state/persistence/fixtureBootAdapter';
import { selectPacedEventRoute } from '@/state/presenters/event.engine';
import { arriveFromFixture, createFixtureStore } from '@/test-utils/fixtureStore';

afterEach(() => {
    delete globalThis.__AXM_FIXTURE__;
    resetBootFixtureForTests();
    jest.restoreAllMocks();
});

describe('readFixtureRequest: channels + precedence', () => {
    it('reads the URL query when no global is set', () => {
        expect(readFixtureRequest(`?${FIXTURE_QUERY_PARAM}=fresh-start&x=1`)).toEqual({ source: 'url', ref: 'fresh-start' });
        expect(readFixtureRequest('?x=1')).toBeNull();
        expect(readFixtureRequest('')).toBeNull();
    });

    it('the global outranks the URL and may be an inline object', () => {
        globalThis.__AXM_FIXTURE__ = 'sage-bw-door-gate';
        expect(readFixtureRequest('?fixture=fresh-start')).toEqual({ source: 'global', ref: 'sage-bw-door-gate' });
        const inline = { id: 'inline', seed: 1 };
        globalThis.__AXM_FIXTURE__ = inline;
        expect(readFixtureRequest('')).toEqual({ source: 'global', ref: inline });
    });
});

describe('resolveFixtureRequest', () => {
    it('resolves registry ids and validates inline objects', () => {
        expect(resolveFixtureRequest({ source: 'url', ref: 'fresh-start' }).id).toBe('fresh-start');
        expect(resolveFixtureRequest({ source: 'global', ref: { id: 'ok', seed: 2 } }).id).toBe('ok');
        expect(() => resolveFixtureRequest({ source: 'url', ref: 'nope' })).toThrow(/Known ids/);
        expect(() => resolveFixtureRequest({ source: 'global', ref: { id: 'Bad Id' } })).toThrow(/Invalid state fixture/);
    });
});

describe('resolveBootFixture: gate + fallback', () => {
    it('returns null with nothing requested', () => {
        expect(resolveBootFixture({ request: null, devToolsEnabled: true })).toBeNull();
        expect(getBootFixture()).toBeNull();
    });

    it('ignores the request when dev tools are disabled (production)', () => {
        expect(resolveBootFixture({ request: { source: 'url', ref: 'sage-bw-door-gate' }, devToolsEnabled: false })).toBeNull();
        expect(getBootFixture()).toBeNull();
    });

    it('falls back to a normal boot on an unknown or invalid fixture', () => {
        expect(resolveBootFixture({ request: { source: 'url', ref: 'nope' }, devToolsEnabled: true })).toBeNull();
        expect(resolveBootFixture({ request: { source: 'global', ref: { id: 'x', world: { continent: 'coastal-continent', map: 'breakwater', node: 'zz' } } }, devToolsEnabled: true })).toBeNull();
    });

    it('compiles a registry fixture and memoises it for the boot', () => {
        const boot = resolveBootFixture({ request: { source: 'url', ref: 'l30-bw-hazard' }, devToolsEnabled: true });
        expect(boot?.fixture.id).toBe('l30-bw-hazard');
        expect(boot?.state.player.level).toBe(30);
        expect(boot?.state.world.currentMap.currentNode).toBe('bw-m2');
        expect(getBootFixture()).toBe(boot);
    });
});

describe('store boot through the fixture adapter', () => {
    it('boots the app store from the fixture state and keeps saves in memory', () => {
        const boot = resolveBootFixture({ request: { source: 'global', ref: 'sage-bw-door-gate' }, devToolsEnabled: true })!;
        const adapter = createFixtureBootAdapter(boot.state);
        const store = createAppStore({ adapter });
        const s = store.getState();
        expect(s.version).toBe(GAME_STATE_VERSION);
        expect(s.player.level).toBe(15);
        expect(s.world.currentMap.name).toBe('breakwater');
        expect(s.world.currentMap.currentNode).toBe('bw-k1');
        // Mobile-only slices are still layered on.
        expect(s.event.pending).toBeNull();

        expect(adapter.saveCount).toBe(0);
        store.getState().save();
        expect(adapter.saveCount).toBe(1);
        expect(adapter.load()?.runId).toBe(s.runId);
    });

    it('`arrive` fixtures resolve the current node so <EventGate> has a paced route', () => {
        const fixture = getStateFixtureById('wanderer-staged-cutscene')!;
        expect(fixture.arrive).toBe(true);
        const boot = resolveBootFixture({ request: { source: 'url', ref: fixture.id }, devToolsEnabled: true })!;
        const store = createAppStore({ adapter: createFixtureBootAdapter(boot.state) });
        const actions = createAppActions(store);
        expect(selectPacedEventRoute(store.getState())).toBeNull();

        // What <FixtureBoot> does once navigation is ready.
        expect(actions.resolveCurrentMapEvent(undefined, boot.fixture.stagedEvent)).toBe(true);
        expect(selectPacedEventRoute(store.getState())).toBe('/cutscene');
    });

    it('`wanderer-staged-village` arrives on the village screen', () => {
        const boot = resolveBootFixture({ request: { source: 'url', ref: 'wanderer-staged-village' }, devToolsEnabled: true })!;
        const store = createAppStore({ adapter: createFixtureBootAdapter(boot.state) });
        createAppActions(store).resolveCurrentMapEvent(undefined, boot.fixture.stagedEvent);
        expect(selectPacedEventRoute(store.getState())).toBe('/village');
        expect(store.getState().player.currency).toBe(240);
    });
});

describe('createFixtureStore + arriveFromFixture (test-utils/fixtureStore.ts)', () => {
    it('boots from a registry id with a zero-save memory adapter', () => {
        const h = createFixtureStore('sage-bw-door-gate');
        expect(h.fixture.id).toBe('sage-bw-door-gate');
        expect(h.store.getState().world.currentMap.currentNode).toBe('bw-k1');
        expect(h.adapter.saveCount).toBe(0);
        expect(h.state.runId).toBe(h.store.getState().runId);
    });

    it('accepts an inline fixture and a caller-supplied adapter', () => {
        const adapter = createMemoryAdapter();
        const h = createFixtureStore(
            { id: 'inline-seat', seed: 11, world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-b2' } },
            { adapter },
        );
        expect(h.adapter).toBe(adapter);
        expect(adapter.saveCount).toBe(1);
        expect(h.store.getState().world.currentMap.currentNode).toBe('bw-b2');
    });

    it('rejects unknown ids and invalid inline documents', () => {
        expect(() => createFixtureStore('nope')).toThrow(/Known ids/);
        expect(() => createFixtureStore({ id: 'Bad Id' })).toThrow(/Invalid state fixture/);
    });

    // One row per state-gated screen: the arrival fixtures exist so the
    // browser harnesses can open these cold; pin here that each `arrive`
    // lands the store in the state its gate routes on.
    it.each([
        ['apprentice-staged-dialogue', (s: ReturnType<AppStore['getState']>) => selectPacedEventRoute(s) === '/dialogue'],
        ['wanderer-staged-village', (s: ReturnType<AppStore['getState']>) => selectPacedEventRoute(s) === '/village'],
        ['wanderer-staged-cutscene', (s: ReturnType<AppStore['getState']>) => selectPacedEventRoute(s) === '/cutscene'],
        ['apprentice-bw-rest', (s: ReturnType<AppStore['getState']>) => s.rest.session !== null],
        ['apprentice-bw-cache', (s: ReturnType<AppStore['getState']>) => s.cache.session !== null],
        ['wanderer-bw-blacksmith', (s: ReturnType<AppStore['getState']>) => s.event.pending?.event.kind === 'village'],
        // A Breakwater hazard opens its puzzle (HP6c); the Charcoal Wood's keeps the three-round board.
        ['l30-bw-hazard-arrive', (s: ReturnType<AppStore['getState']>) => s.hazard.puzzle?.nodeId === 'bw-m2'],
        ['l30-cw-hazard-arrive', (s: ReturnType<AppStore['getState']>) => s.hazard.session !== null],
    ])('"%s": arrive lands the state its gate routes on', (id, landed) => {
        const h = createFixtureStore(id);
        expect(h.fixture.arrive).toBe(true);
        expect(arriveFromFixture(h)).toBe(true);
        expect(landed(h.store.getState())).toBe(true);
    });
});
