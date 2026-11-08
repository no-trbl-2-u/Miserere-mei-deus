---
date: 2026-11-08
---

## Add plan/159-tu1-phone-touch-ups.md
~~~ acceptance
- **A?loadtap** With a save present, a tap anywhere on LOAD GAME opens the Load screen, and nothing left over from the title screen's Embark block takes a touch once the main menu is up.
- **A?foename** The foe's name on the fight board never runs under the VITAE shield: every Act 1 foe's name reads whole at 360, 375 and 390 wide, the longest included ("The Death Beholder", "The Saint Beneath", "The Tithe-Collector").
- **A?relicwrap** A relic name on character select never breaks inside a word ("Suppliant's Ring" reads "Suppliant's / Ring", not "Suppliant' / s Ring").
- **A?selfname** Self shows the character's whole name ("The Chosen", not "The Ch...") at 360, 390 and 430 wide.
~~~
~~~ section Sources
- **T, 2026-11-08,** after a browser playthrough of the current build that reported four small faults (shots `081` and `004` in the playthrough folder, `C:\Users\notrb\Workspace\Miserere-playthrough-2026-11-08`): "plot 1-4 all together".
- **Read 2026-11-08, at 9ebb8e890.** LOAD GAME: with a save the menu has four buttons and LOAD GAME sits at y 664 on a 390 x 844 screen. `document.elementFromPoint` at its centre returns the Embark scroll's image inside `title-cta`, which `TitleScreen.tsx` keeps mounted at opacity 0 after the menu appears. Its parent has `pointerEvents="none"`, but a real mouse click at the centre still did nothing, with reduced motion on and off, and `/saves` opened only on a direct DOM click. Measured on the web export; not measured on a device. The foe's name: `enemyName` in `CombatCombatantPane.tsx` wraps in a row across the full width while the HP shield rises through the middle of it. The relic name: `relicName` at `app/character-select/index.tsx:175`, `numberOfLines={3}` in a narrow plate. Self's name: `characterName` at `app/(tabs)/character/index.tsx:144`, `numberOfLines={1}` beside the level badge.
~~~
~~~ chunks
- [ ] **159.?small** LOAD GAME takes its tap; foe names clear the shield; relic names keep their words; Self shows the whole name · M · closes A?loadtap, A?foename, A?relicwrap, A?selfname · needs — · alias: TU1f
  - `components/TitleScreen.tsx`: once the phase is `menu`, nothing in the faded Embark block can take a touch at any layer, on web as well as native. Smallest fix first: stop rendering the block once its fade ends, if nothing else reads it; otherwise carry the no-touch rule down to the button and its image. Test: with the menu up the Embark button is gone or takes no press, and a browser check that the element at LOAD GAME's centre is LOAD GAME. Check all four menu buttons, with and without a save.
  - `components/combat/encounter/CombatCombatantPane.tsx`: lay the name so it cannot meet the shield (`hudNameRow`, `enemyName`, the `hpBlock` it sits above). Keep the name on one line where it fits; shrink rather than truncate. The shield's position and the HP bar do not move. Find the longest name from the enemy library and say its width in the PR. The `combat-board` visual route re-stamps.
  - `app/character-select/index.tsx`: the relic name breaks only between words; fit the longest relic name in the plate. Test the break on "Suppliant's Ring".
  - `app/(tabs)/character/index.tsx`: the name column gets the room to show the whole name; shrink rather than truncate if it must. Test at 360 and 430.
  - Tests per item above, and pin the fits against measured widths from a render rather than an estimate the code also uses (footgun `font-width-estimates-stale`).
  - Measure: the mobile gate run piecewise with a worker cap; before and after shots of the main menu with a save, the fight board with the Death Beholder, character select and Self at 390 in the PR body.
~~~

## Edit plan/README.md
~~~ old
**Held** (waits on a person's word; never picked until the
~~~
~~~ new
- **159.?small** · TU1f: LOAD GAME takes its tap; foe names clear the shield; relic names keep their words; Self shows the whole name (T, `/plot`, 2026-11-08)

**Held** (waits on a person's word; never picked until the
~~~
