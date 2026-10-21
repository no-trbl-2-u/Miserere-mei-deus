/**
 * Hermetic E2E Tests — Layout / route registration regression checks
 *
 * Pins three layout-file invariants:
 *
 * 1. **`<GestureHandlerRootView>` wraps the root layout's render
 *    tree.** Without it, every `<GestureDetector>` in the app (the
 *    exploration map's pan/zoom gesture, etc.) throws at runtime —
 *    "GestureDetector must be used as a descendant of
 *    GestureHandlerRootView." This is a setup requirement from
 *    `react-native-gesture-handler`; expo + RN don't install it
 *    automatically.
 *
 * 2. **Every `<Tabs.Screen name="X">` matches an actual expo-router
 *    route ID** under `app/(tabs)/`. Expo-router 6 derives the route
 *    ID from the file/folder shape:
 *      - `app/(tabs)/foo.tsx`         → route ID `foo`
 *      - `app/(tabs)/foo/index.tsx`   → route ID `foo/index`
 *    A `<Tabs.Screen name="foo">` whose underlying file is at
 *    `foo/index.tsx` silently fails to match. The result: the
 *    layout options aren't applied, and the tab renders with the
 *    default label which is the raw route ID (e.g. "foo --index").
 *
 * Source-grep tests rather than router-mount tests — the layout
 * files import expo-router which requires a real router context to
 * even import. Reading the source as text + asserting structural
 * patterns gives the same catch-rate for this bug class without the
 * mount overhead. Hermetic = self-contained + deterministic +
 * isolated; this only touches `fs`.
 *
 * 3. **Every `linking` entry in `lib/platform/router.ts` names a
 *    registered screen.** The linking config (and `ROUTE_TABLE`, which
 *    it mirrors) turns a URL segment into a screen `name`; an entry no
 *    navigator registers is a dead route.
 */

import { describe, it, expect } from '@jest/globals';
import { promises as fs } from 'fs';
import * as path from 'path';

import { ROUTE_TABLE, linking } from '@/lib/platform/router';

const APP_ROOT = path.resolve(__dirname, '..', '..', 'app');
const ROOT_LAYOUT = path.join(APP_ROOT, '_layout.tsx');
const TABS_LAYOUT = path.join(APP_ROOT, '(tabs)', '_layout.tsx');
const TABS_DIR = path.join(APP_ROOT, '(tabs)');

/**
 * Compute the expo-router route ID for a route file under a parent
 * directory. Mirrors expo-router 6's behaviour:
 *  - `foo.tsx`        → `foo`
 *  - `foo/index.tsx`  → `foo/index`
 *  - `foo/bar.tsx`    → `foo/bar`
 *
 * Skips files that aren't routes:
 *  - `_layout.tsx` (layout file, not a route)
 *  - hidden / dotfile entries
 *  - files inside __tests__ directories
 */
async function discoverTabRouteIds(tabsDir: string): Promise<string[]> {
    const out: string[] = [];
    async function recurse(dir: string, prefix: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === '__tests__') continue;
            const next = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await recurse(next, prefix ? `${prefix}/${entry.name}` : entry.name);
                continue;
            }
            if (!entry.isFile()) continue;
            if (!entry.name.endsWith('.tsx') && !entry.name.endsWith('.ts')) continue;
            const basename = entry.name.replace(/\.tsx?$/, '');
            if (basename === '_layout') continue;
            const routeId = prefix ? `${prefix}/${basename}` : basename;
            out.push(routeId);
        }
    }
    await recurse(tabsDir, '');
    return out.sort();
}

/**
 * Extract every `<Tabs.Screen name="...">` value from a JSX source
 * string. Matches both single and double quotes. Returns the names
 * in source order.
 */
function extractTabsScreenNames(source: string): string[] {
    const re = /<Tabs\.Screen\b[^>]*?\bname=(["'])([^"']+)\1/g;
    const out: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(source)) !== null) {
        out.push(m[2]);
    }
    return out;
}

describe('layout registration: GestureHandlerRootView wraps the root layout', () => {
    it('imports GestureHandlerRootView from react-native-gesture-handler', async () => {
        const source = await fs.readFile(ROOT_LAYOUT, 'utf8');
        expect(source).toMatch(
            /import\s*\{[^}]*\bGestureHandlerRootView\b[^}]*\}\s*from\s*['"]react-native-gesture-handler['"]/,
        );
    });

    it('renders <GestureHandlerRootView> in the layout JSX', async () => {
        const source = await fs.readFile(ROOT_LAYOUT, 'utf8');
        // Allow whitespace + props between the tag name and the closing
        // `>` — both self-closing and open-with-children forms are valid,
        // but the wrapper has children so we expect the open form.
        expect(source).toMatch(/<GestureHandlerRootView\b/);
    });

    it('places <GestureHandlerRootView> as the outermost wrapper in the returned tree', async () => {
        const source = await fs.readFile(ROOT_LAYOUT, 'utf8');
        // Find the `return (` ... matching close paren region and assert
        // the first non-whitespace tag inside is GestureHandlerRootView.
        const returnMatch = source.match(/return\s*\(\s*\n?\s*<([A-Z][A-Za-z0-9_.]*)/);
        expect(returnMatch).not.toBeNull();
        expect(returnMatch![1]).toBe('GestureHandlerRootView');
    });
});

