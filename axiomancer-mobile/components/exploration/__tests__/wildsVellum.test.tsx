/**
 * The Wilds on vellum, through the real exploration
 * screen and the tab layout:
 *
 * - the status card, node panel, its BACK / TRAVEL HERE buttons and the quest
 *   tracker each draw their vellum piece, and every word on them is inked
 *   (iron-gall brown or oxblood, never the dark panels' gold or parchment);
 * - the black band behind the Wilds' top ships on and the dev switch removes it;
 * - the tab bar sits on the vellum dock, the selected tab is oxblood ink, and
 *   nothing is drawn behind the selection (no tick, no tile).
 */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

const mockTabsComponent = jest.fn((props: { children?: unknown }) => {
    const { View } = require('react-native');
    return require('react').createElement(View, { testID: 'mock-tabs' }, props.children as React.ReactNode);
});
const mockTabsScreen = jest.fn((_props: unknown) => null);
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
    Tabs: Object.assign((props: { children?: unknown }) => mockTabsComponent(props), {
        Screen: (props: unknown) => mockTabsScreen(props),
    }),
}));

import {
    createStartingWorld,
    giveQuestStep,
    type GameState,
} from '@mechanics';
import { LONG_MAIN_LINE, registerLongChainFixture } from '@mechanics/Game/fixtures';
import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { devSettingsStore } from '@/state/dev/dev-settings';
import { NodeConfirmPanel } from '@/components/exploration/NodeConfirmPanel';
import { StatusCard } from '@/components/StatusCard';
import { VELLUM_INK, INK_SOFT, VELLUM_OXBLOOD } from '@/components/exploration/wildsInk';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { AXM } from '@/theme/axm';
import ExplorationScreen from '@/app/(tabs)/exploration';
import TabLayout from '@/app/(tabs)/_layout';

beforeEach(() => {
    jest.useFakeTimers();
    registerLongChainFixture();
});

afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    devSettingsStore.set({ wildsBlackBand: true });
});

const INKS = new Set<string>([VELLUM_INK, INK_SOFT, VELLUM_OXBLOOD]);

/** A node option for the panel: a fight, no purse. */
const BATTLE = {
    nodeId: 'bw-w3',
    label: 'The Gallows Crossroads',
    type: 'combat',
    description: 'Gallows crossroads.',
    leagues: 'near',
    purse: null,
    cheapestWork: null,
} as never;

/** Every `color` a rendered Text carries, with its words, flattened. */
function textColours(root: ReturnType<typeof render>): { text: string; color: unknown }[] {
    const out: { text: string; color: unknown }[] = [];
    const walk = (node: unknown): void => {
        if (node === null || typeof node !== 'object') return;
        if (Array.isArray(node)) { node.forEach(walk); return; }
        const n = node as { type?: string; props?: { style?: unknown }; children?: unknown };
        if (n.type === 'Text') {
            const words = (Array.isArray(n.children) ? n.children : [n.children]).filter((c) => typeof c === 'string').join('');
            out.push({ text: words, color: (StyleSheet.flatten(n.props?.style as never) as { color?: unknown } | undefined)?.color });
        }
        walk(n.children);
    };
    walk(root.toJSON());
    return out;
}

function newStore(): AppStore {
    const w = createStartingWorld('breakwater');
    const map = { ...w.currentMap, pendingArrival: null, consumedNodes: [...w.currentMap.consumedNodes, 'bw-w1'] };
    return createAppStore({ adapter: createMemoryAdapter(), overrides: { world: { ...w, currentMap: map } } });
}

function mountScreen(store: AppStore) {
    const tree = render(
        <CombatModeProvider>
            <GameStoreProvider store={store}>
                <ExplorationScreen />
            </GameStoreProvider>
        </CombatModeProvider>,
    );
    act(() => { jest.advanceTimersByTime(1); });
    return tree;
}

function withQuest(store: AppStore): void {
    const state = giveQuestStep(store.getState() as unknown as GameState, LONG_MAIN_LINE, 1);
    store.setState({ quests: state.quests } as never);
}

