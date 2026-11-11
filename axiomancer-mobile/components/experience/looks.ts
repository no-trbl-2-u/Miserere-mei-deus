/**
 * THE LOOK TABLE — the single source for which look each place in the app
 * wears. Every screen that wears a kit piece reads it.
 *
 * Forty-four places in round 1 and thirteen of round 2's node screens, the
 * ledger's ids, each with one of three looks: Brass Gothic, Vellum & Ink, or
 * Normal (today's code path, untouched). The values are T's picks in the kit
 * mixer, pasted 2026-11-06; the picks and T's notes verbatim are the Verdicts
 * section of `plan/card-ledger/ui-kit.md`.
 *
 * A component NEVER hard-codes a look: it reads its place's look from `LOOKS`
 * (or `lookOf`), so a change of heart is a one-line edit here rather than a
 * re-wire. `LOOKS` is a plain place-id to look map and nothing else, for that
 * reason.
 *
 * `PLACE_PIECES` records which converted kit pieces each place draws, so the
 * later chunks know what to reach for and the A1 gate can check the bundle
 * holds exactly those and nothing dead. A `normal` place names no piece.
 *
 * Two rulings the pieces encode (T, 2026-11-06):
 *
 * - The intent badge (S-03) uses the OXBLOOD ring for an attack and the BRASS
 *   ring for anything else (guard, buff), matching today's colour split.
 * - Gold and amber accents on vellum become OXBLOOD RED, not the dark-brown
 *   body ink.
 */

import type { KitPiece } from '@/assets/images/experience/kit';

export type Look = 'normal' | 'brass' | 'vellum';

/** The 44 places of the kit ledger, in ledger order. */
export type PlaceId =
    | 'M-01'
    | 'W-01' | 'W-02' | 'W-03' | 'W-04' | 'W-05' | 'W-06'
    | 'S-01' | 'S-02' | 'S-03' | 'S-04' | 'S-05' | 'S-06' | 'S-07' | 'S-08' | 'S-09'
    | 'P-01' | 'P-02' | 'P-03' | 'P-04'
    | 'F-01' | 'F-02' | 'F-03' | 'F-04' | 'F-05' | 'F-06'
    | 'L-01'
    | 'B-01' | 'B-02' | 'B-03' | 'B-04' | 'B-05' | 'B-06'
    | 'D-01' | 'D-02' | 'D-03' | 'D-04'
    | 'O-01' | 'O-02' | 'O-03' | 'O-04' | 'O-05' | 'O-06' | 'O-07'
    // Round 2 of the mixer: the node screens (dialogue, cutscene, travel, hazard, quest, labyrinth).
    | 'E-01' | 'E-02' | 'E-03'
    | 'C-01' | 'C-02'
    | 'T-01' | 'T-02'
    | 'H-01' | 'H-02'
    | 'Q-01' | 'Q-02'
    | 'X-01' | 'X-02'
    // Round 2: new game (saves, character select) and the endings (death, game over).
    | 'N-01' | 'N-02' | 'N-03' | 'N-04' | 'N-05' | 'N-06' | 'N-07'
    | 'G-01' | 'G-02'
    // The village screens: the hub's counter buttons and the counters' own buttons.
    | 'V-01';

