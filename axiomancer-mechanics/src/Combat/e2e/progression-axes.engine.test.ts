/**
 * Hermetic E2E — THE PATH: the progression axes.
 *
 * A player's combat power does NOT grow through card rank alone. It grows
 * along six axes: staged decks, card removal, card upgrades, DIE UPGRADES,
 * ACT-REWARD DICE, and better signature items. Modelling only rank + stats is
 * what made every late-stage cell read unwinnable — the harness was sending an
 * act-one body at act-four content.
 *
 * This suite pins the two DICE axes end to end: the character carries them,
 * the encounter seeds them, and the tray honours them. It is a wiring guard,
 * not a balance band — it says nothing about how much either axis is worth.
 *
 * Both axes are potent: there is no draft, so every usable die powers a card —
 * one more die is one more PAID play, one more mana face one fewer dead die.
 * The wiring being correct and the axis being worth
 * something are still different claims; only the first is tested below.
 *
 * Pure math + a fixed RNG only; no disk / network / TTY.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';

import { Player } from '../../Character/characters.mock';
import type { Character } from '../../Character/types';
import { FloatEye } from '../../Enemy/enemy.library';
import { deepClone } from '../../Utils';
import { MAX_DIE_UPGRADE_LEVEL } from '../combat.dice';
import { initializeCombatEncounter, rollEncounterDice } from '../combat.engine';
import { buildStagePlayer, COMBAT_STAGE_ORDER, COMBAT_STAGE_PROFILES } from '../combat.stage-profiles';
import {
    activeDieGear, DEFAULT_DIE_GEAR, honedDieGear, UPGRADEABLE_DIE_COLORS,
} from '../combat.upgradeable-dice';

afterEach(() => vi.restoreAllMocks());

const rng = (): number => 0.5;

function playerWith(over: Partial<Character>): Character {
    const p = deepClone(Player);
    p.knownCards = ['spoiled-poultice'];
    return { ...p, ...over };
}

function openWith(over: Partial<Character>): ReturnType<typeof rollEncounterDice>['state'] {
    const s = initializeCombatEncounter(
        playerWith(over), deepClone(FloatEye), ['spoiled-poultice'], 7,
    );
    return rollEncounterDice(s, rng).state;
}

describe('THE PATH under the SHIPPED dice model (spec 33)', () => {
    it('the encounter seeds the level from the character', () => {
        expect(openWith({ dieUpgradeLevel: 2 }).dieUpgradeLevel).toBe(2);
        expect(openWith({}).dieUpgradeLevel).toBe(0);
    });

    it('the honed ladder tops out at MAX_DIE_UPGRADE_LEVEL (the gold die still gains there)', () => {
        expect(honedDieGear('wild', MAX_DIE_UPGRADE_LEVEL).manaFaces)
            .toBeGreaterThan(honedDieGear('wild', MAX_DIE_UPGRADE_LEVEL - 1).manaFaces);
    });

    it('HONE turns miss faces into mana faces, and saturates honestly', () => {
        const stock = DEFAULT_DIE_GEAR.body;
        expect(honedDieGear('body', 0)).toEqual(stock);
        expect(honedDieGear('body', 1).manaFaces).toBe(stock.manaFaces + 1);
        expect(honedDieGear('body', 2).manaFaces).toBe(stock.manaFaces + 2);
        // A colour die runs out of miss faces at 3 hones and stops there.
        expect(honedDieGear('body', 3).manaFaces).toBe(5);
        expect(honedDieGear('body', 4).manaFaces).toBe(5);
        expect(honedDieGear('body', 99).specialFaces + honedDieGear('body', 99).manaFaces).toBe(6);
        // Gold starts a face behind, so it is still gaining at level 4.
        expect(honedDieGear('wild', 4).manaFaces).toBeGreaterThan(honedDieGear('wild', 3).manaFaces);
    });

    it('an authored gear rail always beats the honed default', () => {
        const rail = { dieColor: 'body', specialFaces: 2, manaFaces: 2 } as const;
        const state = { dieGear: { body: rail }, dieUpgradeLevel: 4 };
        expect(activeDieGear(state, 'body')).toEqual(rail);
        expect(activeDieGear(state, 'mind')).toEqual(honedDieGear('mind', 4));
    });

    it('the tray grows by one die per banked ACT REWARD', () => {
        expect(openWith({}).dice).toHaveLength(UPGRADEABLE_DIE_COLORS.length);
        expect(openWith({ bonusTurnDice: 1 }).dice).toHaveLength(UPGRADEABLE_DIE_COLORS.length + 1);
        expect(openWith({ bonusTurnDice: 2 }).dice).toHaveLength(UPGRADEABLE_DIE_COLORS.length + 2);
        expect(openWith({ bonusTurnDice: -3 }).dice).toHaveLength(UPGRADEABLE_DIE_COLORS.length);
        expect(openWith({}).bonusTurnDice).toBe(0);
    });

    it('act-reward dice are duplicate STANCE colours, never more gold', () => {
        const extras = openWith({ bonusTurnDice: 3 }).dice.filter(d => d.id.includes('-act'));
        expect(extras).toHaveLength(3);
        expect(extras.map(d => d.color).sort()).toEqual(['body', 'heart', 'mind']);
        // Ids stay unique — a collision would silently drop a die downstream.
        expect(new Set(extras.map(d => d.id)).size).toBe(3);
    });

    it('honing strictly raises the count of USABLE dice in a swept tray', () => {
        // Sweep all six faces at each level and count what could power a card.
        const usableAcross = (level: number): number => {
            let usable = 0;
            for (let k = 0; k < 6; k++) {
                const state = initializeCombatEncounter(
                    playerWith({ dieUpgradeLevel: level }), deepClone(FloatEye), ['spoiled-poultice'], 7,
                );
                const opened = rollEncounterDice(state, () => k / 6).state;
                usable += opened.dice.filter(d => d.state === 'available').length;
            }
            return usable;
        };
        // Levels 0→3 each add a mana face to all three colour dice.
        for (let l = 1; l <= 3; l++) {
            expect(usableAcross(l), `level ${l} did not beat level ${l - 1}`)
                .toBeGreaterThan(usableAcross(l - 1));
        }
    });

    it('every stage profile actually reaches the shipped roll', () => {
        for (const id of COMBAT_STAGE_ORDER) {
            const stage = COMBAT_STAGE_PROFILES[id];
            const player = buildStagePlayer(stage);
            const opened = rollEncounterDice(
                initializeCombatEncounter(player, deepClone(FloatEye), player.knownCards.slice(0, 12), 7),
                rng,
            ).state;
            expect(opened.dieUpgradeLevel, `${id} upgrade level lost`).toBe(stage.dieUpgradeLevel);
            expect(opened.dice.filter(d => d.id.includes('-act')), `${id} act dice lost`)
                .toHaveLength(stage.bonusBaseDice);
        }
    });
});

describe('the stage profiles carry the campaign, not just the level', () => {
    it('every axis is monotone across early -> mid -> late', () => {
        const stages = COMBAT_STAGE_ORDER.map(id => COMBAT_STAGE_PROFILES[id]);
        for (let i = 1; i < stages.length; i++) {
            const prev = stages[i - 1];
            const next = stages[i];
            const where = `${prev.id} -> ${next.id}`;
            expect(next.bonusBaseDice, `bonusBaseDice regressed ${where}`)
                .toBeGreaterThanOrEqual(prev.bonusBaseDice);
            expect(next.dieUpgradeLevel, `dieUpgradeLevel regressed ${where}`)
                .toBeGreaterThanOrEqual(prev.dieUpgradeLevel);
            expect(next.upgradedCardShare, `upgradedCardShare regressed ${where}`)
                .toBeGreaterThanOrEqual(prev.upgradedCardShare);
        }
    });

    it('the early stage is the body the game starts you in', () => {
        const early = COMBAT_STAGE_PROFILES.early;
        expect(early.bonusBaseDice).toBe(0);
        expect(early.dieUpgradeLevel).toBe(0);
        expect(early.upgradedCardShare).toBe(0);
    });

    /**
     * Owner-set harness bands: "early game has normal amount of
     * dice, mid-game should have 1 extra base dice and 1 or 2 dice upgrades,
     * late-game should [have] 2 extra base dice and 3 or 4 upgrades."
     *
     * These are the TRAY the non-UI playtest sends into each stage. They are a
     * projection, not a shipped feature — the game is still in act one, so no
     * act-reward die has ever been handed out in the product. Pinned because a
     * silent drift here quietly re-mismeasures every mid/late cell.
     */
    it.each([
        ['early', 0, 0, 0],
        ['mid', 1, 1, 2],
        ['late', 2, 3, 4],
    ] as const)('the %s tray matches the owner band', (id, dice, minUp, maxUp) => {
        const stage = COMBAT_STAGE_PROFILES[id];
        expect(stage.bonusBaseDice, `${id} bonus dice`).toBe(dice);
        expect(stage.dieUpgradeLevel, `${id} die upgrades`).toBeGreaterThanOrEqual(minUp);
        expect(stage.dieUpgradeLevel, `${id} die upgrades`).toBeLessThanOrEqual(maxUp);
    });

    it('the ladder reaches the bands the owner asked for', () => {
        // "3 or 4 upgrades" is only expressible if the ladder goes that far.
        expect(MAX_DIE_UPGRADE_LEVEL).toBeGreaterThanOrEqual(4);
    });

    it('buildStagePlayer hands the dice axes to the encounter', () => {
        for (const id of COMBAT_STAGE_ORDER) {
            const stage = COMBAT_STAGE_PROFILES[id];
            const player = buildStagePlayer(stage);
            expect(player.bonusTurnDice, `${id} bonus dice`).toBe(stage.bonusBaseDice);
            expect(player.dieUpgradeLevel, `${id} die upgrades`).toBe(stage.dieUpgradeLevel);
            const opened = rollEncounterDice(
                initializeCombatEncounter(player, deepClone(FloatEye), player.knownCards.slice(0, 12), 7),
                rng,
            ).state;
            expect(opened.dice, `${id} tray size`).toHaveLength(UPGRADEABLE_DIE_COLORS.length + stage.bonusBaseDice);
        }
    });
});
