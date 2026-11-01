/**
 * The shared keyword ledger: rows, the minor flag, the type tag.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { CardKeywordLedger } from '@/components/card/CardKeywordLedger';
import { withAllProviders } from '@/test-utils/withAllProviders';

function mount(props: React.ComponentProps<typeof CardKeywordLedger>) {
    return render(withAllProviders(<CardKeywordLedger {...props} />).tree);
}

describe('CardKeywordLedger', () => {
    it('renders one row per keyword with its name and definition', () => {
        mount({ keywords: [{ name: 'PROLONG', def: 'Lasts longer.' }, { name: 'GUARD', def: 'Soaks a hit.' }] });
        expect(screen.getAllByTestId('card-keyword-row')).toHaveLength(2);
        expect(screen.getByText('PROLONG')).toBeTruthy();
        expect(screen.getByText('Soaks a hit.')).toBeTruthy();
    });

    it('says a minor rider is minor right now', () => {
        mount({ keywords: [{ name: 'BURN', def: 'Ticks.', minor: true }] });
        expect(screen.getByText('Ticks. (minor right now)')).toBeTruthy();
    });

    it('tags each row from typeTagFor, defaulting to KEYWORD', () => {
        mount({ keywords: [{ name: 'A', def: 'a' }, { name: 'B', def: 'b' }], typeTagFor: (i) => (i === 0 ? 'DOT' : 'EFFECT') });
        expect(screen.getAllByTestId('card-keyword-tag').map((t) => t.props.children)).toEqual(['DOT', 'EFFECT']);
    });

    it('defaults every tag to KEYWORD', () => {
        mount({ keywords: [{ name: 'A', def: 'a' }] });
        expect(screen.getByTestId('card-keyword-tag').props.children).toBe('KEYWORD');
    });

    it('renders nothing for an empty list', () => {
        mount({ keywords: [] });
        expect(screen.queryByTestId('card-keyword-ledger')).toBeNull();
    });
});
