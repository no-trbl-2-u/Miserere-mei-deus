import React from 'react';
import { render } from '@testing-library/react-native';

import { BRASS, type BrassPiece } from '@/assets/images/experience/brass';
import { KitBackdrop, KitHeader } from '../KitBackdrop';

const imagesIn = (piece: BrassPiece): number => {
    const { UNSAFE_root } = render(<KitBackdrop piece={piece} />);
    return UNSAFE_root.findAll((n: { props: { source?: unknown }; type: unknown }) => n.props.source === BRASS[piece].source && typeof n.type !== 'string').length;
};

describe('the Brass Gothic kit', () => {
    it('holds the 65 brass pieces and no vellum one', () => {
        const pieces = Object.keys(BRASS);
        expect(pieces).toHaveLength(65);
        expect(pieces.filter((p) => p.includes('vellum') || p.includes('-ink'))).toEqual([]);
    });

    it('draws a growing piece from more images than a fixed one', () => {
        expect(imagesIn('nav-dock-dark')).toBeGreaterThan(imagesIn('nav-tab-idle'));
    });

    it('keeps a section heading as a header for a screen reader', () => {
        const { getByRole } = render(<KitHeader>POOLS</KitHeader>);
        expect(getByRole('header')).toBeTruthy();
    });
});
