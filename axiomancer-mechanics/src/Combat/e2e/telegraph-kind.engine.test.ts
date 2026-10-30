/**
 * Hermetic E2E — the telegraph kind (phase EN1c): a `phases` foe's intent is
 * its move's declared kind (attack, defend, status, danger, unknown), whatever
 * the move's effects add up to; every other foe keeps the derived kinds.
 */

import { describe, it, expect } from 'vitest';

import { deriveIntentType, getThreatSequence } from '../combat.threat';
import { PHASES_AUTHORED_LEVEL } from '../../Enemy';
import { FloatEye } from '../../Enemy/enemy.library';
import type { Enemy } from '../../Enemy/types';
import { deepClone } from '../../Utils';

function foe(): Enemy {
    return {
        ...deepClone(FloatEye),
        id: 'enemy-en1c-kinds', difficulty: 'normal', level: PHASES_AUTHORED_LEVEL.normal,
        keywords: undefined, stages: undefined,
        phases: [
            {
                moves: [
                    { name: 'Strike', kind: 'attack', text: 'Hits.', damage: 6 },
                    { name: 'Brace', kind: 'defend', text: 'Braces.' },
                    { name: 'Hex', kind: 'status', text: 'Afflicts.', effectId: 'dot_bleed', intensity: 2, duration: 2 },
                    { name: 'Lurk', kind: 'unknown', text: 'Waits.' },
                ],
            },
            {
                moves: [{ name: 'Cleave', kind: 'attack', text: 'Hits.', damage: 9 }],
                danger: { name: 'Doom', kind: 'danger', text: 'Hits hard.', damage: 14 },
            },
        ],
    };
}

describe('the telegraph kind of a phases foe', () => {
    it('stamps each move with its declared kind, and its DANGER as danger', () => {
        const seq = getThreatSequence(foe());
        expect(seq.map(p => p.intentType)).toEqual(['attack', 'defend', 'status', 'unknown', 'danger', 'attack']);
        expect(seq.map(p => p.intentType)).toEqual(seq.map(p => p.enemyMove?.kind));
    });

    it('lets the declared kind win over what the effects would derive', () => {
        const damaging = [{ damage: 6 }];
        expect(deriveIntentType(damaging)).toBe('damage');
        expect(deriveIntentType(damaging, 'unknown')).toBe('unknown');
        expect(deriveIntentType(damaging, 'danger')).toBe('danger');
    });

    it('keeps the derived kinds for a foe without phases', () => {
        const kinds = getThreatSequence({ ...deepClone(FloatEye), phases: undefined }).map(p => p.intentType);
        expect(kinds.length).toBeGreaterThan(0);
        for (const k of kinds) expect(['attack', 'defend', 'status', 'danger', 'unknown']).not.toContain(k);
    });
});
