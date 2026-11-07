/**
 * The brass pieces the menu rows pick: MenuButton's plate and label colour,
 * OptionRow's segment / radio / toggle art and its `plain` opt-out, and
 * StepperRow's slider.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import { AXM } from '@/theme/axm';
import { FeedbackSheet } from '@/components/menu/FeedbackSheet';
import { MenuButton } from '@/components/menu/MenuButton';
import { OptionRow } from '@/components/menu/OptionRow';
import { StepperRow } from '@/components/menu/StepperRow';

jest.mock('@/components/experience/KitBackdrop', () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    const React = jest.requireActual('react') as typeof import('react');
    const Piece = ({ piece }: { piece: string }) => React.createElement(Text, { testID: `piece-${piece}` }, piece);
    return { KitBackdrop: Piece, KitImage: Piece };
});

const noop = () => undefined;
/** A touch event as the responder system hands it to a Pressable. */
const GRANT = { nativeEvent: { touches: [], changedTouches: [], identifier: 1, timestamp: 0, pageX: 0, pageY: 0 }, persist: () => undefined, currentTarget: 1, target: 1 };
const SEG = [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] as const;
const BOOL = [{ value: true, label: 'ON' }, { value: false, label: 'OFF' }] as const;

describe('MenuButton', () => {
    it('draws the idle plate, and the gold plate for the primary row', () => {
        render(<MenuButton label="LOAD" onPress={noop} place="O-07" testID="b" />);
        expect(screen.getByTestId('piece-action-button-idle')).toBeTruthy();
        render(<MenuButton label="GO" onPress={noop} primary />);
        expect(screen.getByTestId('piece-action-button-selected')).toBeTruthy();
    });
    it('draws the disabled plate when disabled', () => {
        render(<MenuButton label="LOAD" onPress={noop} disabled />);
        expect(screen.getByTestId('piece-action-button-disabled')).toBeTruthy();
    });
    it('keeps a danger row off the red label under brass', () => {
        render(<MenuButton label="RESET" onPress={noop} place="O-07" danger />);
        expect(StyleSheet.flatten(screen.getByText('RESET').props.style).color).not.toBe(AXM.blood);
        expect(screen.getByTestId('piece-action-button-idle')).toBeTruthy();
    });
    it('turns the label dark on the gold plate while a non-primary row is pressed', () => {
        render(<MenuButton label="LOAD" onPress={noop} place="O-07" testID="b" />);
        expect(StyleSheet.flatten(screen.getByText('LOAD').props.style).color).not.toBe(AXM.bg);
        act(() => { fireEvent(screen.getByTestId('b'), 'responderGrant', GRANT); });
        expect(screen.getByTestId('piece-action-button-selected')).toBeTruthy();
        expect(StyleSheet.flatten(screen.getByText('LOAD').props.style).color).toBe(AXM.bg);
    });
});

describe('OptionRow', () => {
    it('draws segment art for a plain choice', () => {
        render(<OptionRow label="L" options={SEG} value="a" onChange={noop} testID="o" />);
        expect(screen.getByTestId('piece-segment-button-selected')).toBeTruthy();
        expect(screen.getByTestId('piece-segment-button-idle')).toBeTruthy();
    });
    it('opts out of the kit with `plain`', () => {
        render(<OptionRow label="L" options={SEG} value="a" onChange={noop} testID="o" plain />);
        expect(screen.queryByTestId('piece-segment-button-selected')).toBeNull();
    });
    it('draws radio rings when asked', () => {
        render(<OptionRow label="L" options={SEG} value="a" onChange={noop} testID="o" radio />);
        expect(screen.getAllByTestId('piece-radio-ring')).toHaveLength(2);
    });
    it('draws the toggle shell for a boolean pair, by value', () => {
        const { rerender } = render(<OptionRow label="L" options={BOOL} value={true} onChange={noop} testID="o" />);
        expect(screen.getByTestId('piece-toggle-shell-active')).toBeTruthy();
        rerender(<OptionRow label="L" options={BOOL} value={false} onChange={noop} testID="o" />);
        expect(screen.getByTestId('piece-toggle-shell-inactive')).toBeTruthy();
    });
});

describe('StepperRow', () => {
    it('draws the slider track and knob when given a level', () => {
        render(<StepperRow label="V" valueLabel="70%" onDecrement={noop} onIncrement={noop} testID="s" level={0.7} />);
        expect(screen.getByTestId('piece-slider-track-diamond')).toBeTruthy();
        expect(screen.getByTestId('piece-slider-knob-diamond')).toBeTruthy();
    });
    it('lets the row wrap and keeps the slider at 64pt so the controls fit a 360 screen', () => {
        render(<StepperRow label="V" valueLabel="70%" onDecrement={noop} onIncrement={noop} testID="s" level={0.7} />);
        expect(StyleSheet.flatten(screen.getByTestId('s').props.style).flexWrap).toBe('wrap');
        const widths = screen.UNSAFE_getAllByType(View).map((n) => (StyleSheet.flatten(n.props.style) as { width?: number } | undefined)?.width);
        expect(widths).toContain(64);
    });
    it('draws no slider without a level', () => {
        render(<StepperRow label="V" valueLabel="70%" onDecrement={noop} onIncrement={noop} testID="s" />);
        expect(screen.queryByTestId('piece-slider-track-diamond')).toBeNull();
    });
});

describe('FeedbackSheet', () => {
    it('keeps its BUG or PROPOSAL picker off the brass segments', () => {
        render(<FeedbackSheet visible onSubmit={noop} onClose={noop} />);
        expect(screen.getByTestId('feedback-sheet-kind-bug')).toBeTruthy();
        expect(screen.queryByTestId('piece-segment-button-selected')).toBeNull();
        expect(screen.queryByTestId('piece-segment-button-idle')).toBeNull();
    });
});
