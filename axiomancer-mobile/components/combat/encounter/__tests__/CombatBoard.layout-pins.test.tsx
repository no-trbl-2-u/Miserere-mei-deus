/**
 * THE FIGHT'S LAYOUT PINS — every element of the board keeps the position and
 * size it has today, whatever art is drawn behind it.
 *
 * T's standing call on the fight's kit treatment, verbatim: "while yes, we're
 * swapping out these images, make sure the layout is maintained. (ie. keep
 * intent in the upper right and momentum in the bottom-middle center)". Only
 * the art behind an element changes; the boxes do not move.
 *
 * EVERY NUMBER BELOW IS A MEASUREMENT, NOT A PREFERENCE. Each was read off the
 * rendered board before any art went in, at the 390x844 viewport with the
 * phone's safe-area insets, and hard-coded here as a literal. They are pinned,
 * not derived, so a change of geometry fails here rather than passing because
 * the expectation moved with the code. The one exception is the handful of
 * exported constants, asserted by name so a rename cannot quietly slip past.
 *
 * Nothing here reads the baseline from disk at run time. The capture ran
 * outside the suite; the pins are literals.
 *
 * WHOEVER CHANGES THE FIGHT'S LAYOUT ON PURPOSE EDITS THIS FILE.
 *
 * 153.4 (UX1d) DID, KNOWINGLY, and these are the boxes it moved:
 *   - the dock's phase-ledger row is gone (T: off the board entirely), so its
 *     pin is now an absence;
 *   - END narrows 116 -> 84 (its height, 56, and its face are untouched);
 *   - the dock grows: paddingTop 8 -> 18 and paddingHorizontal 10 -> 26, so
 *     minHeight 106 -> 126 and paddingBottom 42 -> 52. The numbers are not
 *     taste: 18pt is what clears the brass frame's 17.4pt top rail and 26pt
 *     its 25.3pt end caps, so the art reads instead of running under the
 *     cells. The 32pt END gave up pays for the wider side padding, so the
 *     VITAE column is the width it was;
 *   - the reveal lost its kicker line, so the column's first child is now
 *     the foe's portrait (the reveal has no pin here; its test is below).
 * Re-measure, do not guess: render the board and read the boxes.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, act, fireEvent } from '@testing-library/react-native';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { rollEncounterDice } from '@mechanics';
import { CombatBoard, SIG_CONVICTION_CHIP_H, SIG_RUNE_SIZE, SIG_COLUMN_GAP, type DragController } from '@/components/combat/encounter/CombatBoard';
import {
    DOCK_ROW_H, DOCK_PAD_V, DOCK_PAD_H, DOCK_GAP, END_BTN_W, END_BTN_H,
    VITAE_BAR_H, DOCK_VITAE_MAX_WIDTH, dockMinHeight,
} from '@/components/combat/encounter/CombatFooterDock';
import { KIT, type KitPiece } from '@/assets/images/experience/kit';
import { KitBackdrop, ornamentInsets } from '@/components/experience/KitBackdrop';
import { CombatEncounterPanel } from '@/components/combat/encounter/CombatEncounterPanel';
import { LOOKS } from '@/components/experience/looks';
import { buildCombatViewModel, type CombatViewModel } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';

const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
/** The viewport the pins were measured at, and the phone's own insets. */
const PHONE = { width: 390, height: 844, scale: 3, fontScale: 1 };
const INSETS = { top: 47, bottom: 34, left: 0, right: 0 };

// `useWindowDimensions` is read off the module object at call time, so
// overriding the export pins the board to the phone viewport without mocking
// the whole of react-native (the same pin the other board suites use).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native') as Record<string, unknown>;
const realUseWindowDimensions = RN.useWindowDimensions;
beforeAll(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: () => PHONE });
});
afterAll(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: realUseWindowDimensions });
});

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

/**
 * A foe whose intent is an ordinary telegraphed hit, so the badge draws its
 * small ring and damage pill. The fixture's own foe telegraphs its phases,
 * which draws the larger disc instead and never the badge T placed upper
 * right. Its colour is the fixture's, so no palette value is invented here.
 */
const withPlainIntent = (vm: CombatViewModel): CombatViewModel => ({
    ...vm,
    enemy: { ...vm.enemy, intent: { ...vm.enemy.intent, type: 'damage', damage: 10 } },
});

