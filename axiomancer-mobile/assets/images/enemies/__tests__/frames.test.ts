/**
 * The frame registry's two contracts.
 *
 * 1. EVERY ENEMY STILL RESOLVES TO ITS OWN PAINTING, registered for frames or
 *    not. The registry shipped empty in AN1a and the float-eye went into it in
 *    AN1e, so this is no longer "nothing animates" - it is the stronger claim
 *    that installing a set took nothing away: the static binding is untouched
 *    for every key, and the frame lookup answers for exactly the keys that
 *    have an entry. It still ENUMERATES `ENEMY_ART_BY_KEY` rather than naming
 *    the enemies that exist today, so a fourth is covered the day it is added
 *    and nobody has to remember to come back here - the expected frame answer
 *    is read off the registry rather than written down as a list of names.
 * 2. A PARTIAL LOOP IS A FAILURE. A set whose files disagree with its
 *    manifest, whose resting index names a frame that does not exist, or whose
 *    manifest declares no anchor kind, fails validation — it must never render
 *    a truncated animation or a guessed anchor.
 */
import {
    ENEMY_ART_BY_KEY, ENEMY_ART_KEYS, getEncounterEnemyArt, hasEnemyArt,
} from '../index';
import {
    ENEMY_FRAME_SETS, REQUIRED_CLIPS, getEnemyFrameSet, hasEnemyFrames, validateFrameSet,
    type EnemyFrameSet, type FrameClip,
} from '../frames';

describe('installing a frame set took nothing away from the static registry', () => {
    const keys = ENEMY_ART_KEYS;

    it('has keys to enumerate at all', () => {
        // Without this the loop below passes vacuously if the registry moves.
        expect(keys.length).toBeGreaterThanOrEqual(3);
    });

    it.each(keys)('%s resolves to its own single image', (key) => {
        expect(hasEnemyArt(key)).toBe(true);
        expect(getEncounterEnemyArt(key)).toBe(ENEMY_ART_BY_KEY[key]);
        // The nonce only matters on the hash fallback; a registered key ignores it.
        expect(getEncounterEnemyArt(key, 97)).toBe(ENEMY_ART_BY_KEY[key]);
    });

    // Derived from the registry, not from a list of names: a fourth enemy,
    // framed or static, is covered here without this file being edited.
    it.each(keys)('%s animates exactly when the frame registry says so', (key) => {
        const installed = Object.prototype.hasOwnProperty.call(ENEMY_FRAME_SETS, key);
        expect(hasEnemyFrames(key)).toBe(installed);
        expect(getEnemyFrameSet(key)).toBe(installed ? ENEMY_FRAME_SETS[key] : null);
    });

    // The enumeration above is only a contract while at least one key sits on
    // each side of it. With every enemy installed, "the static path still
    // works" would be a sentence about nobody.
    it('the roster still has a framed enemy and a static one', () => {
        expect(keys.filter((k) => hasEnemyFrames(k)).sort()).toEqual(['death-beholder', 'float-eye']);
        expect(keys.filter((k) => !hasEnemyFrames(k)).length).toBeGreaterThan(0);
    });

    it('an unknown key still falls back to the hash pick, as it always did', () => {
        expect(hasEnemyArt('no-such-enemy')).toBe(false);
        expect(hasEnemyFrames('no-such-enemy')).toBe(false);
        expect(Object.values(ENEMY_ART_BY_KEY)).toContain(
            getEncounterEnemyArt('no-such-enemy', 3),
        );
    });
});

/**
 * A9 - the installed set, read against the sheet it was cut from. The manifest
 * in `frames.ts` is a TRANSCRIPTION of `float-eye.sheet.json`, and a
 * transcription is a thing that can be wrong: a row swapped here would make
 * the enemy flinch on the beat it meant to swing, and nothing else in this
 * suite would notice.
 */
describe('the float-eye is installed', () => {
    const set = ENEMY_FRAME_SETS['float-eye'];

    it('is in the registry at all', () => {
        expect(set).toBeDefined();
    });

    it('ships one file per cell of its 8x3 grid', () => {
        expect(set.manifest.columns * set.manifest.rows).toBe(24);
        expect(set.frames).toHaveLength(24);
        // 24 DISTINCT modules, not one cell required 24 times.
        expect(new Set(set.frames.map((f) => JSON.stringify(f))).size).toBe(24);
    });

    it('names its three clips on the rows the sheet drew them on', () => {
        expect(set.manifest.clips.idle).toEqual({ row: 0, frames: 8, fps: 12, loop: true, rest: 0 });
        expect(set.manifest.clips.struck).toEqual({ row: 1, frames: 8, fps: 16, loop: false, rest: 7 });
        expect(set.manifest.clips.attacking).toEqual({ row: 2, frames: 8, fps: 14, loop: false, rest: 0 });
    });

    it('anchors on the centre, because it floats and the hover is the clip', () => {
        expect(set.manifest.anchor.kind).toBe('centre');
    });

    it('records that its cells already carry the grade (A6b)', () => {
        // They descend from an already-ingested painting and came in with
        // --no-grade. Saying `false` here would invite a second grade.
        expect(set.manifest.graded).toBe(true);
    });
});

