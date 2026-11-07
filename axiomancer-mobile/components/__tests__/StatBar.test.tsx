/**
 * Hermetic component tests — StatBar.
 *
 * StatBar renders a value/max bar on the SELF tab + combat HUD.
 * The contract worth pinning is the **clamp + percent math**:
 * a value above max should not overflow the track (pct → 1); a
 * negative value should not produce a negative-width fill
 * (pct → 0). Plus the conditional label / showText rendering
 * and a defensive divide-by-zero guard (max=0).
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BRASS_CAP_X, BRASS_CAP_Y, StatBar } from '@/components/StatBar';

function findFillWidth(json: unknown): string | null {
    if (json === null || typeof json !== 'object') return null;
    const node = json as { props?: { style?: unknown }; children?: unknown[] };
    const style = node.props?.style;
    if (style) {
        const arr: { width?: unknown; position?: unknown }[] = Array.isArray(style)
            ? (style as { width?: unknown; position?: unknown }[])
            : ([style] as { width?: unknown; position?: unknown }[]);
        // Flatten merged style array into a single record; the fill
        // View has position: 'absolute' in one entry and width in
        // another (StatBar composes styles.fill with an inline
        // {width, backgroundColor} object).
        const merged: { width?: unknown; position?: unknown } = {};
        for (const s of arr) {
            if (s && typeof s === 'object') Object.assign(merged, s);
        }
        if (typeof merged.width === 'string' && merged.position === 'absolute') {
            // Skip the track's topLine (height 1, also absolute) by
            // requiring a percent-shaped width string.
            if (/\d|NaN/.test(merged.width as string)) return merged.width;
        }
    }
    if (Array.isArray(node.children)) {
        for (const c of node.children) {
            const found = findFillWidth(c);
            if (found !== null) return found;
        }
    }
    return null;
}

describe('StatBar: percent clamp', () => {
    it('half-full (10/20) renders fill at 50.0%', () => {
        const tree = render(<StatBar value={10} max={20} />);
        expect(findFillWidth(tree.toJSON())).toBe('50.0%');
    });

    it('full (20/20) renders fill at 100.0%', () => {
        const tree = render(<StatBar value={20} max={20} />);
        expect(findFillWidth(tree.toJSON())).toBe('100.0%');
    });

    it('empty (0/20) renders fill at 0.0%', () => {
        const tree = render(<StatBar value={0} max={20} />);
        expect(findFillWidth(tree.toJSON())).toBe('0.0%');
    });

    it('overflow (25/20) is clamped to 100.0%', () => {
        const tree = render(<StatBar value={25} max={20} />);
        expect(findFillWidth(tree.toJSON())).toBe('100.0%');
    });

    it('negative (-5/20) is clamped to 0.0%', () => {
        const tree = render(<StatBar value={-5} max={20} />);
        expect(findFillWidth(tree.toJSON())).toBe('0.0%');
    });
});

describe('StatBar: label + counter', () => {
    it('omits the label row when no label prop is given', () => {
        const tree = render(<StatBar value={10} max={20} />);
        // No textual content at all — only the track and fill Views.
        expect(tree.queryByText('10/20')).toBeNull();
    });

    it('renders the label and counter when label is given (showText default true)', () => {
        const tree = render(<StatBar value={10} max={20} label="HEALTH" />);
        expect(tree.queryByText('HEALTH')).not.toBeNull();
        expect(tree.queryByText('10/20')).not.toBeNull();
    });

    it('renders the label but hides the counter when showText=false', () => {
        const tree = render(
            <StatBar value={10} max={20} label="HEALTH" showText={false} />,
        );
        expect(tree.queryByText('HEALTH')).not.toBeNull();
        expect(tree.queryByText('10/20')).toBeNull();
    });
});

describe('StatBar: divide-by-zero', () => {
    // value/0 = Infinity → Math.min(1, Infinity) = 1 → clamp lands at
    // 100.0%. (Not NaN — JavaScript's positive-numerator-over-zero
    // is +Infinity, which the Math.min upper bound catches cleanly.)
    // Pin the current behavior so a future "treat max=0 as a 0% bar"
    // refactor is a conscious change.
    it('max=0 with positive value lands at 100.0% (Math.min(1, Infinity) clamp)', () => {
        const tree = render(<StatBar value={5} max={0} />);
        expect(findFillWidth(tree.toJSON())).toBe('100.0%');
    });

    it('max=0 with zero value lands at "NaN%" (0/0 is NaN, not clamped)', () => {
        // 0/0 is NaN; Math.min(1, NaN) is NaN; Math.max(0, NaN) is NaN.
        // This is the true divide-by-zero pathology, distinct from the
        // positive-value-over-zero case above.
        const tree = render(<StatBar value={0} max={0} />);
        expect(findFillWidth(tree.toJSON())).toBe('NaN%');
    });
});

/**
 * A nearly-spent bar must read as an alarm, not as an empty rail.
 *
 * At 'VITAE 1/175' the fill is half a pixel wide; without the alarm, one
 * hit from death looks the same as a bar that failed to render.
 */
describe('FE-019: alarm state', () => {
    it('colours the readout and the track edge at or below the threshold', () => {
        const r = render(
            <StatBar value={1} max={175} color="#8b1a1a" label="VITAE" alarmAt={0.25} />
        );
        expect(r.queryByTestId('statbar-value-alarmed')).not.toBeNull();
        expect(r.queryByTestId('statbar-track-alarmed')).not.toBeNull();
    });

    it('stays calm above the threshold', () => {
        const r = render(
            <StatBar value={150} max={175} color="#8b1a1a" label="VITAE" alarmAt={0.25} />
        );
        expect(r.queryByTestId('statbar-value-alarmed')).toBeNull();
        expect(r.queryByTestId('statbar-track-alarmed')).toBeNull();
    });

    it('never alarms when no threshold is given (a bar with no threshold)', () => {
        const r = render(
            <StatBar value={0} max={50} color="#8b4a1a" label="STONE" />
        );
        expect(r.queryByTestId('statbar-value-alarmed')).toBeNull();
    });
});

describe('StatBar: brass look keeps the fill inside the rail caps', () => {
    it('insets the fill slot by the end caps and grows the rail to hold them', () => {
        const r = render(<StatBar value={10} max={20} look="brass" height={14} />);
        const track = StyleSheet.flatten(r.getByTestId('statbar-track').props.style) as { height: number };
        expect(track.height).toBe(14 + BRASS_CAP_Y * 2);
        const slots = r.UNSAFE_getAllByType(View)
            .map((n) => StyleSheet.flatten(n.props.style) as Record<string, unknown> | undefined)
            .filter((s) => s !== undefined && s.position === 'absolute' && s.left === BRASS_CAP_X);
        expect(slots).toHaveLength(1);
        expect(slots[0]).toMatchObject({ top: BRASS_CAP_Y, right: BRASS_CAP_X, bottom: BRASS_CAP_Y });
    });
});