function renderBoard(shape: (vm: CombatViewModel) => CombatViewModel = (v) => v): CombatViewModel {
    const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, {
        player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 129, maxHealth: 200 },
        seed: 16,
    });
    const vm = shape(buildCombatViewModel(rollEncounterDice(combat).state));
    const { tree } = withAllProviders(
        <SafeAreaInsetsContext.Provider value={INSETS}>
            <CombatBoard
                vm={vm} drag={noopDrag()} stagedUids={[]}
                onApply={jest.fn()} onStage={jest.fn()} onUnstage={jest.fn()} onDiscard={jest.fn()}
                onSignature={jest.fn()} onEndPhase={jest.fn()} onInspect={jest.fn()}
            />
        </SafeAreaInsetsContext.Provider>,
        { store },
    );
    render(tree);
    return vm;
}

const flat = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>;

/** Assert a box's every pinned key, and say which element missed. */
function pin(testID: string, box: Record<string, unknown>) {
    const got = flat(testID);
    for (const [key, want] of Object.entries(box)) {
        expect({ el: testID, key, value: got[key] }).toEqual({ el: testID, key, value: want });
    }
}

// ── The places that wear brass: art swapped, boxes held ───────────────────

describe('UK1c — a brass place keeps the box it has today', () => {
    it('the enemy intent badge stays a 36pt disc in the upper right', () => {
        renderBoard(withPlainIntent);
        // The badge's own ring. 36, not the 44 the reference build grew it to:
        // the disc is the element T named when he asked for intent to stay put.
        pin('combat-intent-ring', { width: 36, height: 36, borderRadius: 18, borderWidth: 2 });
        pin('combat-intent', { alignItems: 'center' });
        // The swap really happened: the drawn ring and its tint are cleared so
        // the kit's ring is what shows, while the 2pt width above still holds
        // the box at 36. Clearing the colour without the width would shrink it.
        pin('combat-intent-ring', { borderColor: 'transparent', backgroundColor: 'transparent' });
        // The block the badge sits in, and the HUD that positions it: the
        // badge is in the upper right because of these, so they are pinned too.
        pin('combat-hud-intent', { alignItems: 'flex-start', gap: 6, flexShrink: 1 });
        pin('combat-hud', { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 12, paddingTop: 55 });
    });

    it('the conviction chip keeps its padding, so the rune column below it does not move', () => {
        renderBoard();
        pin('combat-conviction', { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 });
        // The chip's height is a published constant the rune column's anchor is
        // computed from; it is the chip's padding and border that make it true.
        expect(SIG_CONVICTION_CHIP_H).toBe(38);
        expect(2 * 1 + 2 * 3 + 18 + 1 + 11).toBe(SIG_CONVICTION_CHIP_H);
        pin('combat-signature-bar', { position: 'absolute', left: 6, alignItems: 'center', gap: 6, zIndex: 30 });
        expect(SIG_RUNE_SIZE).toBe(44);
        expect(SIG_COLUMN_GAP).toBe(6);
    });

    it('the player dock keeps its three cells in order', () => {
        renderBoard();
        pin('combat-rail', {
            flexDirection: 'row', alignItems: 'center',
            gap: 10, paddingHorizontal: 26, paddingTop: 18,
            // The bottom inset plus the dock's own padding.
            paddingBottom: 52, minHeight: 126,
        });
        pin('combat-rail-vitae-col', { flex: 1, minWidth: 0, maxWidth: 360, gap: 4 });
        pin('combat-piles', { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 });
        // The phase ledger's row is gone, with its marks and gloss target.
        expect(screen.queryByTestId('combat-ledger')).toBeNull();
        // The dock's exported geometry, by name (153.4 moved the padding and
        // END's width, see the header).
        expect([DOCK_ROW_H, DOCK_PAD_V, DOCK_PAD_H, DOCK_GAP]).toEqual([56, 18, 26, 10]);
        expect([END_BTN_W, END_BTN_H, DOCK_VITAE_MAX_WIDTH]).toEqual([84, 56, 360]);
        expect(dockMinHeight(INSETS.bottom)).toBe(126);
        // The dock's drawn fill and top rule are cleared for the frame, but the
        // rule's WIDTH stays: it counts toward the dock's height.
        pin('combat-rail', { backgroundColor: 'transparent', borderTopColor: 'transparent', borderTopWidth: 1 });
    });

    it('the player VITAE bar stays 8pt tall and its fill still spans the live share', () => {
        const vm = renderBoard();
        pin('combat-rail-vitae-bar', { height: 8, borderRadius: 4, overflow: 'hidden', borderWidth: 1 });
        expect(VITAE_BAR_H).toBe(8);
        // The fill is a percentage of the track, so the art rides the value
        // rather than replacing it.
        const fill = flat('combat-rail-vitae-fill');
        expect(fill.height).toBe('100%');
        expect(fill.width).toBe(`${Math.round((vm.player.hp / vm.player.maxHp) * 100)}%`);
    });
});

