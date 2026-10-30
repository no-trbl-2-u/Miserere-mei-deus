/**
 * The board says what it does: the presenter half (phase BC1).
 *
 * Pins, against the REAL engine, the swarm's own cases:
 *   · A1: your INFERNO's chip carries `YOUR INFERNO −n each turn`, n the
 *     engine's `yourInferno`; the foe's INFERNO chip carries none; a weather
 *     chip's a11y line says it lasts the combat, never "0 turns left";
 *   · A2: a self INFERNO tick's log line reads `Your INFERNO burns you for n.`;
 *   · A3: `wallMath.blizzardCut` forwards the engine's cut;
 *   · A6: `selectDeadTray` counts MISS and X dice as unable to power;
 *   · A10, A11: one tick-colour table by element, and white plain hits.
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
    clearSandboxCards, projectIncomingThreat, registerSandboxCards, rollEncounterDice, yourInferno,
    type Card, type CombatEncounterState, type CombatEvent,
} from '@mechanics';

import {
    buildCombatViewModel, DEAD_TRAY_COPY, dotTickColor, dotTickFloat, effectChipA11y, HIT_FLOAT_COLOR,
    selectCombatLogHistory, selectDeadTray, selfBurnCaption, type CombatDieVM, type CombatViewModel,
} from '../combat-encounter.engine';
import { effectGlyph } from '@/components/combat/statusGlyphs';
import { HUE } from '@/theme/axm';
import { lookupEffect } from '@mechanics';
import { REAL_BOSS_FIGHT_FIXTURE, realFightFixture, startRealFight } from '@/test-utils/realFight';

// One program card in the deck gives the fight its weather ledger.
const WEATHER_CARD: Card = {
    id: 'bc-inferno', name: 'bc-inferno', color: 'any', description: 'A board cues test card.',
    tier: 1, rank: 1, cardType: 'skill', targetType: 'enemy',
    program: { free: { text: 'TEST.', run: (c) => c.inferno(4) }, paid: { text: 'TEST.', run: (c) => c.inferno(4) } },
};
beforeAll(() => registerSandboxCards([WEATHER_CARD]));
afterAll(() => clearSandboxCards());

function encounter(): CombatEncounterState {
    const { combat } = startRealFight(
        realFightFixture({ level: 1, baseStats: { heart: 5, body: 5, mind: 5 } }),
        { deck: ['bc-inferno', 'grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'], seed: 5 },
    );
    const s = rollEncounterDice(combat).state;
    return { ...s, guard: 0, player: { ...s.player, health: 100 } };
}

const withWeather = (s: CombatEncounterState, patch: Record<string, number | boolean>): CombatEncounterState =>
    ({ ...s, program: { ...s.program!, el: { ...s.program!.el, ...patch } } });

describe('your INFERNO reads as yours (A1)', () => {
    it('a your-inferno reading of 4 shows "YOUR INFERNO −4 each turn"; the foe chip has no caption', () => {
        const s = withWeather(encounter(), { infShared: 8 });
        expect(yourInferno(s.program!.el)).toBe(4);
        const vm = buildCombatViewModel(s);
        const mine = vm.player.effects.find((c) => c.effectId === 'weather-your-inferno');
        expect(mine?.caption).toBe('YOUR INFERNO −4 each turn');
        expect(mine?.caption).toBe(selfBurnCaption(4));
        const theirs = vm.enemy.effects.find((c) => c.effectId === 'weather-foe-inferno');
        expect(theirs).toBeDefined();
        expect(theirs?.caption).toBeUndefined();
    });

    it('names the per-turn loss, INFERNO on you alone included', () => {
        const s = withWeather(encounter(), { infShared: 5, infSelf: 3 });
        const mine = buildCombatViewModel(s).player.effects.find((c) => c.effectId === 'weather-your-inferno');
        expect(mine?.caption).toBe(selfBurnCaption(yourInferno(s.program!.el)));
        expect(yourInferno(s.program!.el)).toBe(2 + 3);
    });

    it('a weather chip lasts the combat in a11y; a status chip keeps its turns', () => {
        const vm = buildCombatViewModel(withWeather(encounter(), { infShared: 8 }));
        const mine = vm.player.effects.find((c) => c.effectId === 'weather-your-inferno')!;
        expect(effectChipA11y(mine)).toBe('Your Inferno, intensity 4, lasts the combat. YOUR INFERNO −4 each turn');
        expect(effectChipA11y(mine)).not.toMatch(/turns left/);
        const status = { ...mine, effectId: 'debuff_poison', duration: 3, caption: undefined };
        expect(effectChipA11y(status)).toBe('Your Inferno, intensity 4, 3 turns left');
    });
});

describe('the self INFERNO log line (A2)', () => {
    const tick = (target: 'self' | 'enemy', effectId = 'inferno', label = 'INFERNO'): CombatEvent =>
        ({ kind: 'dot-tick', effectId, label, amount: 4, target });
    const lines = (events: CombatEvent[]) =>
        selectCombatLogHistory({ ...encounter(), log: events }).map((l) => l.text);

    it('reads "Your INFERNO burns you for 4."', () => {
        expect(lines([tick('self')])).toContain('Your INFERNO burns you for 4.');
    });

    it('leaves the foe-side and non-weather tick lines as they were', () => {
        expect(lines([tick('enemy')])).toContain('INFERNO ticks for 4 on the foe.');
        expect(lines([tick('self', 'debuff_poison', 'Poison')])).toContain('Poison ticks for 4 on you.');
    });
});

describe('the BLIZZARD cut reaches the intent (A3)', () => {
    it('forwards the engine cut, and 0 with no BLIZZARD', () => {
        // Wall math is a deck foe's readout (a `phases` foe's telegraph carries
        // no number), so this reads the chapter boss.
        const { combat } = startRealFight(
            { ...REAL_BOSS_FIGHT_FIXTURE, player: { level: 1, baseStats: { heart: 5, body: 5, mind: 5 } } },
            { deck: ['bc-inferno', 'grey-strike', 'grey-ward', 'grey-word', 'grey-strike', 'grey-ward'], seed: 5 },
        );
        const rolled = rollEncounterDice(combat).state;
        const clear = { ...rolled, guard: 0, player: { ...rolled.player, health: 100 } };
        expect(buildCombatViewModel(clear).enemy.intent.wallMath.blizzardCut).toBe(0);
        const s = withWeather(clear, { blizzard: 5 });
        const cut = buildCombatViewModel(s).enemy.intent.wallMath.blizzardCut;
        expect(cut).toBe(projectIncomingThreat(s).blizzardCut);
        expect(cut).toBeGreaterThan(0);
    });

    it('a phases foe (the default bw-w2 Float-Eye) shows a kind and no wall-math number, BLIZZARD or not', () => {
        const zero = { projectedDamage: 0, netDamage: 0, willDeny: false, guard: 0, barrier: 0, blizzardCut: 0 };
        const clear = encounter();
        const iced = withWeather(clear, { blizzard: 5 });
        for (const s of [clear, iced]) {
            const intent = buildCombatViewModel(s).enemy.intent;
            expect(intent.type).toBe('attack');
            expect(intent.wallMath).toEqual(zero);
            expect(intent.damage).toBe(0);
        }
        // The engine still cuts the real hit; only the telegraph carries no number.
        expect(projectIncomingThreat(iced).blizzardCut).toBeGreaterThan(0);
    });
});

describe('selectDeadTray (A6)', () => {
    const die = (over: Partial<CombatDieVM>): CombatDieVM => ({
        id: 'd', color: 'heart', colorHex: HUE.damageRed, glyph: '♥', stanceLabel: 'HEART',
        spent: false, isX: false, draggable: true, face: 'mana', ...over,
    });
    const hand = (...stances: string[]) => stances.map((stance, i) => ({ uid: `c${i}`, stance })) as unknown as CombatViewModel['hand'];
    const tray = (dice: CombatDieVM[], cards = hand('body', 'mind', 'body')) =>
        selectDeadTray({ dice, diceRolled: true, hand: cards });

    it('an all-MISS tray with three cards in hand is dead', () => {
        expect(tray([die({ id: 'a', face: 'miss', draggable: false }), die({ id: 'b', face: 'miss', draggable: false })])).toBe(true);
    });
    it('one die that matches a card is not', () => {
        expect(tray([die({ id: 'a', face: 'miss', draggable: false }), die({ id: 'b', color: 'body' })])).toBe(false);
    });
    it('an off-colour die only is dead', () => {
        expect(tray([die({ color: 'heart' })])).toBe(true);
    });
    it('an X die only is dead', () => {
        expect(tray([die({ color: 'x', isX: true, draggable: false, face: undefined })])).toBe(true);
    });
    it('a tray whose every die is spent is not', () => {
        expect(tray([die({ spent: true, draggable: false }), die({ id: 'b', face: 'miss', spent: true, draggable: false })])).toBe(false);
    });
    it('an empty hand is not', () => {
        expect(tray([die({ face: 'miss', draggable: false })], hand())).toBe(false);
    });
    it('a grey card takes any live die, so it is not dead', () => {
        expect(tray([die({ color: 'heart' })], hand('any'))).toBe(false);
    });
    it('the END consequence copy lives in the presenter', () => {
        expect(DEAD_TRAY_COPY.endConsequence).toBe('unusable dice are discarded · fresh roll next phase');
    });
});

describe('tick colours and white hits (A10, A11)', () => {
    it('INFERNO red and STORM gold, each labelled with its own loss', () => {
        expect(dotTickFloat({ effectId: 'inferno', label: 'INFERNO', amount: 4 })).toEqual({ text: 'INFERNO −4', color: HUE.damageRed });
        expect(dotTickFloat({ effectId: 'storm', label: 'STORM', amount: 3 })).toEqual({ text: 'STORM −3', color: HUE.goldAccent });
    });

    it('a status DoT takes its own glyph colour', () => {
        const def = lookupEffect('debuff_poison')!;
        const glyphColor = effectGlyph(def as Parameters<typeof effectGlyph>[0]).color;
        expect(dotTickFloat({ effectId: 'debuff_poison', label: 'Poison', amount: 2 })).toEqual({ text: 'POISON −2', color: glyphColor });
    });

    it('the log line shares the table', () => {
        const [line] = selectCombatLogHistory({
            ...encounter(), log: [{ kind: 'dot-tick', effectId: 'storm', label: 'STORM', amount: 3, target: 'enemy' }],
        });
        expect(line.color).toBe(dotTickColor('storm'));
    });

    it('a plain hit floats white, and no tick does', () => {
        expect(HIT_FLOAT_COLOR).toBe(HUE.white);
        for (const id of ['inferno', 'storm', 'debuff_poison', 'debuff_bleed']) expect(dotTickColor(id)).not.toBe(HUE.white);
    });
});