/** T's pick for every place. */
export const LOOKS: Record<PlaceId, Look> = {
    'M-01': 'brass', // main menu buttons
    'W-01': 'vellum', // Wilds: status card
    'W-02': 'vellum', // Wilds: node panel
    'W-03': 'vellum', // Wilds: BACK / TRAVEL HERE
    'W-04': 'vellum', // Wilds: quest tracker
    'W-05': 'normal', // Wilds: map node marks
    'W-06': 'vellum', // bottom tab bar
    'S-01': 'brass', // Strife: ENTER COMBAT / WITHDRAW
    'S-02': 'normal', // Strife: enemy name rail and VITAE bar
    'S-03': 'brass', // Strife: enemy intent badge
    'S-04': 'brass', // Strife: conviction chip
    'S-05': 'normal', // Strife: momentum chip
    'S-06': 'brass', // Strife: player dock (whole)
    'S-07': 'normal', // Strife: END button
    'S-08': 'normal', // Strife: player portrait ring
    'S-09': 'brass', // Strife: player VITAE bar and phase marks
    'P-01': 'vellum', // Spoils: fight summary panel
    'P-02': 'vellum', // Spoils: CONTINUE
    'P-03': 'vellum', // Spoils: card offer panel
    'P-04': 'vellum', // Spoils: TAKE NOTHING / TAKE CARD
    'F-01': 'brass', // Self: portrait frame
    'F-02': 'brass', // Self: level badge
    'F-03': 'brass', // Self: HEART / BODY / MIND tiles
    'F-04': 'normal', // Self: HAZARD DECK link
    'F-05': 'brass', // Self: section headings and divider
    'F-06': 'brass', // Self: VITAE pool bar
    'L-01': 'vellum', // Ledger: section headings and dividers
    'B-01': 'normal', // Satchel: purse
    'B-02': 'normal', // Satchel: removed place (the bar is gone); id kept so the catalog stays stable
    'B-03': 'normal', // Satchel: worn-gear panel and corners
    'B-04': 'brass', // Satchel: gear slot rows
    'B-05': 'vellum', // Satchel: ALL / GEAR / PHIALS tabs
    'B-06': 'normal', // Satchel: item cards
    'D-01': 'normal', // Deck: CARDS / DISTINCT / RARE tallies
    'D-02': 'normal', // Deck: rarity and colour chips
    'D-03': 'normal', // Deck: card-type heading and divider
    'D-04': 'normal', // Deck: card rows
    'O-01': 'brass', // Settings: section headings
    'O-02': 'normal', // Settings: colour theme list
    'O-03': 'brass', // Settings: segmented choices
    'O-04': 'brass', // Settings: radio choices
    'O-05': 'brass', // Settings: on/off toggles
    'O-06': 'brass', // Settings: volume steppers
    'O-07': 'brass', // Settings: menu row buttons

    // Round 2: the node screens.
    'E-01': 'normal', // Dialogue: title and its underline
    'E-02': 'vellum', // Dialogue: spoken-line box
    'E-03': 'brass', // Dialogue: choice rows
    'C-01': 'normal', // Cutscene: omen
    'C-02': 'normal', // Cutscene: SKIP
    'T-01': 'normal', // Travel: THE WAY ON tag
    'T-02': 'vellum', // Travel: YES / NO buttons
    'H-01': 'vellum', // Hazard: stakes card
    'H-02': 'normal', // Hazard: FACE IT
    'Q-01': 'vellum', // Quest: panel
    'Q-02': 'normal', // Quest: ACCEPT / LEAVE
    'X-01': 'brass', // Labyrinth: act rows
    'X-02': 'brass', // Labyrinth: LEAVE
    'N-01': 'vellum', // Saves: slot rows
    'N-02': 'vellum', // Saves: BEGIN
    'N-03': 'normal', // Saves and character select: close (x)
    'N-04': 'brass', // Character select: portrait and relic cards
    'N-05': 'vellum', // Character select: HEART / BODY / MIND tiles
    'N-06': 'vellum', // Character select: CONFIRM
    'N-07': 'normal', // Character select: roster grid tiles
    'G-01': 'brass', // Death return: CONTINUE (the house look's brass plate; Game over's button is G-02)
    'G-02': 'brass', // Game over: NEW CHARACTER (the house look's brass plate)
    'V-01': 'brass', // Village: hub and counter buttons (168, call #5: these screens only)
};

