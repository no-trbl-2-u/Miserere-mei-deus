import { describe, expect, it } from '@jest/globals';

import { FADE_TICK_MS, MUSIC_TRACKS, decideMusic, fadeSteps, fadeVolume, musicContext } from './music.engine';

const base = { inCombat: false, onCombatScreen: false, hasHazard: false, musicVolume: 70, appActive: true };

describe('decideMusic', () => {
    it('plays the theme in exploration at musicVolume / 100', () => {
        expect(decideMusic(base)).toEqual({
            context: 'exploration',
            track: 'theme',
            state: 'playing',
            targetVolume: 0.7,
        });
    });

    it('is the combat context, paused, while a fight is staged', () => {
        const d = decideMusic({ ...base, inCombat: true });
        expect(d.context).toBe('combat');
        expect(d.state).toBe('paused');
    });

    it('stays combat through the summary: the engine cleared the fight but the screen flag is up', () => {
        const d = decideMusic({ ...base, inCombat: false, onCombatScreen: true });
        expect(d.context).toBe('combat');
        expect(d.state).toBe('paused');
    });

    it('returns to exploration once the screen flag drops', () => {
        expect(decideMusic({ ...base, onCombatScreen: false }).context).toBe('exploration');
    });

    it('is the hazard context, paused, while a hazard is live', () => {
        const d = decideMusic({ ...base, hasHazard: true });
        expect(d.context).toBe('hazard');
        expect(d.state).toBe('paused');
    });

    it('ranks combat over hazard when both hold', () => {
        expect(musicContext({ inCombat: true, onCombatScreen: false, hasHazard: true })).toBe('combat');
        expect(musicContext({ inCombat: false, onCombatScreen: true, hasHazard: true })).toBe('combat');
    });

    it('is silent at volume 0 in every context', () => {
        expect(decideMusic({ ...base, musicVolume: 0 })).toMatchObject({ state: 'paused', targetVolume: 0 });
        expect(decideMusic({ ...base, musicVolume: 0, inCombat: true }).state).toBe('paused');
    });

    it('pauses while the music switch is off, and plays again at the kept volume when it is on', () => {
        expect(decideMusic({ ...base, musicOn: false })).toEqual({ state: 'paused', targetVolume: 0.7 });
        expect(decideMusic({ ...base, musicOn: true })).toEqual({ state: 'playing', targetVolume: 0.7 });
    });

    it('pauses while the app is in the background', () => {
        expect(decideMusic({ ...base, appActive: false }).state).toBe('paused');
    });

    it('treats musicOn false as a master mute, not a context', () => {
        const d = decideMusic({ ...base, musicOn: false });
        expect(d.context).toBe('exploration');
        expect(d.state).toBe('paused');
        expect(decideMusic({ ...base, musicOn: true }).state).toBe('playing');
    });

    it('follows the volume linearly and clamps out-of-range input', () => {
        expect(decideMusic({ ...base, musicVolume: 100 }).targetVolume).toBe(1);
        expect(decideMusic({ ...base, musicVolume: 25 }).targetVolume).toBe(0.25);
        expect(decideMusic({ ...base, musicVolume: 400 }).targetVolume).toBe(1);
        expect(decideMusic({ ...base, musicVolume: -5 }).state).toBe('paused');
    });
});

describe('track table', () => {
    it('has the theme for exploration and nothing for combat or hazard (no combat audio yet)', () => {
        expect(MUSIC_TRACKS).toEqual({ exploration: 'theme', combat: null, hazard: null });
    });
});

describe('fade math', () => {
    it('steps linearly and lands exactly on the target', () => {
        expect(fadeVolume(0, 1, 0, 4)).toBe(0);
        expect(fadeVolume(0, 1, 2, 4)).toBe(0.5);
        expect(fadeVolume(1, 0, 4, 4)).toBe(0);
        expect(fadeVolume(0.2, 0.9, 99, 4)).toBe(0.9);
    });

    it('sizes a fade in whole ticks, at least one', () => {
        expect(fadeSteps(2000)).toBe(2000 / FADE_TICK_MS);
        expect(fadeSteps(1)).toBe(1);
        expect(fadeSteps(0)).toBe(1);
    });
});
