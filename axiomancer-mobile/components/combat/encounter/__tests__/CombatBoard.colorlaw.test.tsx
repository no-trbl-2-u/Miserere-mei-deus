/**
 * CombatBoard — THE COLOR LAW at the UI gate.
 *
 * The engine's COLOR LAW (`playCombatCard`, axiomancer-mechanics
 * src/Combat/combat.engine.ts ~:891) fizzles an off-color play at resolution.
 * The board must make that state UNREACHABLE: during a die drag every staged
 * card the die cannot power reads disabled (dimmed), an off-color drop
 * REJECTS (no selection, no dispatch), and APPLY never routes an off-color
 * die at a card (it falls back to the FREE action instead of eating a
 * fizzle). Wild dice stay legal everywhere.
 *
 * The drag/measureInWindow plumbing can't run under jest, so the drop
 * decision is covered through the PURE `resolveDieDropTarget` (exactly what
 * `resolveDrop` feeds with measurements); the APPLY assertions choose a die
 * through the board's real tap-to-power gesture (`tapCombatDie`), which runs
 * the same gate.
 *
 * Every card in the library is colourless ('any' — the grey office), so no
 * real hand can hold an off-colour card. The pure gate (`dieCanPowerCardVM`,
 * `resolveDieDropTarget`) is pinned on synthetic colours below, and the board
 * cases pin the other half of the law: a colourless card takes a die of every
 * colour.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
    rollEncounterDice, combatDieCanPower,
    type CombatEncounterState, type CombatDieColor,
} from '@mechanics';
import { CombatBoard, resolveDieDropTarget, type DragController } from '@/components/combat/encounter/CombatBoard';
import { buildCombatViewModel, dieCanPowerCardVM, type CombatDieVM } from '@/state/presenters/combat-encounter.engine';
import { REAL_FIGHT_FIXTURE, startRealFight } from '@/test-utils/realFight';
import { withAllProviders } from '@/test-utils/withAllProviders';
import { tapCombatDie } from '@/test-utils/tapCombatDie';

// The grey office (same as the multistage suite) — every card colourless.
const CARDS = ['grey-strike', 'grey-ward', 'grey-word', 'grey-strike'];
const STANCES = ['heart', 'body', 'mind'] as const;

const noopDrag = (): DragController =>
    ({ begin: () => undefined, end: () => undefined, active: null, x: { value: 0 }, y: { value: 0 } } as unknown as DragController);

/** A drag controller mid-die-drag — what the board sees while a die is in flight. */
const dieDrag = (die: CombatDieVM): DragController =>
    ({
        begin: () => undefined, end: () => undefined,
        active: { type: 'die', dieId: die.id, die },
        x: { value: 0 }, y: { value: 0 },
    } as unknown as DragController);

const ghostDie = (color: string): CombatDieVM =>
    ({
        id: `ghost-${color}`, color, colorHex: '#fff', glyph: '?', stanceLabel: color.toUpperCase(),
        spent: false, isX: color === 'x', draggable: true,
    } as CombatDieVM);

const boardCallbacks = () => ({
    onApply: jest.fn(), onStage: jest.fn(), onUnstage: jest.fn(), onDiscard: jest.fn(),
    onSignature: jest.fn(), onEndPhase: jest.fn(), onInspect: jest.fn(),
});

function freshEncounter(seed = 16): { store: ReturnType<typeof withAllProviders>['store']; s: CombatEncounterState } {
    const { store, combat } = startRealFight(REAL_FIGHT_FIXTURE, { player: { knownCards: CARDS, baseStats: { heart: 8, body: 8, mind: 8 }, health: 200, maxHealth: 200 }, seed: seed });
    let s = combat;
    s = rollEncounterDice(s).state;
    return { store, s };
}

afterEach(() => { jest.clearAllMocks(); });

// ── The UI mirror of the engine rule ─────────────────────────────────────────

