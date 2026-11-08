import { describe, expect, it } from '@jest/globals';

import { appNavTheme } from '../router';

describe('the navigation theme', () => {
    it('paints every container colour the app background, never the default near-white', () => {
        const t = appNavTheme('#0a0a0a');
        expect(t.colors.background).toBe('#0a0a0a');
        expect(t.colors.card).toBe('#0a0a0a');
        expect(t.colors.border).toBe('#0a0a0a');
    });
});
