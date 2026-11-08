import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';

import { appNavTheme } from '../router';

describe('the navigation theme', () => {
    it('paints every container colour the app background, never the default near-white', () => {
        const t = appNavTheme('#0a0a0a');
        expect(t.colors.background).toBe('#0a0a0a');
        expect(t.colors.card).toBe('#0a0a0a');
        expect(t.colors.border).toBe('#0a0a0a');
    });

    it('is handed to the root NavigationContainer', () => {
        const src = readFileSync(join(__dirname, '../../../app/_layout.tsx'), 'utf8');
        expect(src).toMatch(/<NavigationContainer[^>]*theme=\{NAV_THEME\}/s);
        expect(src).toMatch(/NAV_THEME = appNavTheme\(AXM\.bg\)/);
    });
});
