/**
 * Hermetic e2e — `--fixture` CLI boot (`src/CLI/fixture-boot.ts` + `io.ts`).
 *
 * Covers flag parsing, registry-id vs JSON-path resolution (with an
 * injected reader — no disk), the `list` sentinel, and the boot path the
 * game CLI takes: fixture → `buildStateFromFixture` → `createGameStore`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseArgv } from '../io';
import {
    FIXTURE_LIST_REF, bootStateFromFixture, describeFixtures, looksLikePath, resolveStateFixture,
} from '../fixture-boot';
import { createGameStore } from '../../Game/store';
import { nullAdapter } from '../../Game/persistence/null.adapter';
import { listStateFixtureIds, StateFixtureError } from '../../Game/fixtures';

afterEach(() => vi.restoreAllMocks());

describe('parseArgv --fixture', () => {
    it('accepts both spellings and the list sentinel', () => {
        expect(parseArgv(['--fixture', 'sage-bw-door-gate']).fixture).toBe('sage-bw-door-gate');
        expect(parseArgv(['--fixture=./f.json']).fixture).toBe('./f.json');
        expect(parseArgv(['--fixture', FIXTURE_LIST_REF]).fixture).toBe('list');
    });

    it('rejects a missing value', () => {
        expect(() => parseArgv(['--fixture'])).toThrow(/--fixture requires/);
        expect(() => parseArgv(['--fixture', '--json-events'])).toThrow(/--fixture requires/);
    });
});

describe('resolveStateFixture', () => {
    it('discriminates ids from paths', () => {
        expect(looksLikePath('fresh-start')).toBe(false);
        expect(looksLikePath('fixtures/x.json')).toBe(true);
        expect(looksLikePath('x.json')).toBe(true);
    });

    it('resolves a registry id', () => {
        expect(resolveStateFixture('fresh-start').id).toBe('fresh-start');
    });

    it('names every known id on an unknown one', () => {
        expect(() => resolveStateFixture('nope')).toThrow(new RegExp(listStateFixtureIds().join('.*')));
    });

    it('reads + validates a JSON document through the injected reader', () => {
        const read = vi.fn(() => JSON.stringify({ id: 'file-fixture', seed: 9, preset: 'sage', world: { continent: 'coastal-continent', map: 'breakwater', node: 'bw-17' } }));
        const fixture = resolveStateFixture('./file-fixture.json', read);
        expect(read).toHaveBeenCalledWith('./file-fixture.json');
        expect(fixture.id).toBe('file-fixture');
        expect(() => resolveStateFixture('./bad.json', () => JSON.stringify({ id: 'bad', world: { continent: 'coastal-continent', map: 'breakwater', node: 'zz' } })))
            .toThrow(StateFixtureError);
    });
});

describe('boot path', () => {
    it('bootStateFromFixture feeds createGameStore as full overrides', () => {
        const initial = bootStateFromFixture('sage-bw-door-gate');
        const store = createGameStore(nullAdapter, initial);
        expect(store.getState().player.level).toBe(15);
        expect(store.getState().world.currentMap.currentNode).toBe('bw-22');
    });

    it('describeFixtures lists every registry id', () => {
        const text = describeFixtures();
        for (const id of listStateFixtureIds()) expect(text).toContain(id);
    });
});
