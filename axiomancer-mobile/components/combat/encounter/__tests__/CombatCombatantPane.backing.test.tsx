/**
 * Phase AP1d - THE FOE STANDS ON A BACKING CUT FROM ITS OWN CELLS.
 *
 * The pane's half of the backing law. `scripts/enemy-backings.test.mjs` proves
 * every matte exists and covers its foe; this proves the pane draws it: under
 * the figure, inside the wrappers that breathe and lunge, in the theme's ground
 * colour, in the same box and at the same position as the cells, only while
 * plates are shown, and that the round figure plate it replaced is gone.
 */
import React from 'react';
import { render, within, type RenderResult } from '@testing-library/react-native';

import { CombatCombatantPane } from '@/components/combat/encounter/CombatCombatantPane';
import { ENEMY_BACKINGS, ENEMY_FRAME_SETS, getEnemyBacking } from '@/assets/images/enemies';
import { cellContentPosition } from '@/components/combat/frames';
import type { CombatEnemyPaneVM, CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

// The flag's real value is another chunk's to flip, so both states are set here.
let mockPlatesShown = true;
jest.mock('@/assets/images/combat', () => ({
    ...jest.requireActual('@/assets/images/combat'),
    get ARENA_PLATES_SHOWN() {
        return mockPlatesShown;
    },
}));

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

    it.each(FRAMED)('%s has a backing', (key) => {
        expect(getEnemyBacking(key)).toBe(ENEMY_BACKINGS[key]);
        expect(getEnemyBacking(key)).not.toBeNull();
    });

    it('answers null for a key with none, including an inherited property name', () => {
        expect(getEnemyBacking('no-such-enemy')).toBeNull();
        expect(getEnemyBacking('constructor')).toBeNull();
        expect(getEnemyBacking(null)).toBeNull();
    });
});

describe('the pane draws the backing', () => {
    it.each(['death-beholder', 'green-jelly', 'gallows-crow'])('%s stands on its matte', (key) => {
        const view = renderPane(key);
        const figure = within(view.getByTestId('combat-enemy-figure'));
        const backing = figure.getByTestId('combat-enemy-backing');
        expect(backing.props.source).toEqual([ENEMY_BACKINGS[key]]);
        expect(backing.props.tintColor).toBeTruthy();
    });

    it('rides in the wrappers that breathe and lunge', () => {
        const view = renderPane('float-eye');
        const lunge = within(view.getByTestId('combat-enemy-lunge'));
        expect(within(lunge.getByTestId('combat-enemy-figure')).getByTestId('combat-enemy-backing')).toBeTruthy();
    });

    it.each(['float-eye', 'green-jelly'])('%s: backing is under the figure, in one box, placed as the cells are', (key) => {
        const view = renderPane(key);
        const box = view.getByTestId('combat-enemy-figure-box');
        const backing = within(box).getByTestId('combat-enemy-backing');
        const frames = within(box).getByTestId('combat-enemy-frames');
        // A cell as drawn: the host image, with its props as they reach the native side.
        const [drawn] = frames.findAll((n: { type: unknown; props: Record<string, unknown> }) => typeof n.type === 'string' && n.props.contentFit !== undefined);
        expect(drawn).toBeDefined();
        expect(backing.props.contentFit).toBe(drawn.props.contentFit);
        expect(backing.props.contentPosition).toEqual(drawn.props.contentPosition);
        // Later siblings paint on top: the matte must come first.
        const painted = (box.children as unknown as { props: { testID?: string } }[]).map((c) => c.props.testID);
        expect(painted).toEqual(['combat-enemy-backing', 'combat-enemy-frames']);
    });

    it('the black scene draws no matte, and the figure keeps its box', () => {
        mockPlatesShown = false;
        const view = renderPane('float-eye');
        expect(view.queryByTestId('combat-enemy-backing')).toBeNull();
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
