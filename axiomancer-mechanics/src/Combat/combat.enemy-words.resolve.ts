/**
 * ENEMY WORDS: what lands when a foe's move fires, what fades at the start of
 * its turn, and what ticks at the start of yours.
 *
 *   WARD n        the foe gains n WARD (soaked in `combat.enemy-words.ts`);
 *                 it fades at the start of the foe's next turn.
 *   MEND n        the foe heals n (the threat's `enemyHeal`, resolved by the
 *                 engine with the other heals).
 *   SCOUR n       the foe strips n statuses off itself, the last one
 *                 included: its LEECH first, then its INFERNO, then its
 *                 STORM, then its newest affliction (VULNERABLE and the rest).
 *   BRINE n       each GUARD you gain is cut by n until the end of your next
 *                 turn (it fades at the start of the foe's next turn).
 *   TANGLE n      your next n cards cannot use their FREE line: a FREE play is
 *                 refused, each landed PAID play counts one off, and what is
 *                 left fades at the start of the foe's next turn.
 *   UNDERTOW      the named die does not roll at the start of your next turn
 *                 (`enemyWordsUndertow`).
 *   BARNACLE n    n Barnacle Curses join your hand (`BARNACLE_ID`): not
 *                 playable, not scrappable; a body die spent on a card knocks
 *                 one off (`enemyWordsAfterPlay`).
 *   VULNERABLE    `debuff_vulnerable` on you: n% more damage from the foe's
 *                 next `turns` attacks.
 *   LEECH n       the program ledger's foe LEECH, mirrored onto you: each
 *                 LEECH adds `LEECH_TURNS_PER_APPLICATION` turns and n to the
 *                 potency. At the start of your turn you lose the potency
 *                 (plain VITAE loss: GUARD does not stop it), the foe heals
 *                 what you lost, and a turn ticks off. At 0 turns it ends and
 *                 the potency resets.
 */

import type { Enemy } from '../Enemy/types';
import { lookupEffect, applyEffect } from '../Effects';
import { applyDamage, heal, isDefeated } from './health';
import { foeInferno, initElementState, weatherEvents } from './combat.elements';
import { LEECH_TURNS_PER_APPLICATION, programRecordDamage } from './combat.card-program';
import { wordsOf } from './combat.enemy-words';
import { BARNACLE_ID } from '../Cards/library/enemy-curses.cards';
import type {
    CombatEncounterState, CombatEvent, CombatManaDie, CombatThreatEffect, EnemyWordsState,
} from './combat.encounter.types';

/** The words result shape: the next state and the events it emitted. */
export interface WordsResult {
    state: CombatEncounterState;
    events: CombatEvent[];
}

function withWords(state: CombatEncounterState, words: EnemyWordsState): CombatEncounterState {
    return { ...state, enemyWords: words };
}

/** Start of the foe's turn: WARD and BRINE run out. */
export function enemyWordsFoeTurnStart(state: CombatEncounterState): WordsResult {
    const words = state.enemyWords;
    const tangle = words?.tangle ?? 0;
    if (!words || (words.ward <= 0 && words.brine <= 0 && tangle <= 0)) return { state, events: [] };
    const events: CombatEvent[] = [];
    if (words.ward > 0) events.push({ kind: 'enemy-word', word: 'ward', op: 'faded', amount: words.ward });
    if (words.brine > 0) events.push({ kind: 'enemy-word', word: 'brine', op: 'faded', amount: words.brine });
    if (tangle > 0) events.push({ kind: 'enemy-word', word: 'tangle', op: 'faded', amount: tangle });
    return { state: withWords(state, { ...words, ward: 0, brine: 0, tangle: 0 }), events };
}

/**
 * UNDERTOW at the start of your turn: the named die does not roll. Takes the
 * turn's freshly built dice and returns them without the named colour's base
 * die (act-reward and floating dice of that colour still roll, and a banked
 * Reserve die is not on the tray to lose). The word is spent either way.
 */
export function enemyWordsUndertow(
    state: CombatEncounterState, turn: number, dice: CombatManaDie[],
): { state: CombatEncounterState; dice: CombatManaDie[]; events: CombatEvent[] } {
    const color = state.enemyWords?.undertow;
    if (!color) return { state, dice, events: [] };
    const also = state.enemyWords?.undertowAlso;
    const lifted = new Set([`t${turn}-u-${color}`, ...(also ? [`t${turn}-u-${also}`] : [])]);
    const kept = dice.filter(d => !lifted.has(d.id));
    const events: CombatEvent[] = kept.length < dice.length
        ? [{ kind: 'enemy-word', word: 'undertow', op: 'spent', amount: dice.length - kept.length }]
        : [];
    const { undertow: _spent, undertowAlso: _spentToo, ...rest } = state.enemyWords!;
    return { state: withWords(state, rest), dice: kept, events };
}

