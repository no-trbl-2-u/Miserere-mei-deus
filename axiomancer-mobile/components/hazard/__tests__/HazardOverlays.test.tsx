import React from 'react';
import { render } from '@testing-library/react-native';

import { 
    DiceRollOverlay, 
    ResolveFlashOverlay, 
    OutcomeOverlay, 
    CardDetailOverlay,
    STAMP_SPRING,
} from '../HazardOverlays';
import type { 
    HazardCardVM, 
    HazardDieVM, 
    HazardResolveFlashVM, 
    HazardOutcomeVM 
} from '@/state/presenters/hazard.engine';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
});

type TestNode = { props?: Record<string, unknown>; children?: unknown[]; parent?: TestNode | null };

/** Depth-first testIDs under a node, in render order. */
function renderOrder(node: TestNode): string[] {
    const out: string[] = [];
    const walk = (n: unknown): void => {
        if (n === null || typeof n !== 'object') return;
        const el = n as TestNode;
        if (typeof el.props?.testID === 'string') out.push(el.props.testID);
        for (const c of el.children ?? []) walk(c);
    };
    walk(node);
    return out;
}

/** testIDs of every ancestor of a node. */
function ancestorIds(node: TestNode): string[] {
    const out: string[] = [];
    for (let p = node.parent; p; p = p.parent) {
        if (typeof p.props?.testID === 'string') out.push(p.props.testID);
    }
    return out;
}

const mockCard: HazardCardVM = {
    uid: 'test-card-1',
    cardId: 'test-card',
    name: 'Test Card',
    kind: 'red',
    rarity: 'common',
    dead: false,
    utility: false,
    free: { force: 3, escape: 1 },
    powered: { force: 5, escape: 2 },
    freeEffectLabel: '',
    poweredEffectLabel: '',
    flavor: 'Free action description',
    keywords: [],
    dieAvailable: true,
    poweredByDieId: null,
    applied: false,
    salvageLabel: null,
};

const mockDice: HazardDieVM[] = [
    {
        id: 'die-1',
        kind: 'red',
        state: 'available',
        isHex: false,
        usable: true,
        temporary: false,
        accessibilityLabel: 'Red die, available',
    },
    {
        id: 'die-2',
        kind: 'blue',
        state: 'spent',
        isHex: false,
        usable: false,
        temporary: false,
        accessibilityLabel: 'Blue die, spent',
    },
];

const mockResolveFlash: HazardResolveFlashVM = {
    cleared: true,
    verdict: 'pass',
    roundRoman: 'I',
    stats: [
        { key: 'force', label: 'FORCE', got: 5, need: 4, ok: true },
        { key: 'escape', label: 'ESCAPE', got: 2, need: 3, ok: false },
    ],
    carryNote: null,
};

const mockOutcome: HazardOutcomeVM = {
    tier: 'complete',
    word: 'Victory',
    sub: 'Complete',
    line: 'You have successfully completed the hazard.',
    ctaLabel: 'Continue',
    marks: [],
};

describe('STAMP_SPRING', () => {
    // Same bound as the dice tray's springs (dice-roll-ritual.test.ts): an
    // underdamped spring finishes at mass * ln(1 / energyThreshold) / damping
    // seconds, so naming mass and threshold keeps the slam under a second.
    it('comes to rest inside a second', () => {
        const s = STAMP_SPRING;
        expect((s.mass * Math.log(1 / s.energyThreshold)) / s.damping).toBeLessThan(1);
    });
});

describe('DiceRollOverlay', () => {
    it('renders dice roll animation', () => {
        const { root } = render(
            <DiceRollOverlay 
                dice={mockDice} 
                routeLabel="Risk Route" 
                routeKey="risk" 
                onDone={jest.fn()} 
            />
        );
        expect(root).toBeTruthy();
    });

    it('handles empty dice array', () => {
        const { root } = render(
            <DiceRollOverlay 
                dice={[]} 
                routeLabel="Safe Route" 
                routeKey="safe" 
                onDone={jest.fn()} 
            />
        );
        expect(root).toBeTruthy();
    });
});

describe('ResolveFlashOverlay', () => {
    it('renders resolve flash with pass verdict', () => {
        const { getByText } = render(
            <ResolveFlashOverlay flash={mockResolveFlash} onDone={jest.fn()} />
        );
        expect(getByText(/ROUND I — CLEARED/)).toBeTruthy();
        expect(getByText('pass')).toBeTruthy();
    });

    it('renders resolve flash with fail verdict', () => {
        const failFlash = { ...mockResolveFlash, verdict: 'fail' as const };
        const { root } = render(
            <ResolveFlashOverlay flash={failFlash} onDone={jest.fn()} />
        );
        expect(root).toBeTruthy();
    });
});

describe('OutcomeOverlay', () => {
    it('renders complete outcome', () => {
        const { getByText } = render(
            <OutcomeOverlay outcome={mockOutcome} onContinue={jest.fn()} />
        );
        expect(getByText('Victory')).toBeTruthy();
        expect(getByText('Continue')).toBeTruthy();
    });

    it('renders failure outcome', () => {
        const failureOutcome = { 
            ...mockOutcome, 
            tier: 'failure' as const, 
            word: 'Defeat',
        };
        const { getByText } = render(
            <OutcomeOverlay outcome={failureOutcome} onContinue={jest.fn()} />
        );
        expect(getByText('Defeat')).toBeTruthy();
    });

    it('displays outcome body', () => {
        const { getByText } = render(
            <OutcomeOverlay outcome={mockOutcome} onContinue={jest.fn()} />
        );
        expect(getByText(/You have successfully completed the hazard\./)).toBeTruthy();
    });
});

describe('CardDetailOverlay', () => {
    it('renders card detail view', () => {
        const { getByText } = render(
            <CardDetailOverlay card={mockCard} onClose={jest.fn()} />
        );
        expect(getByText('Test Card')).toBeTruthy();
    });

    it('floats the shared keyword ledger above the card, outside it', () => {
        const card = { ...mockCard, keywords: [{ id: 'k1', name: 'PROLONG', desc: 'Lasts longer.' }] } as HazardCardVM;
        const { getByTestId, getAllByText } = render(
            <CardDetailOverlay card={card} onClose={jest.fn()} />
        );
        const ledger = getByTestId('hazard-card-detail-keywords');
        const panel = getByTestId('hazard-card-detail-card');
        expect(getAllByText('Lasts longer.').length).toBeGreaterThan(0);
        expect(ancestorIds(ledger)).not.toContain('hazard-card-detail-card');
        expect(ancestorIds(panel)).not.toContain('hazard-card-detail-keywords');
        const order = renderOrder(getByTestId('hazard-card-detail'));
        expect(order.indexOf('hazard-card-detail-keywords')).toBeGreaterThanOrEqual(0);
        expect(order.indexOf('hazard-card-detail-keywords')).toBeLessThan(order.indexOf('hazard-card-detail-card'));
    });

    it('renders utility card details', () => {
        const utilityCard = { 
            ...mockCard, 
            utility: true, 
            freeEffectLabel: 'Heal 2',
            poweredEffectLabel: 'Heal 4'
        };
        const { getByText } = render(
            <CardDetailOverlay card={utilityCard} onClose={jest.fn()} />
        );
        expect(getByText('Test Card')).toBeTruthy();
    });

    it('renders dead card correctly', () => {
        const deadCard = { ...mockCard, dead: true };
        const { getByText } = render(
            <CardDetailOverlay card={deadCard} onClose={jest.fn()} />
        );
        expect(getByText('Test Card')).toBeTruthy();
    });
});