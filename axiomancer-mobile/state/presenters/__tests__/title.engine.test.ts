/**
 * Hermetic — the title sequence's layout and its splash hand-off.
 */

import { describe, expect, it } from '@jest/globals';

import {
    SPLASH_WORDMARK_WIDTH,
    TITLE_COPY,
    WORDMARK_REST_Y,
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
        // A wide window shows the plate at its own aspect.
        const wide = titleLayout({ width: 1280, height: 800, topInset: 0 });
        expect(wide.plate.width / wide.plate.height).toBeCloseTo(TITLE_PLATE_ASPECT, 5);
        // A phone too short to stretch it does too.
        const short = titleLayout({ width: 400, height: 560, topInset: 0 });
        expect(short.plate.width / short.plate.height).toBeCloseTo(TITLE_PLATE_ASPECT, 5);
    });

    // T's phone, 2026-11-04: the plate ended a little past half the screen and
    // left a bare black band above the menu. On a tall phone the plate's box
    // reaches 80% of the height (the foot scrim fades its lower part), never
    // narrower than 0.55 so the cover crop keeps Dante and the lion.
    it('stretches the plate down a tall phone without cropping it past 0.55', () => {
        const tall = titleLayout({ width: 412, height: 915, topInset: 24 });
        expect(tall.plate.width).toBe(412);
        expect(tall.plate.height).toBeCloseTo(915 * 0.8, 5);
        const veryTall = titleLayout({ width: 400, height: 2000, topInset: 0 });
        expect(veryTall.plate.width / veryTall.plate.height).toBeCloseTo(0.55, 5);
    });

    it('spans a phone with the plate and rests the wordmark in its dark upper band', () => {
        const l = titleLayout({ width: 390, height: 844, topInset: 47 });
        expect(l.plate.left).toBe(0);
        expect(l.plate.width).toBe(390);
        // Below the notch, under the plate's slit of sky (7%-20% of its height).
        expect(l.wordmark.centerY).toBeGreaterThan(47);
        expect(l.wordmark.centerY).toBeCloseTo(l.plate.height * WORDMARK_REST_Y, 5);
        expect(WORDMARK_REST_Y).toBeGreaterThan(0.2);
        expect(WORDMARK_REST_Y).toBeLessThan(0.35);
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
