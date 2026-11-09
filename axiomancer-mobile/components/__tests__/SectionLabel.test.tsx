/**
 * Hermetic component tests — SectionLabel (UI primitive that
 * renders all-caps tracked text for section headings, eyebrows,
 * and tab labels). Single render branch with three overridable
 * props (color, size, style); tests pin the defaults plus each
 * override individually.
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { SectionLabel } from '@/components/SectionLabel';
import { AXM, TYPE_ROLES } from '@/theme/axm';

function flattenStyle(node: { props: { style?: unknown } }): Record<string, unknown> {
    const raw = node.props.style;
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.reduce<Record<string, unknown>>((acc, entry) => {
        if (entry && typeof entry === 'object') Object.assign(acc, entry);
        return acc;
    }, {});
}

describe('SectionLabel: children + defaults', () => {
    it('renders the children verbatim', () => {
        const tree = render(<SectionLabel>HELLO</SectionLabel>);
        expect(tree.queryByText('HELLO')).not.toBeNull();
    });

    it('renders the default color (AXM.parchment) when no color prop is passed', () => {
        const tree = render(<SectionLabel>X</SectionLabel>);
        const node = tree.UNSAFE_getAllByType(Text)[0];
        expect(flattenStyle(node).color).toBe(AXM.parchment);
    });

    it('renders the default font size of 11 when no size prop is passed', () => {
        const tree = render(<SectionLabel>X</SectionLabel>);
        const node = tree.UNSAFE_getAllByType(Text)[0];
        expect(flattenStyle(node).fontSize).toBe(11);
    });

    it('always applies the base typographic invariants (uppercase, the eyebrow face and its tracking)', () => {
        const tree = render(<SectionLabel>X</SectionLabel>);
        const node = tree.UNSAFE_getAllByType(Text)[0];
        const style = flattenStyle(node);
        expect(style.textTransform).toBe('uppercase');
        expect(style.letterSpacing).toBe(TYPE_ROLES.eyebrow.letterSpacing);
        expect(style.fontFamily).toBe(TYPE_ROLES.eyebrow.fontFamily);
    });
});

describe('SectionLabel: prop overrides', () => {
    it('honors a custom color', () => {
        const tree = render(<SectionLabel color={AXM.sulfur}>X</SectionLabel>);
        const node = tree.UNSAFE_getAllByType(Text)[0];
        expect(flattenStyle(node).color).toBe(AXM.sulfur);
    });

    it('honors a custom size', () => {
        const tree = render(<SectionLabel size={9}>X</SectionLabel>);
        const node = tree.UNSAFE_getAllByType(Text)[0];
        expect(flattenStyle(node).fontSize).toBe(9);
    });

    it('honors caller-supplied style (e.g. marginTop)', () => {
        const tree = render(<SectionLabel style={{ marginTop: 4 }}>X</SectionLabel>);
        const node = tree.UNSAFE_getAllByType(Text)[0];
        expect(flattenStyle(node).marginTop).toBe(4);
    });

    it('caller style overrides override base style for matching keys (later-in-array wins)', () => {
        // The Text array is [base, { color, fontSize }, style]; caller
        // style sits at the end, so opting in to a different color via
        // `style={{ color: '#ff0000' }}` wins over the resolved color
        // prop. Pin the contract so future refactors don't surprise.
        const tree = render(<SectionLabel color={AXM.sulfur} style={{ color: '#ff0000' }}>X</SectionLabel>);
        const node = tree.UNSAFE_getAllByType(Text)[0];
        expect(flattenStyle(node).color).toBe('#ff0000');
    });
});
