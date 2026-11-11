/**
 * Real enemy turns, for the pane suites that must not hand-write a combat event
 * (phases AN6a, AN6b). A turn is what the panel's `onEndPhase` does: `endTurn`,
 * then `resolveThreatPhase`, the two event lists joined. A tick or a thorn comes
 * from playing the real card that leaves it.
 */
import { getEnemyFrameSet } from '@/assets/images/enemies/frames';
import type { CombatEnemyPaneVM, CombatPlayerPaneVM } from '@/state/presenters/combat-encounter.engine';
import {
    EnemyLibrary, applyEffect, cardLibrary, endTurn, initializeCombatEncounter, lookupEffect, playCombatCard,
    resolveThreatPhase, rollEncounterDice, startTurn, unbrokenPayoutEvents,
    type CombatEncounterState, type CombatEvent, type Enemy,
} from '@mechanics';
import { Player } from '@mechanics/Character/characters.mock';
import { deepClone } from '@mechanics/Utils';

export const rng = () => 0.5;

export const FRAMED = EnemyLibrary.filter((e) => getEnemyFrameSet(e.portraitAsset) !== null);

export const CRANE_HOOK = EnemyLibrary.find((e) => e.id === 'enemy-crane-hook') as Enemy;

/**
 * A trial card's id, found by its name: only a set's own files may quote an id
 * (`trial-set-removal.engine.test.ts`), so a set can come out cleanly.
 */
export function cardIdNamed(name: string): string {
    const named = cardLibrary.filter((c) => c.name === name);
    if (named.length !== 1) throw new Error(`expected one card named "${name}", found ${named.length}`);
    return named[0].id;
}

/** A fight neither side can end, opened the way the live route opens one. */
export function fight(enemy: Enemy, cards: readonly string[] = ['grey-blow']): CombatEncounterState {
    const player = deepClone(Player);
    player.knownCards = [...cards];
    player.health = 100000;
    player.maxHealth = 100000;
    player.effects = [];
    const foe = deepClone(enemy);
    foe.health = 100000;
    foe.maxHealth = 100000;
    foe.effects = [];
    const opened = initializeCombatEncounter(player, foe, player.knownCards, 7);
    return rollEncounterDice(opened, rng).state;
}

/** One enemy turn, exactly as the board's end-of-turn handler runs it. */
export function enemyTurn(state: CombatEncounterState): { state: CombatEncounterState; events: CombatEvent[] } {
    const ended = endTurn(state);
    const resolved = resolveThreatPhase(ended.state, rng);
    let next = resolved.state;
    const events = [...ended.events, ...resolved.events];
    if (next.phase === 'phase-play' && next.dice.length === 0) {
        const turn = startTurn(next, rng);
        next = turn.state;
        events.push(...unbrokenPayoutEvents(turn.events));
    }
    return { state: next, events };
}

/** A fight with these real cards in hand, played free in order, their lines' own events kept. */
export function afterPlaying(enemy: Enemy, cards: readonly string[]) {
    const opened = fight(enemy, cards);
    let state: CombatEncounterState = {
        ...opened, hand: cards.map((cardId, i) => ({ uid: `t${i}`, cardId })),
    };
    const events: CombatEvent[] = [];
    cards.forEach((_card, i) => {
        const played = playCombatCard(state, { uid: `t${i}` }, false);
        state = played.state;
        events.push(...played.events);
    });
    return { state, events };
}

/** Hard control on the foe, as a card's line would land it: the engine's own status. */
export function stunned(state: CombatEncounterState): CombatEncounterState {
    const applied = applyEffect(state.enemy.effects, lookupEffect('debuff_petrify')!, state.round);
    return { ...state, enemy: { ...state.enemy, effects: applied.activeEffects } };
}

/** The pane's enemy, reporting `nextDamage` as the intent the turn has already moved on to. */
export function enemyVM(enemy: Enemy, nextDamage = 0): CombatEnemyPaneVM {
    return {
        name: enemy.name, level: enemy.level, artKey: enemy.portraitAsset as string, isBoss: false, artNonce: 3,
        hp: 100000, maxHp: 100000, hpPct: 1, effects: [],
        // What a `phases` foe reports on the commit its move resolves: nothing,
        // because the intent has already moved on. The clip must not care.
        intent: {
            type: 'attack', icon: 'blade', label: 'moves', damage: nextDamage, branch: null, next: null,
            wallMath: { projectedDamage: nextDamage, netDamage: nextDamage, willDeny: false, guard: 0, barrier: 0 },
        } as unknown as CombatEnemyPaneVM['intent'],
        stagesEntered: 0, pendingDot: 0, roundsToKill: null, isLethalInFlight: false,
    };
}

export const PLAYER: CombatPlayerPaneVM = {
    name: 'Pilgrim', hp: 40, maxHp: 50, hpPct: 0.8, guard: 0, effects: [],
};
