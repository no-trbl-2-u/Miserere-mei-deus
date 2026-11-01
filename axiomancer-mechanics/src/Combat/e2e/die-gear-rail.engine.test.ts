/**
 * Hermetic E2E — die-gear rail → combat wiring.
 *
 * The SOLE engine wiring point is `initializeCombatEncounter` copying
 * `clonedPlayer.dieGear` onto the encounter state; `activeDieGear` does the
 * rest. This suite proves the persisted rail actually drives combat:
 *   - the rail does not set the special payload: the worn weapon does;
 *   - a banked special spent from the Reserve fires the weapon payload too
 *     (use-triggered timing — the trigger is USE, not roll);
 *   - a HONE'd rail rolls more mana faces than the default.
 * All rolls pinned via sequential rng closures.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import { greyPair } from '../../Items/equipment.library';
import type { Character } from '../../Character/types';
import type { Enemy } from '../../Enemy/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { registerSandboxCards } from '../../Cards/cards.sandbox';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, endTurn, startTurn,
    CONVICTION_CAP,
} from '../combat.engine';
import { honeDieGear } from '../../Character/dieGear.reducer';
import { SPECIAL_CONVICTION_DEFAULT } from '../combat.upgradeable-dice';
import type { CombatEncounterState, CombatEvent } from '../combat.encounter.types';

afterEach(() => {
    vi.restoreAllMocks();
});

registerSandboxCards([
    {
        id: 'dg-body-dot', name: 'DG Body DoT',
        color: 'body', description: 'body fixture', tier: 1,
        targetType: 'enemy', rank: 1, cardType: 'spell',
        combatEffects: [{ effectId: 'debuff_bleed', appliedTo: 'opponent', intensity: 1, duration: 2 }],
    },
]);

const DECK = ['dg-body-dot', 'dg-body-dot', 'dg-body-dot', 'dg-body-dot', 'dg-body-dot', 'dg-body-dot'];

function seqRng(...vals: number[]): () => number {
    let i = 0;
    return () => vals[Math.min(i++, vals.length - 1)];
}
const BOON = 0.05; // idx 0 → special
const MANA = 0.25;    // idx 1 → mana
const MISS = 0.95;    // idx 5 → miss

function makePlayer(mutate?: (c: Character) => void): Character {
    const p = deepClone(Player);
    p.knownCards = DECK.slice();
    p.baseStats = { heart: 8, body: 8, mind: 8 };
    p.health = 400; p.maxHealth = 400;
    p.equipment = { ...p.equipment, weapon: greyPair().weapon };
    if (mutate) mutate(p);
    return p;
}
function makeEnemy(): Enemy {
    const e = deepClone(FloatEye);
    e.id = 'enemy-dg-dummy';
    e.health = 500; e.maxHealth = 500; e.effects = [];
    return e;
}
function trayDie(s: CombatEncounterState, color: string) {
    const d = s.dice.find(x => x.color === color && !x.floating);
    if (!d) throw new Error(`no tray die of color ${color}`);
    return d;
}
function paid(s: CombatEncounterState, dieId: string) {
    const entry = s.hand.find(h => h.cardId === 'dg-body-dot')!;
    return playCombatCard(s, { uid: entry.uid }, true, dieId, seqRng(0.5));
}
function events(res: { events: CombatEvent[] }, kind: CombatEvent['kind']): CombatEvent[] {
    return res.events.filter(e => e.kind === kind);
}

describe('die-gear rail → combat', () => {
    it('wires the player rail onto the encounter state', () => {
        const player = makePlayer(c => {
            c.dieGear = { body: { dieColor: 'body', specialFaces: 1, manaFaces: 2, specialConviction: 5 } };
        });
        const s = initializeCombatEncounter(player, makeEnemy(), DECK, 7);
        expect(s.dieGear?.body?.specialConviction).toBe(5);
    });

    it('the worn weapon sets the special payload; a rail with a richer specialConviction does not change it', () => {
        const player = makePlayer(c => {
            c.dieGear = { body: { dieColor: 'body', specialFaces: 1, manaFaces: 2, specialConviction: 5 } };
        });
        let s = initializeCombatEncounter(player, makeEnemy(), DECK, 7);
        s = rollEncounterDice(s, seqRng(BOON, MANA, MANA, MANA)).state; // body = special
        const before = s.conviction;
        const res = paid(s, trayDie(s, 'body').id);
        expect(events(res, 'special-fired')).toHaveLength(1);
        expect(res.state.conviction).toBe(Math.min(CONVICTION_CAP, before + SPECIAL_CONVICTION_DEFAULT));
    });

    it('a banked special spent from the Reserve fires the weapon payload (use-triggered)', () => {
        const player = makePlayer(c => {
            c.dieGear = { body: { dieColor: 'body', specialFaces: 1, manaFaces: 2, specialConviction: 5 } };
        });
        let s = initializeCombatEncounter(player, makeEnemy(), DECK, 7);
        s = rollEncounterDice(s, seqRng(BOON, MISS, MISS, MISS)).state;
        s = endTurn(s).state;                       // banks the special into Reserve
        expect(s.reserve?.[0]?.face).toBe('special');
        const reservedId = s.reserve![0].id;
        s = startTurn(s, seqRng(MISS, MISS, MISS, MISS)).state;
        const before = s.conviction;
        const res = paid(s, reservedId);
        expect(events(res, 'special-fired')).toHaveLength(1);
        expect(res.state.conviction).toBe(Math.min(CONVICTION_CAP, before + SPECIAL_CONVICTION_DEFAULT));
    });

    it('a HONE\'d rail rolls more mana faces in combat than the default', () => {
        const player = makePlayer(c => {
            c.dieGear = honeDieGear(c, 'body').character.dieGear; // body: 1 special / 3 mana / 2 miss
        });
        let s = initializeCombatEncounter(player, makeEnemy(), DECK, 7);
        // Face idx 3 (0.58) is a MISS on the default body die (mana faces = idx
        // 1,2) but a MANA on the honed die (mana faces = idx 1,2,3).
        s = rollEncounterDice(s, seqRng(0.58, MISS, MISS, MISS)).state;
        expect(trayDie(s, 'body').face).toBe('mana');
    });
});