/**
 * Phase AN4b - the Act 1 boss, read against `death-beholder.sheet.json` the
 * same way the float-eye is read against its own sidecar.
 */
describe('the death-beholder is installed', () => {
    const set = ENEMY_FRAME_SETS['death-beholder'];

    it('is in the registry at all', () => {
        expect(set).toBeDefined();
    });

    it('ships one distinct file per cell of its 8x3 grid, cut at 176px', () => {
        expect(set.manifest.frame).toBe(176);
        expect(set.manifest.columns * set.manifest.rows).toBe(24);
        expect(set.frames).toHaveLength(24);
        expect(new Set(set.frames.map((f) => JSON.stringify(f))).size).toBe(24);
    });

    it('names its three clips on the rows the sheet drew them on', () => {
        expect(set.manifest.clips.idle).toEqual({ row: 0, frames: 8, fps: 10, loop: true, rest: 0 });
        expect(set.manifest.clips.struck).toEqual({ row: 1, frames: 8, fps: 16, loop: false, rest: 7 });
        expect(set.manifest.clips.attacking).toEqual({ row: 2, frames: 8, fps: 12, loop: false, rest: 0 });
    });

    it('anchors on the centre, because it floats (A8)', () => {
        expect(set.manifest.anchor.kind).toBe('centre');
        expect(set.manifest.anchor.why).toMatch(/float/);
    });

    it('records that its cells carry no grade, matching the ungraded portrait', () => {
        expect(set.manifest.graded).toBe(false);
    });
});

/**
 * A valid 2x3 set, for the failure fixtures below to break in one way each.
 * Three rows because AN1c made three clips the contract: a set that names only
 * idle and attacking is now itself one of the failures.
 */
function validSet(): EnemyFrameSet {
    return {
        manifest: {
            frame: 64,
            columns: 2,
            rows: 3,
            anchor: { kind: 'foot-line' },
            clips: {
                idle: { row: 0, frames: 2, fps: 12, loop: true, rest: 0 },
                struck: { row: 1, frames: 2, fps: 16, loop: false, rest: 1 },
                attacking: { row: 2, frames: 2, fps: 14, loop: false, rest: 0 },
            },
            graded: true,
        },
        frames: [
            { uri: 'a' }, { uri: 'b' },
            { uri: 'c' }, { uri: 'd' },
            { uri: 'e' }, { uri: 'f' },
        ],
    };
}

/** A copy of `set` with one clip removed — the manifest's clips are readonly. */
function withoutClip(set: EnemyFrameSet, name: string): EnemyFrameSet {
    const clips: Record<string, FrameClip> = { ...set.manifest.clips };
    delete clips[name];
    return { ...set, manifest: { ...set.manifest, clips } };
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
        set.frames = set.frames.slice(0, 5);
        expect(validateFrameSet('short', set).join(' ')).toMatch(/5 frame file\(s\) for a 2x3 manifest/);
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
        // The float-eye floats and the jelly rests on its base; there is no single
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
        expect(validateFrameSet('offsheet', set).join(' ')).toMatch(/row 4 is outside a 3-row sheet/);
    });

    it('fails a clip claiming more frames than its row holds', () => {
        const set = withClip(validSet(), 'idle', { frames: 5, rest: 0 });
        expect(validateFrameSet('wide', set).join(' ')).toMatch(/5 frames in a 2-column row/);
    });

    it('fails a set with no resting clip to fall back to', () => {
        expect(validateFrameSet('restless', withoutClip(validSet(), 'idle')).join(' '))
            .toMatch(/no 'idle' clip/);
    });

    // AN1c — three states or none. Enumerated rather than written out three
    // times, so a fourth state added later cannot be left unchecked here.
    it.each([...REQUIRED_CLIPS])('fails a manifest that names no %s clip', (name) => {
        const problems = validateFrameSet('partial', withoutClip(validSet(), name)).join(' ');
        expect(problems).toMatch(new RegExp(`no '${name}' clip`));
    });

    it('fails a resting clip that does not loop — an enemy must not stop breathing', () => {
        const set = withClip(validSet(), 'idle', { loop: false });
        expect(validateFrameSet('frozen', set).join(' ')).toMatch(/idle: must loop/);
    });

    it.each(['struck', 'attacking'])('fails a looping %s clip — a reaction ends', (name) => {
        const set = withClip(validSet(), name, { loop: true });
        expect(validateFrameSet('endless', set).join(' ')).toMatch(new RegExp(`${name}: must be a one-shot`));
    });

    it('fails a non-positive fps', () => {
        const set = withClip(validSet(), 'idle', { fps: 0 });
        expect(validateFrameSet('still', set).join(' ')).toMatch(/fps must be positive/);
    });
});

describe('every installed frame set validates', () => {
    // No longer vacuous: the float-eye is in here, so this is now the gate
    // that stops a real install shipping broken.
    it('there is something installed to validate', () => {
        expect(Object.keys(ENEMY_FRAME_SETS).length).toBeGreaterThan(0);
    });

    it.each(Object.keys(ENEMY_FRAME_SETS))('%s', (key) => {
        expect(validateFrameSet(key, ENEMY_FRAME_SETS[key])).toEqual([]);
    });
});
