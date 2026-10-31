/**
 * PlayerPortraitImage — the raster pilgrim bust.
 *
 * Used at every production portrait call site (character-sheet header,
 * combat medallion, pilgrim inspect modal).
 * A run opened as a roster character shows that character's portrait. Any
 * other state reads the chosen portrait from the store (`portrait:<id>` flag —
 * see assets/images/portraits). Decorative, the caller's frame supplies a label.
 */

import React from 'react';
import type { DimensionValue } from 'react-native';
import { View } from 'react-native';
import { Image } from '@/lib/platform/image';

import { AxmIcon } from '@/components/icons';
import { usePalette } from '@/theme/runtime';

import { getPlayerPortrait, portraitIdFromFlags } from '@/assets/images/portraits';
import { useGameState } from '@/state/GameStoreProvider';
import { characterPortraitKey } from '@/state/presenters/character-select.engine';

interface PlayerPortraitImageProps {
    /** Accepts a percentage (e.g. '100%') so the portrait can fill a flex column. */
    width?: DimensionValue;
    height?: DimensionValue;
    /** 'contain' shows the full figure (sheet header); 'cover' crops toward the
     *  head for tight circular frames (combat medallion). */
    fit?: 'contain' | 'cover';
    /** Where the image sits within its box. Defaults to 'top center' (the head
     *  anchors up, letterboxing below); pass 'center' to sit it in the middle. */
    contentPosition?: 'top center' | 'center';
    /** Opt-in: show a skull in place of the portrait while the run is dying
     *  (`GameState.dying`, read from the store). Only the combat board's two
     *  portrait sites pass it; the sheet header and equipment dock keep the face. */
    skullWhenDying?: boolean;
}

/** The skull's glyph: the registry's skull (the boss mark), no new art. */
export const DYING_SKULL_ICON = 'action-boss' as const;

export function PlayerPortraitImage({
    width = 80,
    height = 96,
    fit = 'contain',
    contentPosition = 'top center',
    skullWhenDying = false,
}: PlayerPortraitImageProps) {
    const dying = useGameState((s) => s.dying === true);
    const palette = usePalette();
    const characterPortrait = useGameState((s) => characterPortraitKey(s.player?.characterId));
    const flagPortrait = useGameState((s) => portraitIdFromFlags(s.flags));
    const portraitId = characterPortrait ?? flagPortrait;
    const portrait = getPlayerPortrait(portraitId);
    if (skullWhenDying && dying) {
        const box = [width, height].filter((n): n is number => typeof n === 'number');
        return (
            <View
                testID="player-portrait-skull"
                style={{ width, height, alignItems: 'center', justifyContent: 'center' }}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            >
                <AxmIcon name={DYING_SKULL_ICON} size={Math.round(Math.min(...box, 52) * 0.8)} color={palette.bone} />
            </View>
        );
    }
    return (
        <Image
            source={portrait.source}
            style={{ width, height }}
            contentFit={fit}
            contentPosition={contentPosition}
            transition={0}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        />
    );
}
