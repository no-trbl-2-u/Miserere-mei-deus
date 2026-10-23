/**
 * Floating dice apply end-to-end.
 *
 * Pins the exact commit the panel runs on APPLY — `playCombatCard(s, { uid },
 * true, dieId)` with the dropped die forwarded as the EXPLICIT power source —
 * against the REAL engine, guarding the floating-die laws:
 *   1. a floating die commits as an explicit power source (never drafted,
 *      which the engine refuses);
 *   2. several dice — floats and a tray die — power plays in the same turn;
 *   3. a spent floating die is GONE FOREVER (leaves `floatingDice`).
 * Plus a fresh tray die commits a paid play (the die is spent and the card
 * does not bounce).
 *
 * Fixtures are the grey office (the whole library): colourless cards every
 * die colour powers.
 */

import {
    rollEncounterDice, playCombatCard,
} from '@mechanics';
import type { CombatEncounterState, CombatManaDie } from '@mechanics';

import { buildCombatViewModel } from '../combat-encounter.engine';
import { realFightFixture, startRealFight } from '@/test-utils/realFight';

const DECK = ['grey-strike', 'grey-strike', 'grey-ward', 'grey-ward', 'grey-strike', 'grey-ward'];

function openEncounter(floating: ('heart' | 'body' | 'mind' | 'wild')[]): CombatEncounterState {
    const { combat } = startRealFight(
        realFightFixture({ level: 3, baseStats: { heart: 8, body: 8, mind: 8 }, knownCards: DECK }),
        { deck: DECK, seed: 7, floatingDice: floating },
    );
    return rollEncounterDice(combat).state;
}

function findHand(state: CombatEncounterState, cardId: string): string {
    const entry = state.hand.find(h => h.cardId === cardId);
    if (!entry) throw new Error(`${cardId} should be in hand`);
    return entry.uid;
}

