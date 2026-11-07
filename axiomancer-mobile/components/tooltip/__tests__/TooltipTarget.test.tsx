/**
 * TooltipTarget integration pins.
 *
 * Tests the shared tap-tooltip wrapper that renders a Pressable
 * and fires `useTooltip().show({ kind, id })` on tap. Exercises
 * the component's props, accessibility, and interaction behavior.
 *
 * Uses `withAllProviders` since TooltipTarget reads `useTooltip()` 
 * which requires the TooltipProvider context.
 */

import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { TooltipTarget } from '@/components/tooltip/TooltipTarget';
import { useTooltip } from '@/hooks/useTooltip';
import { withAllProviders } from '@/test-utils/withAllProviders';

// Mock the useTooltip hook to track calls
jest.mock('@/hooks/useTooltip', () => ({
    useTooltip: jest.fn(),
}));

const mockUseTooltip = useTooltip as jest.MockedFunction<typeof useTooltip>;

describe('<TooltipTarget>', () => {
    const mockShow = jest.fn();
    const mockHide = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseTooltip.mockReturnValue({ show: mockShow, hide: mockHide });
    });

    it('renders children and accessibility props correctly', () => {
        const { tree } = withAllProviders(
            <TooltipTarget
                kind="stat"
                id="HEART"
                accessibilityLabel="Heart stat"
                accessibilityHint="Tap to see details"
                testID="heart-target"
            >
                <Text>Heart Icon</Text>
            </TooltipTarget>
        );
        const screen = render(tree);

        const target = screen.getByTestId('heart-target');
        expect(target).toBeTruthy();
        expect(target.props.accessibilityRole).toBe('button');
        expect(target.props.accessibilityLabel).toBe('Heart stat');
        expect(target.props.accessibilityHint).toBe('Tap to see details');
        
        // Children should be rendered
        expect(screen.getByText('Heart Icon')).toBeTruthy();
    });

    it('calls tooltip.show with correct params when pressed', () => {
        const { tree } = withAllProviders(
            <TooltipTarget
                kind="effect"
                id="tier1_body_attack"
                testID="effect-target"
            >
                <Text>Effect</Text>
            </TooltipTarget>
        );
        const screen = render(tree);

        fireEvent.press(screen.getByTestId('effect-target'));

        expect(mockShow).toHaveBeenCalledTimes(1);
        expect(mockShow).toHaveBeenCalledWith({
            kind: 'effect',
            id: 'tier1_body_attack',
            anchorRef: expect.any(Object),
        });
    });

    it('does not call tooltip.show when id is empty', () => {
        const { tree } = withAllProviders(
            <TooltipTarget
                kind="stat"
                id=""
                testID="empty-id-target"
            >
                <Text>No ID</Text>
            </TooltipTarget>
        );
        const screen = render(tree);

        fireEvent.press(screen.getByTestId('empty-id-target'));

        expect(mockShow).not.toHaveBeenCalled();
    });

    it('renders with all TooltipKind values', () => {
        const kinds: { kind: any; id: string }[] = [
            { kind: 'stat', id: 'HEART' },
            { kind: 'derived', id: 'body-save' },
            { kind: 'affliction', id: 'bleeding' },
            { kind: 'blessing', id: 'blessed' },
            { kind: 'effect', id: 'tier1_heart_attack' },
            { kind: 'card', id: 'ad_baculum' },
            { kind: 'slot', id: 'Head' },
        ];

        kinds.forEach(({ kind, id }, index) => {
            const { tree } = withAllProviders(
                <TooltipTarget
                    kind={kind}
                    id={id}
                    testID={`target-${index}`}
                >
                    <Text>{kind} content</Text>
                </TooltipTarget>
            );
            const screen = render(tree);
            
            // Should render without errors
            expect(screen.getByTestId(`target-${index}`)).toBeTruthy();
            expect(screen.getByText(`${kind} content`)).toBeTruthy();
        });
    });

    it('works without optional accessibility props', () => {
        const { tree } = withAllProviders(
            <TooltipTarget
                kind="stat"
                id="MIND"
                testID="minimal-target"
            >
                <Text>Minimal</Text>
            </TooltipTarget>
        );
        const screen = render(tree);

        const target = screen.getByTestId('minimal-target');
        expect(target.props.accessibilityRole).toBe('button');
        expect(target.props.accessibilityLabel).toBeUndefined();
        expect(target.props.accessibilityHint).toBeUndefined();
    });

    it('passes through ref correctly to Pressable', () => {
        const { tree } = withAllProviders(
            <TooltipTarget
                kind="stat"
                id="BODY"
                testID="ref-target"
            >
                <Text>Body</Text>
            </TooltipTarget>
        );
        const screen = render(tree);

        fireEvent.press(screen.getByTestId('ref-target'));

        expect(mockShow).toHaveBeenCalledWith({
            kind: 'stat',
            id: 'BODY',
            anchorRef: expect.objectContaining({
                current: expect.any(Object),
            }),
        });
    });

    it('handles multiple presses correctly', () => {
        const { tree } = withAllProviders(
            <TooltipTarget
                kind="card"
                id="fleeting_kindness"
                testID="multi-press-target"
            >
                <Text>Card</Text>
            </TooltipTarget>
        );
        const screen = render(tree);

        const target = screen.getByTestId('multi-press-target');
        
        fireEvent.press(target);
        fireEvent.press(target);
        fireEvent.press(target);

        expect(mockShow).toHaveBeenCalledTimes(3);
        expect(mockShow).toHaveBeenCalledWith({
            kind: 'card',
            id: 'fleeting_kindness',
            anchorRef: expect.any(Object),
        });
    });
});