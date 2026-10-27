/**
 * Hermetic engine test — the relic library (the Suppliant's Ring and Blood
 * Price's three: the Crimson Circlet, the Ruby Signet, the Bleeding Signet).
 *
 * Locks the library invariants (roster, shape, stat lines), the
 * `cloneRelic` copy and the `getSignaturesForLoadout` derivation
 * that supplies the signature kit at combat-init.
 */

import { describe, it, expect } from 'vitest';
import {
    relicLibrary, getRelicById, getSignaturesForLoadout, cloneRelic, relicStatLines,
} from '../relic.library';
import { SIGNATURE_SKILLS } from '../../Combat/combat.signature';
import type { SignatureSkillId } from '../../Combat/combat.encounter.types';
import { emptyLoadout } from '../../Character/types';
import { FIXTURE_WEAPON, FIXTURE_ARMOR, FIXTURE_TRINKETS } from '../../Game/fixtures';

import { unlockedLaneIds, laneSlotCount, rewardLaneSlots } from '../../Combat/combat.rewards';
import { relicLaneId, wornLaneCounts } from '../relic-lanes';
import { Player } from '../../Character/characters.mock';
import { deepClone } from '../../Utils';
import type { Character } from '../../Character/types';
import type { Equipment } from '../types';

const ALL_SIGNATURE_IDS = Object.keys(SIGNATURE_SKILLS) as SignatureSkillId[];
const RING_ID = 'relic-disarming-plea';
const SIGNET_ID = 'relic-bleeding-signet';
const CIRCLET_ID = 'relic-crimson-circlet';
const RUBY_ID = 'relic-ruby-signet';

describe('relic library — roster', () => {
    it('ships the Suppliant\'s Ring and Blood Price\'s three relics', () => {
        expect(relicLibrary.map(r => r.id)).toEqual([RING_ID, CIRCLET_ID, RUBY_ID, SIGNET_ID]);
        const ring = getRelicById(RING_ID)!;
        expect(ring.name).toBe("Suppliant's Ring");
        expect(ring.slot).toBe('accessory');
        expect(ring.accessoryKind).toBe('ring');
    });

    it('A10 · Blood Price\'s three relics are as T wrote them: lane, source, stat lines, signature', () => {
        const row = (id: string) => {
            const r = getRelicById(id)!;
            return [r.name, r.laneId, r.relicSource, r.statModifiers, r.grantsSignature, r.slot, r.accessoryKind];
        };
        expect(row(CIRCLET_ID)).toEqual(['Crimson Circlet', 'blood-price', 'elite',
            [{ stat: 'body', value: 5 }, { stat: 'maxHp', value: 20 }], 'sig-crimson-circlet', 'accessory', 'head']);
        expect(row(RUBY_ID)).toEqual(['Ruby Signet', 'blood-price', 'quest',
            [{ stat: 'heart', value: 5 }], 'sig-ruby-signet', 'accessory', 'ring']);
        expect(row(SIGNET_ID)).toEqual(['Bleeding Signet', 'blood-price', 'quest',
            [{ stat: 'mind', value: 5 }], 'sig-bleeding-signet', 'accessory', 'ring']);
    });

    it('every relic grants exactly one signature; together they cover the full roster with no dupes', () => {
        const granted = relicLibrary.map(r => r.grantsSignature);
        expect(granted.every(Boolean)).toBe(true);
        expect(new Set(granted).size).toBe(relicLibrary.length);
        expect([...granted].sort()).toEqual([...ALL_SIGNATURE_IDS].sort());
        expect(getRelicById(RING_ID)!.grantsSignature).toBe('sig-disarming-plea');
    });

    it('relics are the lean signet shape — only stat/signature/lane/source fields', () => {
        for (const r of relicLibrary) {
            const keys = Object.keys(r).sort();
            expect(keys).toEqual([
                ...(r.slot === 'accessory' ? ['accessoryKind'] : []),
                'category', 'description', 'grantsSignature', 'id', ...(r.laneId ? ['laneId'] : []), 'name',
                ...(r.relicSource ? ['relicSource'] : []), 'slot', 'statModifiers',
            ]);
        }
    });

    it('the ring carries no stat line', () => {
        expect(getRelicById(RING_ID)!.statModifiers).toEqual([]);
    });

    it('a saved copy reads its stat lines from the library entry', () => {
        const stale = { ...cloneRelic(getRelicById(SIGNET_ID)!), statModifiers: [{ stat: 'maxHp' as const, value: 20 }] };
        expect(relicStatLines(stale)).toEqual([{ stat: 'mind', value: 5 }]);
        expect(relicStatLines(FIXTURE_ARMOR)).toEqual(FIXTURE_ARMOR.statModifiers);
    });

    it('resolves an unknown or deleted relic id to undefined', () => {
        expect(getRelicById('relic-overwhelming')).toBeUndefined();
        expect(getRelicById('nope')).toBeUndefined();
    });
});

