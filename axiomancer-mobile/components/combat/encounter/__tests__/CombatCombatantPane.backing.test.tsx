/**
 * Phase AP1d - THE FOE STANDS ON A BACKING CUT FROM ITS OWN CELLS; per cell
 * since 146.8 (AP1h).
 *
 * The pane's half of the backing law. `scripts/enemy-backings.test.mjs` proves
 * every cell's backing exists, covers it and stays inside its shape; this
 * proves the pane draws it: the backing of the cell on screen, under that cell,
 * inside the wrappers that breathe and lunge, in the theme's ground colour,
 * only while plates are shown, and that the round figure plate is gone.
 */
import React from 'react';
import { render, within, type RenderResult } from '@testing-library/react-native';

import { CombatCombatantPane } from '@/components/combat/encounter/CombatCombatantPane';
import { ENEMY_BACKINGS, ENEMY_FRAME_SETS, getEnemyBacking } from '@/assets/images/enemies';
import { cellContentPosition, sheetIndexFor } from '@/components/combat/frames';
import type { CombatEnemyPaneVM, CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

// The flag's real value is another chunk's to flip, so both states are set here.
let mockPlatesShown = true;
jest.mock('@/assets/images/combat', () => Object.defineProperty(
    { ...jest.requireActual('@/assets/images/combat') },
    'ARENA_PLATES_SHOWN',
    { get: () => mockPlatesShown },
));

beforeEach(() => {
    mockPlatesShown = true;
});

const PLAYER: CombatPlayerPaneVM = {
    name: 'You', hp: 30, maxHp: 30, hpPct: 1, classLine: '', effects: [], pendingDot: 0,
} as unknown as CombatPlayerPaneVM;

const foe = (artKey: string): CombatEnemyPaneVM => ({
    name: 'A Foe', hp: 20, maxHp: 20, hpPct: 1, isBoss: false, artKey, artNonce: 1,
    effects: [], pendingDot: 0, isLethalInFlight: false, roundsToKill: 0,
    intent: { type: 'attack', label: 'strikes', damage: 3 },
} as unknown as CombatEnemyPaneVM);

function renderPane(artKey: string): RenderResult {
    const { tree } = withAllProviders(
        <CombatCombatantPane enemy={foe(artKey)} player={PLAYER} region="the Breakwater" />,
    );
    return render(tree);
}

/** Every framed foe has an entry, whichever way its still was keyed. */
const FRAMED = Object.keys(ENEMY_FRAME_SETS);

describe('the backing registry', () => {
    it('has a foe to check', () => {
        expect(FRAMED.length).toBeGreaterThanOrEqual(17);
    });

    it.each(FRAMED)('%s has one backing per cell', (key) => {
        expect(getEnemyBacking(key)).toBe(ENEMY_BACKINGS[key]);
        expect(getEnemyBacking(key)).toHaveLength(ENEMY_FRAME_SETS[key].frames.length);
    });

    it('answers null for a key with none, including an inherited property name', () => {
        expect(getEnemyBacking('no-such-enemy')).toBeNull();
        expect(getEnemyBacking('constructor')).toBeNull();
        expect(getEnemyBacking(null)).toBeNull();
    });
});

/** The backing the frame player draws under the cell on screen. */
const shownBacking = (view: RenderResult) =>
    view.getByTestId(/^combat-enemy-frames-backing-\d+$/);

describe('the pane draws the backing', () => {
    it.each(['death-beholder', 'green-jelly', 'gallows-crow'])('%s stands on the backing of the cell it shows', (key) => {
        const view = renderPane(key);
        const figure = within(view.getByTestId('combat-enemy-figure'));
        const backing = figure.getByTestId(/^combat-enemy-frames-backing-\d+$/);
        const shown = Number(String(backing.props.testID).split('-').pop());
        const set = ENEMY_FRAME_SETS[key];
        const cell = sheetIndexFor(set.manifest, set.manifest.clips.idle, shown);
        expect(backing.props.source).toEqual([ENEMY_BACKINGS[key][cell]]);
        expect(backing.props.tintColor).toBeTruthy();
    });

    it('rides in the wrappers that breathe and lunge', () => {
        const view = renderPane('float-eye');
        const lunge = within(view.getByTestId('combat-enemy-lunge'));
        expect(within(lunge.getByTestId('combat-enemy-figure')).getByTestId(/^combat-enemy-frames-backing-\d+$/)).toBeTruthy();
    });

    it.each(['float-eye', 'green-jelly'])('%s: the backing is drawn by the frame player, under its own cell', (key) => {
        const view = renderPane(key);
        const box = view.getByTestId('combat-enemy-figure-box');
        const frames = within(box).getByTestId('combat-enemy-frames');
        expect(within(frames).getByTestId(/^combat-enemy-frames-backing-\d+$/)).toBeTruthy();
        // No separate one-per-foe matte beside the player any more.
        expect(within(box).queryByTestId('combat-enemy-backing')).toBeNull();
        expect(shownBacking(view)).toBeTruthy();
    });

    it('the black scene draws no backing, and the figure keeps its box', () => {
        mockPlatesShown = false;
        const view = renderPane('float-eye');
        expect(view.queryByTestId(/^combat-enemy-frames-backing-\d+$/)).toBeNull();
        expect(within(view.getByTestId('combat-enemy-figure-box')).getByTestId('combat-enemy-frames')).toBeTruthy();
    });

    it('the round figure plate is gone', () => {
        expect(renderPane('float-eye').queryByTestId('combat-enemy-figure-plate')).toBeNull();
    });

    it('a foe with no backing still renders', () => {
        const view = renderPane('no-such-enemy');
        expect(view.queryByTestId('combat-enemy-backing')).toBeNull();
        expect(view.getByTestId('combat-enemy-figure-box')).toBeTruthy();
    });
});

describe('a cell is placed by its anchor kind', () => {
    it('a standing foe is pinned at the feet and a floater is centred', () => {
        const kinds = FRAMED.map((key) => ENEMY_FRAME_SETS[key].manifest);
        for (const manifest of kinds) {
            expect(cellContentPosition(manifest)).toBe(manifest.anchor.kind === 'foot-line' ? 'bottom center' : 'center');
        }
        expect(kinds.map((m) => m.anchor.kind)).toContain('foot-line');
        expect(kinds.map((m) => m.anchor.kind)).toContain('centre');
    });
});
