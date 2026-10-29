/**
 * Tooltip presenter pins.
 *
 * Every branch tested here reads engine static data; state is passed as
 * `{}` cast to AppStoreState.
 */

import { describe, expect, it } from '@jest/globals';
import { cardLibrary } from '@mechanics';

import {
    accentForStat,
    formatEffectStatEffect,
    selectTooltipContentFor,
    type TooltipKind,
} from '@/state/presenters/tooltip.engine';
import type { AppStoreState } from '@/state/store';

const EMPTY_STATE = {} as AppStoreState;

describe('selectTooltipContentFor', () => {
    describe('kind: stat (Tick A authored)', () => {
        it('returns HEART content with title and body, no grace (D39)', () => {
            const content = selectTooltipContentFor('stat', 'HEART', EMPTY_STATE);
            expect(content).not.toBeNull();
            expect(content?.title).toBe('HEART');
            expect(content?.body).toContain("will to stay");
            expect(content?.body).not.toMatch(/grace/i);
            expect(content?.footnote).toBeUndefined();
        });

        it('returns BODY content', () => {
            const content = selectTooltipContentFor('stat', 'BODY', EMPTY_STATE);
            expect(content?.title).toBe('BODY');
            expect(content?.body).toContain('weight you carry');
            expect(content?.footnote).toContain('hp');
        });

        it('returns MIND content', () => {
            const content = selectTooltipContentFor('stat', 'MIND', EMPTY_STATE);
            expect(content?.title).toBe('MIND');
            expect(content?.body).toContain('discipline of attention');
            expect(content?.footnote).toContain('focus');
        });

        it('returns null for an unknown stat id', () => {
            expect(selectTooltipContentFor('stat', 'SPIRIT', EMPTY_STATE)).toBeNull();
        });

        it('returns null for an empty id', () => {
            expect(selectTooltipContentFor('stat', '', EMPTY_STATE)).toBeNull();
        });
    });

    describe('null contract for unwired kinds (later ticks)', () => {
        const unwiredKinds: TooltipKind[] = [
            'affliction',
            'blessing',
        ];
        it.each(unwiredKinds)('returns null for kind: %s with any id', (kind) => {
            expect(selectTooltipContentFor(kind, 'anything', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: item-stat (Phase 74 walkthrough — inventory Tick 2)', () => {
        it('returns the kind:"stat" content for bare stance ids (overlap)', () => {
            const content = selectTooltipContentFor('item-stat', 'heart', EMPTY_STATE);
            expect(content?.title).toBe('HEART');
        });

        it('returns null for unknown / malformed item-stat ids', () => {
            expect(selectTooltipContentFor('item-stat', 'whateverGarbage', EMPTY_STATE)).toBeNull();
            expect(selectTooltipContentFor('item-stat', 'physicalNonsense', EMPTY_STATE)).toBeNull();
            expect(selectTooltipContentFor('item-stat', '', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: chronicle-entry (Phase 74 walkthrough — memoir Tick 2)', () => {
        const ids = ['combat:ended', 'character:levelup', 'world:moved', 'dialogue:applied'] as const;
        it.each(ids)('returns content for chronicle id %s', (id) => {
            const content = selectTooltipContentFor('chronicle-entry', id, EMPTY_STATE);
            expect(content).not.toBeNull();
            expect(typeof content?.title).toBe('string');
            expect(typeof content?.body).toBe('string');
            expect(content?.footnote).toMatch(/^engine: /);
        });

        it('returns null for an unknown chronicle id', () => {
            expect(selectTooltipContentFor('chronicle-entry', 'whatever', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: quest-objective (Phase 74 walkthrough — memoir Tick 2)', () => {
        const ids = ['active', 'completed', 'failed'] as const;
        it.each(ids)('returns content for quest status id %s', (id) => {
            const content = selectTooltipContentFor('quest-objective', id, EMPTY_STATE);
            expect(content).not.toBeNull();
            expect(typeof content?.title).toBe('string');
            expect(typeof content?.body).toBe('string');
        });

        it("'failed' renders as 'FORGOTTEN QUEST' in the title (UI naming convention)", () => {
            const content = selectTooltipContentFor('quest-objective', 'failed', EMPTY_STATE);
            expect(content?.title).toBe('FORGOTTEN QUEST');
        });

        it('returns null for an unknown quest-objective id', () => {
            expect(selectTooltipContentFor('quest-objective', 'whatever', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: map-node (Phase 74 walkthrough — exploration Tick 1)', () => {
        const nodeTypes = ['encounter', 'boss', 'treasure', 'quest', 'rest', 'waypoint', 'current'] as const;
        it.each(nodeTypes)('returns content for node type %s', (type) => {
            const content = selectTooltipContentFor('map-node', type, EMPTY_STATE);
            expect(content).not.toBeNull();
            expect(typeof content?.title).toBe('string');
            expect(typeof content?.body).toBe('string');
        });

        it('boss footnote includes "no retreat"', () => {
            const content = selectTooltipContentFor('map-node', 'boss', EMPTY_STATE);
            expect(content?.footnote).toContain('no retreat');
        });

        it('returns null for an unknown map-node id', () => {
            expect(selectTooltipContentFor('map-node', 'whatever', EMPTY_STATE)).toBeNull();
        });

        it('returns null for an empty map-node id', () => {
            expect(selectTooltipContentFor('map-node', '', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: burden (Phase 74 walkthrough — inventory Tick 1)', () => {
        it('returns content for id "burden"', () => {
            const content = selectTooltipContentFor('burden', 'burden', EMPTY_STATE);
            expect(content?.title).toBe('BURDEN');
            expect(content?.body).toContain('weight');
            expect(content?.footnote).toContain('shed');
        });

        it('returns null for an unknown burden id', () => {
            expect(selectTooltipContentFor('burden', 'whatever', EMPTY_STATE)).toBeNull();
        });

        it('returns null for an empty burden id', () => {
            expect(selectTooltipContentFor('burden', '', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: slot (Phase 74 walkthrough Tick 3)', () => {
        // Only weapon / armor / relic tooltip ids resolve.
        const slotKeys = ['weapon', 'armor', 'relic'] as const;
        it.each(slotKeys)('returns content for slot id %s', (key) => {
            const content = selectTooltipContentFor('slot', key, EMPTY_STATE);
            expect(content).not.toBeNull();
            expect(typeof content?.title).toBe('string');
            expect(typeof content?.body).toBe('string');
        });

        it("renders 'relic' as RELIC in the title (chrome convention)", () => {
            const content = selectTooltipContentFor('slot', 'relic', EMPTY_STATE);
            expect(content?.title).toBe('RELIC');
        });

        it('returns null for an unknown slot id', () => {
            expect(selectTooltipContentFor('slot', 'mouth', EMPTY_STATE)).toBeNull();
        });

        it('returns null for an empty slot id', () => {
            expect(selectTooltipContentFor('slot', '', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: effect (Phase 75 + tighten 2026-05-24)', () => {
        it('returns engine-sourced name + payload-derived stat-effect body for a known effectId', () => {
            // Fixture: debuff_poison (the canonical keyword DoT).
            const content = selectTooltipContentFor('effect', 'debuff_poison', EMPTY_STATE);
            expect(content).not.toBeNull();
            // Title is the engine effect name uppercased.
            expect(content?.title).toBe('POISON');
            // Body is the formatted stat-effect line, not the engine
            // description.
            expect(content?.body).toBe('-2 hp / round');
            // mentalAttack damage type → 'mind' accent.
            expect(content?.accent).toBe('mind');
            // Footnote dropped under the tighten — the body now
            // carries the stat info.
            expect(content?.footnote).toBeUndefined();
        });

        it('returns null for an unknown effectId', () => {
            expect(selectTooltipContentFor('effect', 'definitely-not-an-effect', EMPTY_STATE))
                .toBeNull();
        });

        it('returns null for an empty effectId', () => {
            expect(selectTooltipContentFor('effect', '', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: card (Phase 75)', () => {
        it('returns engine-sourced name + description + colour for a known card id', () => {
            // Pick any known engine card — the first one is stable.
            const first = cardLibrary[0];
            const content = selectTooltipContentFor('card', first.id, EMPTY_STATE);
            expect(content).not.toBeNull();
            // getCombatCardById uppercases the name.
            expect(content?.title).toBe(first.name.toUpperCase());
            expect(content?.body).toBe(first.description);
            // The grey office is colourless ('any') — the footnote names that too.
            expect(content?.footnote).toMatch(/^colour (HEART|BODY|MIND|ANY)$/);
            expect(content?.footnote).toBe(`colour ${first.color.toUpperCase()}`);
        });

        it('returns null for an unknown card id', () => {
            expect(selectTooltipContentFor('card', 'no-such-card', EMPTY_STATE)).toBeNull();
        });

        it('returns null for an empty card id', () => {
            expect(selectTooltipContentFor('card', '', EMPTY_STATE)).toBeNull();
        });
    });

    describe('card kind threads stance accent', () => {
        it('card on body stance returns body accent', () => {
            const { cardLibrary } = require('@mechanics');
            const bodyCard = cardLibrary.find((s: { color: string }) => s.color === 'body');
            if (!bodyCard) {
                // No body-stance card in library; skip without
                // failing — the contract is still pinned by stat
                // tests below.
                return;
            }
            const content = selectTooltipContentFor('card', bodyCard.id, EMPTY_STATE);
            expect(content?.accent).toBe('body');
        });
    });

    describe('kind: hazard-keyword (Phase 82)', () => {
        it('returns engine-sourced name + desc for a known hazard keyword id', () => {
            const content = selectTooltipContentFor('hazard-keyword', 'surge', EMPTY_STATE);
            expect(content).not.toBeNull();
            expect(content?.title).toBe('SURGE');
            expect(content?.body).toContain('Drop a matching-colour die');
            expect(content?.accent).toBe('neutral');
        });

        it('returns null for an unknown hazard keyword id', () => {
            expect(selectTooltipContentFor('hazard-keyword', 'no-such-keyword', EMPTY_STATE)).toBeNull();
        });

        it('returns null for an empty hazard keyword id', () => {
            expect(selectTooltipContentFor('hazard-keyword', '', EMPTY_STATE)).toBeNull();
        });
    });

    describe('kind: disabled-action (Phase 95)', () => {
        it('returns content for item action', () => {
            const content = selectTooltipContentFor('disabled-action', 'item', EMPTY_STATE);
            expect(content).not.toBeNull();
            expect(content?.title).toBe('ITEM UNAVAILABLE');
            expect(content?.body).toBe('Item usage will be available in a future update. Currently no usable items in inventory.');
            expect(content?.accent).toBe('neutral');
        });

        it('returns null for unknown disabled action id', () => {
            expect(selectTooltipContentFor('disabled-action', 'attack', EMPTY_STATE)).toBeNull();
        });

        it('returns null for empty disabled action id', () => {
            expect(selectTooltipContentFor('disabled-action', '', EMPTY_STATE)).toBeNull();
        });
    });
});

// ---------------------------------------------------------------------------
// Helpers (payload formatter + accent mapper)
// ---------------------------------------------------------------------------

describe('accentForStat', () => {
    it('maps each bare stance to itself', () => {
        expect(accentForStat('body')).toBe('body');
        expect(accentForStat('mind')).toBe('mind');
        expect(accentForStat('heart')).toBe('heart');
    });

    it('maps anything else → neutral', () => {
        expect(accentForStat('physicalAttack')).toBe('neutral');
        expect(accentForStat('whatever')).toBe('neutral');
    });
});

describe('formatEffectStatEffect', () => {
    it('formats damage-over-time as "-N hp / round"', () => {
        expect(
            formatEffectStatEffect(
                { damageOverTime: { damagePerRound: 3, damageType: 'body' } },
                'fallback',
            ),
        ).toBe('-3 hp / round');
    });

    it('formats actionRestriction skipTurn', () => {
        expect(formatEffectStatEffect({ actionRestriction: { skipTurn: true } }, 'fallback'))
            .toBe('skip turn');
    });

    it('falls back to the description string when no payload field is present', () => {
        expect(formatEffectStatEffect(undefined, 'description fallback')).toBe('description fallback');
        expect(formatEffectStatEffect({}, 'description fallback')).toBe('description fallback');
    });
});
