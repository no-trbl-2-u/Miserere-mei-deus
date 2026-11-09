/**
 * The Merciful's two quest relics (A13 to A15): Brim Over (the Brimming Locket,
 * ◆3) and Absolution (the Penitent's Brooch, ◆3). Neither touches MERCY (T, 2026-11-02).
 */

import { describe, expect, it } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { BaseStats } from '../../Character/types';
import { Sandbag_01 } from '../../Enemy/enemy.library';
import { MERCIFUL_SET } from '../../Cards/library/merciful.cards';
import { BARNACLE_ID } from '../../Cards/library/enemy-curses.cards';
import { relicLibrary, getRelicById, getSignaturesForLoadout } from '../../Items/relic.library';
import { deepClone } from '../../Utils';
import {
    initializeCombatEncounter, rollEncounterDice, playCombatCard, playSignatureSkill, resolveThreatPhase,
} from '../combat.engine';
import { getSignatureSkill, signatureCastBlock, signatureText, SIGNATURE_SKILLS } from '../combat.signature';
import { programTurnStart, initProgramLedger } from '../combat.card-program';
import { PROGRAM_KIT } from '../combat.engine';
import { scaleFor } from '../stat-scaling';
import type { CombatEncounterState } from '../combat.encounter.types';

const LOCKET = 'sig-merciful-locket';
const BROOCH = 'sig-merciful-brooch';
// Found by name so no trial card id is written here: Salve (FREE: HEAL 2, DRAW 1), Searing Mend (FREE: RADIANCE 3).
const SALVE = MERCIFUL_SET.cards.find(c => c.name === 'Salve')!.id;
const SEARING = MERCIFUL_SET.cards.find(c => c.name === 'Searing Mend')!.id;
const WILD = { id: 'w', color: 'wild' as const, state: 'available' as const, temporary: false, face: 'mana' as const };
const STATS: BaseStats = { heart: 5, body: 5, mind: 5 };
const VULN = { effectId: 'debuff_vulnerable', remainingDuration: 3, intensity: 25, appliedAt: 1, tier: 1 as const };

/** A fight against a 500-VITAE sandbag with `hand` in hand, `vitae` of 100, GUARD 0 and plenty of Conviction. */
function fight(hand: string[], vitae = 100): CombatEncounterState {
    const enemy = { ...deepClone(Sandbag_01), health: 500, maxHealth: 500 };
    const player = { ...deepClone(Player), baseStats: STATS };
    let s = initializeCombatEncounter(player, enemy, [...hand, ...Array(10).fill('grey-strike')], 7);
    s = rollEncounterDice(s).state;
    return {
        ...s,
        hand: hand.map((cardId, i) => ({ uid: `t${i}`, cardId })),
        player: { ...s.player, health: vitae, maxHealth: 100 },
        dice: [{ ...WILD }], reserve: [], guard: 0, conviction: 9,
    };
}
const play = (s: CombatEncounterState, uid = 't0'): CombatEncounterState =>
    playCombatCard({ ...s, dice: [{ ...WILD }] }, { uid }, false).state;
const mindHeal = (n: number): number => scaleFor(n, STATS, 'mind', 'one-shot');
const heartRadiance = (n: number): number => scaleFor(n, STATS, 'heart', 'repeating');

