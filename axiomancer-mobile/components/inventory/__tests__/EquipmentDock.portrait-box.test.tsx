/**
 * Hermetic component test — the equipment dock's column split at both viewports.
 *
 * The portrait sources are square, so a tall `fit="contain"` bust would
 * letterbox the pilgrim into dead black. The bust box is therefore always
 * square. At phone width the slot column takes about 55% of the dock's inner
 * width and the bust takes the rest, so it has room to breathe; above 900 pt
 * the bust is a fixed 300 pt square and the slot column flexes to fit.
 */

import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import {
    EquipmentDock,
    equipmentDockPortraitBox,
    equipmentDockSlotColumnWidth,
} from '../EquipmentDock';
import type { EquipmentDockViewModel } from '@/state/presenters/inventory.engine';
import { withAllProviders } from '@/test-utils/withAllProviders';

const PHONE = { width: 360, height: 640, scale: 3, fontScale: 1 };
const DESKTOP = { width: 1280, height: 800, scale: 1, fontScale: 1 };

/** The dock's inner width at a viewport: the margin, border and padding come off both sides. */
const innerWidth = (viewport: number): number => viewport - 44;

// The bust is the thing under test, so stand in for it with a host view that
// records the width/height/fit it was handed.
jest.mock('@/components/art/PlayerPortraitImage', () => ({
    PlayerPortraitImage: (props: { width?: unknown; height?: unknown; fit?: string }) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const R = require('react');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { View } = require('react-native');
        return R.createElement(View, { testID: 'dock-portrait-image', portraitProps: props });
    },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RN = require('react-native') as Record<string, unknown>;
const realUseWindowDimensions = RN.useWindowDimensions;
let viewport = PHONE;
beforeAll(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: () => viewport });
});
afterAll(() => {
    Object.defineProperty(RN, 'useWindowDimensions', { configurable: true, value: realUseWindowDimensions });
});

function makeVm(): EquipmentDockViewModel {
    return {
        slots: [
            { id: 'weapon', key: 'weapon', label: 'WEAPON', item: { id: 'w', name: 'Fixture Weapon', sub: 'Weapon', grantsSignature: null } },
            { id: 'armor', key: 'armor', label: 'ARMOR', item: { id: 'a', name: 'Fixture Armor', sub: 'Armor', grantsSignature: null } },
            { id: 'relic-0', key: 'relic', relicIndex: 0, label: 'RELIC I', item: null },
            { id: 'relic-1', key: 'relic', relicIndex: 1, label: 'RELIC II', item: null },
            { id: 'relic-2', key: 'relic', relicIndex: 2, label: 'RELIC III', item: null },
        ],
        headerLabel: '✠ WORN UPON THE BODY',
        hintLabel: 'CHOOSE A SLOT TO SEE WHAT ELSE FITS',
        bareLabel: '— bare —',
        selectedRow: null,
        bannerEyebrow: 'FITTING SLOT',
        bannerSlotLabel: '',
        bannerClearLabel: 'CLEAR ✕',
    };
}

/** Mounts the dock at `size` and reports the laid-out column widths and the bust's height. */
function mountDock(size: typeof PHONE): {
    portraitWidth: unknown;
    imageHeight: unknown;
    slotsWidth: unknown;
    slotsFlex: unknown;
} {
    viewport = size;
    const { tree } = withAllProviders(
        <EquipmentDock vm={makeVm()} selectedRow={null} onSelectRow={() => {}} />,
    );
    const screen = render(tree);
    const portrait = StyleSheet.flatten(screen.getByTestId('equipment-dock-portrait').props.style);
    const slots = StyleSheet.flatten(screen.getByTestId('equipment-dock-slots').props.style);
    const image = screen.getByTestId('dock-portrait-image').props.portraitProps;
    return {
        portraitWidth: portrait.width,
        imageHeight: image.height,
        slotsWidth: slots.width,
        slotsFlex: slots.flex,
    };
}

describe('equipmentDockPortraitBox: the bust is never letterboxed', () => {
    it('returns a square box at every viewport width', () => {
        for (const width of [320, 360, 375, 414, 768, 900, 1024, 1280, 1920]) {
            const box = equipmentDockPortraitBox(width);
            expect(box.height).toBe(box.width);
        }
    });

    it('is a fixed 300 pt square above the wide threshold', () => {
        expect(equipmentDockPortraitBox(900).width).toBe(300);
        expect(equipmentDockPortraitBox(1280).width).toBe(300);
        expect(equipmentDockSlotColumnWidth(900)).toBeNull();
        expect(equipmentDockSlotColumnWidth(1280)).toBeNull();
    });
});

describe('the slot column is no wider than about 55% of the dock at phone width', () => {
    it('takes at most 55% of the inner width at 360 pt', () => {
        const column = equipmentDockSlotColumnWidth(360)!;
        expect(column).toBeLessThanOrEqual(Math.ceil(innerWidth(360) * 0.55));
        expect(column).toBeGreaterThan(innerWidth(360) * 0.5);
    });

    it('leaves the bust the rest: wider than the old 112 pt gutter', () => {
        const box = equipmentDockPortraitBox(360);
        expect(box.width).toBeGreaterThan(112);
        // Column + gap + bust fills the inner width exactly.
        expect(equipmentDockSlotColumnWidth(360)! + 12 + box.width).toBe(innerWidth(360));
    });

    it('holds the 55% share across phone widths', () => {
        for (const width of [320, 360, 375, 414]) {
            const column = equipmentDockSlotColumnWidth(width)!;
            expect(column / innerWidth(width)).toBeCloseTo(0.55, 1);
        }
    });
});

describe('EquipmentDock: the layout the dock draws', () => {
    it('sets the slot column to its share and draws the bust in the rest on a phone', () => {
        const { portraitWidth, imageHeight, slotsWidth, slotsFlex } = mountDock(PHONE);

        expect(slotsWidth).toBe(equipmentDockSlotColumnWidth(PHONE.width));
        expect(slotsFlex).toBeUndefined();
        expect(portraitWidth).toBe(equipmentDockPortraitBox(PHONE.width).width);
        expect(imageHeight).toBe(portraitWidth);
        expect((slotsWidth as number) / innerWidth(PHONE.width)).toBeLessThanOrEqual(0.55 + 0.01);
    });

    it('is unchanged above 900 pt: a large bust and a flexing slot column', () => {
        const { portraitWidth, imageHeight, slotsWidth, slotsFlex } = mountDock(DESKTOP);

        expect(portraitWidth as number).toBeGreaterThanOrEqual(240);
        expect(imageHeight).toBe(portraitWidth);
        expect(slotsFlex).toBe(1);
        expect(slotsWidth).toBeUndefined();
    });
});
