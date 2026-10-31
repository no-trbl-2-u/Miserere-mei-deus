import { NavigationContainer, Stack, linking, navigationRef, flushPendingNavigation } from '@/lib/platform/router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from '@/lib/platform/font';
import * as SplashScreen from '@/lib/platform/splash-screen';
import * as NavigationBar from '@/lib/platform/navigation-bar';
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { isDevToolsEnabled } from '@/lib/buildProfile';
import { Platform } from 'react-native';
import { StatusBar } from '@/lib/platform/status-bar';
import { TooltipProvider } from '@/components/tooltip/TooltipProvider';
import { CombatModeProvider } from '@/state/combat-mode';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { FontProvider } from '@/hooks/useFontFallbacks';
// Map event pools are authored and self-registered by the engine
// (axiomancer-mechanics → World/MapEvents/content); the client registers
// none of its own.
// Side-effect: skin the web scrollbar to match the gothic chrome.
import '@/theme/web-scrollbar';
import { createAsyncStorageAdapter } from '@/state/persistence/asyncStorageAdapter';
import { SaveOnExit } from '@/components/SaveOnExit';
import { createFixtureBootAdapter } from '@/state/persistence/fixtureBootAdapter';
import { resolveBootFixture } from '@/state/fixtures';
import { FixtureBoot } from '@/components/FixtureBoot';
import { CorruptSaveModal } from '@/components/CorruptSaveModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SaveSlotsProvider } from '@/state/SaveSlotsProvider';
import { SettingsProvider, settingsStore } from '@/state/settings';
import { devSettingsStore } from '@/state/dev/dev-settings';
import { PrevSessionCrashPrompt } from '@/components/PrevSessionCrashPrompt';
import { HardwareBackHandler } from '@/components/HardwareBackHandler';
import { BlacksmithGate } from '@/components/BlacksmithGate';
import { CacheGate } from '@/components/CacheGate';
import { QuestGate } from '@/components/QuestGate';
import { TravelGate } from '@/components/TravelGate';
import { EventGate } from '@/components/EventGate';
import { HazardGate } from '@/components/HazardGate';
import { CombatGate } from '@/components/CombatGate';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { LabyrinthGate } from '@/components/LabyrinthGate';
import { ItemRewardGate } from '@/components/item-reward/ItemRewardGate';
import { RestGate } from '@/components/RestGate';
import { NavLogger } from '@/components/NavLogger';
import { ToastHost } from '@/components/ToastHost';
import { getLogger } from '@mechanics';
import { initAppLogging } from '@/state/logging';
import { attachCrashBreadcrumbs, initCrashReporting, registerNavigationTracing, withCrashReporting } from '@/lib/monitoring';
import IndexScreen from './index';
import SaveSlotsScreen from './saves/index';
import CharacterSelectScreen from './character-select/index';
import SettingsScreen from './settings/index';
import TabLayout from './(tabs)/_layout';
import HazardScreen from './hazard/index';
import CombatEncounterScreen from './combat-encounter/index';
import HazardDeckScreen from './hazard-deck/index';
import ItemRewardScreen from './item-reward/index';
import RestScreen from './rest/index';
import DeathReturnScreen from './death-return/index';
import CacheScreen from './cache/index';
import QuestScreen from './quest/index';
import TravelScreen from './travel/index';
import BlacksmithScreen from './blacksmith/index';
import VillageScreen from './village/index';
import DialogueScreen from './dialogue/index';
import CutsceneScreen from './cutscene/index';
import DevToolsScreen from './dev/index';
import LabyrinthScreen from './labyrinth/index';
import DevArtGallery from './devart/index';
import DevRoomGallery from './devart/rooms';
import DevAftermathPanel from './devaftermath/index';
import DevHazardPuzzles from './devpuzzle/index';
import DevFrameHarness from './devframes/index';

// Vendored locally (OFL-licensed .ttf files, sourced under
// assets/fonts/LICENSES/). Keys are the exact fontFamily strings
// `theme/axm.ts` references; `expo-font`'s loader keys a font by
// this object's property name, not the file name.
const PirataOne_400Regular = require('@/assets/fonts/PirataOne_400Regular.ttf');
const IMFellEnglish_400Regular = require('@/assets/fonts/IMFellEnglish_400Regular.ttf');
const IMFellEnglish_400Regular_Italic = require('@/assets/fonts/IMFellEnglish_400Regular_Italic.ttf');
const BebasNeue_400Regular = require('@/assets/fonts/BebasNeue_400Regular.ttf');
const JetBrainsMono_400Regular = require('@/assets/fonts/JetBrainsMono_400Regular.ttf');

SplashScreen.preventAutoHideAsync();

// Crash reporting (lib/monitoring.ts) — FIRST, so a crash during the boot
// below is still reported. Native-only and DSN-gated; a no-op on web.
initCrashReporting();

// The root container is ready: replay a queued navigation request, then hand
// the container to Sentry for per-screen transactions (preview builds only).
function onNavigationReady(): void {
  flushPendingNavigation();
  registerNavigationTracing(navigationRef);
}

