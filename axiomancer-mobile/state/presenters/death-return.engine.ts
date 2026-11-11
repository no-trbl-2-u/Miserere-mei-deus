/**
 * Presenter for the full-screen return moment (`/death-return`, phases DY1b
 * and FE1c): the title, one body line, the VITAE bar at 1 of the player's
 * maximum with its figure, one line on what is kept and the CONTINUE label.
 * The player's figure is the shared portrait component's; no rule lives here.
 */

import {
    DEATH_RETURN_BODY,
    DEATH_RETURN_CONTINUE_LABEL,
    DEATH_RETURN_KEPT,
    DEATH_RETURN_TITLE,
    DEATH_RETURN_VITAE_LABEL,
} from './death-return.copy';

/** A first death returns the player at 1 VITAE (`resolveDeath`, `Game/death.ts`). */
export const DEATH_RETURN_VITAE = 1;

export interface DeathReturnVM {
    readonly title: string;
    readonly body: string;
    readonly kept: string;
    readonly vitae: number;
    readonly maxVitae: number;
    /** "VITAE 1 / 24", the line under the bar. */
    readonly vitaeText: string;
    readonly continueLabel: string;
    readonly continueA11yLabel: string;
}

export function selectDeathReturnVM(maxHealth?: number): DeathReturnVM {
    const maxVitae = Math.max(DEATH_RETURN_VITAE, Math.floor(maxHealth ?? DEATH_RETURN_VITAE));
    return {
        title: DEATH_RETURN_TITLE,
        body: DEATH_RETURN_BODY,
        kept: DEATH_RETURN_KEPT,
        vitae: DEATH_RETURN_VITAE,
        maxVitae,
        vitaeText: `${DEATH_RETURN_VITAE_LABEL} ${DEATH_RETURN_VITAE} / ${maxVitae}`,
        continueLabel: DEATH_RETURN_CONTINUE_LABEL,
        continueA11yLabel: 'Continue to the map',
    };
}
