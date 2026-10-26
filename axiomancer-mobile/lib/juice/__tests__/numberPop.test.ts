import { describe, expect, it } from '@jest/globals';

import { numberPopTimeline } from '../numberPop';
import { JUICE_TIMING } from '../juice.timing';

describe('numberPopTimeline', () => {
    it('mirrors the shared JUICE_TIMING.numberPop constants', () => {
        expect(numberPopTimeline()).toEqual(JUICE_TIMING.numberPop);
    });

    it('rises before it finishes fading (delay + fade caps within the rise)', () => {
        const t = numberPopTimeline();
        expect(t.fadeDelayMs + t.fadeDurationMs).toBeLessThanOrEqual(t.riseDurationMs);
    });

    it('holds a full read: opaque at least 700 ms, about 1.6 s in all (phase BC1, A9)', () => {
        const t = numberPopTimeline();
        expect(t.fadeDelayMs).toBeGreaterThanOrEqual(700);
        expect(t.fadeDurationMs).toBe(900);
        expect(t.riseDurationMs).toBe(1600);
        expect(t.fadeDelayMs + t.fadeDurationMs).toBe(t.riseDurationMs);
    });
});