// AXM Log (docs/logging.md) — enable the structured logger before any
// store/provider touches the engine so boot-time events are captured.
initAppLogging();

// …then hang Sentry's breadcrumb sink off the logger `initAppLogging` just
// configured (it replaces the logger, so this cannot run any earlier). Every
// structured line from here on becomes a breadcrumb attached to a crash.
attachCrashBreadcrumbs();

// Single app-wide persistence adapter. Created once at module load; the
// `preload()` call below populates its in-memory cache from AsyncStorage
// before `<GameStoreProvider>` mounts. Tests bypass this entirely via
// the provider's `adapter` / `store` props.
const persistenceAdapter = createAsyncStorageAdapter();

// Player settings (theme, motion, haptics, text size, audio)
// hydrate from their own AsyncStorage key alongside the save preload below.
// They are a UX preference, not gameplay state — a new game never resets them.
const settingsHydrated = settingsStore.hydrate();

// Dev settings (the play-log switch) have their own key and hydrate only in
// a dev-tools build; a production launch never reads them.
const devSettingsHydrated = isDevToolsEnabled() ? devSettingsStore.hydrate() : Promise.resolve();

// State-fixture boot (`state/fixtures.ts`): when a dev build
// is asked for a fixture (`?fixture=<id>` or `__AXM_FIXTURE__`), the
// store boots from that compiled state through an in-memory adapter —
// the AsyncStorage slot is neither read into the store nor written to.
// `null` on every normal launch, so production uses the real
// persistence adapter.
const bootFixture = resolveBootFixture();
const storeAdapter = bootFixture ? createFixtureBootAdapter(bootFixture.state) : persistenceAdapter;

// Dev-only skip hook (`components/DevSkipBridge.tsx`). Lazy so the skip
// module and the engine combat sim it imports stay out of production
// bundles; the mount below is additionally gated on `isDevToolsEnabled()`.
// Web-only ready signal for the screenshot scripts
// (`scripts/lib/page-ready.mjs`): set once every font has settled, loaded or
// failed, so a shot never lands mid font swap. Native builds get nothing.
function markWebReady(): void {
  if (Platform.OS === 'web') document.documentElement.dataset.axmReady = '1';
}

const DevSkipBridge = lazy(() =>
  import('@/components/DevSkipBridge').then((m) => ({ default: m.DevSkipBridge })),
);

