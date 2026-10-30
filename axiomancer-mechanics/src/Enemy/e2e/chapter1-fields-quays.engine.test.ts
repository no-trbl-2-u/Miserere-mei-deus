/**
 * Hermetic E2E — Chapter 1's fields and quays (phase EN1f, A9): the Float-Eye
 * (reworked), the Gallows Crow, the Net-Mender and the Crane-Hook play exactly
 * the Appendix's moves, in order, with each move's rider resolved by the
 * engine (`Combat/combat.enemy-riders.ts`).
 *
 * Each foe fights at its Breakwater level, so every number is the Appendix's
 * scaled with `scaleMoveNumber` from the authored level 2 (the Float-Eye and
 * the Gallows Crow at 2 land exactly as printed). Fixed RNG; no disk /
 * network / TTY.
 */

import { describe, it, expect } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import type { Enemy } from '../types';
import { CraneHook, ENEMY_REGISTRY, FloatEye, GallowsCrow, NetMender } from '../enemy.library';
import { PHASES_AUTHORED_LEVEL } from '../enemy-phases';
import { moveKeywords } from '../enemy-keywords';
import { deepClone } from '../../Utils';
import { scaleEnemyToLevel } from '../../World/encounter';
import { BW_ENCOUNTER_FOES } from '../../World/MapEvents/content';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import {
    initializeCombatEncounter, rollEncounterDice, resolveThreatPhase, threatHits,
} from '../../Combat/combat.engine';
import { scaleMoveNumber } from '../../Combat/combat.threat';
import { riderAfterPlay } from '../../Combat/combat.enemy-riders';
import type { CombatEncounterState, CombatManaDie } from '../../Combat/combat.encounter.types';

const rng = (): number => 0.5;

registerSandboxCards([
    {
        id: 'qa-en1f-free', name: 'QA Quay', color: 'body',
        description: 'quay fixture', tier: 1, targetType: 'enemy', rank: 1, cardType: 'spell',
        free: { damage: 1 },
    },
]);
const DECK = ['qa-en1f-free'];

function makePlayer(): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 5, body: 5, mind: 5 };
    p.health = 500; p.maxHealth = 500;
    p.effects = [];
    return p;
}

/** The foe as its Breakwater node fights it. */
function atLevel(foe: Enemy, level: number): Enemy {
    return { ...scaleEnemyToLevel(foe, level), effects: [] };
}

/** Opens the fight with the foe about to play `move` (in `phase`, 0 = the opening loop). */
function at(foe: Enemy, move: string, phase = 0): CombatEncounterState {
    const s = rollEncounterDice(initializeCombatEncounter(makePlayer(), foe, DECK, 7), rng).state;
    const idx = s.threatPhases.findIndex(p => p.enemyMove?.name === move && p.enemyMove.phase === phase);
    expect(idx, `${foe.id} has no ${move} in phase ${phase}`).toBeGreaterThanOrEqual(0);
    return { ...s, currentPhaseIndex: idx, hand: [], guard: 0 };
}

/** The foe's turn: what the player lost, and the state after. */
function foeTurn(s: CombatEncounterState): { lost: number; next: CombatEncounterState; events: ReturnType<typeof resolveThreatPhase>['events'] } {
    const res = resolveThreatPhase(s, rng);
    return { lost: s.player.health - res.state.player.health, next: res.state, events: res.events };
}

const cards = (n: number) => Array.from({ length: n }, (_u, i) => ({ uid: `h${i}`, cardId: 'qa-en1f-free' }));
const s2 = (n: number) => scaleMoveNumber(n, 2, PHASES_AUTHORED_LEVEL.normal);
const s3 = (n: number) => scaleMoveNumber(n, 3, PHASES_AUTHORED_LEVEL.normal);

