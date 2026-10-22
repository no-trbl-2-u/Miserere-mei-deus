/**
 * EnemyIllustration — resolves an enemy id to a bespoke archetype
 * illustration drawn in the shared CreatureScene. Every archetype (including
 * `generic` and non-boss `tyrant`) renders through the one shared figure
 * set (`./figures`).
 */

import React from 'react';

import { resolveEnemyArchetype, type EnemyArchetype } from '@/state/presenters/enemy-art';
import { CreatureScene } from './CreatureScene';
import {
    AvianFigure,
    BeastFigure,
    CrustaceanFigure,
    EldritchFigure,
    FloraFigure,
    GenericFigure,
    SpiritFigure,
    TyrantFigure,
    VerminFigure,
    ZealotFigure,
} from './figures';

export interface EnemyIllustrationProps {
    /** Enemy art key (e.g. "death-beholder" / "float-eye"). */
    enemyArtKey?: string | null;
    isBoss?: boolean;
}

const LABELS: Record<EnemyArchetype, string> = {
    vermin: 'a hunched vermin baring its teeth',
    crustacean: 'a broad-shelled crustacean with raised claws',
    spirit: 'a tattered shroud-spirit drifting above the ground',
    beast: 'a four-legged beast with a lowered, fanged head',
    avian: 'a hunched carrion bird with a hooked beak',
    flora: 'a gnarled treant with branch-like arms',
    zealot: 'a hooded zealot bearing a staff',
    eldritch: 'a broken sigil of light around a single eye',
    tyrant: 'a crowned tyrant upon a throne',
    generic: 'a horned creature in a moonlit clearing',
};

const SHADOW_WIDTHS: Record<EnemyArchetype, number> = {
    vermin: 54,
    crustacean: 62,
    spirit: 40,
    beast: 58,
    avian: 34,
    flora: 40,
    zealot: 44,
    eldritch: 30,
    tyrant: 58,
    generic: 64,
};

const FIGURES: Record<EnemyArchetype, React.ComponentType> = {
    vermin: VerminFigure,
    crustacean: CrustaceanFigure,
    spirit: SpiritFigure,
    beast: BeastFigure,
    avian: AvianFigure,
    flora: FloraFigure,
    zealot: ZealotFigure,
    eldritch: EldritchFigure,
    tyrant: TyrantFigure,
    generic: GenericFigure,
};

export function EnemyIllustration({ enemyArtKey, isBoss = false }: EnemyIllustrationProps) {
    const archetype = resolveEnemyArchetype(enemyArtKey, isBoss);
    const Figure = FIGURES[archetype];
    const label = `Combat encounter illustration showing ${LABELS[archetype]}`;
    return (
        <CreatureScene label={label} shadowWidth={SHADOW_WIDTHS[archetype]}>
            <Figure />
        </CreatureScene>
    );
}
