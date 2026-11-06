/**
 * The experience kit as the app draws it: the converted Brass Gothic and
 * Vellum & Ink pieces T's picks name, in one map.
 *
 * This is the only registry the bundle sees. It deliberately does NOT live in,
 * and is not reached from, `./index.ts` — that module registers all 86
 * delivered PNGs, and one import of it would pull every one of those
 * `require()` literals into the Metro bundle. A piece no place in
 * `components/experience/looks.ts` uses stays a PNG there, unbundled.
 *
 * Keys are unique across the two sets, so the spread merges rather than
 * shadows.
 */

import { BRASS } from './brass';
import { VELLUM } from './vellum';

export const KIT = { ...BRASS, ...VELLUM };

export type KitPiece = keyof typeof KIT;
