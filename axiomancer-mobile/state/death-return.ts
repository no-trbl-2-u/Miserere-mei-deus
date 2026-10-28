/**
 * Whether the return moment is owed (phase DY1b).
 *
 * A revive in the app arms it; the moment's CONTINUE clears it. It lives in
 * module memory on purpose: it is shown once per revive and never saved, so
 * a reload during it finds nothing armed and the screen sends the player to
 * the map, with `dying` still set in the save.
 */

let armed = false;

export function armDeathReturn(): void {
    armed = true;
}

export function isDeathReturnArmed(): boolean {
    return armed;
}

export function clearDeathReturn(): void {
    armed = false;
}
