/**
 * CU1a (A2) - the cutscene presenter and the one image module.
 *
 * The five authored scene ids resolve without the fallback; an absent or
 * unknown id gives the fallback picture; every cutscene gets the same narrator.
 * (The engine test pins that the content authors exactly these five ids.)
 *
 * Hermetic = self-contained + deterministic + isolated. See docs/testing.md.
 */

import { describe, expect, it } from '@jest/globals';
import type { ResolvedEvent } from '@mechanics';

import { CUTSCENE_FALLBACK, CUTSCENE_NARRATOR, CUTSCENE_SCENES } from '@/assets/images/cutscenes';
import { cutsceneView } from '@/state/presenters/event.engine';

const AUTHORED = ['windmill-headland', 'clifftop-chapel', 'old-watchtower', 'high-pass', 'charcoal-wood-arrival'];

const ev = (lines: string[], scene?: string): ResolvedEvent =>
    scene === undefined ? { kind: 'cutscene', lines } : { kind: 'cutscene', lines, scene };

describe('cutsceneView (CU1a)', () => {
    it.each(AUTHORED)('scene %s resolves to its own picture, not the fallback', (id) => {
        const v = cutsceneView(ev(['One.', 'Two.'], id));
        expect(v.isFallback).toBe(false);
        expect(v.picture).toBe(CUTSCENE_SCENES[id]!.source);
        expect(v.picture).not.toBe(CUTSCENE_FALLBACK.source);
        expect(v.chapter).toBeTruthy();
    });

    it('names the chapter for the Breakwater and the Charcoal Wood', () => {
        expect(cutsceneView(ev(['x'], 'high-pass')).chapter).toBe('THE BREAKWATER');
        expect(cutsceneView(ev(['x'], 'charcoal-wood-arrival')).chapter).toBe('THE CHARCOAL WOOD');
    });

    it('an absent or unknown scene id gives the fallback picture', () => {
        for (const e of [ev(['x']), ev(['x'], 'no-such-scene')]) {
            const v = cutsceneView(e);
            expect(v.isFallback).toBe(true);
            expect(v.picture).toBe(CUTSCENE_FALLBACK.source);
            expect(v.chapter).toBeNull();
        }
    });

    it('every cutscene gets the same narrator figure', () => {
        const views = [
            ...AUTHORED.map((id) => cutsceneView(ev(['x'], id))),
            cutsceneView(ev(['No scene id.'])),
            cutsceneView(ev(['A Sophist line.'])),
        ];
        for (const v of views) expect(v.narrator).toBe(CUTSCENE_NARRATOR);
    });

    it('turns lines into beats with an "n of m" count', () => {
        const v = cutsceneView(ev(['One.', 'Two.'], 'windmill-headland'));
        expect(v.beats).toEqual([
            { line: 'One.', count: '1 of 2' },
            { line: 'Two.', count: '2 of 2' },
        ]);
    });

    it('gives no beats for a non-cutscene or missing event', () => {
        expect(cutsceneView(null).beats).toEqual([]);
        expect(cutsceneView({ kind: 'none' } as ResolvedEvent).beats).toEqual([]);
    });
});
