/**
 * Stepping a font down so a name fits, never truncating it.
 *
 * Inputs: the width the text measured at its nominal size (read off a real
 * render, never estimated here), the room, the nominal and floor sizes and the
 * letter spacing.
 * Output: the largest size in half-point steps in `[floor, nominal]` at which the
 * text fits the room; the floor when none does.
 */

/**
 * `natural` is the width of `chars` letters at `nominal`. Glyph widths scale
 * with the size; letter spacing does not.
 */
export function fitSizeToRoom(
    natural: number, chars: number, room: number, nominal: number, floor: number, letterSpacing: number,
): number {
    if (natural <= 0 || room <= 0 || natural <= room) return nominal;
    const spacing = chars * letterSpacing;
    const glyphs = Math.max(1, natural - spacing);
    const size = Math.floor(((nominal * (room - spacing)) / glyphs) * 2) / 2;
    return Math.max(floor, Math.min(nominal, size));
}

/** The longest run of letters between spaces (or hyphens a line may break at). */
export function longestWord(text: string): string {
    return text.split(/[\s]+/).reduce((a, b) => (b.length > a.length ? b : a), '');
}
