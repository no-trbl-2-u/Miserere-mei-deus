/**
 * The `/settings` route, reached from the main menu (no tab bar there), so it
 * keeps the close control. The body is shared with the SETTINGS tab.
 */

import React from 'react';

import { SettingsBody } from '@/components/settings/SettingsBody';

export default function SettingsScreen() {
    return <SettingsBody showClose />;
}