describe('A2: the Wilds wear vellum, inked', () => {
    it('the status card draws its panel and inks every word', () => {
        const { tree } = withAllProviders(<StatusCard name="THE CHOSEN" mapName="The Breakwater" />);
        const r = render(tree);
        expect(r.getByTestId('status-card-vellum')).toBeTruthy();
        const words = textColours(r);
        expect(words.map((w) => w.text)).toEqual(expect.arrayContaining(['THE CHOSEN', 'The Breakwater', 'VITAE']));
        for (const w of words) expect(INKS.has(w.color as string)).toBe(true);
    });

    it('keeps the VITAE bar\'s accessibility reading and its alarm at a quarter', () => {
        const { tree } = withAllProviders(<StatusCard name="X" hp={10} hpMax={100} />);
        const r = render(tree);
        expect(r.getByLabelText('VITAE: 10 out of 100, 10 percent')).toBeTruthy();
        expect(r.getByTestId('statbar-value-alarmed')).toBeTruthy();
    });

    it('the node panel, its buttons and the quest tracker ink every word', () => {
        const store = newStore();
        withQuest(store);
        const r = mountScreen(store);
        const tracker = r.getByTestId('quest-tracker');
        expect(tracker).toBeTruthy();
        for (const w of textColours({ toJSON: () => tracker } as never)) expect(INKS.has(w.color as string)).toBe(true);

        const { tree } = withAllProviders(
            <NodeConfirmPanel selected={BATTLE} onConfirm={() => {}} onCancel={() => {}} emptyMessage="x" />,
        );
        const panel = render(tree);
        const words = textColours(panel);
        expect(words.map((w) => w.text)).toEqual(expect.arrayContaining(['The Gallows Crossroads', 'BACK', 'TRAVEL HERE']));
        for (const w of words) expect(INKS.has(w.color as string)).toBe(true);
        // The two buttons keep their testIDs and their press.
        fireEvent.press(panel.getByTestId('node-confirm-go'));
        fireEvent.press(panel.getByTestId('node-confirm-cancel'));
    });

    it('ships the black band, and the dev switch takes it off', () => {
        const on = mountScreen(newStore());
        expect(on.queryByTestId('wilds-black-band')).not.toBeNull();
        expect(on.queryByTestId('wilds-floating-top')).toBeNull();
        on.unmount();
        devSettingsStore.set({ wildsBlackBand: false });
        const off = mountScreen(newStore());
        expect(off.queryByTestId('wilds-black-band')).toBeNull();
        // Without the band the map runs up under the card: the card floats on it.
        expect(off.queryByTestId('wilds-floating-top')).not.toBeNull();
        // The status card and the map are there either way.
        expect(off.queryByTestId('status-card-vellum')).not.toBeNull();
        expect(off.queryByTestId('map-canvas-wrapper')).not.toBeNull();
    });
});

describe('A3: the tab bar on the vellum dock', () => {
    function mountLayout() {
        const { tree } = withAllProviders(<TabLayout />);
        render(tree);
        const tabs = mockTabsComponent.mock.calls[0][0] as unknown as { screenOptions: Record<string, unknown> };
        const screens = mockTabsScreen.mock.calls.map((c) => c[0] as unknown as { options: { tabBarIcon: (p: unknown) => React.ReactElement } });
        return { options: tabs.screenOptions, screens };
    }

    it('selects in oxblood and rests in ink', () => {
        const { options } = mountLayout();
        expect(options.tabBarActiveTintColor).toBe(VELLUM_OXBLOOD);
        expect(options.tabBarInactiveTintColor).toBe(INK_SOFT);
        expect(typeof options.tabBarBackground).toBe('function');
    });

    it('153.3: shows no tab words, and each tab keeps its name as its accessibility label', () => {
        const { options } = mountLayout();
        expect(options.tabBarShowLabel).toBe(false);
        const screenProps = mockTabsScreen.mock.calls.map((c) => c[0] as unknown as { options: { title: string; tabBarLabel?: string; tabBarAccessibilityLabel?: string; tabBarIcon: (p: unknown) => React.ReactElement } });
        expect(screenProps).toHaveLength(6);
        for (const { options: o } of screenProps) {
            expect(o.tabBarLabel).toBeUndefined();
            expect(o.tabBarAccessibilityLabel).toBe(o.title);
            expect(o.tabBarAccessibilityLabel).toMatch(/[A-Z]/);
        }
    });

    it('153.3: draws each icon at 30pt with no text beside it', () => {
        const { screens } = mountLayout();
        for (const sc of screens) {
            const icon = render(sc.options.tabBarIcon({ color: '#000', focused: false }));
            expect(icon.queryAllByText(/./).length).toBe(0);
            const svg = icon.UNSAFE_getByProps({ accessibilityRole: 'image' });
            expect(Number(svg.props.width ?? svg.props.height)).toBe(30);
        }
    });

    it('draws nothing behind the selected tab (no tick, no tile)', () => {
        const { screens } = mountLayout();
        const icon = render(screens[0].options.tabBarIcon({ color: VELLUM_OXBLOOD, size: 24, focused: true }));
        const filled: unknown[] = [];
        const walk = (n: unknown): void => {
            if (n === null || typeof n !== 'object') return;
            if (Array.isArray(n)) { n.forEach(walk); return; }
            const node = n as { props?: { style?: unknown }; children?: unknown };
            const bg = (StyleSheet.flatten(node.props?.style as never) as { backgroundColor?: unknown } | undefined)?.backgroundColor;
            if (bg !== undefined && bg !== 'transparent') filled.push(bg);
            walk(node.children);
        };
        walk(icon.toJSON());
        // No sulfur tick; nothing painted at all on the focused icon.
        expect(filled).not.toContain(AXM.sulfur);
        expect(filled).toEqual([]);
    });
});