/** Every foe's phases as `kind name` lines, and its DANGER. */
function shape(foe: Enemy): { moves: string[][]; dangers: (string | undefined)[] } {
    return {
        moves: (foe.phases ?? []).map(p => p.moves.map(m => `${m.kind} ${m.name}`)),
        dangers: (foe.phases ?? []).map(p => p.danger && `${p.danger.kind} ${p.danger.name}`),
    };
}

describe('A9 — the four foes play exactly the Appendix', () => {
    it('the Float-Eye (reworked): its loop, then Shut Lid leaves and The Long Career fires at 30%', () => {
        expect(shape(FloatEye)).toEqual({
            moves: [
                ['attack Long Look', 'attack Afterimage', 'defend Shut Lid', 'status Stare'],
                ['attack Long Look', 'attack Afterimage', 'status Stare'],
            ],
            dangers: [undefined, 'danger The Long Career'],
        });
    });

    it('the Gallows Crow: Murder of Crows at 30%, Peck the Debt becomes 3 hits', () => {
        expect(shape(GallowsCrow)).toEqual({
            moves: [
                ['attack Peck the Debt', 'attack Carrion Dive', 'defend Take Wing', 'status Shiny Thing'],
                ['attack Peck the Debt', 'attack Carrion Dive', 'defend Take Wing', 'status Shiny Thing'],
            ],
            dangers: [undefined, 'danger Murder of Crows'],
        });
        expect(GallowsCrow.phases![0].moves[0].hits).toBe(2);
        expect(GallowsCrow.phases![1].moves[0].hits).toBe(3);
    });

    it('the Net-Mender: The Whole Catch at 30%, then Cast Net and Haul In back to back', () => {
        expect(shape(NetMender)).toEqual({
            moves: [
                ['attack Cast Net', 'attack Haul In', 'defend Mend the Net', 'status Gill-hook'],
                ['attack Cast Net', 'attack Haul In'],
            ],
            dangers: [undefined, 'danger The Whole Catch'],
        });
    });

    it('the Crane-Hook: Drop the Load at 30%, Counterweight\'s second hit grows to 9', () => {
        expect(shape(CraneHook)).toEqual({
            moves: [
                ['attack Swing', 'attack Counterweight', 'defend Lock the Brake', 'status Hoist'],
                ['attack Swing', 'attack Counterweight', 'defend Lock the Brake', 'status Hoist'],
            ],
            dangers: [undefined, 'danger Drop the Load'],
        });
        expect(CraneHook.phases![0].moves[1].rider).toEqual({ kind: 'delayed-hit', damage: 6, unless: 10 });
        expect(CraneHook.phases![1].moves[1].rider).toEqual({ kind: 'delayed-hit', damage: 9, unless: 10 });
    });

    it('each is a registered normal with its own id, portrait key and enemy words', () => {
        for (const [slug, foe] of [
            ['float-eye', FloatEye], ['gallows-crow', GallowsCrow], ['net-mender', NetMender], ['crane-hook', CraneHook],
        ] as const) {
            expect(ENEMY_REGISTRY[slug]).toBe(foe);
            expect(foe.id).toBe(`enemy-${slug}`);
            expect(foe.portraitAsset).toBe(slug);
            expect(foe.difficulty).toBe('normal');
            expect(foe.stages).toEqual([]);
        }
        const words = (foe: Enemy) => new Set((foe.phases ?? []).flatMap(p => [...p.moves, ...(p.danger ? [p.danger] : [])]).flatMap(moveKeywords));
        expect([...words(NetMender)].sort()).toEqual(['barnacle', 'mend', 'scour', 'tangle']);
        expect([...words(CraneHook)].sort()).toEqual(['undertow', 'ward']);
    });

    it('every Breakwater node binds its foe under level 10', () => {
        expect(BW_ENCOUNTER_FOES['bw-w2']).toEqual({ slug: 'float-eye', level: 2 });
        expect(BW_ENCOUNTER_FOES['bw-w3']).toEqual({ slug: 'gallows-crow', level: 2 });
        expect(BW_ENCOUNTER_FOES['bw-m1']).toEqual({ slug: 'float-eye', level: 2 });
        expect(BW_ENCOUNTER_FOES['bw-p2']).toEqual({ slug: 'gallows-crow', level: 2 });
        expect(BW_ENCOUNTER_FOES['bw-h1']).toEqual({ slug: 'net-mender', level: 3 });
        expect(BW_ENCOUNTER_FOES['bw-h2']).toEqual({ slug: 'crane-hook', level: 3 });
        expect(BW_ENCOUNTER_FOES['bw-h3']).toEqual({ slug: 'net-mender', level: 3 });
        for (const row of Object.values(BW_ENCOUNTER_FOES)) expect(row.level).toBeLessThan(10);
    });
});