/** The converted pieces each place draws. A `normal` place draws none. */
export const PLACE_PIECES: Record<PlaceId, readonly KitPiece[]> = {
    'M-01': ['action-button-idle', 'action-button-selected', 'action-button-disabled'],
    'W-01': ['menu-panel-vellum', 'vellum-chip'],
    'W-02': ['menu-panel-vellum'],
    'W-03': ['action-button-vellum'],
    'W-04': ['quest-row-vellum'],
    'W-05': [],
    'W-06': ['nav-dock-vellum'],
    'S-01': ['modal-panel-dark', 'action-button-idle', 'action-button-selected', 'action-button-disabled'],
    'S-02': [],
    'S-03': ['combat-intent-oxblood', 'combat-intent-brass', 'combat-badge'],
    'S-04': ['combat-badge', 'nav-count-plate-dark'],
    'S-05': [],
    'S-06': ['nav-dock-dark'],
    'S-07': [],
    'S-08': [],
    'S-09': ['combat-player-track', 'combat-player-fill', 'combat-vitae-fill', 'combat-pip'],
    'P-01': ['modal-panel-vellum'],
    'P-02': ['action-button-vellum'],
    'P-03': ['modal-panel-vellum'],
    'P-04': ['action-button-vellum'],
    'F-01': ['character-portrait-frame'],
    'F-02': ['level-badge-dark'],
    'F-03': ['stat-tile'],
    'F-04': [],
    'F-05': ['section-header-dark-star', 'section-header-dark-quatrefoil', 'divider-ornate-brass', 'nav-count-shield-dark'],
    'F-06': ['combat-vitae-track', 'combat-vitae-fill'],
    'L-01': ['section-header-vellum-star', 'section-header-vellum-leaf', 'divider-ornate-ink', 'divider-plain-ink', 'divider-short-ink'],
    'B-01': [],
    'B-02': [],
    'B-03': [],
    'B-04': ['equipment-slot-dark', 'equipment-slot-selected'],
    'B-05': ['filter-tab-vellum'],
    'B-06': [],
    'D-01': [],
    'D-02': [],
    'D-03': [],
    'D-04': [],
    'O-01': ['section-header-dark-star', 'section-header-dark-quatrefoil', 'divider-ornate-brass', 'divider-plain-brass', 'divider-short-brass'],
    'O-02': [],
    'O-03': ['segment-button-idle', 'segment-button-selected', 'segment-button-pressed'],
    'O-04': ['radio-ring'],
    'O-05': ['toggle-shell-active', 'toggle-shell-inactive', 'slider-knob-round'],
    'O-06': ['icon-button-square', 'slider-track-diamond', 'slider-track-quatrefoil', 'slider-knob-diamond', 'slider-knob-round'],
    'O-07': ['action-button-idle', 'action-button-selected', 'action-button-disabled'],

    'E-01': [],
    'E-02': ['modal-panel-vellum'],
    'E-03': ['action-button-idle', 'action-button-selected', 'action-button-disabled'],
    'C-01': [],
    'C-02': [],
    'T-01': [],
    'T-02': ['action-button-vellum'],
    'H-01': ['modal-panel-vellum'],
    'H-02': [],
    'Q-01': ['modal-panel-vellum'],
    'Q-02': [],
    'X-01': ['action-button-idle', 'action-button-selected'],
    'X-02': ['action-button-idle', 'action-button-selected'],
    'N-01': ['quest-row-vellum'],
    'N-02': ['action-button-vellum'],
    'N-03': [],
    'N-04': ['modal-panel-dark'],
    'N-05': ['vellum-chip'],
    'N-06': ['action-button-vellum'],
    'N-07': [],
    'G-01': ['action-button-idle', 'action-button-selected', 'action-button-disabled'],
    'G-02': ['action-button-idle', 'action-button-selected', 'action-button-disabled'],
    'V-01': ['action-button-idle', 'action-button-selected', 'action-button-disabled'],
};

/** The look a place wears. */
export const lookOf = (place: PlaceId): Look => LOOKS[place];