describe('A13 · Brim Over (the Brimming Locket)', () => {
    it('armed, a HEAL past max VITAE gives GUARD equal to the overflow', () => {
        const heal = mindHeal(2);
        const armed = playSignatureSkill(fight([SALVE], 99), LOCKET).state;
        expect(armed.conviction).toBe(6);
        const s = play(armed);
        expect(s.player.health).toBe(100);
        expect(s.guard).toBe(heal - 1);
        // At full VITAE the whole heal is overflow.
        expect(play(playSignatureSkill(fight([SALVE], 100), LOCKET).state).guard).toBe(heal);
    });

    it('a heal that fits gives no GUARD, and unarmed a heal past max gives none either', () => {
        const fits = play(playSignatureSkill(fight([SALVE], 50), LOCKET).state);
        expect(fits.player.health).toBe(50 + mindHeal(2));
        expect(fits.guard).toBe(0);
        expect(play(fight([SALVE], 100)).guard).toBe(0);
    });

    it('RADIANCE gives GUARD for the overflow but still DEALs only what it restored', () => {
        const amt = heartRadiance(3);
        const s = play(playSignatureSkill(fight([SEARING], 99), LOCKET).state);
        expect(s.player.health).toBe(100);
        expect(500 - s.enemy.health).toBe(1);
        expect(s.guard).toBe(amt - 1);
        const full = play(playSignatureSkill(fight([SEARING], 100), LOCKET).state);
        expect(full.enemy.health).toBe(500);
        expect(full.guard).toBe(amt);
    });

    it('a signature HEAL and a LEECH you trigger on your turn count (Open Vein, armed)', () => {
        const vein = 'sig-bleeding-signet';
        let s = fight([SALVE], 100);
        s = { ...s, program: { ...initProgramLedger(), leechTurns: 2, leechPotency: 10, leechCardId: 'x' } };
        s = playSignatureSkill(s, LOCKET).state;
        s = playSignatureSkill(s, vein).state;
        // Open Vein HEALs 5 (mind-scaled) and drains 10: all of it overflows at full VITAE.
        expect(s.guard).toBe(mindHeal(5) + 10);
    });

    it('BRINE cuts the GUARD as it cuts any GUARD gain', () => {
        const heal = mindHeal(2);
        let s = fight([SALVE], 100);
        s = { ...s, enemyWords: { ward: 0, brine: 1, leechTurns: 0, leechPotency: 0 } };
        const out = play(playSignatureSkill(s, LOCKET).state);
        expect(out.guard).toBe(Math.max(0, heal - 1));
    });

    it('ends with your turn: the foe\'s turn lets go, and the next turn start gives no GUARD', () => {
        const armed = playSignatureSkill(fight([SALVE], 100), LOCKET).state;
        expect(armed.program!.brimming).toBe(true);
        const foeTurn = resolveThreatPhase(armed).state;
        expect(foeTurn.program!.brimming).toBe(false);
        const turn = programTurnStart({ ...armed, guard: 0 }, PROGRAM_KIT).state;
        expect(turn.program!.brimming).toBe(false);
        expect(play({ ...foeTurn, guard: 0, hand: [{ uid: 't0', cardId: SALVE }], dice: [{ ...WILD }] }).guard).toBe(0);
    });

    it('casting it armed is refused and spends nothing', () => {
        const sig = getSignatureSkill(LOCKET)!;
        const armed = playSignatureSkill(fight([SALVE]), LOCKET).state;
        expect(signatureCastBlock(armed, sig)).toBe('You are already brimming');
        const again = playSignatureSkill(armed, LOCKET);
        expect(again.state.conviction).toBe(armed.conviction);
        expect(again.events).toContainEqual(expect.objectContaining({ kind: 'effect-fizzled', message: 'You are already brimming' }));
        expect(signatureCastBlock({ ...fight([SALVE]), conviction: 2 }, sig)).toBe('Need 3 ◆ Conviction');
    });
});

describe('A14 · Absolution (the Penitent\'s Brooch)', () => {
    /** Every condition at once: VULNERABLE in `effects`, and BRINE, TANGLE, UNDERTOW and LEECH on you, plus a BARNACLE in hand. */
    function afflicted(vitae = 50): CombatEncounterState {
        const s = fight([SALVE, BARNACLE_ID], vitae);
        return {
            ...s,
            player: { ...s.player, effects: [VULN] },
            enemyWords: { ward: 0, brine: 3, leechTurns: 2, leechPotency: 4, tangle: 2, undertow: 'body' },
        };
    }

    it('removes each debuff and word, leaves the BARNACLE, and HEALs 2 per condition (mind-scaled in one heal)', () => {
        const cast = playSignatureSkill(afflicted(), BROOCH);
        const s = cast.state;
        expect(s.conviction).toBe(6);
        expect(s.player.effects).toEqual([]);
        expect(s.enemyWords).toMatchObject({ brine: 0, leechTurns: 0, leechPotency: 0, tangle: 0 });
        expect(s.enemyWords!.undertow).toBeUndefined();
        expect(s.hand.some(h => h.cardId === BARNACLE_ID)).toBe(true);
        expect(s.player.health).toBe(50 + mindHeal(2 * 5));
        for (const word of ['brine', 'tangle', 'undertow', 'leech']) {
            expect(cast.events).toContainEqual(expect.objectContaining({ kind: 'enemy-word', word, op: 'stripped' }));
        }
    });

    it('counts a condition once whatever its stacks, and heals for just the ones there', () => {
        const s = fight([SALVE], 50);
        const one = playSignatureSkill({ ...s, enemyWords: { ward: 0, brine: 9, leechTurns: 0, leechPotency: 0 } }, BROOCH).state;
        expect(one.player.health).toBe(50 + mindHeal(2));
        expect(one.enemyWords!.brine).toBe(0);
    });

    it('the HEAL counts toward "all you healed this turn"', () => {
        const s = playSignatureSkill(afflicted(), BROOCH).state;
        expect(s.program!.heals!.healed).toBe(mindHeal(2 * 5));
    });

    it('with nothing to remove it is refused and spends nothing', () => {
        const sig = getSignatureSkill(BROOCH)!;
        const s = fight([SALVE], 50);
        expect(signatureCastBlock(s, sig)).toBe('Nothing on you to absolve');
        const refused = playSignatureSkill(s, BROOCH);
        expect(refused.state.conviction).toBe(s.conviction);
        expect(refused.state.player.health).toBe(50);
        expect(refused.events).toContainEqual(expect.objectContaining({ kind: 'effect-fizzled', message: 'Nothing on you to absolve' }));
        // A BARNACLE alone is a card, not a condition.
        const barnacle = { ...s, hand: [...s.hand, { uid: 'b', cardId: BARNACLE_ID }] };
        expect(signatureCastBlock(barnacle, sig)).toBe('Nothing on you to absolve');
    });

    it('its HEAL overflows into GUARD when Brim Over is armed', () => {
        let s = afflicted(100);
        s = playSignatureSkill(s, LOCKET).state;
        s = playSignatureSkill(s, BROOCH).state;
        expect(s.guard).toBe(mindHeal(2 * 5));
    });
});

