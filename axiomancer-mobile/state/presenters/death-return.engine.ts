/**
 * Presenter for the full-screen return moment (`/death-return`, phase DY1b):
 * the title line, one line of body copy and the CONTINUE label.
 */

import {
    DEATH_RETURN_BODY,
    DEATH_RETURN_CONTINUE_LABEL,
    DEATH_RETURN_TITLE,
} from './death-return.copy';

export interface DeathReturnVM {
    readonly title: string;
    readonly body: string;
    readonly continueLabel: string;
    readonly continueA11yLabel: string;
}

export function selectDeathReturnVM(): DeathReturnVM {
    return {
        title: DEATH_RETURN_TITLE,
        body: DEATH_RETURN_BODY,
        continueLabel: DEATH_RETURN_CONTINUE_LABEL,
        continueA11yLabel: 'Continue to the map',
    };
}
