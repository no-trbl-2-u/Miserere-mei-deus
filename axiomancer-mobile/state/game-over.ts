/**
 * Whether the Game Over moment is owed (phase CH1j).
 *
 * A run end in the app arms it; the screen's button clears it. It lives in
 * module memory on purpose, like the death return: a reload finds nothing
 * armed and the screen goes straight to character select, where the saved
 * run-over state already points.
 */

let armed = false;

export function armGameOver(): void {
    armed = true;
}

export function isGameOverArmed(): boolean {
    return armed;
}

export function clearGameOver(): void {
    armed = false;
}
