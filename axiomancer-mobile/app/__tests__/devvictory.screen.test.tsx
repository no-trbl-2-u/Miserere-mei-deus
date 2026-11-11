/**
 * Hermetic screen test — the victory screen's dev preview (phase FE1b, A7).
 *
 * The route `verify:visual` shoots: the Quay-Crab fallen on the Breakwater,
 * a purse of 41, the three grey cards on offer, drawn at the level panel's
 * settled end, both ways (the settled shot's left and middle screens). A
 * build without dev tools renders nothing.
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

const mockParams: Record<string, string> = {};
let mockDevTools = true;
jest.mock('@/lib/platform/router', () => ({
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => mockParams,
}));
jest.mock('@/lib/buildProfile', () => ({
    isDevToolsEnabled: () => mockDevTools,
    getBuildProfile: () => 'preview',
    getBuildCommit: () => 'abc1234',
}));

import DevVictoryPreview from '@/app/devvictory/index';
import { withAllProviders } from '@/test-utils/withAllProviders';

function mount() {
    render(withAllProviders(<DevVictoryPreview />).tree);
}

beforeEach(() => {
    mockDevTools = true;
    delete mockParams.levelled;
});

describe('/devvictory', () => {
    it('no level: XP +40 and "30 XP to level 2", settled', () => {
        mount();
        expect(screen.getByTestId('combat-victory-chapter').props.children).toBe('BREAKWATER');
        expect(screen.getByTestId('combat-victory-purse').props.children).toBe('Shillings 41');
        expect(screen.getByTestId('combat-victory-paid').props.children).toBe('Shillings +15 · XP +40');
        expect(screen.getByTestId('victory-level-line').props.children).toBe('30 XP to level 2');
        for (const id of ['grey-strike', 'grey-ward', 'grey-word']) {
            expect(screen.getByTestId(`combat-reward-${id}`)).toBeTruthy();
        }
    });

    it('?levelled=1: XP +70 and "LEVEL 2", settled', () => {
        mockParams.levelled = '1';
        mount();
        expect(screen.getByTestId('combat-victory-paid').props.children).toBe('Shillings +15 · XP +70');
        expect(screen.getByTestId('victory-level-line').props.children).toBe('LEVEL 2');
    });

    it('renders nothing without dev tools', () => {
        mockDevTools = false;
        mount();
        expect(screen.getByTestId('devvictory-disabled')).toBeTruthy();
        expect(screen.queryByTestId('combat-victory')).toBeNull();
    });
});
