/**
 * The loadable faces, keyed by the exact `fontFamily` string the theme uses
 * (`expo-font` keys a face by property name). One registry so `_layout.tsx`
 * and the A2 test read the same list. Each face comes from its own
 * `@expo-google-fonts/*` package, imported by weight so Metro bundles only
 * the weights a role uses (T's ballot, `plan/ballots/fonts.md`).
 */
import { UncialAntiqua_400Regular } from '@expo-google-fonts/uncial-antiqua/400Regular';
import { Rosarivo_400Regular } from '@expo-google-fonts/rosarivo/400Regular';
import { EagleLake_400Regular } from '@expo-google-fonts/eagle-lake/400Regular';
import { MarcellusSC_400Regular } from '@expo-google-fonts/marcellus-sc/400Regular';
import { MedievalSharp_400Regular } from '@expo-google-fonts/medievalsharp/400Regular';
import { Spectral_600SemiBold } from '@expo-google-fonts/spectral/600SemiBold';
import { Grenze_400Regular } from '@expo-google-fonts/grenze/400Regular';
import { Fondamento_400Regular } from '@expo-google-fonts/fondamento/400Regular';

/** Loaded before the splash hides: the title and body faces. */
export const CORE_FACES = {
  UncialAntiqua_400Regular,
  Rosarivo_400Regular,
};

/** Loaded after start, non-blocking. */
export const SECONDARY_FACES = {
  EagleLake_400Regular,
  MarcellusSC_400Regular,
  MedievalSharp_400Regular,
  Spectral_600SemiBold,
  Grenze_400Regular,
  Fondamento_400Regular,
};

export const LOADED_FACE_NAMES: readonly string[] = [
  ...Object.keys(CORE_FACES),
  ...Object.keys(SECONDARY_FACES),
];
