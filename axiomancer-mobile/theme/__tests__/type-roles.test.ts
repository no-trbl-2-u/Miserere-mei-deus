/**
 * Every type role and every FONTS slot names a face that
 * `app/_layout.tsx` loads (the registry in `theme/fontFaces.ts`).
 */
import { FONTS, TYPE_ROLES } from '../axm';
import { CORE_FACES, LOADED_FACE_NAMES, SECONDARY_FACES } from '../fontFaces';

const ROLE_IDS = [
  'title', 'eyebrow', 'sectionHead', 'narration', 'spoken', 'rules', 'button', 'chip',
  'mapName', 'bigNumber', 'count', 'cardName', 'cardRules', 'foeName', 'entry',
];

describe('TYPE_ROLES', () => {
  it('holds the 15 ballot roles', () => {
    expect(Object.keys(TYPE_ROLES).sort()).toEqual([...ROLE_IDS].sort());
  });

  it.each(ROLE_IDS)('%s names a loaded face and has real metrics', (id) => {
    const role = TYPE_ROLES[id as keyof typeof TYPE_ROLES];
    expect(LOADED_FACE_NAMES).toContain(role.fontFamily);
    expect(role.fontSize).toBeGreaterThan(0);
    expect(role.lineHeight).toBeGreaterThanOrEqual(role.fontSize);
    expect(role.letterSpacing).toBeLessThanOrEqual(0.5);
  });

  it('card names are Fondamento, which has real lowercase', () => {
    expect(TYPE_ROLES.cardName.fontFamily).toBe('Fondamento_400Regular');
    expect(TYPE_ROLES.cardName.textTransform).toBe('none');
  });

  it('every FONTS face slot names a loaded face', () => {
    for (const slot of ['gothic', 'serif', 'serifItalic', 'sans', 'mono'] as const) {
      expect(LOADED_FACE_NAMES).toContain(FONTS[slot]);
    }
  });

  it('loads no face that no role uses', () => {
    const used = new Set(Object.values(TYPE_ROLES).map((r) => r.fontFamily));
    expect(LOADED_FACE_NAMES.filter((f) => !used.has(f))).toEqual([]);
  });

  it('loads the title and body faces first', () => {
    expect(Object.keys(CORE_FACES)).toEqual(
      expect.arrayContaining([TYPE_ROLES.title.fontFamily, TYPE_ROLES.rules.fontFamily]),
    );
    expect(Object.keys(CORE_FACES).filter((k) => k in SECONDARY_FACES)).toEqual([]);
    for (const asset of [...Object.values(CORE_FACES), ...Object.values(SECONDARY_FACES)]) {
      expect(asset).toBeDefined();
    }
  });
});
