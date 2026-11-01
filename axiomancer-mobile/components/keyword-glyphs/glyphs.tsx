/**
 * One glyph per printed keyword: 24-unit line icons, single stroke weight,
 * round caps, drawn to read at text size. DEAL, GUARD, VULNERABLE, SACRIFICE,
 * TETHER, LEECH, MERCY (a laurel), CONVICTION, INFERNO, BLIZZARD, DISCARD and
 * EXILE are the mock set T chose; the other eleven are drawn in the same
 * hand and each differs from every other glyph in its silhouette.
 *
 * A glyph never picks its own colour: the caller passes one (the keyword's
 * category colour, `KeywordGlyph`). Swapping a glyph for a generated image
 * means replacing its entry in `KEYWORD_GLYPH_COMPONENT` (`./index.tsx`).
 */

import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export interface GlyphProps {
    /** Edge in px. */
    size: number;
    /** Stroke colour. */
    color: string;
    /** The keyword word, read by a screen reader. */
    label: string;
}

/** The frame every glyph shares: viewBox 24, line only, rounded. */
function Frame({ size, color, label, children }: GlyphProps & { children: React.ReactNode }) {
    return (
        <Svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            accessibilityRole="image"
            accessibilityLabel={label}
        >
            {children}
        </Svg>
    );
}

export const DealGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M14.5 3H21v6.5L10 20.5 3.5 14z" />
        <Path d="M6 17l-3 4M8 13l3 3" />
    </Frame>
);

export const GuardGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
    </Frame>
);

export const HealGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z" />
    </Frame>
);

export const SacrificeGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M12 3c3 4.5 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-6.5 6-11z" />
    </Frame>
);

/** An open padlock: the cost is released. */
export const WaiveGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Rect x={5} y={11} width={14} height={10} rx={2} />
        <Path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </Frame>
);

export const ExileGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Circle cx={12} cy={12} r={8.5} />
        <Path d="M6 6l12 12" />
    </Frame>
);

export const TetherGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <Path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </Frame>
);

export const LeechGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M5 4h14l-3 7-2-3-2 8-2-8-2 3z" />
    </Frame>
);

export const VulnerableGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
        <Path d="M12 6l-2 5 3 2-2 5" />
    </Frame>
);

export const ConvictionGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M12 3l7 9-7 9-7-9z" />
    </Frame>
);

export const InfernoGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3-1-3 0-6 0-8z" />
    </Frame>
);

export const BlizzardGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
        <Path d="M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />
    </Frame>
);

/** A lightning bolt. */
export const StormGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M13 2L5 13.5h6L10 22l9-12h-6z" />
    </Frame>
);

/** An ice cube seen corner-on. */
export const FrozenGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
        <Path d="M4.2 7.5L12 12l7.8-4.5M12 12v9" />
    </Frame>
);

/** A card with an arrow coming down from it into the hand. */
export const DrawGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Rect x={7} y={2.5} width={10} height={12} rx={1.5} />
        <Path d="M12 17.5V22M9.5 19.5L12 22l2.5-2.5" />
    </Frame>
);

/** A barbed twig. */
export const ThornsGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M4 20L20 4" />
        <Path d="M9 15l-1-6 6 1M14 10l-1-6 6 1" />
    </Frame>
);

/** A ray striking a surface and coming back. */
export const ReflectGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M3 20h18" />
        <Path d="M4 4l8 12 8-12" />
        <Path d="M16.5 4H20v3.5" />
    </Frame>
);

/** An arrow turning back on itself. */
export const RetrieveGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M5 9h9a5 5 0 0 1 0 10H8" />
        <Path d="M8 5L4.5 9 8 13" />
    </Frame>
);

export const DiscardGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M7 3h10v18H7z" />
        <Path d="M10 10l4 4M14 10l-4 4" />
    </Frame>
);

/** A shield with a tick: the guard holds. */
export const HoldsGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
        <Path d="M8.8 12l2.3 2.3 4.2-4.6" />
    </Frame>
);

/** A sun. */
export const RadianceGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Circle cx={12} cy={12} r={4} />
        <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </Frame>
);

/** A laurel, never an hourglass. */
export const MercyGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M9 20C4.5 17 3.5 10.5 7 5M15 20c4.5-3 5.5-9.5 2-15" />
        <Path d="M5.6 9.5L3.5 8.6M5 13.5H2.8M6.6 17l-2 .8M18.4 9.5l2.1-.9M19 13.5h2.2M17.4 17l2 .8" />
    </Frame>
);

/** A flag on a staff, struck: the foe gives way. */
export const YieldingGlyph = (p: GlyphProps) => (
    <Frame {...p}>
        <Path d="M6 3v18" />
        <Path d="M6 4h12l-3 4 3 4H6" />
    </Frame>
);
