/**
 * Hermetic — the title sequence's layout and its splash hand-off.
 */

import { describe, expect, it } from '@jest/globals';

import {
    SPLASH_WORDMARK_WIDTH,
    TITLE_COPY,
    titleLayout,
    titleWordmarkFrames,
} from '../title.engine';
import { TITLE_PLATE_ASPECT } from '@/assets/images/title';

// Read through the module system, not the disk (the hermeticity guard).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const app = require('../../../app.json');

describe('title.engine', () => {
    /**
     * The title screen's first frame has to land on the native splash's last:
     * same wordmark, same width. The splash width is app.json's, so the two
     * cannot drift apart silently.
     */
    it('matches the native splash wordmark width in app.json', () => {
        const splash = app.expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen');
        expect(splash[1].imageWidth).toBe(SPLASH_WORDMARK_WIDTH);
        expect(splash[1].image).toBe('./assets/images/splash-icon.png');
    });

    it('names the game, not the old title', () => {
        expect(TITLE_COPY.wordmark).toBe('Miserere Mei, Deus');
        for (const line of Object.values(TITLE_COPY)) expect(line).not.toMatch(/axiomancer/i);
    });

    it('keeps the layout aspect in step with the plate registry', () => {
        const l = titleLayout({ width: 400, height: 2000, topInset: 0 });
        expect(l.plate.width / l.plate.height).toBeCloseTo(TITLE_PLATE_ASPECT, 5);
    });

    it('spans a phone with the plate and rests the wordmark in its sky', () => {
        const l = titleLayout({ width: 390, height: 844, topInset: 47 });
        expect(l.plate.left).toBe(0);
        expect(l.plate.width).toBe(390);
        expect(l.plate.height).toBeLessThan(844 * 0.72);
        // In the sky: the upper fifth of the plate, below the notch.
        expect(l.wordmark.centerY).toBeGreaterThan(47);
        expect(l.wordmark.centerY).toBeLessThan(l.plate.height * 0.2);
        expect(l.wordmark.width).toBeCloseTo(390 * 0.86, 5);
        expect(l.splashCenter).toEqual({ x: 195, y: 422 });
    });

    it('caps and centres the plate on a wide window', () => {
        const l = titleLayout({ width: 1440, height: 900, topInset: 0 });
        expect(l.plate.height).toBeCloseTo(900 * 0.72, 5);
        expect(l.plate.left).toBeCloseTo((1440 - l.plate.width) / 2, 5);
        expect(l.wordmark.width).toBeLessThanOrEqual(460);
    });

    // Critique pass 79: at 1280x800 the 520pt menu column overhung the 464pt
    // plate by about 28pt a side. The menu shares the plate's band.
    it('keeps the menu within the plate on a wide window and full width on a phone', () => {
        const wide = titleLayout({ width: 1280, height: 800, topInset: 0 });
        expect(wide.menu).toEqual({ left: wide.plate.left, width: wide.plate.width });
        expect(wide.menu.width).toBeLessThan(520);
        const phone = titleLayout({ width: 390, height: 844, topInset: 47 });
        expect(phone.menu).toEqual({ left: 0, width: 390 });
    });

    it('starts the wordmark at the splash frame and rests it untransformed', () => {
        const l = titleLayout({ width: 390, height: 844, topInset: 0 });
        const f = titleWordmarkFrames(l, 300);
        expect(f.splash.scale).toBeCloseTo(SPLASH_WORDMARK_WIDTH / 300, 5);
        expect(f.splash.translateY).toBeCloseTo(422 - l.wordmark.centerY, 5);
        expect(f.rest).toEqual({ translateY: 0, scale: 1 });
        // Before the text is measured, the layout width stands in.
        expect(titleWordmarkFrames(l, 0).splash.scale).toBeCloseTo(SPLASH_WORDMARK_WIDTH / l.wordmark.width, 5);
    });
});
