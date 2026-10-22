/**
 * Hermetic component tests — EnemyIllustration (the combat-encounter art
 * dispatcher rendered on every combat encounter).
 *
 * EnemyIllustration is pure wiring: it resolves an enemy id to a drawing
 * archetype (`resolveEnemyArchetype`) and routes every archetype — including
 * `generic` and non-boss `tyrant` — through the shared `CreatureScene` +
 * archetype-figure set. The sibling scenes and the resolver
 * presenter carry their own tests; this pins the dispatcher that wires
 * them together.
 *
 * Labels and resolver truth are read at test time so the suite survives
 * roster / copy churn rather than hard-coding archetype-keyword pairs.
 */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { EnemyIllustration } from '@/components/event/enemy-art/EnemyIllustration';
import {
    resolveEnemyArchetype,
    type EnemyArchetype,
} from '@/state/presenters/enemy-art';

const GENERIC_LABEL =
    'Combat encounter illustration showing a horned creature in a moonlit clearing';

/** A representative enemy id (a live foe where one fits, else a synthetic key) per bespoke (non-generic, non-tyrant) archetype. */
const BESPOKE_SAMPLES: ReadonlyArray<readonly [string, EnemyArchetype]> = [
    ['bilge-rat', 'vermin'],
    ['tidepool-crab', 'crustacean'],
    ['drowned-wraith', 'spirit'],
    ['grey-wolf', 'beast'],
    ['mournful-gull', 'avian'],
    ['bramble-sprite', 'flora'],
    ['brine-hag', 'zealot'],
    ['float-eye', 'eldritch'],
];

describe('EnemyIllustration', () => {
    it('keeps the bespoke samples aligned with the live resolver', () => {
        for (const [key, archetype] of BESPOKE_SAMPLES) {
            expect(resolveEnemyArchetype(key, false)).toBe(archetype);
        }
    });

    it('falls through to the generic encounter scene for an unmatched enemy', () => {
        expect(resolveEnemyArchetype('a-foe-with-no-keyword', false)).toBe('generic');
        const tree = render(<EnemyIllustration enemyArtKey="a-foe-with-no-keyword" />);
        expect(tree.getByLabelText(GENERIC_LABEL)).toBeTruthy();
    });

    it('falls through to the generic encounter scene when no enemy key is given', () => {
        const tree = render(<EnemyIllustration />);
        expect(tree.getByLabelText(GENERIC_LABEL)).toBeTruthy();
    });

    it('renders a labelled CreatureScene for each bespoke archetype', () => {
        for (const [key, archetype] of BESPOKE_SAMPLES) {
            const tree = render(<EnemyIllustration enemyArtKey={key} />);
            const scene = tree.getByLabelText(
                new RegExp(`Combat encounter illustration showing `),
            );
            expect(scene).toBeTruthy();
            expect(scene.props.accessibilityRole).toBe('image');
            // Not the generic fall-through scene.
            expect(scene.props.accessibilityLabel).not.toBe(GENERIC_LABEL);
            // Sanity: the sample really maps to the claimed archetype.
            expect(resolveEnemyArchetype(key, false)).toBe(archetype);
        }
    });

    it('renders distinct per-archetype labels across bespoke archetypes', () => {
        const labels = BESPOKE_SAMPLES.map(([key]) => {
            const tree = render(<EnemyIllustration enemyArtKey={key} />);
            return tree.getByLabelText(/Combat encounter illustration showing /)
                .props.accessibilityLabel as string;
        });
        expect(new Set(labels).size).toBe(labels.length);
    });

    it('routes a tyrant boss to the crowned CreatureScene', () => {
        const key = 'death-beholder';
        expect(resolveEnemyArchetype(key, true)).toBe('tyrant');
        const tree = render(<EnemyIllustration enemyArtKey={key} isBoss />);
        const scene = tree.getByLabelText(/Combat encounter illustration showing /);
        expect(scene).toBeTruthy();
        expect(scene.props.accessibilityRole).toBe('image');
    });

    it('routes a tyrant non-boss to the same crowned CreatureScene as a boss', () => {
        const key = 'hill-giant';
        expect(resolveEnemyArchetype(key, false)).toBe('tyrant');
        const bossTree = render(<EnemyIllustration enemyArtKey={key} isBoss />);
        const nonBossTree = render(<EnemyIllustration enemyArtKey={key} isBoss={false} />);
        const bossLabel = bossTree.getByLabelText(/Combat encounter illustration showing /)
            .props.accessibilityLabel;
        const nonBossLabel = nonBossTree.getByLabelText(/Combat encounter illustration showing /)
            .props.accessibilityLabel;
        expect(nonBossLabel).toBe(bossLabel);
    });

    it('defaults a keyless boss to the crowned tyrant CreatureScene', () => {
        expect(resolveEnemyArchetype(null, true)).toBe('tyrant');
        const tree = render(<EnemyIllustration isBoss />);
        const scene = tree.getByLabelText(/Combat encounter illustration showing /);
        expect(scene).toBeTruthy();
        expect(scene.props.accessibilityRole).toBe('image');
    });
});
