/**
 * The frame registry's two contracts.
 *
 * 1. SHIPPING CHANGES NO PIXEL. The frame-set registry is empty, so every
 *    enemy still resolves to the one image it resolved to before. This test
 *    ENUMERATES `ENEMY_ART_BY_KEY` rather than naming the three enemies that
 *    exist today, so a fourth is covered the day it is added and nobody has to
 *    remember to come back here.
 * 2. A PARTIAL LOOP IS A FAILURE. A set whose files disagree with its
 *    manifest, whose resting index names a frame that does not exist, or whose
 *    manifest declares no anchor kind, fails validation — it must never render
 *    a truncated animation or a guessed anchor.
 */
import {
    ENEMY_ART_BY_KEY, ENEMY_ART_KEYS, getEncounterEnemyArt, hasEnemyArt,
} from '../index';
import {
    ENEMY_FRAME_SETS, getEnemyFrameSet, hasEnemyFrames, validateFrameSet,
    type EnemyFrameSet, type FrameClip,
} from '../frames';

describe('the static art registry is untouched while no frame set is installed', () => {
    const keys = ENEMY_ART_KEYS;

    it('has keys to enumerate at all', () => {
        // Without this the loop below passes vacuously if the registry moves.
        expect(keys.length).toBeGreaterThanOrEqual(3);
    });

    it.each(keys)('%s resolves to its own single image, and has no frames', (key) => {
        expect(hasEnemyArt(key)).toBe(true);
        expect(getEncounterEnemyArt(key)).toBe(ENEMY_ART_BY_KEY[key]);
        // The nonce only matters on the hash fallback; a registered key ignores it.
        expect(getEncounterEnemyArt(key, 97)).toBe(ENEMY_ART_BY_KEY[key]);
        expect(hasEnemyFrames(key)).toBe(false);
        expect(getEnemyFrameSet(key)).toBeNull();
    });

    it('the frame registry ships empty, so no enemy animates yet', () => {
        expect(Object.keys(ENEMY_FRAME_SETS)).toEqual([]);
    });

    it('an unknown key still falls back to the hash pick, as it always did', () => {
        expect(hasEnemyArt('no-such-enemy')).toBe(false);
        expect(Object.values(ENEMY_ART_BY_KEY)).toContain(
            getEncounterEnemyArt('no-such-enemy', 3),
        );
    });
});

/** A valid 2x2 set, for the failure fixtures below to break in one way each. */
function validSet(): EnemyFrameSet {
    return {
        manifest: {
            frame: 64,
            columns: 2,
            rows: 2,
            anchor: { kind: 'foot-line' },
            clips: {
                idle: { row: 0, frames: 2, fps: 12, loop: true, rest: 0 },
                attacking: { row: 1, frames: 2, fps: 14, loop: false, rest: 0 },
            },
            graded: true,
        },
        frames: [{ uri: 'a' }, { uri: 'b' }, { uri: 'c' }, { uri: 'd' }],
    };
}

/** A copy of `set` with one clip patched — the manifest's clips are readonly. */
function withClip(set: EnemyFrameSet, name: string, patch: Partial<FrameClip>): EnemyFrameSet {
    const clips: Record<string, FrameClip> = { ...set.manifest.clips };
    clips[name] = { ...clips[name], ...patch };
    return { ...set, manifest: { ...set.manifest, clips } };
}

describe('validateFrameSet', () => {
    it('accepts a set whose files, grid, clips and anchor all agree', () => {
        expect(validateFrameSet('ok', validSet())).toEqual([]);
    });

    it('fails a cell count that disagrees with the manifest', () => {
        const set = validSet();
        set.frames = set.frames.slice(0, 3);
        expect(validateFrameSet('short', set).join(' ')).toMatch(/3 frame file\(s\) for a 2x2 manifest/);
    });

    it('fails a resting index past the end of its clip', () => {
        const set = withClip(validSet(), 'idle', { rest: 2 });
        expect(validateFrameSet('resting', set).join(' ')).toMatch(/resting index 2 is out of range/);
    });

    it('fails a negative resting index just as hard', () => {
        const set = withClip(validSet(), 'idle', { rest: -1 });
        expect(validateFrameSet('resting', set).join(' ')).toMatch(/resting index -1 is out of range/);
    });

    it('fails a manifest that declares no anchor kind', () => {
        const set = validSet();
        // The float-eye floats and the doorwarden stands; there is no single
        // right anchor, so a manifest that names neither kind is unusable.
        delete (set.manifest as { anchor?: unknown }).anchor;
        expect(validateFrameSet('anchorless', set).join(' ')).toMatch(/declares no anchor kind/);
    });

    it('fails an anchor kind that is not one of the two measured kinds', () => {
        const set = validSet();
        (set.manifest.anchor as { kind: string }).kind = 'bounding-box';
        expect(validateFrameSet('bbox', set).join(' ')).toMatch(/declares no anchor kind/);
    });

    it('accepts the centre kind, for a creature that floats', () => {
        const set = validSet();
        set.manifest.anchor = { kind: 'centre', x: 32, y: 32, why: 'it hovers' };
        expect(validateFrameSet('floater', set)).toEqual([]);
    });

    it('fails a set that does not record whether it has been graded', () => {
        const set = validSet();
        delete (set.manifest as { graded?: unknown }).graded;
        expect(validateFrameSet('ungraded', set).join(' ')).toMatch(/whether the cells have been graded/);
    });

    it('fails a clip pointing at a row the sheet does not have', () => {
        const set = withClip(validSet(), 'attacking', { row: 4 });
        expect(validateFrameSet('offsheet', set).join(' ')).toMatch(/row 4 is outside a 2-row sheet/);
    });

    it('fails a clip claiming more frames than its row holds', () => {
        const set = withClip(validSet(), 'idle', { frames: 5, rest: 0 });
        expect(validateFrameSet('wide', set).join(' ')).toMatch(/5 frames in a 2-column row/);
    });

    it('fails a set with no resting clip to fall back to', () => {
        const base = validSet();
        const clips: Record<string, FrameClip> = { ...base.manifest.clips };
        delete clips.idle;
        const set: EnemyFrameSet = { ...base, manifest: { ...base.manifest, clips } };
        expect(validateFrameSet('restless', set).join(' ')).toMatch(/no 'idle' clip/);
    });

    it('fails a non-positive fps', () => {
        const set = withClip(validSet(), 'idle', { fps: 0 });
        expect(validateFrameSet('still', set).join(' ')).toMatch(/fps must be positive/);
    });
});

describe('every installed frame set validates', () => {
    // Vacuous today by design, and the guard that stops an install shipping
    // broken the moment the registry is no longer empty.
    it.each(Object.keys(ENEMY_FRAME_SETS).length ? Object.keys(ENEMY_FRAME_SETS) : ['<none installed>'])(
        '%s',
        (key) => {
            if (key === '<none installed>') return;
            expect(validateFrameSet(key, ENEMY_FRAME_SETS[key])).toEqual([]);
        },
    );
});
