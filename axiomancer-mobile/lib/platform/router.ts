/**
 * The navigation seam: the single import site every application call
 * site routes through. The implementation is `@react-navigation/native`
 * + `native-stack` + `bottom-tabs` (the bare-RN libraries Expo Router
 * itself is built on), behind Expo-Router-shaped call sites
 * (`useRouter().push('/x')`, `<Stack.Screen name="x/index" />`,
 * `useLocalSearchParams()`, `usePathname()`, `<Redirect href="/x" />`).
 * There is no file-tree auto-discovery: `_layout.tsx` gives every
 * screen an explicit `component` prop.
 */
import { useEffect, useState } from 'react';
import {
  createNavigationContainerRef,
  StackActions,
  useRoute,
  type LinkingOptions,
  type NavigationState,
  type ParamListBase,
  type PartialState,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getLogger } from '@mechanics';

export { NavigationContainer } from '@react-navigation/native';

// `<Stack>`/`<Tabs>` compat surface: expo-router's own versions are a
// thin wrapper over exactly these two factories, with `.Screen`
// attached to the Navigator component so `<Stack>...<Stack.Screen/>`
// JSX works as-is. Every screen the app has is an explicit
// `<Stack.Screen name="..." component={...} />` in `app/_layout.tsx` /
// `app/(tabs)/_layout.tsx`.
const RootStack = createNativeStackNavigator();
export const Stack = Object.assign(RootStack.Navigator, { Screen: RootStack.Screen });

const RootTabs = createBottomTabNavigator();
export const Tabs = Object.assign(RootTabs.Navigator, { Screen: RootTabs.Screen });

// Every `router.push('/segment')` / `<Redirect href="/segment">` call
// site uses file-tree-style path strings (e.g. `/hazard`,
// `/(tabs)/exploration`, `/combat-encounter?seed=16`). This table is
// the one place that owns segment -> registered screen `name` resolution.
// `tab: true` entries live under the nested `(tabs)` navigator and
// resolve via a nested `navigate`, not a root Stack push (matching
// expo-router's own tab-link behavior — visiting a tab focuses it,
// it doesn't stack a second copy of the tab navigator).
type RouteEntry = { screen: string; tab: boolean };

export const ROUTE_TABLE: Readonly<Record<string, RouteEntry>> = {
  '': { screen: 'index', tab: false },
  saves: { screen: 'saves/index', tab: false },
  'character-select': { screen: 'character-select/index', tab: false },
  settings: { screen: 'settings/index', tab: false },
  hazard: { screen: 'hazard/index', tab: false },
  'combat-encounter': { screen: 'combat-encounter/index', tab: false },
  'hazard-deck': { screen: 'hazard-deck/index', tab: false },
  'item-reward': { screen: 'item-reward/index', tab: false },
  'death-return': { screen: 'death-return/index', tab: false },
  'game-over': { screen: 'game-over/index', tab: false },
  rest: { screen: 'rest/index', tab: false },
  quest: { screen: 'quest/index', tab: false },
  travel: { screen: 'travel/index', tab: false },
  cache: { screen: 'cache/index', tab: false },
  blacksmith: { screen: 'blacksmith/index', tab: false },
  village: { screen: 'village/index', tab: false },
  dialogue: { screen: 'dialogue/index', tab: false },
  cutscene: { screen: 'cutscene/index', tab: false },
  dev: { screen: 'dev/index', tab: false },
  labyrinth: { screen: 'labyrinth/index', tab: false },
  devart: { screen: 'devart/index', tab: false },
  'devart/rooms': { screen: 'devart/rooms', tab: false },
  devaftermath: { screen: 'devaftermath/index', tab: false },
  devpuzzle: { screen: 'devpuzzle/index', tab: false },
  devframes: { screen: 'devframes/index', tab: false },
  exploration: { screen: 'exploration/index', tab: true },
  character: { screen: 'character/index', tab: true },
  memoir: { screen: 'memoir/index', tab: true },
  inventory: { screen: 'inventory/index', tab: true },
  deck: { screen: 'deck/index', tab: true },
};