describe('floating-die APPLY (the snap-back bug)', () => {
    it('a wild floating die COMMITS a play (no fizzle) and is consumed forever', () => {
        const s = openEncounter(['wild']);
        const float = s.dice.find(d => d.floating)!;
        expect(float).toBeDefined();
        const uid = findHand(s, 'grey-strike');
        const res = playCombatCard(s, { uid }, true, float.id);
        expect(res.events.some(e => e.kind === 'effect-fizzled')).toBe(false);
        expect(res.events.some(e => e.kind === 'floating-die-spent')).toBe(true);
        // Gone from the tray AND the persistent pool — forever.
        expect(res.state.dice.some(d => d.id === float.id)).toBe(false);
        expect((res.state.floatingDice ?? []).some(d => d.id === float.id)).toBe(false);
    });

    it('several dice power plays in ONE turn — a tray die, then two floats', () => {
        let s = openEncounter(['wild', 'wild']);
        const floats = s.dice.filter(d => d.floating);
        expect(floats.length).toBe(2);
        // A live WILD tray die powers the first play (colour-legal for any card)...
        const trayIdx = s.dice.findIndex(d => !d.floating && d.state === 'available' && d.face !== 'miss');
        expect(trayIdx).toBeGreaterThanOrEqual(0);
        s = { ...s, dice: s.dice.map((d, i) => (i === trayIdx ? { ...d, color: 'wild' as const, face: 'mana' as const } : d)) };
        const trayId = s.dice[trayIdx].id;
        const nextUid = () => s.hand.find(h => ['grey-strike', 'grey-ward'].includes(h.cardId))!.uid;
        let res = playCombatCard(s, { uid: nextUid() }, true, trayId);
        expect(res.events.some(e => e.kind === 'effect-fizzled')).toBe(false);
        s = res.state;
        // ...then BOTH floats still power plays in the same turn.
        for (const f of floats) {
            res = playCombatCard(s, { uid: nextUid() }, true, f.id);
            expect(res.events.some(e => e.kind === 'floating-die-spent')).toBe(true);
            s = res.state;
        }
        expect((s.floatingDice ?? []).length).toBe(0);
    });

    it('the view-model tags floating dice so the tray can tell them from turn dice', () => {
        const s = openEncounter(['wild']);
        const vm = buildCombatViewModel(s);
        const float = vm.dice.find(d => d.floating);
        expect(float).toBeDefined();
    });

    // ── D6d regression (the "die spent, card bounces" bug) ──
    // The engine's `playBottomAction` REQUIRES an explicit `dieId` (undefined
    // fizzles "choose a die"). The presenter once routed a fresh tray die
    // draft-first, so the commit reached the engine with no die and fizzled
    // while the tray die read spent + the card bounced. The panel now forwards
    // every dropped die as the explicit power source.
    describe('tray-die APPLY (D6d paid-commit bug)', () => {
        function openHeartEncounter(): CombatEncounterState {
            const deck = ['grey-strike', 'grey-strike', 'grey-ward', 'grey-ward', 'grey-word', 'grey-word'];
            const { combat } = startRealFight(
                realFightFixture({ level: 3, baseStats: { heart: 8, body: 8, mind: 8 }, knownCards: deck }),
                { deck, seed: 7 },
            );
            return rollEncounterDice(combat).state;
        }
        const heartMana = (): CombatManaDie => ({ id: 'u-heart', color: 'heart', face: 'mana', state: 'available', temporary: false });

        it('a heart tray die COMMITS A Plain Blow paid — the paid DEAL lands, die spends, card leaves hand, no fizzle', () => {
            const s = openHeartEncounter();
            s.dice = [heartMana()];
            const uid = findHand(s, 'grey-strike');
            const res = playCombatCard(s, { uid }, true, 'u-heart');
            // card-played:1, fizzled:0 (the hermetic probe's exact signature).
            expect(res.events.some(e => e.kind === 'card-played')).toBe(true);
            expect(res.events.some(e => e.kind === 'effect-fizzled')).toBe(false);
            // The PAID effect resolved: the foe took damage (nothing landed in the bug).
            expect(res.state.enemy.health).toBeLessThan(s.enemy.health);
            // Die spent (gone/locked from the tray) and the card left hand.
            expect(res.state.dice.find(d => d.id === 'u-heart')?.state).not.toBe('available');
            expect(res.state.hand.some(h => h.uid === uid)).toBe(false);
        });

        it('a paid play with NO die fizzles — the panel must always forward the die', () => {
            const s = openHeartEncounter();
            s.dice = [heartMana()];
            const uid = findHand(s, 'grey-strike');
            const res = playCombatCard(s, { uid }, true, undefined);
            expect(res.events.some(e => e.kind === 'effect-fizzled')).toBe(true);
            expect(res.state.dice.find(d => d.id === 'u-heart')?.state).toBe('available');
        });
    });

    // `draggable` is presenter-owned and depends only on engine state, never
    // on live drag state: flipping it false when the die's OWN drag begins
    // would unmount its GestureDetector mid-gesture, and on web the pan dies
    // without onEnd, so the drop never resolves.
    it('draggable is presenter-computed from engine state: live dice drag, spent dice do not', () => {
        let s = openEncounter(['wild']);
        const pre = buildCombatViewModel(s);
        expect(pre.dice.find(d => d.floating)!.draggable).toBe(true);
        const tray = s.dice.find(d => !d.floating && d.state === 'available' && d.face !== 'miss')!;
        expect(pre.dice.find(d => d.id === tray.id)!.draggable).toBe(true);

        // Spend that tray die → it stops dragging; the float and the other
        // live tray dice keep dragging (no draft locks the rest of the tray).
        s = { ...s, dice: s.dice.map(d => (d.id === tray.id ? { ...d, state: 'spent' as const } : d)) };
        const post = buildCombatViewModel(s);
        expect(post.dice.find(d => d.id === tray.id)!.draggable).toBe(false);
        expect(post.dice.find(d => d.floating)!.draggable).toBe(true);
        for (const d of post.dice.filter(x => !x.floating && !x.reserve && x.id !== tray.id)) {
            expect(d.draggable).toBe(d.face !== 'miss' && !d.isX && !d.spent);
        }
    });
});