describe('the Float-Eye\'s riders', () => {
    const eye = atLevel(FloatEye, 2);

    it('Long Look: 6, +2 per card left unplayed (a Barnacle does not count); +3 in its second phase', () => {
        const s = at(eye, 'Long Look');
        expect(threatHits(s)).toEqual([6]);
        const held = { ...s, hand: [...cards(3), { uid: 'bn1', cardId: BARNACLE_ID }] };
        expect(threatHits(held)).toEqual([12]);
        expect(foeTurn(held).lost).toBe(12);
        expect(threatHits({ ...at(eye, 'Long Look', 1), hand: cards(3) })).toEqual([15]);
    });

    it('Afterimage: a full block copies your GUARD as its WARD; a hit that gets through copies nothing', () => {
        const blocked = foeTurn({ ...at(eye, 'Afterimage'), guard: 9 });
        expect(blocked.lost).toBe(0);
        expect(blocked.next.enemyWords?.ward).toBe(9);
        expect(blocked.events).toContainEqual({ kind: 'enemy-rider', rider: 'guard-to-ward', amount: 9 });
        const through = foeTurn({ ...at(eye, 'Afterimage'), guard: 2 });
        expect(through.lost).toBe(3);
        expect(through.next.enemyWords?.ward ?? 0).toBe(0);
    });

    it('Shut Lid: WARD 8 and a DEFEND telegraph; the next status put on it lasts 1 turn longer, until its next turn', () => {
        const s = at(eye, 'Shut Lid');
        expect(s.threatPhases[s.currentPhaseIndex].intentType).toBe('defend');
        const { next } = foeTurn(s);
        expect(next.enemyWords?.ward).toBe(8);
        expect(next.enemyRiders?.lengthenStatus).toBe(1);
        const struck = {
            ...next,
            enemy: { ...next.enemy, effects: [{ effectId: 'debuff_vulnerable', remainingDuration: 2, intensity: 25, appliedAt: next.round, tier: 1 as const }] },
        };
        const after = riderAfterPlay(next, struck);
        expect(after.state.enemy.effects[0]!.remainingDuration).toBe(3);
        expect(after.state.enemyRiders?.lengthenStatus).toBeUndefined();
        // A second status is not lengthened.
        expect(riderAfterPlay(after.state, after.state).events).toEqual([]);
    });

    it('Stare: you are VULNERABLE 25%', () => {
        const { next } = foeTurn(at(eye, 'Stare'));
        expect(next.player.effects.find(e => e.effectId === 'debuff_vulnerable')?.intensity).toBe(25);
    });

    it('The Long Career: hits back for half what you dealt it since its last turn', () => {
        const s = at(eye, 'The Long Career', 1);
        const dealt = { ...s, directDamageDealt: 21, enemyRiders: { dealtMark: 1 } };
        expect(threatHits(dealt)).toEqual([10]);
        expect(foeTurn(dealt).lost).toBe(10);
        // Nothing dealt, nothing back.
        expect(threatHits({ ...s, enemyRiders: { dealtMark: s.directDamageDealt } })).toEqual([]);
    });
});