// ── The places T kept plain: today's code path, untouched ─────────────────

describe('UK1c — a place T kept plain is not re-skinned', () => {
    it('the momentum chip stays in the bottom-middle centre at its own size', () => {
        renderBoard();
        // The other element T named by hand. `alignSelf: center` IS the
        // "bottom-middle center" he asked to keep.
        pin('combat-momentum-v2', {
            alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
            gap: 5, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 2,
        });
    });

    it('END keeps its drawn button, borders and all', () => {
        renderBoard();
        pin('combat-end-wrap', { width: 84, height: 56, marginLeft: 'auto' });
        // Still a drawn button: a kit plate would have cleared these.
        const end = flat('combat-end-phase');
        expect(end).toMatchObject({ width: 84, height: 56, borderRadius: 10, borderWidth: 2.5 });
        expect(end.backgroundColor).toBeTruthy();
        expect(end.borderColor).not.toBe('transparent');
    });

    it('the player portrait ring keeps its 48pt box', () => {
        renderBoard();
        pin('combat-player-medallion', { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' });
    });

    it('the look table is what decides this, place by place', () => {
        // The pins above are only meaningful while these are the looks on
        // record: a component never hard-codes one.
        expect([LOOKS['S-01'], LOOKS['S-03'], LOOKS['S-04'], LOOKS['S-06'], LOOKS['S-09']])
            .toEqual(['brass', 'brass', 'brass', 'brass', 'brass']);
        expect([LOOKS['S-02'], LOOKS['S-05'], LOOKS['S-07'], LOOKS['S-08']])
            .toEqual(['normal', 'normal', 'normal', 'normal']);
    });
});

// ── No card changes, in any look ──────────────────────────────────────────

describe('UK1c — no kit piece goes on a card in combat', () => {
    it('the board still clips at its own edge and the hand keeps its band', () => {
        renderBoard();
        pin('combat-board', { flex: 1, overflow: 'hidden' });
        const fan = flat('combat-hand');
        expect(fan.paddingLeft).toBeUndefined();
        expect(fan.paddingRight).toBeUndefined();
    });

    it('no card in hand draws a kit image', () => {
        renderBoard();
        // The hand holds the cards and nothing else, so its whole subtree is
        // the thing to search. `KIT` holds every converted piece's `source`: a
        // card wearing one would carry it on an image in here.
        const sources = new Set<unknown>(Object.values(KIT).map((p) => p.source));
        expect(screen.getAllByTestId('combat-card-face-name').length).toBeGreaterThan(0);
        const drawn = screen.getByTestId('combat-hand')
            .findAll(() => true)
            .map((node: { props?: { source?: unknown } }) => node.props?.source)
            .filter((src: unknown) => src !== undefined && sources.has(src));
        expect(drawn).toEqual([]);
    });
});

// ── The kit's pieces: each place draws its own, and fits its box ──────────

/** Every kit piece drawn anywhere under `node`, by key, found by image source. */
function piecesUnder(node: { findAll: (p: () => boolean) => Array<{ props?: { source?: unknown } }> }): KitPiece[] {
    const byKey = new Map<unknown, KitPiece>((Object.keys(KIT) as KitPiece[]).map((k) => [KIT[k].source, k]));
    const out = new Set<KitPiece>();
    for (const n of node.findAll(() => true)) {
        const piece = byKey.get(n.props?.source);
        if (piece) out.add(piece);
    }
    return [...out];
}

const withDamage = (damage: number) => (vm: CombatViewModel): CombatViewModel => ({
    ...vm,
    enemy: { ...vm.enemy, intent: { ...vm.enemy.intent, type: damage > 0 ? 'damage' : 'defend', damage, debuffs: false, branch: undefined } },
});

describe('UK1c — the intent ring says what kind of threat it is (T, spec 152 question 4)', () => {
    it('an attack wears the oxblood ring', () => {
        renderBoard(withDamage(10));
        const drawn = piecesUnder(screen.getByTestId('combat-intent-ring'));
        expect(drawn).toContain('combat-intent-oxblood');
        expect(drawn).not.toContain('combat-intent-brass');
    });

    it('anything that deals no damage wears the brass ring', () => {
        renderBoard(withDamage(0));
        const drawn = piecesUnder(screen.getByTestId('combat-intent-ring'));
        expect(drawn).toContain('combat-intent-brass');
        expect(drawn).not.toContain('combat-intent-oxblood');
    });
});

describe('UK1c — every brass place draws its piece', () => {
    it('the board: dock frame, VITAE track and both fills, conviction plate, damage pill', () => {
        renderBoard(withDamage(10));
        expect(piecesUnder(screen.getByTestId('combat-rail'))).toEqual(expect.arrayContaining(['nav-dock-dark']));
        expect(piecesUnder(screen.getByTestId('combat-rail-vitae-bar'))).toEqual(expect.arrayContaining(['combat-player-track']));
        // The fill is the heal fill at this VITAE (129 of 200).
        expect(piecesUnder(screen.getByTestId('combat-rail-vitae-fill'))).toEqual(['combat-player-fill']);
        expect(piecesUnder(screen.getByTestId('combat-conviction'))).toEqual(['combat-badge']);
        expect(piecesUnder(screen.getByTestId('combat-intent'))).toEqual(expect.arrayContaining(['combat-badge']));
    });

    it('the reveal: the commit takes the struck button and the retreat the plain one', () => {
        const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
            player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
        });
        const { tree } = withAllProviders(
            <CombatEncounterPanel enemy={enemy} bootstrapPlayer={store.getState().player} deck={CARDS} seed={7} onExit={() => undefined} onWithdraw={() => undefined} />,
            { store },
        );
        render(tree);
        expect(piecesUnder(screen.getByTestId('combat-enter'))).toEqual(['action-button-selected']);
        expect(piecesUnder(screen.getByTestId('combat-withdraw'))).toEqual(['action-button-idle']);
        // 153.4: the reveal prints no kicker line above the foe.
        expect(screen.queryByTestId('combat-reveal-eyebrow')).toBeNull();
        expect(screen.queryByText(/A FOE|THE WAY ENDS|CHAMPION HOLDS/)).toBeNull();
        act(() => { fireEvent.press(screen.getByTestId('combat-enter')); });
    });
});

