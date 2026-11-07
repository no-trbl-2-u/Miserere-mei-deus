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
    // Containment, not equality: a later round of the mixer adds its own
    // places to the same table, and that must not have to edit the pinned
    // record below. What is asked here is that no place already in it is lost.
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
