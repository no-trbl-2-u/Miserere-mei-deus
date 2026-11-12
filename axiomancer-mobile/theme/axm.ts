import { type Palette } from './palette';
import { currentPalette, getActiveThemeId } from './runtime';

/**
 * The active theme id at module-load. Exported for non-reactive callers; React code that must track switches should use
 * `useThemeId()` from `theme/runtime` instead.
 */
export const ACTIVE_THEME_ID = getActiveThemeId();

/**
 * Canonical colour palette — a **static snapshot** of the active theme
 * at module-load. Retained for non-reactive consumers (engine
 * presenters that snapshot once, fixtures, fallbacks). Reactive UI must
 * read colours via `usePalette()` / `makeStyles()` from `theme/runtime`
 * so they re-paint when the theme switches without a reload. See
 * `theme/palette.ts` for the registry and `theme/runtime.tsx` for the
 * live store.
 */
export const AXM: Palette = currentPalette();

/** Fixed colours, the same in every theme. Defined in `theme/hue.ts`. */
export { HUE } from './hue';

/**
 * The five face slots from before the type roles, kept for engine code and
 * tests that still read a face by slot. Components never use them: they name a
 * job in `TYPE_ROLES` (`theme/__tests__/type-roles-only.test.ts` fails a direct use).
 */
export const FONTS = {
  gothic: 'UncialAntiqua_400Regular',
  serif: 'Rosarivo_400Regular',
  serifItalic: 'EagleLake_400Regular',
  sans: 'UncialAntiqua_400Regular',
  mono: 'Grenze_400Regular',
  // Fallback fonts for progressive loading
  sansFallback: 'System',
  monoFallback: 'serif',
};

/**
 * The 15 jobs type does, one per ballot place (T's verdict in `plan/ballots/fonts.md`).
 * A component names the job, never a face. None of T's faces is a
 * condensed capital face, so no role tracks out; Marcellus SC is small caps
 * already. `fontFamily` must name a face in `theme/fontFaces.ts`.
 */
export const TYPE_ROLES = {
  title: { fontFamily: 'UncialAntiqua_400Regular', fontSize: 30, lineHeight: 36, letterSpacing: 0.3, textTransform: 'none' },
  eyebrow: { fontFamily: 'MarcellusSC_400Regular', fontSize: 13, lineHeight: 17, letterSpacing: 0.2, textTransform: 'none' },
  sectionHead: { fontFamily: 'MedievalSharp_400Regular', fontSize: 18, lineHeight: 23, letterSpacing: 0, textTransform: 'none' },
  narration: { fontFamily: 'EagleLake_400Regular', fontSize: 17, lineHeight: 25, letterSpacing: 0, textTransform: 'none' },
  spoken: { fontFamily: 'EagleLake_400Regular', fontSize: 18, lineHeight: 26, letterSpacing: 0, textTransform: 'none' },
  rules: { fontFamily: 'Rosarivo_400Regular', fontSize: 15, lineHeight: 22, letterSpacing: 0, textTransform: 'none' },
  button: { fontFamily: 'UncialAntiqua_400Regular', fontSize: 16, lineHeight: 20, letterSpacing: 0.2, textTransform: 'none' },
  chip: { fontFamily: 'UncialAntiqua_400Regular', fontSize: 13, lineHeight: 16, letterSpacing: 0, textTransform: 'none' },
  mapName: { fontFamily: 'UncialAntiqua_400Regular', fontSize: 14, lineHeight: 18, letterSpacing: 0, textTransform: 'none' },
  bigNumber: { fontFamily: 'Spectral_600SemiBold', fontSize: 34, lineHeight: 38, letterSpacing: 0, textTransform: 'none' },
  count: { fontFamily: 'Grenze_400Regular', fontSize: 14, lineHeight: 18, letterSpacing: 0, textTransform: 'none' },
  cardName: { fontFamily: 'Fondamento_400Regular', fontSize: 13, lineHeight: 16, letterSpacing: 0, textTransform: 'none' },
  cardRules: { fontFamily: 'Rosarivo_400Regular', fontSize: 11, lineHeight: 14, letterSpacing: 0, textTransform: 'none' },
  foeName: { fontFamily: 'UncialAntiqua_400Regular', fontSize: 20, lineHeight: 24, letterSpacing: 0.2, textTransform: 'none' },
  entry: { fontFamily: 'Fondamento_400Regular', fontSize: 15, lineHeight: 22, letterSpacing: 0, textTransform: 'none' },
} as const;

export type TypeRoleId = keyof typeof TYPE_ROLES;

export const TYPE = {
  display: { fontFamily: FONTS.gothic, fontSize: 32, lineHeight: 38, letterSpacing: 0.5 },
  h1: { fontFamily: FONTS.gothic, fontSize: 24, lineHeight: 30, letterSpacing: 0.3 },
  h2: { fontFamily: FONTS.serif, fontSize: 20, lineHeight: 26, letterSpacing: 0.2 },
  body: { fontFamily: FONTS.serif, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  caption: { fontFamily: FONTS.sans, fontSize: 14, lineHeight: 18, letterSpacing: 0.1 },
  mono: { fontFamily: FONTS.mono, fontSize: 14, lineHeight: 18, letterSpacing: 0 },
} as const;

// Dynamic type styles with font fallbacks for progressive loading
export function getTypeWithFallbacks(secondaryFontsLoaded: boolean) {
  return {
    display: { fontFamily: FONTS.gothic, fontSize: 32, lineHeight: 38, letterSpacing: 0.5 },
    h1: { fontFamily: FONTS.gothic, fontSize: 24, lineHeight: 30, letterSpacing: 0.3 },
    h2: { fontFamily: FONTS.serif, fontSize: 20, lineHeight: 26, letterSpacing: 0.2 },
    body: { fontFamily: FONTS.serif, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
    caption: { fontFamily: secondaryFontsLoaded ? FONTS.sans : FONTS.sansFallback, fontSize: 14, lineHeight: 18, letterSpacing: 0.1 },
    mono: { fontFamily: secondaryFontsLoaded ? FONTS.mono : FONTS.monoFallback, fontSize: 14, lineHeight: 18, letterSpacing: 0 },
  } as const;
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export function rnd(i: number, seed = 1) {
  const x = Math.sin(i * 9301 + seed * 49297) * 233280;
  return x - Math.floor(x);
}
