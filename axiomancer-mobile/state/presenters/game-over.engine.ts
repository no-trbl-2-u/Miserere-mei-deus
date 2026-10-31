/**
 * Presenter for the Game Over screen (`/game-over`, phase CH1j): the title,
 * one line of body copy and the NEW CHARACTER button.
 */

import { GAME_OVER_BODY, GAME_OVER_BUTTON_LABEL, GAME_OVER_TITLE } from './game-over.copy';

export interface GameOverVM {
    readonly title: string;
    readonly body: string;
    readonly buttonLabel: string;
    readonly buttonA11yLabel: string;
}

export function selectGameOverVM(): GameOverVM {
    return {
        title: GAME_OVER_TITLE,
        body: GAME_OVER_BODY,
        buttonLabel: GAME_OVER_BUTTON_LABEL,
        buttonA11yLabel: 'Choose a new character',
    };
}
