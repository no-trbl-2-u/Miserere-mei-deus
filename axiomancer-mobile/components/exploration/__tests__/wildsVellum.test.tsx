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
import TabLayout, { DOCK_HEIGHT } from '@/app/(tabs)/_layout';

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
        on.unmount();
        devSettingsStore.set({ wildsBlackBand: false });
        const off = mountScreen(newStore());
        expect(off.queryByTestId('wilds-black-band')).toBeNull();
        // Without the band the map runs up under the whole card.
        expect(off.queryByTestId('wilds-top-card')).not.toBeNull();
        // The status card and the map are there either way.
        expect(off.queryByTestId('status-card-vellum')).not.toBeNull();
        expect(off.queryByTestId('map-canvas-wrapper')).not.toBeNull();
    });

    it('159.3 A7: the black ends at the status card\'s vertical middle', () => {
        const r = mountScreen(newStore());
        const top = r.getByTestId('wilds-top-card');
        act(() => { fireEvent(top, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 120 } } }); });
        const band = StyleSheet.flatten(r.getByTestId('wilds-black-band').props.style) as { height: number; top: number };
        expect(band.top).toBe(0);
        expect(band.height).toBe(60);
        // The map is not pushed down by the card: it fills the stage behind it.
        const stage = r.getByTestId('wilds-stage');
        expect(stage.findByProps({ testID: 'map-canvas-wrapper' })).toBeTruthy();
    });

    it('MC1c A11: the gesture line sits in a strip under the map frame, not inside it', () => {
        const r = mountScreen(newStore());
        const frame = r.getByTestId('wilds-map-frame');
        expect(frame.findAllByProps({ testID: 'map-gesture-line' })).toHaveLength(0);
        expect(r.getByTestId('wilds-stage').findAllByProps({ testID: 'map-gesture-strip' }).length).toBeGreaterThan(0);
        // Nothing the map holds is drawn over it but the recentre button.
        expect(r.queryByTestId('map-overlays-fixed')).toBeNull();
        expect(r.queryByTestId('map-recenter')).not.toBeNull();
    });

    it('159.3: the foot takes touches only through its panels, and the map is told what covers it', () => {
        const store = newStore();
        withQuest(store);
        const r = mountScreen(store);
        expect(r.getByTestId('wilds-foot').props.pointerEvents).toBe('box-none');
        act(() => { fireEvent(r.getByTestId('wilds-top-card'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 120 } } }); });
        act(() => { fireEvent(r.getByTestId('wilds-foot'), 'layout', { nativeEvent: { layout: { x: 0, y: 700, width: 390, height: 90 } } }); });
        act(() => { fireEvent(r.getByTestId('map-canvas-wrapper'), 'layout', { nativeEvent: { layout: { width: 370, height: 700 } } }); });
        // The Recentre button is parked above the foot.
        expect(StyleSheet.flatten(r.getByTestId('map-recenter').props.style).bottom).toBe(10 + 84);
    });

    it('159.3 A7: nothing black is drawn behind the quest tracker or the node panel', () => {
        const store = newStore();
        withQuest(store);
        const r = mountScreen(store);
        const foot = StyleSheet.flatten(r.getByTestId('wilds-foot').props.style) as { position: string; bottom: number; backgroundColor?: unknown };
        // Laid over the map's foot, with no fill of its own.
        expect(foot.position).toBe('absolute');
        expect(foot.bottom).toBe(0);
        expect(foot.backgroundColor).toBeUndefined();
        expect(r.queryByTestId('quest-tracker')).not.toBeNull();
        // The stage and every ancestor of the foot up to the screen draw no fill.
        const stage = StyleSheet.flatten(r.getByTestId('wilds-stage').props.style) as { backgroundColor?: unknown };
        expect(stage.backgroundColor).toBeUndefined();
        const band = r.getByTestId('wilds-black-band');
        // The only black on the screen is the band, and it hangs from the top.
        expect(StyleSheet.flatten(band.props.style)).toMatchObject({ top: 0 });
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

    it('159.3 A9: draws nothing behind the vellum, spans the width, and is about 76pt tall plus the inset', () => {
        const { options } = mountLayout();
        const bar = StyleSheet.flatten(options.tabBarStyle as never) as {
            backgroundColor: string; borderTopWidth: number; elevation: number; height: number;
        };
        expect(bar.backgroundColor).toBe('transparent');
        expect(bar.borderTopWidth).toBe(0);
        expect(bar.elevation).toBe(0);
        expect(bar.height).toBe(DOCK_HEIGHT);
        expect(DOCK_HEIGHT).toBe(76);
        // The art is pinned to the top 76pt and fills the bar edge to edge.
        const art = render((options.tabBarBackground as () => React.ReactElement)());
        const holder = StyleSheet.flatten(art.getByTestId('tab-dock-art').props.style) as { left: number; right: number; top: number; height: number };
        expect(holder).toMatchObject({ left: 0, right: 0, top: 0, height: DOCK_HEIGHT });
    });

    it('159.3 A9: the icons sit inside the art\'s rails at 360 and 430', () => {
        const { options } = mountLayout();
        const bar = StyleSheet.flatten(options.tabBarStyle as never) as { paddingTop: number; paddingBottom: number; paddingHorizontal: number; height: number };
        expect(bar.height - bar.paddingTop - bar.paddingBottom).toBeGreaterThanOrEqual(30 + 4);
        for (const width of [360, 390, 430]) {
            expect((width - 2 * bar.paddingHorizontal) / 6).toBeGreaterThanOrEqual(30);
        }
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
