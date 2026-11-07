/**
 * The brass pieces the menu rows pick: MenuButton's plate and label colour,
 * OptionRow's segment / radio / toggle art and its `plain` opt-out, and
 * StepperRow's slider.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

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
        expect(JSON.stringify(screen.getByText('RESET').props.style)).not.toMatch(/"color":"#?[a-z0-9]*blood/i);
        expect(screen.getByTestId('piece-action-button-idle')).toBeTruthy();
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
    it('draws no slider without a level', () => {
        render(<StepperRow label="V" valueLabel="70%" onDecrement={noop} onIncrement={noop} testID="s" />);
        expect(screen.queryByTestId('piece-slider-track-diamond')).toBeNull();
    });
});
