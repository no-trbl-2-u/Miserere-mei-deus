/**
 * ET1a: the ink curtain lands its end state at once in instant mode (nothing
 * skipped: it still reports done), and a tap skips the animated draw-back.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { InkCurtain } from '../InkCurtain';

describe('InkCurtain', () => {
    it('in instant mode mounts no ink and reports done once', () => {
        const onDone = jest.fn();
        render(<InkCurtain instant onDone={onDone} />);
        expect(screen.queryByTestId('ink-curtain')).toBeNull();
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('in animate mode covers the screen until tapped, then reports done', () => {
        const onDone = jest.fn();
        render(<InkCurtain instant={false} onDone={onDone} />);
        expect(onDone).not.toHaveBeenCalled();
        fireEvent.press(screen.getByTestId('ink-curtain'));
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId('ink-curtain')).toBeNull();
    });
});