// `NavigationContainer`'s linking config — mirrors `ROUTE_TABLE`
// exactly (segment -> URL path). This is what makes a fresh page load
// at `/character`, `/hazard`, etc. resolve to the right screen on web
// (scripts/*-e2e.mjs and scripts/smoke-screens.mjs depend on exactly
// this). `prefixes: []` is intentional: native deep-linking via the
// `axiomancer://` scheme is not wired to navigation (see the note in
// `app/_layout.tsx`).
// `PathConfigMap<ParamListBase>` can't express a nested `screens` block
// generically (the generic param type per key is `object | undefined`,
// not a nested ParamListBase to recurse into) — the `as` below is the
// standard react-navigation escape hatch for hand-authored nested
// linking config; the shape itself is still checked structurally by
// `LinkingOptions`' outer fields (`prefixes`, `config.screens`).
export const linking = {
  prefixes: [],
  config: {
    screens: {
      index: '',
      'saves/index': 'saves',
      'character-select/index': 'character-select',
      'settings/index': 'settings',
      'hazard/index': 'hazard',
      'combat-encounter/index': 'combat-encounter',
      'hazard-deck/index': 'hazard-deck',
      'item-reward/index': 'item-reward',
      'death-return/index': 'death-return',
      'game-over/index': 'game-over',
      'rest/index': 'rest',
      'quest/index': 'quest',
      'travel/index': 'travel',
      'cache/index': 'cache',
      'blacksmith/index': 'blacksmith',
      'village/index': 'village',
      'dialogue/index': 'dialogue',
      'cutscene/index': 'cutscene',
      'dev/index': 'dev',
      'labyrinth/index': 'labyrinth',
      'devart/index': 'devart',
      'devart/rooms': 'devart/rooms',
      'devaftermath/index': 'devaftermath',
      'devpuzzle/index': 'devpuzzle',
      'devframes/index': 'devframes',
      '(tabs)': {
        screens: {
          'exploration/index': 'exploration',
          'character/index': 'character',
          'memoir/index': 'memoir',
          'inventory/index': 'inventory',
          'deck/index': 'deck',
        },
      },
    },
  },
} as unknown as LinkingOptions<ParamListBase>;

// Root-scoped imperative handle. expo-router's `useRouter()` is also
// root-scoped in practice (`router.push('/village')` from a deeply
// nested tab screen pushes onto the outer stack, not the tab's own
// navigator) — a container ref reproduces that without needing to
// walk `navigation.getParent()` chains from arbitrary call depths.
export const navigationRef = createNavigationContainerRef<ParamListBase>();

function parseHref(href: string): { entry: RouteEntry | undefined; params?: Record<string, string> } {
  const [pathPart, queryPart] = href.split('?');
  let segment = pathPart.replace(/^\/+/, '').replace(/\/+$/, '');
  if (segment.startsWith('(tabs)/')) segment = segment.slice('(tabs)/'.length);
  const params = queryPart ? Object.fromEntries(new URLSearchParams(queryPart)) : undefined;
  return { entry: ROUTE_TABLE[segment], params };
}

/**
 * The navigation request that arrived before the container was ready.
 *
 * A `<Redirect>` can fire on a screen's FIRST paint, before the
 * NavigationContainer attaches. `Redirect`'s effect is keyed on `[href]`, and
 * `href` never changes, so the effect cannot re-run: if `dispatchTo` dropped
 * the request while `navigationRef.isReady()` was false, the screen would stay
 * blank forever. So the request is held here and replayed on ready.
 *
 * Last-write-wins on purpose: only the most recent request can still be
 * correct. If two screens both asked to navigate while the container was
 * starting, replaying the older one would land the player somewhere they have
 * already navigated away from.
 *
 * This is deliberately module-scoped rather than React state — the callers are
 * `useRouter().push/replace` and `<Redirect>`, which can fire from anywhere
 * (including effects that run before any provider mounts).
 */
