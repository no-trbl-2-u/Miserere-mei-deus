/**
 * Hermetic component tests — AxmIcon + the icon registry.
 *
 * The registry is the single source of truth for the icon canon:
 * curated game-icons.net silhouettes, extracted from a local copy of the
 * library by `scripts/extract-game-icons.mjs` (the library is not in the
 * repository; the geometry is). Pins: every registered name
 * renders an Svg; every spec carries geometry, a label, and its
 * attribution source; the label override lands on the a11y tree; the
 * adapters' expected names all exist.
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { AxmIcon } from '@/components/icons';
import { AXM_ICON_NAMES, AXM_ICON_SPECS, isAxmIconName, type AxmIconName } from '@/components/icons';

describe('AxmIcon: every registered icon renders', () => {
    it.each(AXM_ICON_NAMES)('name="%s" produces non-null output', (name) => {
        const tree = render(<AxmIcon name={name} />);
        expect(tree.toJSON()).not.toBeNull();
    });
});

describe('AxmIcon: accessibility labels', () => {
    it('uses the registry label by default', () => {
        const tree = render(<AxmIcon name="action-sword" />);
        expect(tree.getByLabelText('Sword attack')).toBeTruthy();
    });

    it('honors a per-placement label override', () => {
        const tree = render(<AxmIcon name="action-eye" label="Exploration tab" />);
        expect(tree.getByLabelText('Exploration tab')).toBeTruthy();
    });
});

describe('icon registry: spec well-formedness', () => {
    it.each(AXM_ICON_NAMES)('name="%s" carries geometry, label and attribution', (name) => {
        const spec = AXM_ICON_SPECS[name];
        expect(spec.primitives.length).toBeGreaterThan(0);
        for (const p of spec.primitives) {
            expect(p.d.length).toBeGreaterThan(0);
        }
        expect(spec.label.length).toBeGreaterThan(0);
        // Attribution key: `<artist>/<icon>` on game-icons.net.
        expect(spec.source).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/);
        expect(spec.viewBox).toBe('0 0 512 512');
    });

    it('covers the action/effect vocabulary the adapters expect', () => {
        for (const kind of ['sword', 'shield', 'arcane', 'bag', 'flee', 'eye', 'crown', 'boss', 'chest', 'scroll', 'quill']) {
            expect(isAxmIconName(`action-${kind}`)).toBe(true);
        }
        for (const kind of ['poison', 'bleed', 'stun', 'regen', 'burn', 'buff', 'debuff', 'shield']) {
            expect(isAxmIconName(`effect-${kind}`)).toBe(true);
        }
        expect(isAxmIconName('not-a-mark')).toBe(false);
    });

    const MAP_MARKS: [AxmIconName, string][] = [
        ['action-elite', 'lorc/horned-helm'],
        ['action-door', 'delapouite/exit-door'],
        ['action-start', 'delapouite/windmill'],
        ['action-settings', 'lorc/cog'],
    ];
    it.each(MAP_MARKS)('the map mark %s draws the chosen silhouette, %s', (name, source) => {
        expect(isAxmIconName(name)).toBe(true);
        expect(AXM_ICON_SPECS[name].source).toBe(source);
    });
});