/**
 * After a card play: a landed PAID play counts one card off TANGLE, and a
 * body die spent on it knocks one BARNACLE off your hand. `before` is the
 * state the play started from (its dice say which colour paid).
 */
export function enemyWordsAfterPlay(
    before: CombatEncounterState, after: CombatEncounterState, events: readonly CombatEvent[],
    useBottom: boolean, dieId: string | undefined,
): WordsResult {
    const landed = useBottom && events.some(e => e.kind === 'card-played' && e.useBottom);
    if (!landed) return { state: after, events: [] };
    let state = after;
    const out: CombatEvent[] = [];
    const tangle = state.enemyWords?.tangle ?? 0;
    if (tangle > 0) {
        state = withWords(state, { ...wordsOf(state), tangle: tangle - 1 });
        out.push({ kind: 'enemy-word', word: 'tangle', op: 'spent', amount: 1 });
    }
    const die = [...before.dice, ...(before.reserve ?? [])].find(d => d.id === dieId);
    if (die?.color === 'body') {
        const idx = state.hand.findIndex(h => h.cardId === BARNACLE_ID);
        if (idx >= 0) {
            state = { ...state, hand: state.hand.filter((_, i) => i !== idx) };
            out.push({ kind: 'enemy-word', word: 'barnacle', op: 'shed', amount: 1 });
        }
    }
    return { state, events: out };
}

/**
 * SCOUR: strips up to `n` statuses off the foe, in a fixed order (its LEECH,
 * its INFERNO, its STORM, then its afflictions newest first). The last one
 * goes too. Your own INFERNO stays: a both-sides INFERNO leaves you yours.
 */
function scour(state: CombatEncounterState, n: number, events: CombatEvent[]): CombatEncounterState {
    let s = state;
    const stripped: string[] = [];
    for (let k = 0; k < n; k++) {
        const l = s.program;
        if (l && l.leechTurns > 0 && l.leechPotency > 0) {
            s = { ...s, program: { ...l, leechTurns: 0, leechPotency: 0, leechCardId: null } };
            stripped.push('LEECH');
            continue;
        }
        const el = l?.el ?? initElementState();
        if (l && foeInferno(el) > 0) {
            const kept = Math.floor(el.infShared / 2);
            const next = {
                ...el, infFoe: 0, infShared: 0, infSelf: el.infSelf + kept,
                upSelf: el.infSelf > 0 ? el.upSelf : (kept > 0 && el.upShared),
            };
            events.push(...weatherEvents(el, next));
            s = { ...s, program: { ...l, el: next } };
            stripped.push('INFERNO');
            continue;
        }
        if (l && el.storm > 0) {
            const next = { ...el, storm: 0 };
            events.push(...weatherEvents(el, next));
            s = { ...s, program: { ...l, el: next } };
            stripped.push('STORM');
            continue;
        }
        const afflictions = s.enemy.effects.filter(ae => lookupEffect(ae.effectId)?.type === 'debuff');
        const newest = afflictions[afflictions.length - 1];
        if (!newest) break;
        s = { ...s, enemy: { ...s.enemy, effects: s.enemy.effects.filter(ae => ae !== newest) } };
        stripped.push(newest.effectId);
    }
    if (stripped.length > 0) {
        events.push({ kind: 'enemy-word', word: 'scour', op: 'stripped', amount: stripped.length, stripped });
    }
    return s;
}

/**
 * The words a fired move carries, after its hits: WARD, BRINE, VULNERABLE,
 * LEECH and SCOUR. Run once per fired move (a hindered foe fires none).
 */