describe('dieCanPowerCardVM — parity with the engine COLOR LAW', () => {
    it('matches combatDieCanPower verdict-for-verdict on every color pairing', () => {
        const dieColors: CombatDieColor[] = ['heart', 'body', 'mind', 'wild', 'x'];
        const cardColors: CombatDieColor[] = ['heart', 'body', 'mind', 'wild'];
        for (const d of dieColors) {
            for (const c of cardColors) {
                expect(dieCanPowerCardVM({ color: d, isX: d === 'x' }, c))
                    .toBe(combatDieCanPower({ id: 'p', color: d, state: 'available', temporary: false }, c));
            }
        }
    });

    it('colored dice power only their color; WILD powers everything; X never drag-powers', () => {
        expect(dieCanPowerCardVM({ color: 'body', isX: false }, 'body')).toBe(true);
        expect(dieCanPowerCardVM({ color: 'body', isX: false }, 'mind')).toBe(false);
        expect(dieCanPowerCardVM({ color: 'mind', isX: false }, 'heart')).toBe(false);
        for (const stance of STANCES) expect(dieCanPowerCardVM({ color: 'wild', isX: false }, stance)).toBe(true);
        expect(dieCanPowerCardVM({ color: 'x', isX: true }, 'body')).toBe(false);
    });
});

// ── The drop decision (what resolveDrop dispatches) ──────────────────────────

describe('resolveDieDropTarget — an illegal drop dispatches NOTHING', () => {
    const stanceOf = (uid: string) => ({ 'u-mind': 'mind', 'u-body': 'body' } as Record<string, string>)[uid];

    it('a red (body) die dropped ON a blue (mind) card rejects', () => {
        expect(resolveDieDropTarget(ghostDie('body'), 'u-mind', true, ['u-mind'], stanceOf, {})).toBeNull();
    });

    it('a matching die dropped on its card lands', () => {
        expect(resolveDieDropTarget(ghostDie('mind'), 'u-mind', true, ['u-mind'], stanceOf, {})).toBe('u-mind');
    });

    it('a WILD die drops anywhere', () => {
        expect(resolveDieDropTarget(ghostDie('wild'), 'u-mind', true, ['u-mind', 'u-body'], stanceOf, {})).toBe('u-mind');
        expect(resolveDieDropTarget(ghostDie('wild'), 'u-body', true, ['u-mind', 'u-body'], stanceOf, {})).toBe('u-body');
    });

    it('loose-drop forgiveness only ever lands on a color-legal card', () => {
        // body die, loose drop, [mind, body] staged → lands on the BODY card.
        expect(resolveDieDropTarget(ghostDie('body'), null, true, ['u-mind', 'u-body'], stanceOf, {})).toBe('u-body');
        // only an off-color card staged → nothing.
        expect(resolveDieDropTarget(ghostDie('body'), null, true, ['u-mind'], stanceOf, {})).toBeNull();
    });

    it('a drop outside the play area never lands', () => {
        expect(resolveDieDropTarget(ghostDie('wild'), null, false, ['u-mind', 'u-body'], stanceOf, {})).toBeNull();
    });

    // ── The STAGING LAW: a card already carrying
    // a dropped die rejects further drops — exactly like an off-color card. ──
    it('a direct hit on an already-armed card REJECTS, even color-legal', () => {
        expect(resolveDieDropTarget(ghostDie('body'), 'u-body', true, ['u-body'], stanceOf, { 'u-body': 'die-1' })).toBeNull();
        expect(resolveDieDropTarget(ghostDie('wild'), 'u-body', true, ['u-body'], stanceOf, { 'u-body': 'die-1' })).toBeNull();
    });

    it('loose-drop forgiveness skips armed cards; all armed → nothing lands', () => {
        // body die, loose drop, body card armed + mind card open → the open
        // card is off-color → nothing lands.
        expect(resolveDieDropTarget(ghostDie('body'), null, true, ['u-body', 'u-mind'], stanceOf, { 'u-body': 'die-1' })).toBeNull();
        // wild die: the armed body card is skipped, the open mind card takes it.
        expect(resolveDieDropTarget(ghostDie('wild'), null, true, ['u-body', 'u-mind'], stanceOf, { 'u-body': 'die-1' })).toBe('u-mind');
        // every staged card armed → the die snaps home.
        expect(resolveDieDropTarget(ghostDie('wild'), null, true, ['u-body', 'u-mind'], stanceOf, { 'u-body': 'die-1', 'u-mind': 'die-2' })).toBeNull();
    });

    // A card whose PAID line cannot be played now ("Only at half VITAE or
    // less" above half) never takes a die: the die would sit on it unspendable.
    it('a card whose PAID line is blocked rejects a direct hit and is skipped by a loose drop', () => {
        const blockOf = (uid: string) => (uid === 'u-body' ? 'only at half VITAE or less' : null);
        expect(resolveDieDropTarget(ghostDie('wild'), 'u-body', true, ['u-body'], stanceOf, {}, blockOf)).toBeNull();
        expect(resolveDieDropTarget(ghostDie('wild'), null, true, ['u-body', 'u-mind'], stanceOf, {}, blockOf)).toBe('u-mind');
        expect(resolveDieDropTarget(ghostDie('body'), null, true, ['u-body', 'u-mind'], stanceOf, {}, blockOf)).toBeNull();
    });
});

