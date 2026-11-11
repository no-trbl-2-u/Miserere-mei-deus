import { KIT, type KitPiece } from '@/assets/images/experience/kit';
import { LOOKS, PLACE_PIECES, lookOf, type Look, type PlaceId } from '../looks';

/** The ledger's 44 place ids, written out so a dropped row fails rather than shrinking the check. */
const PLACES: readonly PlaceId[] = [
    'M-01',
    'W-01', 'W-02', 'W-03', 'W-04', 'W-05', 'W-06',
    'S-01', 'S-02', 'S-03', 'S-04', 'S-05', 'S-06', 'S-07', 'S-08', 'S-09',
    'P-01', 'P-02', 'P-03', 'P-04',
    'F-01', 'F-02', 'F-03', 'F-04', 'F-05', 'F-06',
    'L-01',
    'B-01', 'B-02', 'B-03', 'B-04', 'B-05', 'B-06',
    'D-01', 'D-02', 'D-03', 'D-04',
    'O-01', 'O-02', 'O-03', 'O-04', 'O-05', 'O-06', 'O-07',
];

const LOOK_VALUES: readonly Look[] = ['normal', 'brass', 'vellum'];

const of = (look: Look) => PLACES.filter((p) => LOOKS[p] === look);

describe('the look table (A1)', () => {
    // Containment, not equality: round 2 of the mixer adds its own places to
    // the same table, and that must not have to edit round 1's pinned record. What A1 asks is that no place of round 1 goes missing.
    it('names all 44 places, in LOOKS and in PLACE_PIECES', () => {
        expect(PLACES).toHaveLength(44);
        expect(new Set(PLACES).size).toBe(44);
        const missingLook = PLACES.filter((p) => LOOKS[p] === undefined);
        const missingPieces = PLACES.filter((p) => PLACE_PIECES[p] === undefined);
        expect(missingLook).toEqual([]);
        expect(missingPieces).toEqual([]);
        expect(Object.keys(LOOKS).sort()).toEqual(Object.keys(PLACE_PIECES).sort());
    });

    it('gives every place a valid look', () => {
        for (const place of PLACES) {
            expect(LOOK_VALUES).toContain(LOOKS[place]);
            expect(lookOf(place)).toBe(LOOKS[place]);
        }
    });

    it("matches T's picks exactly: 18 brass, 11 vellum, 15 normal", () => {
        expect(of('brass')).toEqual([
            'M-01', 'S-01', 'S-03', 'S-04', 'S-06', 'S-09',
            'F-01', 'F-02', 'F-03', 'F-05', 'F-06',
            'B-04',
            'O-01', 'O-03', 'O-04', 'O-05', 'O-06', 'O-07',
        ]);
        expect(of('vellum')).toEqual([
            'W-01', 'W-02', 'W-03', 'W-04', 'W-06',
            'P-01', 'P-02', 'P-03', 'P-04',
            'L-01', 'B-05',
        ]);
        expect(of('brass')).toHaveLength(18);
        expect(of('vellum')).toHaveLength(11);
        expect(of('normal')).toHaveLength(15);
    });
});

describe('the bundle the table names (A1)', () => {
    // Every place in the table, not only round 1's, so a piece round 2 converts
    // for a place of its own does not read as dead weight here.
    const named = new Set<KitPiece>(Object.values(PLACE_PIECES).flatMap((pieces) => [...pieces]));

    it('names only pieces that are keys of KIT', () => {
        const missing = [...named].filter((piece) => !(piece in KIT));
        expect(missing).toEqual([]);
    });

    it('leaves nothing in KIT unused, so the bundle holds nothing dead', () => {
        const dead = Object.keys(KIT).filter((piece) => !named.has(piece as KitPiece));
        expect(dead).toEqual([]);
    });

    it('names no piece for a place T kept normal', () => {
        for (const place of PLACES) {
            if (LOOKS[place] !== 'normal') continue;
            expect(PLACE_PIECES[place]).toEqual([]);
        }
    });

    it('names a piece for every place T did not keep normal', () => {
        for (const place of PLACES) {
            if (LOOKS[place] === 'normal') continue;
            expect(PLACE_PIECES[place].length).toBeGreaterThan(0);
        }
    });
});

/** Round 2's node screens, written out so a dropped row fails rather than shrinking the check. */
const ROUND_TWO: readonly PlaceId[] = [
    'E-01', 'E-02', 'E-03',
    'C-01', 'C-02',
    'T-01', 'T-02',
    'H-01', 'H-02',
    'Q-01', 'Q-02',
    'X-01', 'X-02',
];

describe("round 2's node screens (A1)", () => {
    it('names all 13 places, in LOOKS and in PLACE_PIECES', () => {
        expect(new Set(ROUND_TWO).size).toBe(13);
        for (const place of ROUND_TWO) {
            expect(LOOK_VALUES).toContain(LOOKS[place]);
            expect(PLACE_PIECES[place]).toBeDefined();
        }
    });

    it("matches T's picks: vellum for the spoken line, stakes card and quest panel; brass for the choices, travel buttons, act rows and LEAVE", () => {
        const picked = (look: Look) => ROUND_TWO.filter((p) => LOOKS[p] === look);
        expect(picked('vellum')).toEqual(['E-02', 'H-01', 'Q-01']);
        expect(picked('brass')).toEqual(['E-03', 'T-02', 'X-01', 'X-02']);
        expect(picked('normal')).toEqual(['E-01', 'C-01', 'C-02', 'T-01', 'H-02', 'Q-02']);
    });

    it('draws a vellum piece on every vellum place and a brass piece on every brass place', () => {
        const isVellum = (piece: KitPiece) => piece.includes('vellum') || piece.includes('-ink');
        for (const place of ROUND_TWO) {
            const pieces = PLACE_PIECES[place];
            if (LOOKS[place] === 'vellum') expect(pieces.every(isVellum)).toBe(true);
            if (LOOKS[place] === 'brass') expect(pieces.some(isVellum)).toBe(false);
            if (LOOKS[place] === 'normal') expect(pieces).toEqual([]);
            if (LOOKS[place] !== 'normal') expect(pieces.length).toBeGreaterThan(0);
        }
    });
});

/** Round 2's new-game and ending screens, written out so a dropped row fails. */
const NEW_GAME: readonly PlaceId[] = ['N-01', 'N-02', 'N-03', 'N-04', 'N-05', 'N-06', 'N-07', 'G-01'];

describe('the village screens (168, call #5)', () => {
    it('wear the brass action plate, idle, pressed and refused', () => {
        expect(LOOKS['V-01']).toBe('brass');
        expect(PLACE_PIECES['V-01']).toEqual(['action-button-idle', 'action-button-selected', 'action-button-disabled']);
    });
});

describe("round 2's new game and endings (A2)", () => {
    it("matches T's picks: vellum for rows, BEGIN, stat tiles, CONFIRM ; brass for the cards and the death return's button", () => {
        const picked = (look: Look) => NEW_GAME.filter((p) => LOOKS[p] === look);
        expect(picked('vellum')).toEqual(['N-01', 'N-02', 'N-05', 'N-06']);
        expect(picked('brass')).toEqual(['N-04', 'G-01']);
        expect(picked('normal')).toEqual(['N-03', 'N-07']);
    });

    it('draws a piece on every worn place and none on a normal one', () => {
        for (const place of NEW_GAME) {
            if (LOOKS[place] === 'normal') expect(PLACE_PIECES[place]).toEqual([]);
            else expect(PLACE_PIECES[place].length).toBeGreaterThan(0);
        }
    });
});