describe('A1 · the Bleeding Signet opens Blood Price while worn', () => {
    const signet = (): Equipment => getRelicById(SIGNET_ID)!;
    const wearer = (worn: Equipment[], carried: Equipment[] = []): Character => ({
        ...deepClone(Player),
        inventory: [...worn, ...carried],
        equipment: { weapon: null, armor: null, accessories: worn },
        devRewardLaneIds: undefined,
    });

    it('the library entry names the blood-price lane; the Ring names none', () => {
        expect(signet().laneId).toBe('blood-price');
        expect(getRelicById(RING_ID)!.laneId).toBeUndefined();
    });

    it('a worn Signet puts blood-price in the unlocked lanes and earns one lane slot', () => {
        const p = wearer([cloneRelic(signet())]);
        expect(unlockedLaneIds(p)).toEqual(['blood-price']);
        expect(laneSlotCount(wornLaneCounts(p).get('blood-price') ?? 0)).toBe(1);
        expect(rewardLaneSlots(p, () => 0.5)).toEqual({ laneId: 'blood-price', slots: 1 });
    });

    it('a Signet only carried in the satchel opens nothing', () => {
        const p = wearer([], [cloneRelic(signet())]);
        expect(unlockedLaneIds(p)).not.toContain('blood-price');
    });

    it('a saved Signet copy without the field resolves to the lane through the library', () => {
        const { laneId: _omitted, ...saved } = cloneRelic(signet());
        expect(relicLaneId(saved)).toBe('blood-price');
        expect(unlockedLaneIds(wearer([saved as Equipment]))).toEqual(['blood-price']);
    });
});

describe('cloneRelic', () => {
    it('returns fresh, non-aliased clones of a library relic', () => {
        const ring = getRelicById(RING_ID)!;
        const a = [cloneRelic(ring)];
        const b = [cloneRelic(ring)];
        expect(a).toEqual([ring]);
        // Fresh objects each call (equipping must not mutate the singleton library).
        expect(a[0]).not.toBe(b[0]);
        expect(a[0]).not.toBe(getRelicById(a[0].id));
        expect(a[0].statModifiers).not.toBe(getRelicById(a[0].id)!.statModifiers);
    });
});

describe('getSignaturesForLoadout', () => {
    it('derives the ring\'s signature from a worn ring', () => {
        const loadout = { weapon: null, armor: null, accessories: [cloneRelic(getRelicById(RING_ID)!)] };
        expect(getSignaturesForLoadout(loadout)).toEqual(['sig-disarming-plea']);
    });

    it('the Ring and the Signet worn together grant both signatures, in slot order', () => {
        const loadout = { weapon: null, armor: null, accessories: [getRelicById(RING_ID)!, getRelicById(SIGNET_ID)!] };
        expect(getSignaturesForLoadout(loadout)).toEqual(['sig-disarming-plea', 'sig-bleeding-signet']);
    });

    it('returns [] for an empty loadout (combat may legally begin signature-less)', () => {
        expect(getSignaturesForLoadout(emptyLoadout())).toEqual([]);
    });

    it('dedupes when two worn pieces grant the same signature (first occurrence wins)', () => {
        const ring = getRelicById(RING_ID)!;
        const loadout = { weapon: null, armor: null, accessories: [ring, { ...ring, id: 'dup' }] };
        expect(getSignaturesForLoadout(loadout)).toEqual(['sig-disarming-plea']);
    });

    it('reads the signature from any slot (a weapon-slot carrier counts)', () => {
        const ringAsWeapon = { ...FIXTURE_WEAPON, grantsSignature: 'sig-disarming-plea' as const };
        expect(getSignaturesForLoadout({ weapon: ringAsWeapon, armor: null, accessories: [] }))
            .toEqual(['sig-disarming-plea']);
    });

    it('ignores non-relic worn pieces (no grantsSignature)', () => {
        expect(getSignaturesForLoadout({
            weapon: FIXTURE_WEAPON, armor: FIXTURE_ARMOR, accessories: [...FIXTURE_TRINKETS],
        })).toEqual([]);
    });
});