// ── Render: the drag-time affordance ─────────────────────────────────────────

describe('CombatBoard — staged cards under a die drag', () => {
    it('the hand is colourless — the fixture every case below leans on', () => {
        const { s } = freshEncounter();
        const vm = buildCombatViewModel(s);
        expect(vm.hand.length).toBeGreaterThanOrEqual(2);
        for (const card of vm.hand) expect(card.stance).toBe('any');
    });

    it('a die of EVERY colour leaves a colourless card enabled', () => {
        for (const color of STANCES) {
            const { store, s } = freshEncounter();
            const vm = buildCombatViewModel(s);
            const card = vm.hand[0];

            const { tree } = withAllProviders(
                <CombatBoard vm={vm} drag={dieDrag(ghostDie(color))} stagedUids={[card.uid]} {...boardCallbacks()} />,
                { store },
            );
            const view = render(tree);
            expect(screen.getByTestId(`combat-staged-${card.uid}`).props.accessibilityState)
                .toEqual({ disabled: false });
            view.unmount();
        }
    });

    it('a WILD die drag disables NO staged card', () => {
        const { store, s } = freshEncounter();
        const vm = buildCombatViewModel(s);
        const uids = [vm.hand[0].uid, vm.hand[1].uid];

        const { tree } = withAllProviders(
            <CombatBoard vm={vm} drag={dieDrag(ghostDie('wild'))} stagedUids={uids} {...boardCallbacks()} />,
            { store },
        );
        render(tree);
        for (const uid of uids) {
            expect(screen.getByTestId(`combat-staged-${uid}`).props.accessibilityState)
                .toEqual({ disabled: false });
        }
    });
});

// ── A blocked PAID line: no die ever lands on it ─────────────────────────────

describe('CombatBoard — a staged card whose PAID line cannot be played now', () => {
    const WHY = 'only at half VITAE or less';
    /** The fixture's first hand card, read as a program card whose PAID line
     *  the engine refuses right now. */
    function blockedVM(s: CombatEncounterState) {
        const vm = buildCombatViewModel(s);
        const card = { ...vm.hand[0], play: { freeBlock: null, paidBlock: WHY, freeShortfall: null, paidShortfall: null, paidDiscard: null, unscrappable: false, xRange: null } };
        return { vm: { ...vm, hand: [card, ...vm.hand.slice(1)] }, card };
    }

    it('reads disabled under a die drag, and its label names the reason', () => {
        const { store, s } = freshEncounter();
        const { vm, card } = blockedVM(s);
        const { tree } = withAllProviders(
            <CombatBoard vm={vm} drag={dieDrag(ghostDie('wild'))} stagedUids={[card.uid]} {...boardCallbacks()} />,
            { store },
        );
        render(tree);
        const staged = screen.getByTestId(`combat-staged-${card.uid}`);
        expect(staged.props.accessibilityState).toEqual({ disabled: true });
        expect(staged.props.accessibilityLabel).toContain(WHY);
    });

    it('a tapped die is not taken, so APPLY stays FREE', async () => {
        const { store, s } = freshEncounter();
        const { vm, card } = blockedVM(s);
        const die = vm.dice.find((d) => d.draggable && !d.spent);
        expect(die).toBeDefined();
        const cbs = boardCallbacks();
        const { tree } = withAllProviders(
            <CombatBoard vm={vm} drag={noopDrag()} stagedUids={[card.uid]} {...cbs} />,
            { store },
        );
        render(tree);
        await tapCombatDie(die!.id);
        expect(screen.queryByTestId('combat-staged-die')).toBeNull();
        fireEvent.press(screen.getByTestId(`combat-apply-${card.uid}`));
        expect(cbs.onApply).toHaveBeenCalledWith(card.uid, null, false);
    });
});

