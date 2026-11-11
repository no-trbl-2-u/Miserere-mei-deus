/**
 * TV1a (A4) - one table supplies every travel picture. Hermetic: the
 * registry, the layout, the bundled files and the provenance record.
 */
import fs from 'fs';
import path from 'path';
import { BREAKWATER_CHAPTER_KINDS } from '@mechanics/World/MapEvents/content';

import { ACT1_PLATES } from '@/assets/images/maps';
import { BREAKWATER_LANDMARKS } from '@/state/exploration-maps/breakwater.layout';
import { createFixtureStore } from '@/test-utils/fixtureStore';
import { cropPlacement } from '@/components/travel/TravelPicture';
import { selectTravelScene } from '@/state/presenters/travel.engine';
import { TRAVEL_CROP_ZOOM, TRAVEL_SCENES } from '../index';

const DIR = path.resolve(__dirname, '..');
const travelNodes = Object.entries(BREAKWATER_CHAPTER_KINDS).filter(([, v]) => v.kind === 'travel').map(([id]) => id);

describe('the travel scene table', () => {
    it('has an entry for every Breakwater travel node', () => {
        expect(travelNodes.sort()).toEqual(['bw-b2', 'bw-c0', 'bw-h6']);
        for (const id of travelNodes) expect(TRAVEL_SCENES[id]).toBeDefined();
    });

    it("crops the coast plate on the destination node's own landmark, at the one zoom", () => {
        for (const id of ['bw-h6', 'bw-c0']) {
            const scene = TRAVEL_SCENES[id];
            if (scene.kind !== 'crop') throw new Error(`${id} should be a crop`);
            expect(scene.plate).toBe(ACT1_PLATES.coast);
            expect(scene.zoom).toBe(TRAVEL_CROP_ZOOM);
            expect(TRAVEL_CROP_ZOOM).toBe(2);
            const handle = createFixtureStore({
                id: `travel-scene-${id}`, seed: `travel-scene-${id}`,
                world: { continent: 'coastal-continent', map: 'breakwater', node: id },
            });
            handle.actions.resolveCurrentMapEvent('travel');
            const destination = handle.store.getState().travel.open!.destination;
            if (!('node' in destination)) throw new Error(`${id} should lead to a node`);
            expect(scene.landmark).toBe(BREAKWATER_LANDMARKS[destination.node]);
            expect(selectTravelScene(id)).toMatchObject({ kind: 'crop' });
        }
    });

    it('draws the bridge from a bundled file recorded in provenance.json', () => {
        expect(TRAVEL_SCENES['bw-b2'].kind).toBe('image');
        expect(fs.existsSync(path.join(DIR, 'bridge.webp'))).toBe(true);
        const record = JSON.parse(fs.readFileSync(path.join(DIR, 'provenance.json'), 'utf-8'));
        expect(record.flatMap((e: { covers: string[] }) => e.covers)).toContain('bridge.webp');
    });

    it('never points into Potential Assets', () => {
        const registry = fs.readFileSync(path.join(DIR, 'index.ts'), 'utf-8');
        for (const m of registry.matchAll(/require\('([^']*)'\)/g)) { expect(m[1]).not.toContain('Potential Assets'); expect(m[1].startsWith('./')).toBe(true); }
    });
});

describe('cropPlacement', () => {
    it('centres the focus at 2x the box width', () => {
        const p = cropPlacement(400, 360, 0.5, 0.5, 2);
        expect(p).toEqual({ width: 800, height: 800, left: -200, top: -220 });
    });

    it('clamps so the plate always covers the box', () => {
        const p = cropPlacement(400, 360, 0.0, 1.0, 2);
        expect(p.left).toBe(0);
        expect(p.top).toBe(360 - 800);
    });
});