describe('A15 · both relics are the Merciful\'s quest relics', () => {
    const ring = getRelicById('relic-disarming-plea')!;
    const locket = getRelicById('relic-brimming-locket')!;
    const brooch = getRelicById('relic-penitents-brooch')!;

    it('carry the Merciful lane, source quest and +5 Mind, and grant their signature', () => {
        for (const [relic, sig, name] of [[locket, LOCKET, 'Brimming Locket'], [brooch, BROOCH, "Penitent's Brooch"]] as const) {
            expect(relic.name).toBe(name);
            expect(relic.laneId).toBe('merciful');
            expect(relic.relicSource).toBe('quest');
            expect(relic.slot).toBe('relic');
            expect(relic.statModifiers).toEqual([{ stat: 'mind', value: 5 }]);
            expect(relic.grantsSignature).toBe(sig);
            expect(getSignaturesForLoadout({ weapon: null, armor: null, relics: [relic] })).toEqual([sig]);
        }
        expect(relicLibrary.filter(r => r.laneId === 'merciful').map(r => [r.id, r.relicSource])).toEqual([
            [ring.id, 'elite'], [locket.id, 'quest'], [brooch.id, 'quest'],
        ]);
    });

    it('read on the signature bar: name, cost 3 and the printed effect', () => {
        const stats = STATS;
        expect(SIGNATURE_SKILLS[LOCKET]).toMatchObject({ name: 'Brim Over', cost: 3, kind: 'overheal-guard' });
        expect(signatureText(SIGNATURE_SKILLS[LOCKET], stats)).toBe('This turn, healing past your max VITAE becomes GUARD.');
        expect(SIGNATURE_SKILLS[BROOCH]).toMatchObject({ name: 'Absolution', cost: 3, kind: 'absolve' });
        expect(signatureText(SIGNATURE_SKILLS[BROOCH], stats)).toMatch(/^Remove all your debuffs, then HEAL \d+ for each\.$/);
    });

    it('neither signature touches MERCY', () => {
        let s = fight([SALVE], 80);
        s = { ...s, enemyWords: { ward: 0, brine: 2, leechTurns: 0, leechPotency: 0 } };
        const before = s.enemy.health;
        s = playSignatureSkill(s, LOCKET).state;
        s = playSignatureSkill(s, BROOCH).state;
        s = play(s);
        const mercy = s.program?.mercy;
        expect(mercy?.total ?? 0).toBe(0);
        expect(mercy?.clock ?? 0).toBe(0);
        expect(s.enemy.health).toBe(before);
        expect(s.program?.mercyCards ?? []).toEqual([]);
        expect(SIGNATURE_SKILLS[LOCKET].kind).not.toBe('mercy');
        expect(SIGNATURE_SKILLS[BROOCH].kind).not.toBe('mercy');
    });
});
