/**
 * The tab bar is icons alone: no word under any tab, a large icon each, an
 * accessibility label kept on every tab, and (on the vellum dock) tab padding
 * that clears the dock art's end flourishes.
 */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
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

import { KIT } from '@/assets/images/experience/kit';
import { kitScale, unstretchedInset } from '@/components/experience/KitBackdrop';
import TabLayout, { DOCK_END_PADDING, DOCK_FLOURISH_PX, TAB_ICON_SIZE } from '@/app/(tabs)/_layout';
import { withAllProviders } from '@/test-utils/withAllProviders';

afterEach(() => {
    jest.clearAllMocks();
});

type ScreenProps = {
    name: string;
    options: {
        tabBarAccessibilityLabel?: string;
        tabBarLabel?: unknown;
        tabBarIcon: (p: { color: string; focused: boolean }) => React.ReactElement;
    };
};

function mountLayout() {
    const { tree } = withAllProviders(<TabLayout />);
    render(tree);
    const tabs = mockTabsComponent.mock.calls[0][0] as unknown as { screenOptions: Record<string, unknown> };
    const screens = mockTabsScreen.mock.calls.map((c) => c[0] as unknown as ScreenProps);
    return { options: tabs.screenOptions, screens };
}

/** Every string a rendered tree would put on screen as text. */
function visibleStrings(node: unknown, out: string[] = []): string[] {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach((n) => visibleStrings(n, out));
    else if (node && typeof node === 'object') visibleStrings((node as { children?: unknown }).children, out);
    return out;
}

describe('the tab bar: icons alone', () => {
    it('hides every label and names no tab by label', () => {
        const { options, screens } = mountLayout();
        expect(options.tabBarShowLabel).toBe(false);
        expect(screens).toHaveLength(6);
        for (const s of screens) expect(s.options.tabBarLabel).toBeUndefined();
    });

    it('keeps a distinct accessibility label on every tab', () => {
        const { screens } = mountLayout();
        const labels = screens.map((s) => s.options.tabBarAccessibilityLabel);
        for (const l of labels) expect(typeof l === 'string' && l.length > 0).toBe(true);
        expect(new Set(labels).size).toBe(screens.length);
    });

    it('draws no text in a resting tab icon', () => {
        const { screens } = mountLayout();
        for (const s of screens) {
            const icon = render(s.options.tabBarIcon({ color: '#000', focused: false }));
            expect(visibleStrings(icon.toJSON())).toEqual([]);
        }
    });

    it('draws each icon at the large size', () => {
        const { screens } = mountLayout();
        for (const s of screens) {
            const el = s.options.tabBarIcon({ color: '#000', focused: false });
            expect((el.props as { size: number }).size).toBe(TAB_ICON_SIZE);
        }
        expect(TAB_ICON_SIZE).toBeGreaterThanOrEqual(28);
    });
});

describe('the vellum dock art against the bar in front of it', () => {
    const inset = unstretchedInset('nav-dock-vellum');
    const k = kitScale('nav-dock-vellum');

    it('holds each end flourish whole in an unstretched column', () => {
        expect(inset).not.toBeNull();
        expect(inset!.left).toBeGreaterThanOrEqual(DOCK_FLOURISH_PX * k);
        expect(inset!.right).toBeGreaterThanOrEqual(DOCK_FLOURISH_PX * k);
    });

    it('pads the tabs past the flourishes', () => {
        const { options } = mountLayout();
        const bar = StyleSheet.flatten(options.tabBarStyle as never) as { paddingHorizontal?: number };
        expect(bar.paddingHorizontal).toBe(DOCK_END_PADDING);
        expect(DOCK_END_PADDING).toBeGreaterThanOrEqual(DOCK_FLOURISH_PX * k);
    });

    it('stretches the middle band close to 1x, so the rails keep their drawn weight', () => {
        const { options } = mountLayout();
        const bar = StyleSheet.flatten(options.tabBarStyle as never) as { height: number };
        const { h } = KIT['nav-dock-vellum'];
        const fixed = inset!.top + inset!.bottom;
        const stretch = (bar.height - fixed) / (h * k - fixed);
        expect(stretch).toBeGreaterThan(0.95);
        expect(stretch).toBeLessThan(1.1);
    });
});
