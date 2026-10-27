/**
 * Hermetic engine test — the relic library (the Suppliant's Ring and the
 * Bleeding Signet).
 *
 * Locks the library invariants (roster, shape, no stat line), the
 * `cloneRelic` copy and the `getSignaturesForLoadout` derivation
 * that supplies the signature kit at combat-init.
 */

import { describe, it, expect } from 'vitest';
import {
    relicLibrary, getRelicById, getSignaturesForLoadout, cloneRelic,
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

describe('relic library — roster', () => {
    it('ships two relics: the Suppliant\'s Ring and the Bleeding Signet', () => {
        expect(relicLibrary.map(r => r.id)).toEqual([RING_ID, SIGNET_ID]);
        const signet = getRelicById(SIGNET_ID)!;
        expect(signet.slot).toBe('relic');
        expect(signet.grantsSignature).toBe('sig-crimson-covenant');
        const ring = getRelicById(RING_ID)!;
        expect(ring.name).toBe("Suppliant's Ring");
        expect(ring.slot).toBe('relic');
        expect('accessoryKind' in ring).toBe(false);
    });

    it('every relic grants exactly one signature; together they cover the full roster with no dupes', () => {
        const granted = relicLibrary.map(r => r.grantsSignature);
        expect(granted.every(Boolean)).toBe(true);
        expect(new Set(granted).size).toBe(relicLibrary.length);
        expect([...granted].sort()).toEqual([...ALL_SIGNATURE_IDS].sort());
        expect(getRelicById(RING_ID)!.grantsSignature).toBe('sig-disarming-plea');
    });

    it('relics are the lean signet shape — only stat/signature fields (Phase 23)', () => {
        for (const r of relicLibrary) {
            const keys = Object.keys(r).sort();
            expect(keys).toEqual(
                ['category', 'description', 'grantsSignature', 'id', ...(r.laneId ? ['laneId'] : []), 'name', 'slot', 'statModifiers'],
            );
        }
    });

    it('the ring carries no stat line; the Signet carries +20 max VITAE', () => {
        expect(getRelicById(RING_ID)!.statModifiers).toEqual([]);
        expect(getRelicById(SIGNET_ID)!.statModifiers).toEqual([{ stat: 'maxHp', value: 20 }]);
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
        equipment: { weapon: null, armor: null, relics: worn },
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
        const loadout = { weapon: null, armor: null, relics: [cloneRelic(getRelicById(RING_ID)!)] };
        expect(getSignaturesForLoadout(loadout)).toEqual(['sig-disarming-plea']);
    });

    it('the Ring and the Signet worn together grant both signatures, in slot order', () => {
        const loadout = { weapon: null, armor: null, relics: [getRelicById(RING_ID)!, getRelicById(SIGNET_ID)!] };
        expect(getSignaturesForLoadout(loadout)).toEqual(['sig-disarming-plea', 'sig-crimson-covenant']);
    });

    it('returns [] for an empty loadout (combat may legally begin signature-less)', () => {
        expect(getSignaturesForLoadout(emptyLoadout())).toEqual([]);
    });

    it('dedupes when two worn pieces grant the same signature (first occurrence wins)', () => {
        const ring = getRelicById(RING_ID)!;
        const loadout = { weapon: null, armor: null, relics: [ring, { ...ring, id: 'dup' }] };
        expect(getSignaturesForLoadout(loadout)).toEqual(['sig-disarming-plea']);
    });

    it('reads signatures from the relic slot only (a weapon-slot carrier grants nothing)', () => {
        const ringAsWeapon = { ...FIXTURE_WEAPON, grantsSignature: 'sig-disarming-plea' as const };
        expect(getSignaturesForLoadout({ weapon: ringAsWeapon, armor: null, relics: [] }))
            .toEqual([]);
        const ring = getRelicById(RING_ID)!;
        expect(getSignaturesForLoadout({ weapon: ringAsWeapon, armor: null, relics: [ring] }))
            .toEqual(['sig-disarming-plea']);
    });

    it('ignores non-relic worn pieces (no grantsSignature)', () => {
        expect(getSignaturesForLoadout({
            weapon: FIXTURE_WEAPON, armor: FIXTURE_ARMOR, relics: [...FIXTURE_TRINKETS],
        })).toEqual([]);
    });
});
