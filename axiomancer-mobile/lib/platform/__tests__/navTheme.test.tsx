import { describe, expect, it } from '@jest/globals';
import { useTheme } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { AppNavigationContainer, appNavTheme } from '../router';
import { AXM } from '@/theme/axm';

describe('the navigation theme', () => {
    it('paints every container colour the app background, never the default near-white', () => {
        const t = appNavTheme(AXM.bg);
        expect(t.colors.background).toBe(AXM.bg);
        expect(t.colors.card).toBe(AXM.bg);
        expect(t.colors.border).toBe(AXM.bg);
    });

    it('the app container hands that theme to everything inside it', () => {
        function Probe() {
            const { colors } = useTheme();
            return <Text testID="probe">{`${colors.background}|${colors.card}|${colors.border}`}</Text>;
        }
        const r = render(
            <AppNavigationContainer>
                <Probe />
            </AppNavigationContainer>,
        );
        expect(r.getByTestId('probe').props.children).toBe(`${AXM.bg}|${AXM.bg}|${AXM.bg}`);
    });
});