// ── APPLY routing: an off-color die never powers ─────────────────────────────

describe('CombatBoard — APPLY routes only an explicitly chosen legal die', () => {
    /** Recolor the first live tray die to `color` (a MANA face, so it powers)
     *  — a pure-state override giving the board a die of a KNOWN color. */
    function withTrayDie(s: CombatEncounterState, color: CombatDieColor): { s: CombatEncounterState; dieId: string } {
        const first = s.dice.findIndex((d) => d.state === 'available' && !d.floating && d.face !== 'miss');
        expect(first).toBeGreaterThanOrEqual(0);
        const dice = s.dice.map((d, i) => (i === first ? { ...d, color, face: 'mana' as const } : d));
        return { s: { ...s, dice }, dieId: dice[first].id };
    }

    function renderStaged(s: CombatEncounterState, uid: string, store: ReturnType<typeof withAllProviders>['store']) {
        const vm = buildCombatViewModel(s);
        const cbs = boardCallbacks();
        const { tree } = withAllProviders(
            <CombatBoard vm={vm} drag={noopDrag()} stagedUids={[uid]} {...cbs} />,
            { store },
        );
        render(tree);
        return cbs;
    }

    it('a coloured die → APPLY powers a colourless card with that EXPLICIT die', async () => {
        const { store, s: s0 } = freshEncounter();
        const card = buildCombatViewModel(s0).hand[0];
        const { s, dieId } = withTrayDie(s0, 'body');
        const cbs = renderStaged(s, card.uid, store);

        await tapCombatDie(dieId);
        expect(screen.getByTestId('combat-staged-die')).toBeTruthy();
        fireEvent.press(screen.getByTestId(`combat-apply-${card.uid}`));
        expect(cbs.onApply).toHaveBeenCalledWith(card.uid, dieId, true);
    });

    it('a WILD die → powers any staged card', async () => {
        const { store, s: s0 } = freshEncounter();
        const card = buildCombatViewModel(s0).hand[0];
        const { s, dieId } = withTrayDie(s0, 'wild');
        const cbs = renderStaged(s, card.uid, store);

        await tapCombatDie(dieId);
        fireEvent.press(screen.getByTestId(`combat-apply-${card.uid}`));
        expect(cbs.onApply).toHaveBeenCalledWith(card.uid, dieId, true);
    });

    it('no die chosen → APPLY is FREE — nothing auto-attaches, even a legal die', () => {
        const { store, s: s0 } = freshEncounter();
        const card = buildCombatViewModel(s0).hand[0];
        const { s } = withTrayDie(s0, 'body');
        const cbs = renderStaged(s, card.uid, store);

        expect(screen.queryByTestId('combat-staged-die')).toBeNull();
        fireEvent.press(screen.getByTestId(`combat-apply-${card.uid}`));
        expect(cbs.onApply).toHaveBeenCalledWith(card.uid, null, false);
    });

    it('END PHASE batch commits a chosen legal die POWERED', async () => {
        const { store, s: s0 } = freshEncounter();
        const card = buildCombatViewModel(s0).hand[0];
        const { s, dieId } = withTrayDie(s0, 'mind');
        const cbs = renderStaged(s, card.uid, store);

        await tapCombatDie(dieId);
        fireEvent.press(screen.getByTestId('combat-end-phase'));
        expect(cbs.onApply).toHaveBeenCalledWith(card.uid, dieId, true);
        expect(cbs.onEndPhase).toHaveBeenCalledTimes(1);
    });
});