export function applyEnemyWordEffects(
    stateIn: CombatEncounterState, effects: readonly CombatThreatEffect[],
): WordsResult {
    let state = stateIn;
    const events: CombatEvent[] = [];
    let towed: CombatThreatEffect['undertow'];
    for (const eff of effects) {
        if (isDefeated(state.enemy)) break;
        if ((eff.ward ?? 0) > 0) {
            const words = wordsOf(state);
            state = withWords(state, { ...words, ward: words.ward + eff.ward! });
            events.push({ kind: 'enemy-word', word: 'ward', op: 'gained', amount: eff.ward! });
        }
        if ((eff.brine ?? 0) > 0) {
            const words = wordsOf(state);
            state = withWords(state, { ...words, brine: words.brine + eff.brine! });
            events.push({ kind: 'enemy-word', word: 'brine', op: 'gained', amount: eff.brine! });
        }
        if (eff.vulnerable && eff.vulnerable.pct > 0 && eff.vulnerable.turns > 0) {
            const def = lookupEffect('debuff_vulnerable');
            if (def) {
                // One turn of the clock ticks off at this same round's end, so
                // it lasts through the foe's next `turns` attacks.
                const applied = applyEffect(state.player.effects, def, state.round, {
                    intensityDelta: eff.vulnerable.pct,
                    durationMode: 'additive', durationDelta: eff.vulnerable.turns + 1,
                    sourceId: state.enemy.id,
                });
                state = { ...state, player: { ...state.player, effects: applied.activeEffects } };
                events.push({ kind: 'enemy-word', word: 'vulnerable', op: 'gained', amount: eff.vulnerable.pct });
            }
        }
        if ((eff.leech ?? 0) > 0) {
            const words = wordsOf(state);
            state = withWords(state, {
                ...words,
                leechTurns: words.leechTurns + LEECH_TURNS_PER_APPLICATION,
                leechPotency: words.leechPotency + eff.leech!,
            });
            events.push({ kind: 'enemy-word', word: 'leech', op: 'gained', amount: eff.leech! });
        }
        if ((eff.scour ?? 0) > 0) state = scour(state, eff.scour!, events);
        if ((eff.tangle ?? 0) > 0) {
            const words = wordsOf(state);
            state = withWords(state, { ...words, tangle: (words.tangle ?? 0) + eff.tangle! });
            events.push({ kind: 'enemy-word', word: 'tangle', op: 'gained', amount: eff.tangle! });
        }
        if (eff.undertow) {
            const words = wordsOf(state);
            // A move that names a second die holds both (one move, two UNDERTOW effects).
            const second = towed !== undefined && towed !== eff.undertow;
            state = withWords(state, second ? { ...words, undertowAlso: eff.undertow } : { ...words, undertow: eff.undertow });
            towed = eff.undertow;
            events.push({ kind: 'enemy-word', word: 'undertow', op: 'gained', amount: 1 });
        }
        if ((eff.barnacle ?? 0) > 0) {
            const words = wordsOf(state);
            let uid = words.barnacleUid ?? 0;
            const added = Array.from({ length: eff.barnacle! }, () => ({ uid: `bn${++uid}`, cardId: BARNACLE_ID }));
            state = { ...withWords(state, { ...words, barnacleUid: uid }), hand: [...state.hand, ...added] };
            events.push({ kind: 'enemy-word', word: 'barnacle', op: 'gained', amount: eff.barnacle! });
        }
    }
    return { state, events };
}

/**
 * Start of your turn, LEECH on you: you lose the potency in VITAE (plain
 * loss, so GUARD does not stop it and it can kill you), the foe heals what
 * you lost (up to its max), then a turn ticks off.
 */
export function enemyWordsPlayerTurnStart(state: CombatEncounterState): WordsResult {
    const words = state.enemyWords;
    if (!words || words.leechTurns <= 0 || words.leechPotency <= 0) return { state, events: [] };
    if (isDefeated(state.player) || isDefeated(state.enemy)) return { state, events: [] };
    const lost = Math.min(words.leechPotency, state.player.health);
    const player = applyDamage(state.player, lost);
    const before = state.enemy.health;
    const enemy: Enemy = heal(state.enemy, lost);
    const healed = enemy.health - before;
    const turns = words.leechTurns - 1;
    const events: CombatEvent[] = [
        { kind: 'dot-tick', effectId: 'enemy-leech', label: 'LEECH', amount: lost, target: 'self' },
        { kind: 'enemy-word', word: 'leech', op: 'ticked', amount: lost },
    ];
    if (healed > 0) events.push({ kind: 'enemy-healed', enemyId: enemy.id, source: 'THREAT', amount: healed });
    return {
        state: {
            ...state, player, enemy,
            ...(state.program ? { program: programRecordDamage(state.program, lost) } : {}),
            enemyWords: turns > 0
                ? { ...words, leechTurns: turns }
                : { ...words, leechTurns: 0, leechPotency: 0 },
        },
        events,
    };
}
