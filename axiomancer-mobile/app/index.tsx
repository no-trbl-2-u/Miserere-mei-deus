/**
 * The launch route — `/`.
 *
 * One screen, two phases (`<TitleScreen>`):
 *   1. TITLE  — the splash's wordmark lifts into the title plate's sky, then
 *               the psalm line and EMBARK. Shown on every cold launch.
 *   2. MENU   — CONTINUE / NEW GAME / LOAD GAME / SETTINGS (`<MainMenu>`),
 *               beneath the same wordmark over the dimmed plate. CONTINUE
 *               resumes the most recent slot in place; NEW GAME and LOAD GAME
 *               open the slot screen; SETTINGS opens the settings route.
 *
 * `?menu=1` opens on the menu with the sequence already played (the settings
 * screen's RETURN TO TITLE lands here). A fixture boot (`state/fixtures.ts`)
 * skips BOTH phases and enters the compiled state directly — a harness that
 * asked for a fixture did not ask for a menu.
 *
 * No deck picker lives here: the grey office is seeded at first combat
 * (`ensureStarterCards`).
 */

import React from 'react';

import { MainMenu } from '@/components/menu/MainMenu';
import { TitleScreen } from '@/components/TitleScreen';
import { Redirect, useLocalSearchParams, useRouter } from '@/lib/platform/router';
import { useGameStore } from '@/state/GameStoreProvider';
import { useSaveSlots } from '@/state/SaveSlotsProvider';
import { getBootFixture } from '@/state/fixtures';
import { entryRoute } from '@/state/run-end';
import { selectActiveTab } from '@/state/presenters/navigation.engine';

export default function Index() {
    const router = useRouter();
    const store = useGameStore();
    const { continueGame, slots } = useSaveSlots();
    const params = useLocalSearchParams<{ menu?: string }>();

    // A fixture boot IS the intended state — straight in, no menu.
    if (getBootFixture() !== null) {
        return <Redirect href={`/${selectActiveTab(store.getState())}`} />;
    }

    return (
        <TitleScreen
            startAtMenu={params.menu === '1'}
            menu={
                <MainMenu
                    embedded
                    onContinue={() => {
                        if (continueGame()) {
                            router.replace(entryRoute(
                                store.getState(),
                                slots.getActiveSlot(),
                                `/${selectActiveTab(store.getState())}`,
                            ));
                        }
                    }}
                    onNewGame={() => router.push('/saves?mode=new')}
                    onLoadGame={() => router.push('/saves?mode=load')}
                    onSettings={() => router.push('/settings')}
                />
            }
        />
    );
}