/** The padding a host view gives one side, as the layout engine reads it. */
function padding(style: Record<string, unknown>, side: 'Top' | 'Right' | 'Bottom' | 'Left'): number {
    const axis = side === 'Top' || side === 'Bottom' ? 'paddingVertical' : 'paddingHorizontal';
    return (style[`padding${side}`] ?? style[axis] ?? style.padding ?? 0) as number;
}

describe('UK1c — a piece\'s unstretched ornaments fit inside the padding of the box behind it', () => {
    // The rule, not the slice literals: the corners a nine-slice keeps
    // (`ornamentInsets`) must sit inside the host's padding, or the art runs
    // under the content. Slice tuples are retuned with the art; this holds.
    const hostOf = (node: { parent: unknown }) => {
        let cur = node.parent as { type: unknown; props: { style?: unknown }; parent: unknown } | null;
        while (cur && typeof cur.type !== 'string') cur = cur.parent as typeof cur | null;
        return cur;
    };

    function checkEvery(): number {
        let checked = 0;
        const backdrops = screen.UNSAFE_root.findAll((n) => n.type === KitBackdrop);
        for (const b of backdrops) {
            const piece = b.props.piece as KitPiece;
            const host = hostOf(b);
            expect(host).toBeTruthy();
            const style = StyleSheet.flatten(host!.props.style as never) as Record<string, unknown>;
            const inset = ornamentInsets(piece, b.props.scale as number | undefined);
            for (const [side, key] of [['top', 'Top'], ['right', 'Right'], ['bottom', 'Bottom'], ['left', 'Left']] as const) {
                const room = padding(style, key);
                expect({ piece, side, fits: inset[side] <= room + 1e-6, inset: inset[side], room })
                    .toMatchObject({ piece, side, fits: true });
            }
            checked += 1;
        }
        return checked;
    }

    it('on the board', () => {
        renderBoard(withDamage(10));
        // dock, VITAE track, conviction plate, damage pill (the fill is a bare image).
        expect(checkEvery()).toBeGreaterThanOrEqual(4);
    });

    it('on the reveal', () => {
        const { store, enemy } = startRealFight(REAL_FIGHT_FIXTURE, {
            player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 160, maxHealth: 160 },
        });
        const { tree } = withAllProviders(
            <CombatEncounterPanel enemy={enemy} bootstrapPlayer={store.getState().player} deck={CARDS} seed={7} onExit={() => undefined} onWithdraw={() => undefined} />,
            { store },
        );
        render(tree);
        expect(checkEvery()).toBe(2);
    });

    it('catches a piece whose ornaments are wider than the padding (the nav-dock-dark defect)', () => {
        // The dock frame's end caps are 25.3pt; the old 10pt side padding is
        // the violation this rule exists to catch.
        expect(ornamentInsets('nav-dock-dark').left).toBeGreaterThan(10);
        expect(ornamentInsets('nav-dock-dark').left).toBeLessThanOrEqual(DOCK_PAD_H);
    });
});
