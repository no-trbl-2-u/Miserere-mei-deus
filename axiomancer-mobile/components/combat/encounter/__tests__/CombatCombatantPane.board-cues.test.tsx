/**
 * The board says what it does: the pane half (phase BC1).
 *
 *   · A1: your INFERNO's chip shows its caption (`combat-self-burn`) and its
 *     a11y line says it lasts the combat;
 *   · A2: a self tick floats with its cause, `INFERNO −4`;
 *   · A8: the enemy float layer sits on the foe's figure, not under the crest;
 *   · A10: two ticks in one batch float as two labelled numbers in two
 *     colours, the second staggered;
 *   · A11: a DEAL on the foe and a hit on the player float white.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { act, render, screen, within } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';

import * as Juice from '@/lib/juice';
import { CombatCombatantPane, EffectChips, PlayerMedallion, type CombatFx } from '@/components/combat/encounter/CombatCombatantPane';
import {
    DOT_TICK_STAGGER_MS, HIT_FLOAT_COLOR, selfBurnCaption,
    type CombatEffectChipVM, type CombatEnemyPaneVM, type CombatPlayerPaneVM,
} from '@/state/presenters/combat-encounter.engine';
import type { CombatEvent } from '@mechanics';
import { HUE } from '@/theme/axm';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { ENEMY_ATTACK_IMPACT_MS } from '@/components/combat/frames';

jest.mock('@/lib/juice', () => {
    const actual = jest.requireActual('@/lib/juice') as typeof Juice;
    return { ...actual, useJuiceNumberPop: jest.fn(actual.useJuiceNumberPop) };
});

const ENEMY: CombatEnemyPaneVM = {
    name: 'The Float-Eye', artKey: 'no-such-enemy', isBoss: false, artNonce: 3,
    hp: 20, maxHp: 30, hpPct: 0.66, effects: [],
    intent: {
        type: 'damage', icon: '⚔', label: 'ATTACKS', color: HUE.damageRed, description: 'It lunges.',
        damage: 6, debuffs: false, branch: null, next: null,
        wallMath: { projectedDamage: 6, netDamage: 6, willDeny: false, guard: 0, barrier: 0, blizzardCut: 0 },
    },
    stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
};

const PLAYER: CombatPlayerPaneVM = { name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [] };

const fx = (events: CombatEvent[]): CombatFx => ({ seq: 1, events });
const colorOf = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style).color;

function renderPane(events: CombatEvent[] = [], enemy: CombatEnemyPaneVM = ENEMY) {
    const { tree } = withAllProviders(
        <CombatCombatantPane enemy={enemy} player={PLAYER} fx={fx(events)} region="the Drowned Parish" />,
    );
    return render(tree);
}

describe('your INFERNO chip (A1)', () => {
    const chip: CombatEffectChipVM = {
        effectId: 'weather-your-inferno', intensity: 4, duration: 0,
        glyph: { glyph: '🔥', color: HUE.damageRed, kind: 'dot', label: 'Your Inferno' },
        gloss: null, caption: selfBurnCaption(4),
    };

    it('renders the caption and an a11y line with no "0 turns left"', () => {
        const { tree } = withAllProviders(<EffectChips effects={[chip]} />);
        render(tree);
        expect(screen.getByTestId('combat-self-burn').props.children).toBe('YOUR INFERNO −4 each turn');
        const a11y: string = screen.getByTestId('combat-effect-weather-your-inferno').props.accessibilityLabel;
        expect(a11y).toMatch(/lasts the combat/);
        expect(a11y).not.toMatch(/0 turns left/);
    });

    it('a chip with no caption renders none', () => {
        const { tree } = withAllProviders(<EffectChips effects={[{ ...chip, effectId: 'weather-foe-inferno', caption: undefined }]} />);
        render(tree);
        expect(screen.queryByTestId('combat-self-burn')).toBeNull();
    });
});

describe('the self tick names its cause (A2)', () => {
    it('floats "INFERNO −4", not a bare "-4", in INFERNO red', () => {
        const events: CombatEvent[] = [{ kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 4, target: 'self' }];
        const { tree } = withAllProviders(<PlayerMedallion player={PLAYER} enemyIntentDamage={0} fx={fx(events)} />);
        render(tree);
        expect(screen.getByText('INFERNO −4')).toBeTruthy();
        expect(screen.queryByText('-4')).toBeNull();
        expect(colorOf('INFERNO −4')).toBe(HUE.damageRed);
    });
});

describe('the enemy floats rise from the figure (A8)', () => {
    for (const isBoss of [false, true]) {
        it(`the float layer sits in an anchor matching the figure wrap (${isBoss ? 'boss' : 'normal'} figure)`, () => {
            renderPane([], { ...ENEMY, isBoss });
            const wrap = StyleSheet.flatten(screen.getByTestId('combat-enemy-figure-wrap').props.style);
            const anchor = screen.getByTestId('combat-enemy-float-anchor');
            const anchorStyle = StyleSheet.flatten(anchor.props.style);
            expect({ top: anchorStyle.top, bottom: anchorStyle.bottom }).toEqual({ top: wrap.top, bottom: wrap.bottom });
            expect(within(anchor).getByTestId('combat-enemy-float-layer')).toBeTruthy();
            // The upper third of the drawn figure, not the HUD crest's fixed 116.
            const layer = StyleSheet.flatten(screen.getByTestId('combat-enemy-float-layer').props.style);
            expect(layer.top).toBe('22%');
        });
    }
});

describe('one float per tick, in its colour, staggered; plain hits white (A10, A11)', () => {
    it('an INFERNO 4 and a STORM 3 tick float as two numbers, red and gold, beside a white DEAL', () => {
        (Juice.useJuiceNumberPop as jest.Mock).mockClear();
        renderPane([
            { kind: 'damage-dealt', target: 'enemy', amount: 7 } as unknown as CombatEvent,
            { kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 4, target: 'enemy' },
            { kind: 'dot-tick', effectId: 'storm', label: 'STORM', amount: 3, target: 'enemy' },
        ]);
        expect(colorOf('-7')).toBe(HIT_FLOAT_COLOR);
        expect(colorOf('INFERNO −4')).toBe(HUE.damageRed);
        expect(colorOf('STORM −3')).toBe(HUE.goldAccent);
        // Never summed, never bare: the layer holds exactly the three floats.
        const layer = within(screen.getByTestId('combat-enemy-float-layer'));
        expect(layer.getAllByText(/./).map((n) => n.props.children)).toEqual(['-7', 'INFERNO −4', 'STORM −3']);
        const delays = (Juice.useJuiceNumberPop as jest.Mock).mock.calls.map((c) => c[1] ?? 0);
        expect(delays).toContain(DOT_TICK_STAGGER_MS);
    });

    it('the hit the player takes floats white; an INFERNO tick in the same batch floats red', () => {
        const events = [
            { kind: 'threat-fired' },
            { kind: 'damage-dealt', target: 'self', amount: 9 },
            { kind: 'dot-tick', effectId: 'inferno', label: 'INFERNO', amount: 2, target: 'self' },
        ] as unknown as CombatEvent[];
        jest.useFakeTimers();
        const { tree } = withAllProviders(<PlayerMedallion player={PLAYER} enemyIntentDamage={9} fx={fx(events)} />);
        render(tree);
        // The hit floats on the impact beat.
        act(() => { jest.advanceTimersByTime(ENEMY_ATTACK_IMPACT_MS + 50); });
        jest.useRealTimers();
        expect(colorOf('-9')).toBe(HUE.white);
        expect(colorOf('INFERNO −2')).toBe(HUE.damageRed);
    });
});
