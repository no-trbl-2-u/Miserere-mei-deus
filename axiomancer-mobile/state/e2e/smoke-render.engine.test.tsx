/**
 * Hermetic smoke-render harness.
 *
 * The shipped pattern — hermetic tests on the presenter VM only —
 * has a strategic gap: it doesn't render the full screen tree, so
 * crashes, blank renders, and template-string leaks pass verify
 * but break the deployed app. This harness mounts each primary
 * surface at fresh-store boot and asserts three contracts:
 *
 *   1. render() does not throw (catches "character tab crashing")
 *   2. rendered output contains no `{`/`}`-bracketed template
 *      strings (catches "tab labels rendering as
 *      `{ TAB NAME }"--index"` literally")
 *   3. the primary heading / title is non-empty (catches
 *      "combat encounter is blank")
 *
 * Each surface gets its own `describe` so a failure pinpoints the
 * broken screen. The harness intentionally keeps mocks minimal —
 * the goal is to exercise the full screen render path the way the
 * runtime does, not the way the VM-shape tests do.
 */

import { afterEach, describe, it, expect, jest } from '@jest/globals';
import { render, type RenderAPI } from '@testing-library/react-native';
import React from 'react';

/**
 * Local re-statement of the `ReactTestInstance` shape we walk, so
 * the harness doesn't pull `@types/react-test-renderer` (not a
 * project dep). Only the fields we use.
 */
interface TreeNode {
    props?: { accessibilityLabel?: unknown };
    children?: ReadonlyArray<TreeNode | string | number | null | undefined>;
}

jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => false,
    }),
}));

import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { createAppStore, type AppStore, EMPTY_EVENT_SLICE } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';
import { arriveAtRealFight } from '@/test-utils/realFight';
import type { ResolveMapEventResult } from '@mechanics';

import CharacterScreen from '@/app/(tabs)/character';
import InventoryScreen from '@/app/(tabs)/inventory';
import ExplorationScreen from '@/app/(tabs)/exploration';
import MemoirScreen from '@/app/(tabs)/memoir';
import EventScreen from '@/app/event';

afterEach(() => {
    jest.restoreAllMocks();
});

function makeStore(): AppStore {
    return createAppStore({ adapter: createMemoryAdapter() });
}

/**
 * Seed an active (non-empty) event slice so a screen renders the
 * event-bearing branch. The empty-slice boot path returns the stable
 * `EMPTY_VM` singleton from `selectEventViewModel`; only an active
 * event composes a fresh frozen VM each call, which is what made the
 * exploration screen's `useGameState(selectEventViewModel)` loop.
 */
function seedActiveEvent(store: AppStore, result: ResolveMapEventResult): void {
    store.setState({ event: { ...EMPTY_EVENT_SLICE, pending: result } });
}

const REST_EVENT: ResolveMapEventResult = {
    state: undefined as never,
    event: { kind: 'rest', healed: 7 } as never,
};

function withProviders(store: AppStore, screen: React.ReactNode) {
    return (
        <CombatModeProvider>
            <GameStoreProvider store={store}>{screen}</GameStoreProvider>
        </CombatModeProvider>
    );
}

/**
 * Walk a rendered tree and collect every string the user would
 * see. We can't use `render(...).toJSON()` text-only because RN
 * `Text` nodes carry their content as `children` props that may
 * themselves be React fragments; this walker pulls every leaf
 * string out so the bracket-leak assertion runs against the
 * full visible surface.
 */
function collectVisibleStrings(api: RenderAPI): string[] {
    const out: string[] = [];
    const walk = (node: TreeNode | string | number | null | undefined): void => {
        if (node === null || node === undefined) return;
        if (typeof node === 'string') {
            out.push(node);
            return;
        }
        if (typeof node === 'number') {
            out.push(String(node));
            return;
        }
        const label = node.props?.accessibilityLabel;
        if (typeof label === 'string' && label.length > 0) out.push(label);
        for (const child of node.children ?? []) {
            walk(child);
        }
    };
    walk(api.toJSON() as unknown as TreeNode);
    return out;
}

/**
 * Heuristic for unresolved template strings in rendered output.
 * Matches a curly-bracketed token of word characters and spaces,
 * which is the shape of expo-router's default title placeholder
 * (`{ tab-name }`) and of any JS template-literal leak (e.g.
 * `${something}` rendered as a string).
 */
const TEMPLATE_LEAK_RE = /\{[\s\w.-]+\}|\$\{[^}]+\}/;

function expectNoTemplateLeaks(strings: readonly string[], surface: string): void {
    const offenders = strings.filter((s) => TEMPLATE_LEAK_RE.test(s));
    expect({
        surface,
        offenders,
    }).toEqual({ surface, offenders: [] });
}

// ---------------------------------------------------------------------------
// Per-surface smoke renders
// ---------------------------------------------------------------------------

describe('smoke-render: each primary surface', () => {
    it('renders the Character tab at fresh-store boot without throwing', () => {
        const store = makeStore();
        // Wrapped so a thrown error surfaces with `toThrow` rather than
        // bubbling up and aborting the whole test file.
        expect(() => render(withProviders(store, <CharacterScreen />))).not.toThrow();
    });

    it('renders the Inventory tab at fresh-store boot without throwing', () => {
        const store = makeStore();
        expect(() => render(withProviders(store, <InventoryScreen />))).not.toThrow();
    });

    it('renders the Exploration tab at fresh-store boot without throwing', () => {
        const store = makeStore();
        expect(() => render(withProviders(store, <ExplorationScreen />))).not.toThrow();
    });

    it('renders the Memoir tab at fresh-store boot without throwing', () => {
        const store = makeStore();
        expect(() => render(withProviders(store, <MemoirScreen />))).not.toThrow();
    });

    it('renders the Event modal at fresh-store boot (empty event) without throwing', () => {
        const store = makeStore();
        expect(() => render(withProviders(store, <EventScreen />))).not.toThrow();
    });
});