describe('the Gallows Crow\'s riders', () => {
    const crow = atLevel(GallowsCrow, 2);

    it('Peck the Debt: each hit that gets through steals 1 Conviction; a blocked hit steals none', () => {
        const open = foeTurn({ ...at(crow, 'Peck the Debt'), conviction: 5 });
        expect(open.lost).toBe(6);
        expect(open.next.conviction).toBe(3);
        const guarded = foeTurn({ ...at(crow, 'Peck the Debt'), conviction: 5, guard: 4 });
        expect(guarded.next.conviction).toBe(4);
    });

    it('Carrion Dive: 8, or 12 and MEND 4 when you are under half VITAE', () => {
        expect(foeTurn(at(crow, 'Carrion Dive')).lost).toBe(8);
        const low = at(crow, 'Carrion Dive');
        const hurt = { ...low, player: { ...low.player, health: 200 }, enemy: { ...low.enemy, health: low.enemy.maxHealth - 10 } };
        const res = foeTurn(hurt);
        expect(res.lost).toBe(12);
        expect(res.next.enemy.health).toBe(hurt.enemy.health + 4);
    });

    it('Take Wing: WARD 6; left unhit, its next attack gains +3', () => {
        let s = at(crow, 'Take Wing');
        s = foeTurn(s).next;
        expect(s.enemyRiders?.unhitBonus).toBe(3);
        // Shiny Thing (no attack) carries the bonus to Peck the Debt.
        s = foeTurn(s).next;
        expect(s.threatPhases[s.currentPhaseIndex].enemyMove?.name).toBe('Peck the Debt');
        expect(threatHits(s)).toEqual([6, 3]);
        // Hit it on your turn and the bonus never arms.
        let hit = foeTurn(at(crow, 'Take Wing')).next;
        hit = { ...hit, directDamageDealt: hit.directDamageDealt + 2 };
        hit = foeTurn(hit).next;
        expect(threatHits(hit)).toEqual([3, 3]);
    });

    it('Shiny Thing: steals your newest banked die; with none banked, TANGLE 1', () => {
        const die: CombatManaDie = { id: 'r1', color: 'body', face: 'mana', state: 'available', temporary: false };
        const banked = foeTurn({ ...at(crow, 'Shiny Thing'), reserve: [die] });
        expect(banked.next.reserve).toEqual([]);
        expect(banked.next.enemyWords?.tangle ?? 0).toBe(0);
        const empty = foeTurn({ ...at(crow, 'Shiny Thing'), reserve: [] });
        expect(empty.next.enemyWords?.tangle).toBe(1);
    });

    it('Murder of Crows: one 2-damage hit per 2 cards in your discard, at least 3', () => {
        const s = at(crow, 'Murder of Crows', 1);
        expect(threatHits({ ...s, discard: ['a', 'b'] })).toEqual([2, 2, 2]);
        expect(threatHits({ ...s, discard: Array.from({ length: 11 }, (_u, i) => `c${i}`) })).toEqual([2, 2, 2, 2, 2]);
    });
});

