/**
 * PF2a (A1): the combat board's static layers and every die carry the texture-cache
 * props, so a drag re-composites them instead of re-rasterising the SVG.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { CombatDie } from '@/components/combat/encounter/CombatDie';
import { SeamFog } from '@/components/combat/encounter/SeamFog';
import { RASTER_LAYER } from '@/components/combat/encounter/rasterLayer';
import type { CombatDieVM } from '@/state/presenters/combat-encounter.engine';

const DIE: CombatDieVM = {
    id: 'd-heart', color: 'heart', colorHex: '#c23b3b', glyph: '♥', stanceLabel: 'Heart',
    spent: false, isX: false, draggable: true,
};

describe('RASTER_LAYER (PF2a)', () => {
    it('names both platforms', () => {
        expect(RASTER_LAYER.renderToHardwareTextureAndroid).toBe(true);
        expect(RASTER_LAYER.shouldRasterizeIOS).toBe(true);
    });

    it('a CombatDie is texture-cached', () => {
        render(<CombatDie die={DIE} />);
        const el = screen.getByTestId(`combat-die-${DIE.id}`);
        expect(el.props.renderToHardwareTextureAndroid).toBe(true);
        expect(el.props.shouldRasterizeIOS).toBe(true);
    });

    it('the seam fog is texture-cached', () => {
        render(<SeamFog />);
        const el = screen.getByTestId('combat-seam-fog');
        expect(el.props.renderToHardwareTextureAndroid).toBe(true);
        expect(el.props.shouldRasterizeIOS).toBe(true);
    });
});
