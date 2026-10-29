/**
 * The elite relic drop chance is never shown to the player (phase ER1, A12).
 *
 * `ELITE_RELIC_DROP_CHANCE` stays engine-only: no player-facing string says
 * it as a percentage, as a fraction, or as "drop chance" / "chance to drop".
 * The sweep covers every `*.copy.ts` source in the app, the relic library's
 * names and descriptions, the elite-drop eyebrow, and the rest screen's
 * rendered text after a forced drop and after a forced miss.
 */

import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import React from 'react';

import {
    ELITE_RELIC_DROP_CHANCE,
    FIXTURE_ELITE_RELICS,
    createStartingWorld,
    relicLibrary,
    retireEliteNode,
    type WorldState,
} from '@mechanics';

import RestScreen from '@/app/rest/index';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { eliteDropSource } from '@/state/presenters/relic-source.copy';
import { beginRestAction, chooseRestChoiceOfferAction } from '@/state/rest/store-actions';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const PERCENT = `${Math.round(ELITE_RELIC_DROP_CHANCE * 100)}%`;
const FRACTION = String(ELITE_RELIC_DROP_CHANCE);
const FORBIDDEN: readonly RegExp[] = [
    new RegExp(`(^|[^0-9.])${PERCENT.replace('%', '\\s?%')}`),
    new RegExp(`(^|[^0-9])${FRACTION.replace('.', '\\.')}(?![0-9])`),
    /drop chance/i,
    /chance to drop/i,
];

function offending(text: string): RegExp | undefined {
    return FORBIDDEN.find(re => re.test(text));
}

const APP_ROOT = path.resolve(__dirname, '../../..');

/** Every `*.copy.ts` under the app's source folders. */
function copySources(): string[] {
    const out: string[] = [];
    const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name.endsWith('.copy.ts')) out.push(full);
        }
    };
    for (const dir of ['app', 'components', 'state', 'lib']) {
        const full = path.join(APP_ROOT, dir);
        if (fs.existsSync(full)) walk(full);
    }
    return out;
}

/** Every text node a render shows. */
function renderedText(node: unknown): string {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(renderedText).join(' ');
    const children = (node as { children?: unknown }).children;
    return renderedText(children);
}

function restScreenText(world: WorldState): string {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    store.setState({ world } as never);
    expect(beginRestAction(store, { seed: 7, shelter: 'camp' })).toBe(true);
    chooseRestChoiceOfferAction(store, 'rest');
    const r = render(
        <GameStoreProvider store={store}>
            <RestScreen />
        </GameStoreProvider>,
    );
    return renderedText(r.toJSON());
}

describe('the elite drop chance is never shown (A12)', () => {
    it('the sweep patterns catch the chance in each shape', () => {
        expect(offending(`A ${PERCENT} chance`)).toBeDefined();
        expect(offending(`p = ${FRACTION}`)).toBeDefined();
        expect(offending('Drop chance: low')).toBeDefined();
        expect(offending('a chance to drop a relic')).toBeDefined();
        expect(offending('18% more')).toBeUndefined();
    });

    it('no *.copy.ts source says it', () => {
        const files = copySources();
        expect(files.length).toBeGreaterThan(5);
        for (const file of files) {
            const text = fs.readFileSync(file, 'utf8');
            expect({ file, hit: offending(text)?.source ?? null }).toEqual({ file, hit: null });
        }
    });

    it('no relic name or description says it, live or fixture', () => {
        for (const relic of [...relicLibrary, ...FIXTURE_ELITE_RELICS]) {
            const text = `${relic.name} ${relic.description ?? ''}`;
            expect({ id: relic.id, hit: offending(text)?.source ?? null }).toEqual({ id: relic.id, hit: null });
        }
        expect(offending(eliteDropSource('Green Jelly'))).toBeUndefined();
    });

    it('the rest screen says nothing of it, after a drop (retired) or a miss (returning)', () => {
        const fought = createStartingWorld('breakwater');
        const missed: WorldState = {
            ...fought,
            currentMap: { ...fought.currentMap, consumedNodes: [...fought.currentMap.consumedNodes, 'bw-w5'] },
        };
        const dropped = retireEliteNode(missed, 'bw-w5');
        const afterMiss = restScreenText(missed);
        expect(afterMiss).toContain('is back at');
        expect(offending(afterMiss)).toBeUndefined();
        const afterDrop = restScreenText(dropped);
        expect(afterDrop).not.toContain('is back at');
        expect(offending(afterDrop)).toBeUndefined();
    });
});
