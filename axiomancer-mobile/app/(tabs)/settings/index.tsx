/**
 * The SETTINGS tab: the same body as the `/settings` route, without the close
 * control (the tab bar is the way out).
 */

import React from 'react';

import { SettingsBody } from '@/components/settings/SettingsBody';

export default function SettingsTabScreen() {
    return <SettingsBody showClose={false} />;
}
