/**
 * 154.5 (A5): the stakes card says three things, the place, the goal and the
 * time, in a TYPE_ROLES face. Costs and pay stay in the presenter.
 */

import React from 'react';
import { render } from '@testing-library/react-native';

import { StakesCard } from '../StakesCard';
import { TYPE_ROLES } from '@/theme/axm';
import { hazardPuzzleStakesGoalLine } from '@/state/presenters/hazard-puzzle.copy';

const STAKES = {
    place: 'River meadow',
    kindLine: 'Hazard · holds the road',
    goalLine: hazardPuzzleStakesGoalLine([18, 10]),
    timeLine: 'Time: 60 secs',
    lines: [
        { key: 'fail', label: 'FALLING SHORT COSTS', values: ['Up to −4 VITAE'] },
        { key: 'clear', label: 'CLEARING PAYS', values: ['XP and a find'] },
        { key: 'opens', label: 'Opens', values: ['the road to Moored ship'] },
    ],
    cta: 'Face it',
};

describe('StakesCard', () => {
    it('shows the place, the goal and the time, and no costs, pay or road', () => {
        const view = render(<StakesCard stakes={STAKES as never} onFace={() => undefined} />);
        expect(view.getByTestId('hazard-stakes-place').props.children).toBe('River meadow');
        expect(view.getByText('Goal: Force 18 | Escape 10')).toBeTruthy();
        expect(view.getByText('Time: 60 secs')).toBeTruthy();
        expect(view.queryByText(/VITAE/)).toBeNull();
        expect(view.queryByText(/CLEARING PAYS/)).toBeNull();
        expect(view.queryByTestId('hazard-stakes-opens')).toBeNull();
        expect(view.queryByTestId('hazard-stakes-kind')).toBeNull();
    });

    it('sets the goal in a legible role face, not the thin condensed one', () => {
        const view = render(<StakesCard stakes={STAKES as never} onFace={() => undefined} />);
        const style = JSON.stringify(view.getByTestId('hazard-stakes-goal').props.style);
        expect(style).toContain(TYPE_ROLES.sectionHead.fontFamily);
    });
});