let pendingNavigation: { href: string; mode: 'push' | 'replace' } | null = null;

/**
 * Replay the navigation request that was dropped before the container was
 * ready, if there was one.
 *
 * Called from `<NavigationContainer onReady>` in `app/_layout.tsx`. Idempotent:
 * the pending request is cleared BEFORE it is dispatched, so a re-entrant or
 * duplicate `onReady` cannot double-navigate, and a dispatch that itself fails
 * does not leave a request queued forever.
 *
 * Exported for `_layout.tsx` and for the regression test.
 */
export function flushPendingNavigation(): void {
  const queued = pendingNavigation;
  pendingNavigation = null;
  if (!queued) return;
  dispatchTo(queued.href, queued.mode);
}

/** Test seam: forget any queued request between cases. */
export function __resetPendingNavigationForTests(): void {
  pendingNavigation = null;
}

function dispatchTo(href: string, mode: 'push' | 'replace'): void {
  if (!navigationRef.isReady()) {
    // Queue rather than drop — see `pendingNavigation`. `onReady` replays it.
    pendingNavigation = { href, mode };
    return;
  }
  const { entry, params } = parseHref(href);
  if (!entry) {
    // Was `__DEV__ && console.warn`, i.e. invisible in a production build —
    // which is exactly why BUG-02 reached a player as a blank screen with
    // nothing in the log. Route it through the app logger so the next
    // occurrence lands in the crash tail (`PREV SESSION` under DIAGNOSTICS).
    reportRouterFault('unknown-route', { href });
    return;
  }
  if (entry.tab) {
    navigationRef.navigate('(tabs)', { screen: entry.screen, params });
    return;
  }
  navigationRef.dispatch(
    mode === 'push' ? StackActions.push(entry.screen, params) : StackActions.replace(entry.screen, params),
  );
}

/**
 * Log a navigation fault without ever letting logging break navigation.
 *
 * The logger reaches `@mechanics` and a log-tail adapter; if any of that is
 * unavailable (a test harness, a cold boot before `initAppLogging`), a thrown
 * error here would take out the very redirect we are trying to diagnose.
 */
function reportRouterFault(event: string, payload: Record<string, unknown>): void {
  try {
    getLogger().warn('nav', event, payload);
  } catch {
    /* logging never breaks navigation */
  }
}

export function useRouter() {
  return {
    push: (href: string) => dispatchTo(href, 'push'),
    replace: (href: string) => dispatchTo(href, 'replace'),
    back: () => {
      if (navigationRef.isReady()) navigationRef.goBack();
    },
    canGoBack: () => navigationRef.isReady() && navigationRef.canGoBack(),
  };
}

export function useLocalSearchParams<T extends Record<string, unknown> = Record<string, string>>(): T {
  const route = useRoute();
  return (route.params ?? {}) as T;
}

type NavState = NavigationState | PartialState<NavigationState>;

function buildPath(state: NavState): string {
  const routes = state.routes;
  const index = state.index ?? routes.length - 1;
  const route = routes[index];
  return route.state ? `${route.name}/${buildPath(route.state)}` : route.name;
}

// `useNavigationState` needs `NavigationStateListenerContext`, which a
// Navigator provides to its own screen subtree — not `NavigationContainer`
// itself. `NavLogger` (this hook's only caller) renders as a sibling of
// `<Stack>`, not inside it, so it reaches for the same root-scoped
// `navigationRef` `useRouter()` already uses instead.
export function usePathname(): string {
  const [path, setPath] = useState(computeCurrentPath);
  useEffect(() => {
    setPath(computeCurrentPath());
    return navigationRef.addListener('state', () => setPath(computeCurrentPath()));
  }, []);
  return path;
}

function computeCurrentPath(): string {
  if (!navigationRef.isReady()) return '/';
  const state = navigationRef.getRootState();
  return state ? `/${buildPath(state)}` : '/';
}

export function Redirect({ href }: { href: string }): null {
  useEffect(() => {
    dispatchTo(href, 'replace');
  }, [href]);
  return null;
}
