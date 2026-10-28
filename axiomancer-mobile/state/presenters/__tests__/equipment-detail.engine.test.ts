/**
 * Hermetic presenter test — the equipment detail card's "Lane:" line (LR1a, A2).
 *
 * The lane is resolved by the engine's `relicLaneId` and named from the lane
 * registry, never re-derived here.
 */

import { createCharacter, getRelicById, type Equipment } from '@mechanics';

import { selectEquipmentDetailViewModel } from '@/state/presenters/equipment-detail.engine';
import { createAppStore } from '@/state/store';
import { createMemoryAdapter } from '@/test-utils/memoryAdapter';

const RING = getRelicById('relic-disarming-plea')!;
const SIGNET = getRelicById('relic-bleeding-signet')!;

function stateWith(inventory: readonly Equipment[], worn: readonly Equipment[]) {
    const store = createAppStore({ adapter: createMemoryAdapter() });
    const base = store.getState().player;
    const player = createCharacter({
        id: base.id,
        name: base.name,
        level: base.level,
        baseStats: base.baseStats,
        inventory: [...inventory],
        equipment: [...worn],
    });
    store.setState({ player: { ...base, ...player } });
    return store.getState();
}

describe('equipment detail view-model — lane', () => {
    it('the Bleeding Signet reads exactly "Lane: Blood Price (while worn)"', () => {
        const vm = selectEquipmentDetailViewModel(stateWith([SIGNET], [SIGNET]), SIGNET.id)!;
        expect(vm.lane).toBe('Lane: Blood Price (while worn)');
    });

    it('the line shows whether the Signet is worn or carried', () => {
        const vm = selectEquipmentDetailViewModel(stateWith([SIGNET], []), SIGNET.id)!;
        expect(vm.lane).toBe('Lane: Blood Price (while worn)');
    });

    it('the Suppliant\'s Ring opens no lane: null', () => {
        const vm = selectEquipmentDetailViewModel(stateWith([RING], [RING]), RING.id)!;
        expect(vm.lane).toBeNull();
    });

    it('a relic naming an unregistered lane (a removed trial set) is null', () => {
        const orphan: Equipment = {
            id: 'orphan-relic', name: 'Orphan', description: '', category: 'equipment',
            slot: 'relic', laneId: 'no-such-lane',
        };
        const vm = selectEquipmentDetailViewModel(stateWith([orphan], [orphan]), orphan.id)!;
        expect(vm.lane).toBeNull();
    });

    it('a saved Signet copy without the field still resolves through the library', () => {
        const { laneId: _omitted, ...saved } = SIGNET;
        const vm = selectEquipmentDetailViewModel(stateWith([saved as Equipment], []), SIGNET.id)!;
        expect(vm.lane).toBe('Lane: Blood Price (while worn)');
    });

    it.each([
        'relic-elementalist-signet', 'relic-elementalist-brooch', 'relic-elementalist-belt',
    ])('the Elementalist relic %s reads exactly "Lane: Elementalist (while worn)" (LR1e, A16)', (id) => {
        const relic = getRelicById(id)!;
        const vm = selectEquipmentDetailViewModel(stateWith([relic], [relic]), id)!;
        expect(vm.lane).toBe('Lane: Elementalist (while worn)');
    });

    it.each([
        'relic-thornback-signet', 'relic-mirror-brooch', 'relic-carapace-belt',
    ])('the Defender relic %s reads exactly "Lane: Defender (while worn)" (DF1e, A10)', (id) => {
        const relic = getRelicById(id)!;
        const vm = selectEquipmentDetailViewModel(stateWith([relic], [relic]), id)!;
        expect(vm.lane).toBe('Lane: Defender (while worn)');
    });
});