/**
 * "Visible body" heuristic — assert that the screen actually
 * paints user-visible content, not just an empty View placeholder.
 * Catches "the screen is blank" without coupling to specific copy.
 */
function expectNonEmptyBody(strings: readonly string[], surface: string): void {
    const visibleText = strings.filter((s) => s.trim().length > 0);
    // The smoke harness asserts a *loose* lower bound: at least
    // one non-whitespace string in the rendered tree. Tighter
    // assertions live in the per-screen tests.
    expect({ surface, hasVisibleText: visibleText.length > 0 }).toEqual({
        surface,
        hasVisibleText: true,
    });
}

describe('smoke-render: primary body is non-empty (no blank screens)', () => {
    it('Character tab paints visible text', () => {
        const store = makeStore();
        const api = render(withProviders(store, <CharacterScreen />));
        expectNonEmptyBody(collectVisibleStrings(api), 'character');
    });

    it('Inventory tab paints visible text', () => {
        const store = makeStore();
        const api = render(withProviders(store, <InventoryScreen />));
        expectNonEmptyBody(collectVisibleStrings(api), 'inventory');
    });

    it('Exploration tab paints visible text', () => {
        const store = makeStore();
        const api = render(withProviders(store, <ExplorationScreen />));
        expectNonEmptyBody(collectVisibleStrings(api), 'exploration');
    });

    it('Memoir tab paints visible text (empty journal still renders eyebrows + empty-state copy)', () => {
        const store = makeStore();
        const api = render(withProviders(store, <MemoirScreen />));
        expectNonEmptyBody(collectVisibleStrings(api), 'memoir');
    });

    it('Event modal paints visible text in its empty-event state', () => {
        const store = makeStore();
        const api = render(withProviders(store, <EventScreen />));
        expectNonEmptyBody(collectVisibleStrings(api), 'event (empty)');
    });
});

describe('smoke-render: no template-string leaks in rendered output', () => {
    it('Character tab renders no `{ ... }` template strings', () => {
        const store = makeStore();
        const api = render(withProviders(store, <CharacterScreen />));
        expectNoTemplateLeaks(collectVisibleStrings(api), 'character');
    });

    it('Inventory tab renders no `{ ... }` template strings', () => {
        const store = makeStore();
        const api = render(withProviders(store, <InventoryScreen />));
        expectNoTemplateLeaks(collectVisibleStrings(api), 'inventory');
    });

    it('Exploration tab renders no `{ ... }` template strings', () => {
        const store = makeStore();
        const api = render(withProviders(store, <ExplorationScreen />));
        expectNoTemplateLeaks(collectVisibleStrings(api), 'exploration');
    });

    it('Memoir tab renders no `{ ... }` template strings', () => {
        const store = makeStore();
        const api = render(withProviders(store, <MemoirScreen />));
        expectNoTemplateLeaks(collectVisibleStrings(api), 'memoir');
    });

    it('Event modal renders no `{ ... }` template strings (empty event)', () => {
        const store = makeStore();
        const api = render(withProviders(store, <EventScreen />));
        expectNoTemplateLeaks(collectVisibleStrings(api), 'event');
    });
});

// ---------------------------------------------------------------------------
// Active-event render guard (Maximum-update-depth regression)
// ---------------------------------------------------------------------------
//
// Regression for the map-node-nav crash. The fresh-boot
// smoke renders above all run with an EMPTY event slice, where
// `selectEventViewModel` returns the stable `EMPTY_VM` singleton — so
// they never exercised the path that loops. The exploration screen
// subscribes via `useGameState(selectEventViewModel)`; once a real
// (non-empty) event resolved, the selector composed a fresh frozen VM
// every render, React's `useSyncExternalStore` saw a new reference each
// time, and the screen blew up with "Maximum update depth exceeded".
// Hazard slipped through only because that resolve path clears the slice
// back to EMPTY before routing away. These renders pin the screens
// against an ACTIVE event so the loop can't come back unnoticed.
describe('smoke-render: surfaces with an ACTIVE event (no infinite render loop)', () => {
    it('renders the Exploration tab with an active narrative event without throwing', () => {
        const store = makeStore();
        seedActiveEvent(store, REST_EVENT);
        expect(() => render(withProviders(store, <ExplorationScreen />))).not.toThrow();
    });

    it('renders the Exploration tab with an active combat-prelude without throwing', () => {
        // A real arrival at bw-2: the prelude holds the node's own foe.
        const { store } = arriveAtRealFight();
        expect(() => render(withProviders(store, <ExplorationScreen />))).not.toThrow();
    });

    it('renders the Event modal with an active narrative event without throwing', () => {
        const store = makeStore();
        seedActiveEvent(store, REST_EVENT);
        expect(() => render(withProviders(store, <EventScreen />))).not.toThrow();
    });
});

describe('smoke-render: the GRACE meter and the alignment grid are gone (D39)', () => {
    it.each([
        ['character', () => <CharacterScreen />],
        ['exploration', () => <ExplorationScreen />],
        ['memoir', () => <MemoirScreen />],
    ])('%s tab prints no GRACE, arrears, MEASURE or oath readout', (surface, screen) => {
        const store = makeStore();
        const text = collectVisibleStrings(render(withProviders(store, screen()))).join(' ');
        expect({ surface, leaks: text.match(/GRACE|arrears|MEASURE|CREED|AUGURY|TROTH|THE ACCOUNT/g) }).toEqual({
            surface,
            leaks: null,
        });
    });
});