function RootLayout() {
  // Load core fonts only - reduces initial font bundle by ~40%
  const [fontsLoaded] = useFonts({
    PirataOne_400Regular,
    IMFellEnglish_400Regular,
    IMFellEnglish_400Regular_Italic,
  });
  
  // Asynchronously load decorative fonts after app starts
  const [secondaryFontsLoaded, setSecondaryFontsLoaded] = useState(false);
  
  const [preloaded, setPreloaded] = useState(false);
  const [corruptSave, setCorruptSave] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([persistenceAdapter.preload(), settingsHydrated, devSettingsHydrated])
      .catch((err: unknown) => {
        // Surface "save corrupted — start new game?" to the user via
        // CorruptSaveModal; the
        // console.warn stays as a dev breadcrumb so the failure shows up
        // in Metro logs alongside the modal mount.
        if (__DEV__) {
          console.warn('[persistence] preload failed; surfacing modal', err);
        }
        getLogger().warn('persistence', 'preload-failed', {
          message: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) setCorruptSave(true);
      })
      .finally(() => {
        if (!cancelled) setPreloaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onCorruptConfirm = useCallback(() => {
    // Clear the corrupt slot + drop the modal. The provider boots a fresh
    // `createNewGameState` because the persistence cache is now null.
    getLogger().info('persistence', 'corrupt-save-cleared');
    persistenceAdapter.clear().catch((err: unknown) => {
      if (__DEV__) {
        console.warn('[persistence] clear failed after corrupt-save confirm', err);
      }
      getLogger().error('persistence', 'corrupt-save-clear-failed', {
        message: err instanceof Error ? err.message : String(err),
      });
    });
    setCorruptSave(false);
  }, []);

  const onCorruptCancel = useCallback(() => {
    // Keep the modal mounted so the user can troubleshoot / reach support.
    // No-op intentionally — the modal stays visible until they choose
    // Confirm or close the app.
  }, []);

  // Load secondary fonts after the app starts (non-blocking)
  useEffect(() => {
    if (fontsLoaded && preloaded) {
      SplashScreen.hideAsync();

      // Load decorative fonts asynchronously after startup
      import('expo-font').then(({ loadAsync }) => {
        loadAsync({
          BebasNeue_400Regular,
          JetBrainsMono_400Regular,
        }).then(() => {
          setSecondaryFontsLoaded(true);
          markWebReady();
        }).catch((err) => {
          // Fallback gracefully - app works without decorative fonts
          if (__DEV__) {
            console.warn('[fonts] secondary fonts failed to load', err);
          }
          markWebReady();
        });
      }).catch((err) => {
        if (__DEV__) {
          console.warn('[fonts] expo-font import failed', err);
        }
        markWebReady();
      });
    }
  }, [fontsLoaded, preloaded]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // Best-effort: phones using gesture nav already hide the system bar,
    // but on devices with 3-button nav this drives it offscreen
    // until the user swipes from the bottom edge.
    NavigationBar.setVisibilityAsync('hidden').catch(() => undefined);
  }, []);

  // Deep linking is declared in `app.json` (`scheme: "axiomancer"`)
  // but **not yet wired to navigation**. When deep-linking is
  // wired, register the subscription here, look up the route from
  // `Linking.parse`, and call `router.replace(...)` (the router
  // must come from `useRouter()` rendered below the `<Stack>`
  // boundary, so the handler likely belongs in a child component,
  // not in this root layout).

  if (!fontsLoaded || !preloaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <CorruptSaveModal
        visible={corruptSave}
        onConfirm={onCorruptConfirm}
        onCancel={onCorruptCancel}
      />
      <PrevSessionCrashPrompt />
      <GameStoreProvider adapter={storeAdapter}>
        {/* The slot store the menu drives. A fixture boot gets an in-memory
            one (the provider's default) so a test session can never reach
            the player's real slots. */}
        <SaveSlotsProvider slots={bootFixture ? undefined : persistenceAdapter}>
        <SettingsProvider>
        {/* ErrorBoundary mounts INSIDE the GameStoreProvider so
            the fallback ErrorScreen can read engine state via
            useGameState for the debug snapshot. */}
        <ErrorBoundary>
          <FontProvider secondaryLoaded={secondaryFontsLoaded}>
          <CombatModeProvider>
          <TooltipProvider>
            {/* A navigation request (e.g. a `<Redirect>` on first paint)
            can fire BEFORE this container attaches. The router queues it;
            `onReady` is where it gets replayed. */}
            <NavigationContainer
          ref={navigationRef}
          linking={linking}
          onReady={onNavigationReady}
            >
          <StatusBar barStyle="light-content" />
          <HardwareBackHandler />
          <NavLogger />
          <EventGate />
          <HazardGate />
          <CombatGate />
          <BackgroundMusic />
          <RestGate />
          <CacheGate />
          <QuestGate />
          <TravelGate />
          <ItemRewardGate />
          <BlacksmithGate />
          <LabyrinthGate />
          {/* Dev-only: `globalThis.__AXM_SKIP_EVENT__` for browser drivers
              (docs/dev-tools.md → "Skip the current event"). Lazy AND
              gated, so production bundles never load the skip module. */}
          {isDevToolsEnabled() && (
            <Suspense fallback={null}>
              <DevSkipBridge />
            </Suspense>
          )}
          <ToastHost />
          {/* The adapter's 500ms write debounce could eat a checkpoint if
              the player closed inside it. This takes a final save and
              flushes it on background/pagehide. */}
          <SaveOnExit adapter={storeAdapter} />
          <FixtureBoot />
          {/* `initialRouteName="index"`: every launch begins at the title
              and its menu. Without it the native stack would open on the
              first registered screen — the tabs — and skip the title on a
              phone while web (URL `/`) showed it. A new game starts with
              nothing, in dev builds too; the `/dev` route seeds on demand. */}
          <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" component={IndexScreen} options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" component={TabLayout} options={{ headerShown: false }} />
            <Stack.Screen
              name="saves/index"
              component={SaveSlotsScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="character-select/index"
              component={CharacterSelectScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="settings/index"
              component={SettingsScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="hazard/index"
              component={HazardScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="combat-encounter/index"
              component={CombatEncounterScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="hazard-deck/index"
              component={HazardDeckScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            {/* The ONE reward screen that is dismissible on purpose.
                No `gestureEnabled: false` and no <HardwareBackHandler>: the
                item is already the player's and every exit commits it as
                CONFIRM (see `app/item-reward/index.tsx`). Do not "fix" this
                to match the hazard/cache/rest screens beside it. */}
            <Stack.Screen
              name="item-reward/index"
              component={ItemRewardScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="death-return/index"
              component={DeathReturnScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="rest/index"
              component={RestScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="cache/index"
              component={CacheScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="quest/index"
              component={QuestScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="travel/index"
              component={TravelScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="blacksmith/index"
              component={BlacksmithScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="village/index"
              component={VillageScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="dialogue/index"
              component={DialogueScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="cutscene/index"
              component={CutsceneScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="dev/index"
              component={DevToolsScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="labyrinth/index"
              component={LabyrinthScreen}
              options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <Stack.Screen
              name="devart/index"
              component={DevArtGallery}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="devart/rooms"
              component={DevRoomGallery}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="devaftermath/index"
              component={DevAftermathPanel}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="devpuzzle/index"
              component={DevHazardPuzzles}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="devframes/index"
              component={DevFrameHarness}
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
          </Stack>
            </NavigationContainer>
          </TooltipProvider>
          </CombatModeProvider>
          </FontProvider>
        </ErrorBoundary>
        </SettingsProvider>
        </SaveSlotsProvider>
      </GameStoreProvider>
    </GestureHandlerRootView>
  );
}

// Wrapped so Sentry sees render errors and the native lifecycle. A plain
// passthrough when reporting never started (web, or no DSN configured).
export default withCrashReporting(RootLayout);
