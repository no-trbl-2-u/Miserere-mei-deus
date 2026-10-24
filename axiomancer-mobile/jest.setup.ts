import '@testing-library/jest-native/extend-expect';

jest.mock('expo-font', () => ({
    useFonts: () => [true, null],
    isLoaded: () => true,
}));

jest.mock('expo-splash-screen', () => ({
    preventAutoHideAsync: () => Promise.resolve(),
    hideAsync: () => Promise.resolve(),
    setOptions: () => undefined,
}));

// react-native-haptic-feedback's default (non-.web) entry point calls
// `TurboModuleRegistry.getEnforcing('RNHapticFeedback')` at import time
// (codegenSpec/NativeHapticFeedback.js) — throws synchronously under Jest,
// since no native project is linked.
jest.mock('react-native-haptic-feedback', () => ({
    trigger: jest.fn(),
    HapticFeedbackTypes: {
        selection: 'selection',
        impactLight: 'impactLight',
        impactMedium: 'impactMedium',
        impactHeavy: 'impactHeavy',
        rigid: 'rigid',
        soft: 'soft',
        notificationSuccess: 'notificationSuccess',
        notificationWarning: 'notificationWarning',
        notificationError: 'notificationError',
    },
}));

// `@sentry/react-native` ships untranspiled ESM that Jest cannot parse, and
// `lib/monitoring.ts` now reaches the combat panel (drag spans). Nothing
// under Jest starts a client, so an inert stub is the whole contract;
// `lib/__tests__/monitoring.test.ts` replaces it with its own spies.
jest.mock('@sentry/react-native', () => ({
    init: jest.fn(),
    wrap: (root: unknown) => root,
    addBreadcrumb: jest.fn(),
    startInactiveSpan: jest.fn(() => ({ setAttribute: jest.fn(), end: jest.fn() })),
    reactNavigationIntegration: jest.fn(() => ({ name: 'ReactNavigation', registerNavigationContainer: jest.fn() })),
}));

require('react-native-reanimated/mock');

// AsyncStorage's native module isn't available in a Jest-Node
// environment; route every consumer through the package's official
// in-memory mock. Persistence-specific suites still scope cleanup
// via `AsyncStorage.clear()` in their own afterEach.
jest.mock('@react-native-async-storage/async-storage', () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// `@/lib/buildProfile` reads `Constants.expoConfig.extra.devToolsEnabled`
// (set by `app.config.ts` from `EAS_BUILD_PROFILE`). Under Jest that
// signal isn't present and we want the existing `__DEV__`-toggling
// suite contracts (DevMenu, Debug*)
// to keep working, so route the helper directly to the same global
// flag those suites already swap.
jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: () => (globalThis as { __DEV__?: boolean }).__DEV__ !== false,
    getBuildProfile: () => null,
    getBuildCommit: () => null,
}));
