/**
 * Hermetic E2E Tests — App component smoke tests
 *
 * Smoke/render tests for main app-level screen components to ensure
 * they can be imported without errors. Provides basic test coverage for the
 * app directory structure as required by the audit finding [7.2].
 *
 * Hermetic = self-contained + deterministic + isolated.
 * See docs/testing.md for the full standard.
 */

import { describe, it, expect, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { createAppStore } from '@/state/store';
import { GameStoreProvider } from '@/state/GameStoreProvider';
import { SaveSlotsProvider } from '@/state/SaveSlotsProvider';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

// Mock expo-router for all tests
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({
        replace: jest.fn(),
        push: jest.fn(),
        back: jest.fn(),
        canGoBack: () => false,
    }),
    useLocalSearchParams: () => ({}),
    Redirect: () => null,
    Tabs: () => null,
    Stack: () => null,
}));

// Import components after mocks
import IndexScreen from '@/app/index';
import InventoryScreen from '@/app/(tabs)/inventory/index';
import MemoirScreen from '@/app/(tabs)/memoir/index';

describe('App Component Smoke Tests', () => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
        const store = createAppStore({ adapter: createMemoryAdapter() });
        return (
            <GameStoreProvider store={store}>
                <SaveSlotsProvider>{children}</SaveSlotsProvider>
            </GameStoreProvider>
        );
    };

    describe('Main App Screens', () => {
        it('renders index screen without crashing', () => {
            expect(() => {
                render(
                    <TestWrapper>
                        <IndexScreen />
                    </TestWrapper>
                );
            }).not.toThrow();
        });

        it('renders inventory screen without crashing', () => {
            expect(() => {
                render(
                    <TestWrapper>
                        <InventoryScreen />
                    </TestWrapper>
                );
            }).not.toThrow();
        });

        it('renders memoir screen without crashing', () => {
            expect(() => {
                render(
                    <TestWrapper>
                        <MemoirScreen />
                    </TestWrapper>
                );
            }).not.toThrow();
        });
    });

    describe('Component Imports', () => {
        it('can import all main app components without syntax errors', () => {
            // Test that all main app components can be imported
            expect(() => {
                require('@/app/index');
                require('@/app/(tabs)/inventory/index');
                require('@/app/(tabs)/memoir/index');
                require('@/app/(tabs)/character/index');
                require('@/app/(tabs)/exploration/index');
                require('@/app/(tabs)/_layout');
            }).not.toThrow();
        });

        it('verifies all required app files exist and are importable', () => {
            // Tests that the main app directory has proper structure
            const appComponents = [
                '@/app/index',
                '@/app/(tabs)/_layout',
                '@/app/(tabs)/character/index',
                '@/app/(tabs)/exploration/index',
                '@/app/(tabs)/inventory/index',
                '@/app/(tabs)/memoir/index'
            ];

            appComponents.forEach(component => {
                expect(() => require(component)).not.toThrow();
            });
        });
    });
});