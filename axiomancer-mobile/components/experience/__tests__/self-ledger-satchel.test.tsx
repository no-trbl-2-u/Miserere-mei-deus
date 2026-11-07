/**
 * UK1e: Self in brass, the Ledger on vellum and ink, the Satchel's
 * gear rows in brass and its filter tabs on vellum. Each place reads its look
 * from `LOOKS`; the places T kept Normal keep today's code.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

import { KIT, type KitPiece } from '@/assets/images/experience/kit';
import { StatBar } from '@/components/StatBar';
import { EquipmentSlot } from '@/components/inventory/EquipmentSlot';
import { InventoryTabs, VELLUM_EMPTY_OPACITY, VELLUM_INK_QUIET } from '@/components/inventory/InventoryTabs';
import { VELLUM_INK, VELLUM_OXBLOOD } from '@/components/experience/KitBackdrop';
import { LOOKS } from '@/components/experience/looks';
import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { withAllProviders } from '@/test-utils/withAllProviders';

import CharacterScreen from '@/app/(tabs)/character';
import MemoirScreen from '@/app/(tabs)/memoir';

type Node = { props: { source?: unknown } };

/** Every kit piece a rendered tree draws. */
function piecesDrawn(root: { findAll: (p: (n: Node) => boolean) => Node[] }): Set<KitPiece> {
    const drawn = new Set<KitPiece>();
    for (const n of root.findAll((x) => x.props.source !== undefined)) {
        for (const piece of Object.keys(KIT) as KitPiece[]) {
            if (KIT[piece].source === n.props.source) drawn.add(piece);
        }
    }
    return drawn;
}

const screen = (node: React.ReactElement) => (
    <CombatModeProvider>
        <GameStoreProvider store={createAppStore({ adapter: createMemoryAdapter() })}>{node}</GameStoreProvider>
    </CombatModeProvider>
);

describe('the picks this chunk wires', () => {
    it('are the ones T made', () => {
        for (const id of ['F-01', 'F-02', 'F-03', 'F-05', 'F-06', 'B-04'] as const) expect(LOOKS[id]).toBe('brass');
        for (const id of ['L-01', 'B-05'] as const) expect(LOOKS[id]).toBe('vellum');
        for (const id of ['F-04', 'B-01', 'B-02', 'B-03', 'B-06'] as const) expect(LOOKS[id]).toBe('normal');
    });
});

describe('Self (A6)', () => {
    const drawn = piecesDrawn(render(screen(<CharacterScreen />)).UNSAFE_root);

    it('wears the portrait frame, level badge, stat tiles, headings, divider and VITAE bar in brass', () => {
        for (const piece of [
            'character-portrait-frame',
            'level-badge-dark',
            'stat-tile',
            'section-header-dark-star',
            'section-header-dark-quatrefoil',
            'divider-ornate-brass',
            'combat-vitae-track',
            'combat-vitae-fill',
        ] as const) {
            expect(drawn.has(piece)).toBe(true);
        }
    });

    it('has no hazard deck link (UX1e)', () => {
        const { queryByTestId, queryByText } = render(screen(<CharacterScreen />));
        expect(queryByTestId('self-hazard-deck-link')).toBeNull();
        expect(queryByText('✠ HAZARD DECK')).toBeNull();
    });
});

describe('StatBar look', () => {
    it('draws the brass rail and fill only when asked', () => {
        const brass = piecesDrawn(render(<StatBar value={5} max={10} look="brass" />).UNSAFE_root);
        expect(brass.has('combat-vitae-track')).toBe(true);
        expect(brass.has('combat-vitae-fill')).toBe(true);
        expect(piecesDrawn(render(<StatBar value={5} max={10} />).UNSAFE_root).size).toBe(0);
    });
});

describe('The Ledger (A7)', () => {
    it('puts its headings on vellum plates and its dividers in ink', () => {
        const drawn = piecesDrawn(render(screen(<MemoirScreen />)).UNSAFE_root);
        expect(drawn.has('section-header-vellum-star')).toBe(true);
        expect(drawn.has('section-header-vellum-leaf')).toBe(true);
        expect(drawn.has('divider-ornate-ink')).toBe(true);
        expect(drawn.has('divider-plain-ink')).toBe(true);
        expect(drawn.has('section-header-dark-star')).toBe(false);
    });
});

describe('The Satchel (A7)', () => {
    const slot = { id: 'weapon' as const, key: 'weapon' as const, label: 'Weapon', item: null };

    it('wears the gear rows in brass, the selected row in its selected piece', () => {
        const idle = piecesDrawn(render(<EquipmentSlot slot={slot} bareLabel="bare" selected={false} onPress={jest.fn()} />).UNSAFE_root);
        expect(idle.has('equipment-slot-dark')).toBe(true);
        const picked = piecesDrawn(render(<EquipmentSlot slot={slot} bareLabel="bare" selected onPress={jest.fn()} />).UNSAFE_root);
        expect(picked.has('equipment-slot-selected')).toBe(true);
    });

    it('puts every filter tab on vellum', () => {
        const tabs = [
            { key: 'all' as const, label: 'All', count: 5 },
            { key: 'equipment' as const, label: 'Gear', count: 0 },
        ];
        const { tree } = withAllProviders(<InventoryTabs tabs={tabs} activeTab="all" onTabPress={jest.fn()} />);
        const drawn = render(tree).UNSAFE_root.findAll((n: Node) => n.props.source === KIT['filter-tab-vellum'].source);
        expect(drawn.length).toBeGreaterThanOrEqual(tabs.length);
    });

    it('draws the oxblood rule under the picked vellum tab only', () => {
        const tabs = [
            { key: 'all' as const, label: 'All', count: 5 },
            { key: 'equipment' as const, label: 'Gear', count: 0 },
        ];
        const { tree } = withAllProviders(<InventoryTabs tabs={tabs} activeTab="all" onTabPress={jest.fn()} />);
        const view = render(tree);
        const rule = (id: string) => StyleSheet.flatten(view.getByTestId(id).props.style) as { borderBottomWidth: number; borderBottomColor: string };
        expect(rule('tab-all')).toMatchObject({ borderBottomWidth: 2, borderBottomColor: VELLUM_OXBLOOD });
        expect(rule('tab-equipment').borderBottomColor).toBe('transparent');
    });
});

/** The vellum pieces' darkest parchment, measured at the 10th percentile of their opaque pixels. */
const DARKEST_PARCHMENT = [204, 180, 142] as const;

function luminance([r, g, b]: readonly number[]): number {
    const lin = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function contrast(ink: string, opacity = 1): number {
    // An inked colour at partial opacity is the blend of ink and parchment.
    const blended = hex(ink).map((c, i) => c * opacity + DARKEST_PARCHMENT[i] * (1 - opacity));
    const a = luminance(blended);
    const b = luminance(DARKEST_PARCHMENT);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('ink on vellum', () => {
    it('measures at least 4.5:1 against the darkest parchment, for every inked colour used here', () => {
        for (const ink of [VELLUM_INK, VELLUM_OXBLOOD]) {
            expect(contrast(ink)).toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(VELLUM_INK_QUIET, VELLUM_EMPTY_OPACITY)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps oxblood the accent T chose, not a gold or amber', () => {
        expect(VELLUM_OXBLOOD).toBe('#6e1a10');
        expect(VELLUM_INK).toBe('#2b1f14');
    });
});
