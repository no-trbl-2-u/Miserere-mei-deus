import { describe, expect, it } from '@jest/globals';

import { FADE_TICK_MS, decideMusic, fadeSteps, fadeVolume } from './music.engine';

const base = { inCombat: false, hasHazard: false, musicVolume: 70, appActive: true };

describe('decideMusic', () => {
    it('plays outside combat and hazards at musicVolume / 100', () => {
        expect(decideMusic(base)).toEqual({ state: 'playing', targetVolume: 0.7 });
    });

    it('pauses while a fight is staged', () => {
        expect(decideMusic({ ...base, inCombat: true }).state).toBe('paused');
    });

    it('pauses while a hazard is live', () => {
        expect(decideMusic({ ...base, hasHazard: true }).state).toBe('paused');
    });

    it('pauses for combat and hazard at once', () => {
        expect(decideMusic({ ...base, inCombat: true, hasHazard: true }).state).toBe('paused');
    });

    it('is silent at volume 0', () => {
        expect(decideMusic({ ...base, musicVolume: 0 })).toEqual({ state: 'paused', targetVolume: 0 });
    });

    it('pauses while the app is in the background', () => {
        expect(decideMusic({ ...base, appActive: false }).state).toBe('paused');
    });

    it('follows the volume linearly and clamps out-of-range input', () => {
        expect(decideMusic({ ...base, musicVolume: 100 }).targetVolume).toBe(1);
        expect(decideMusic({ ...base, musicVolume: 25 }).targetVolume).toBe(0.25);
        expect(decideMusic({ ...base, musicVolume: 400 }).targetVolume).toBe(1);
        expect(decideMusic({ ...base, musicVolume: -5 }).state).toBe('paused');
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
