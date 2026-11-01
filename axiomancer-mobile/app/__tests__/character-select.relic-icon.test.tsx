/**
 * CD1a (A2): the select screen draws the starting relic through the same
 * icon table the satchel reads (`getItemGlyph`), at 44 pt, and the screen
 * holds no hand-drawn `<Svg`.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CHARACTER_ROSTER, type CharacterDefinition } from '@mechanics';

import CharacterSelectScreen from '@/app/character-select/index';
import { AXM_ICON_SPECS } from '@/components/icons/icon-registry';
import { getItemGlyph } from '@/components/icons/item-glyphs';
import { createMemorySlotStore } from '@/state/persistence/memorySlotStore';
import { createAppStore } from '@/state/store';
import { mockFixedRng } from '@/test-utils/rng';
import { withAllProviders } from '@/test-utils/withAllProviders';

function def(id: string, relic: string): CharacterDefinition {
    return {
        id,
        name: id,
        portraitKey: 'bard',
        startingRelicId: relic,
        baseStats: { heart: 5, body: 5, mind: 5 },
        startingLaneIds: ['elementalist', 'lane-y'],
        startingCardIds: ['card-x', 'card-y', 'card-z'],
        playstyle: 'x',
    };
}

const FIXTURES: CharacterDefinition[] = [def('fx-knight', 'relic-bleeding-signet'), def('fx-bard', 'relic-disarming-plea')];
let mockRoster: CharacterDefinition[] = FIXTURES;
jest.mock('@/state/presenters/character-select.engine', () => ({
    ...(jest.requireActual('@/state/presenters/character-select.engine') as object),
    selectRoster: () => mockRoster,
}));

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({ slot: '2' }),
}));

beforeEach(() => { mockFixedRng(0.5); });
afterEach(() => { mockRoster = FIXTURES; });

/** The label of the icon drawn inside the relic box, with its size. */
function relicIcon(): { label: string | undefined; width: number } {
    const box = screen.getByTestId('character-select-relic');
    const svg = box.findAll((n: { props?: Record<string, unknown> }) => n.props?.accessibilityRole === 'image')[0];
    return { label: svg.props.accessibilityLabel, width: Number(svg.props.width) };
}

function labelOf(relicId: string): string {
    const glyph = getItemGlyph(relicId);
    return glyph === null ? 'Relic' : AXM_ICON_SPECS[glyph].label;
}

function mount() {
    const slots = createMemorySlotStore();
    const store = createAppStore({ adapter: slots });
    render(withAllProviders(<CharacterSelectScreen />, { store, slots }).tree);
}

describe('character select relic icon', () => {
    it('the Suppliant relic resolves to the engagement ring', () => {
        expect(getItemGlyph('relic-disarming-plea')).toBe('relic-engagement-ring');
    });

    it('draws the satchel icon for every roster character and fixture relic, at 44 pt', () => {
        const all = [...CHARACTER_ROSTER, ...FIXTURES];
        for (const character of all) {
            mockRoster = [character];
            mount();
            const icon = relicIcon();
            const glyph = getItemGlyph(character.startingRelicId);
            if (glyph !== null) expect(icon.label).toBe(AXM_ICON_SPECS[glyph].label);
            else expect(icon.label).toBe(AXM_ICON_SPECS['category-relic'].label);
            expect(icon.width).toBe(44);
            screen.unmount();
        }
    });

    it('switching to the Suppliant shows the engagement ring icon', () => {
        mockRoster = FIXTURES;
        mount();
        act(() => { fireEvent.press(screen.getByTestId('character-select-square-fx-bard')); });
        expect(relicIcon().label).toBe(labelOf('relic-disarming-plea'));
        expect(relicIcon().label).toBe('Hand holding a ring');
    });

    it('app/character-select holds no hand-drawn Svg', () => {
        const dir = path.join(__dirname, '..', 'character-select');
        for (const f of fs.readdirSync(dir)) {
            expect(fs.readFileSync(path.join(dir, f), 'utf8')).not.toMatch(/<Svg|react-native-svg/);
        }
    });
});
