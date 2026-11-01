import { clearCameraMemory, recallCamera, rememberCamera } from '../mapCameraMemory';

describe('mapCameraMemory (MC1b A7)', () => {
    beforeEach(clearCameraMemory);

    it('has nothing for a map not yet visited', () => {
        expect(recallCamera('breakwater')).toBeUndefined();
    });

    it('recalls the camera last left on a map, per map', () => {
        rememberCamera('breakwater', { scale: 0.6, cx: 900, cy: 1200 });
        rememberCamera('charcoal-wood', { scale: 1.2, cx: 10, cy: 20 });
        expect(recallCamera('breakwater')).toEqual({ scale: 0.6, cx: 900, cy: 1200 });
        expect(recallCamera('charcoal-wood')).toEqual({ scale: 1.2, cx: 10, cy: 20 });
    });

    it('replaces an earlier camera, and stores a copy', () => {
        const cam = { scale: 0.5, cx: 1, cy: 2 };
        rememberCamera('m', cam);
        cam.scale = 9;
        expect(recallCamera('m')?.scale).toBe(0.5);
        rememberCamera('m', { scale: 0.7, cx: 3, cy: 4 });
        expect(recallCamera('m')).toEqual({ scale: 0.7, cx: 3, cy: 4 });
    });

    it('clears every map', () => {
        rememberCamera('m', { scale: 1, cx: 0, cy: 0 });
        clearCameraMemory();
        expect(recallCamera('m')).toBeUndefined();
    });
});