describe('layout registration: (tabs)/_layout Tabs.Screen names match actual route IDs', () => {
    it('every Tabs.Screen name resolves to a real route file under app/(tabs)/', async () => {
        const [source, routeIds] = await Promise.all([
            fs.readFile(TABS_LAYOUT, 'utf8'),
            discoverTabRouteIds(TABS_DIR),
        ]);
        const screenNames = extractTabsScreenNames(source);
        expect(screenNames.length).toBeGreaterThan(0);

        const routeIdSet = new Set(routeIds);
        for (const name of screenNames) {
            // If this fails the layout config silently won't apply to
            // the screen — expo-router falls back to a default label
            // built from the route ID, surfacing as e.g. "WILDS --index"
            // in the live tab bar. (See `3a14f5f`.)
            expect(routeIdSet.has(name)).toBe(true);
        }
    });

    it('folder-route screens use the "<folder>/index" form, not the short "<folder>" form', async () => {
        const [source, routeIds] = await Promise.all([
            fs.readFile(TABS_LAYOUT, 'utf8'),
            discoverTabRouteIds(TABS_DIR),
        ]);
        const screenNames = extractTabsScreenNames(source);

        // Collect every route ID that ends in /index (the folder routes).
        const folderRouteShortNames = new Set<string>(
            routeIds
                .filter((r) => r.endsWith('/index'))
                .map((r) => r.replace(/\/index$/, '')),
        );

        // If a screen name matches one of these short-form names, the
        // layout is wrong — it should use the /index suffix instead.
        for (const name of screenNames) {
            expect(folderRouteShortNames.has(name)).toBe(false);
        }
    });
});

/** Every `name="…"` string registered by a layout's navigator. */
function registeredScreenNames(source: string): Set<string> {
    return new Set(Array.from(source.matchAll(/\bname="([^"]+)"/g), (m) => m[1]));
}

type LinkingScreens = Record<string, string | { screens: Record<string, string> }>;

describe('layout registration: every linking entry names a registered screen', () => {
    const screens = (linking as unknown as { config: { screens: LinkingScreens } }).config.screens;

    it('every root linking entry is registered in app/_layout.tsx', async () => {
        const rootNames = registeredScreenNames(await fs.readFile(ROOT_LAYOUT, 'utf8'));
        const unregistered = Object.keys(screens).filter((name) => !rootNames.has(name));
        expect(unregistered).toEqual([]);
    });

    it('every tab linking entry is registered in app/(tabs)/_layout.tsx', async () => {
        const tabNames = registeredScreenNames(await fs.readFile(TABS_LAYOUT, 'utf8'));
        const tabs = screens['(tabs)'] as { screens: Record<string, string> };
        expect(typeof tabs).toBe('object');
        const unregistered = Object.keys(tabs.screens).filter((name) => !tabNames.has(name));
        expect(unregistered).toEqual([]);
    });
});

describe('layout registration: ROUTE_TABLE and linking describe the same routes', () => {
    // `linking` is documented as mirroring `ROUTE_TABLE` exactly, and nothing
    // checked it: a route added to one and not the other is navigable from
    // code but dead from a URL, or the reverse, and both read as fine.
    const screens = (linking as unknown as { config: { screens: LinkingScreens } }).config.screens;

    /** Every screen name the linking config maps, root and tabs alike. */
    function linkedScreenNames(): Set<string> {
        const out = new Set<string>();
        for (const [name, value] of Object.entries(screens)) {
            if (typeof value === 'string') out.add(name);
            else for (const nested of Object.keys(value.screens)) out.add(nested);
        }
        return out;
    }

    it('every ROUTE_TABLE screen is reachable from a URL', () => {
        const linked = linkedScreenNames();
        const missing = Object.values(ROUTE_TABLE)
            .map((entry) => entry.screen)
            .filter((screen) => !linked.has(screen));
        expect(missing).toEqual([]);
    });

    it('every linked screen is in ROUTE_TABLE', () => {
        const tabled = new Set(Object.values(ROUTE_TABLE).map((entry) => entry.screen));
        // `index` is the root route; it has no ROUTE_TABLE segment of its own.
        const orphans = [...linkedScreenNames()].filter((name) => name !== 'index' && !tabled.has(name));
        expect(orphans).toEqual([]);
    });
});

describe('layout registration: the live fight cannot be swiped or backed out of', () => {
    it('registers combat-encounter/index full-screen with the iOS swipe off', async () => {
        const source = await fs.readFile(ROOT_LAYOUT, 'utf8');
        const block = source.match(/name="combat-encounter\/index"[\s\S]*?\/>/)?.[0] ?? '';
        expect(block).toContain("presentation: 'fullScreenModal'");
        expect(block).toContain('gestureEnabled: false');
    });
});
