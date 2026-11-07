import React from 'react';
import { render } from '@testing-library/react-native';

import { KIT, type KitPiece } from '@/assets/images/experience/kit';
import { KitBackdrop, KitHeader } from '../KitBackdrop';

const imagesIn = (piece: KitPiece): number => {
    const { UNSAFE_root } = render(<KitBackdrop piece={piece} />);
    return UNSAFE_root.findAll((n: { props: { source?: unknown }; type: unknown }) => n.props.source === KIT[piece].source && typeof n.type !== 'string').length;
};

const drawsIn = (node: React.ReactElement, piece: KitPiece): boolean => {
    const { UNSAFE_root } = render(node);
    return UNSAFE_root.findAll((n: { props: { source?: unknown } }) => n.props.source === KIT[piece].source).length > 0;
};

describe('the experience kit', () => {
    it('holds the 36 brass and 12 vellum pieces T\'s picks name', () => {
        const pieces = Object.keys(KIT);
        expect(pieces).toHaveLength(48);
        const vellum = pieces.filter((p) => p.includes('vellum') || p.includes('-ink'));
        expect(vellum).toHaveLength(12);
        expect(pieces.length - vellum.length).toBe(36);
    });

    it('draws a growing piece from more images than a fixed one', () => {
        expect(imagesIn('nav-dock-dark')).toBeGreaterThan(imagesIn('divider-short-brass'));
    });

    it('nine-slices every piece that backs a box whose size varies (a stretched tile smears its ornament)', () => {
        for (const piece of ['stat-tile', 'equipment-slot-dark', 'equipment-slot-selected', 'combat-vitae-track', 'character-portrait-frame', 'level-badge-dark'] as KitPiece[]) {
            expect(imagesIn(piece)).toBe(9);
        }
    });

    it('keeps a section heading as a header for a screen reader', () => {
        const { getByRole } = render(<KitHeader>POOLS</KitHeader>);
        expect(getByRole('header')).toBeTruthy();
    });

    it('draws a brass plate behind a brass heading and a vellum one behind a vellum heading', () => {
        expect(drawsIn(<KitHeader>POOLS</KitHeader>, 'section-header-dark-star')).toBe(true);
        expect(drawsIn(<KitHeader look="vellum">POOLS</KitHeader>, 'section-header-vellum-star')).toBe(true);
        expect(drawsIn(<KitHeader look="vellum">POOLS</KitHeader>, 'section-header-dark-star')).toBe(false);
        expect(drawsIn(<KitHeader look="vellum" variant="quatrefoil">POOLS</KitHeader>, 'section-header-vellum-leaf')).toBe(true);
        expect(drawsIn(<KitHeader variant="quatrefoil">POOLS</KitHeader>, 'section-header-dark-quatrefoil')).toBe(true);
    });
});