describe('the Net-Mender\'s riders (level 3)', () => {
    const mender = atLevel(NetMender, 3);

    it('Cast Net: 5 and TANGLE 1', () => {
        const res = foeTurn(at(mender, 'Cast Net'));
        expect(res.lost).toBe(s3(5));
        expect(res.next.enemyWords?.tangle).toBe(1);
    });

    it('Haul In: 6, or 11 while TANGLE is still on you at the end of your turn', () => {
        const s = at(mender, 'Haul In');
        expect(foeTurn(s).lost).toBe(s3(6));
        const tangled = { ...s, enemyWords: { ward: 0, brine: 0, leechTurns: 0, leechPotency: 0, tangle: 1 } };
        const res = foeTurn(tangled);
        expect(res.lost).toBe(s3(11));
        expect(res.next.enemyWords?.tangle ?? 0).toBe(0);
    });

    it('Mend the Net: MEND 6 and it SCOURs one status off itself', () => {
        const s = at(mender, 'Mend the Net');
        const hurt = {
            ...s,
            enemy: {
                ...s.enemy, health: s.enemy.maxHealth - 20,
                effects: [{ effectId: 'debuff_vulnerable', remainingDuration: 2, intensity: 25, appliedAt: 1, tier: 1 as const }],
            },
        };
        const { next } = foeTurn(hurt);
        expect(next.enemy.health).toBe(hurt.enemy.health + s3(6));
        expect(next.enemy.effects.some(e => e.effectId === 'debuff_vulnerable')).toBe(false);
    });

    it('Gill-hook: a BARNACLE Curse goes into your hand', () => {
        const { next } = foeTurn(at(mender, 'Gill-hook'));
        expect(next.hand.filter(h => h.cardId === BARNACLE_ID)).toHaveLength(1);
    });

    it('The Whole Catch: 3 per card in your hand (a Barnacle too), then TANGLE 2', () => {
        const s = { ...at(mender, 'The Whole Catch', 1), hand: [...cards(3), { uid: 'bn1', cardId: BARNACLE_ID }] };
        expect(threatHits(s)).toEqual([s3(3) * 4]);
        const { next } = foeTurn(s);
        expect(next.enemyWords?.tangle).toBe(2);
    });
});

describe('the Crane-Hook\'s riders (level 3)', () => {
    const crane = atLevel(CraneHook, 3);

    it('Swing: your GUARD counts half against it', () => {
        expect(foeTurn({ ...at(crane, 'Swing'), guard: 10 }).lost).toBe(s3(8) - 5);
    });

    it('Counterweight: 4 now, 6 more next turn unless you deal it 10+ first', () => {
        const first = foeTurn(at(crane, 'Counterweight'));
        expect(first.lost).toBe(s3(4));
        expect(first.next.enemyRiders?.delayedHit).toEqual({ damage: s3(6), unless: 10 });
        // Lock the Brake is next: a DEFEND, but the delayed hit lands on it.
        expect(first.next.threatPhases[first.next.currentPhaseIndex].intentType).toBe('defend');
        const late = foeTurn(first.next);
        expect(late.lost).toBe(s3(6));
        expect(late.events).toContainEqual({ kind: 'enemy-rider', rider: 'delayed-hit', amount: s3(6) });
        // Deal it 10 on your turn and the second hit never comes.
        const answered = foeTurn({ ...first.next, directDamageDealt: first.next.directDamageDealt + 10 });
        expect(answered.lost).toBe(0);
        expect(answered.next.enemyRiders?.delayedHit).toBeUndefined();
    });

    it('Lock the Brake: WARD 10, telegraphed as DEFEND', () => {
        const s = at(crane, 'Lock the Brake');
        expect(s.threatPhases[s.currentPhaseIndex].intentType).toBe('defend');
        expect(foeTurn(s).next.enemyWords?.ward).toBe(s3(10));
    });

    it('Hoist: UNDERTOW on your body die', () => {
        expect(foeTurn(at(crane, 'Hoist')).next.enemyWords?.undertow).toBe('body');
    });

    it('Drop the Load: 15; block all of it and the crane is VULNERABLE 50%', () => {
        const open = foeTurn(at(crane, 'Drop the Load', 1));
        expect(open.lost).toBe(s3(15));
        expect(open.next.enemy.effects.some(e => e.effectId === 'debuff_vulnerable')).toBe(false);
        const blocked = foeTurn({ ...at(crane, 'Drop the Load', 1), guard: 40 });
        expect(blocked.lost).toBe(0);
        expect(blocked.next.enemy.effects.find(e => e.effectId === 'debuff_vulnerable')?.intensity).toBe(50);
    });
});

describe('numbers land as authored at the authored level', () => {
    it('the level-2 foes print the Appendix exactly', () => {
        expect(s2(6)).toBe(6);
        expect(s2(15)).toBe(15);
    });
});
